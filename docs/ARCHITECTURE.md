# Architecture — Black in Blockchain

Architecture **réellement implémentée** dans ce dépôt. Les services externes
(Supabase BIB, Brevo, fournisseur IA, planification) sont intégrés dans le
code mais **désactivés par défaut** : voir [DEPLOYMENT.md](DEPLOYMENT.md).

## Vue d'ensemble

```mermaid
flowchart TB
    V[Visiteurs] --> W["Site public Next.js<br/>/[locale] FR · EN · ES"]
    E[Éditeurs habilités] --> L["/login<br/>Supabase Auth"]
    L --> A["Administration /admin<br/>Server Actions"]

    W -->|lecture anon, RLS: publié| DB[(Supabase PostgreSQL BIB)]
    W -->|fichiers publiés| SP[(Storage bib-media-public)]
    A -->|session éditeur, RLS| DB
    A -->|URL signées d'import| SD[(Storage bib-media-drafts<br/>bib-consents — privés)]
    A -->|copie à la publication<br/>clé serveur| SP

    W -->|lien « S'inscrire »| LU[Luma — externe]
    W -->|POST /api/newsletter| NL[Inscription]
    NL -->|double opt-in| BR[Brevo]

    W --> SOB[State of BIB]
    SOB -->|repli| JSON[public/data/*.json]
    SOB -->|si activé| DB
    SOB -->|snapshots immuables| SS[(Storage bib-sob-snapshots)]

    GH[GitHub Actions<br/>désactivées par défaut] -->|quotidien| PY[Python + DuckDB<br/>data-pipeline]
    PY --> JSON
    PY -->|si SOB_SUPABASE_SYNC| DB
    PY --> SS
    GH -->|CRON_SECRET| CN["/api/cron/news"]
    GH -->|CRON_SECRET| CW["/api/cron/newsletter"]
    CN -->|RSS/Atom autorisés| DB
    CW --> IA[Moteur IA commun<br/>fournisseur configurable]
    CW -->|campagnes FR + EN| BR
    CW -->|incidents| AL[Alertes e-mail internes]
    A -->|brouillons d'insights| IA
```

## Composants

| Composant | Emplacement | Rôle |
| --- | --- | --- |
| Site public | `src/app/[locale]/(public)/` | Pages traduites ; lecture des seuls contenus publiés (client anonyme, cache par étiquettes) |
| Espace opérateurs | `src/app/(operateurs)/` | `/login`, `/register` (fermé), `/dashboard` → `/admin`, administration |
| Proxy | `src/proxy.ts` | Routage de langue next-intl ; rafraîchissement de session Supabase et première barrière pour `/admin` |
| Accès Supabase | `src/lib/supabase/` | `server.ts` (session, RLS), `public.ts` (anonyme, cache), `admin.ts` (clé secrète, serveur seulement), `client.ts` (navigateur, imports signés) |
| Autorisation | `src/lib/auth/editor.ts` | `requireEditor()` / `requireAdmin()` : jeton vérifié + habilitation `public.editors` |
| Événements | `src/lib/events/`, `src/components/events/` | Requêtes publiques, formulaire validé (zod), calcul à venir / en cours / passé, fuseaux |
| BIB en action | `src/lib/stories/`, `src/lib/media/`, `src/components/en-action/` | Rétrospectives, médias, publication/retrait des copies publiques, aperçus signés |
| Luma | `src/lib/luma.ts` | Validation/normalisation des URL (aucune API) |
| State of BIB | `src/lib/sob/`, `data-pipeline/` | Lecture du snapshot courant (Supabase ou JSON), historique, insights |
| Newsletter | `src/lib/newsletter/`, `src/lib/brevo.ts`, `src/app/api/newsletter/` | Inscription, cycle autonome, rendu, contrôles, envoi idempotent |
| Veille | `src/lib/news/ingest.ts` | Flux RSS/Atom autorisés, thèmes, déduplication |
| Moteur IA | `src/lib/ai/engine.ts` | Adaptateurs « anthropic » / « openai-compatible », budget, sortie JSON validée, traces `ai_runs` |
| Exploitation | `src/lib/ops/incidents.ts`, `src/lib/security/` | Incidents + alertes e-mail, limitation de débit, CSRF, secret de planification |
| Base | `supabase/migrations/` | Schéma, RLS, fonctions, buckets |
| Automatisations | `.github/workflows/` | `ci.yml`, `refresh-data.yml`, `news-ingest.yml`, `newsletter.yml` |

## Principaux flux

**Publication d'une rétrospective.** L'éditeur importe un fichier : le serveur
contrôle type et taille, émet une URL signée vers le bucket privé, puis
revérifie l'objet stocké. À la publication, chaque média associé doit avoir des
droits approuvés, une référence d'autorisation et (photo) un texte alternatif ;
il est alors copié vers le bucket public. Le cache public est invalidé par
étiquette (`stories`, `media`).

**Retrait.** Retirer, archiver ou révoquer les droits supprime les copies
publiques qui ne sont plus utilisées par un contenu publié et invalide le cache.

**Cycle newsletter (America/Toronto).**

```mermaid
sequenceDiagram
    participant GH as GitHub Actions
    participant API as /api/cron/newsletter
    participant IA as Moteur IA
    participant BR as Brevo
    GH->>API: lundi — generate
    API->>IA: brouillon FR+EN (données publiées uniquement)
    API->>API: rendu + contrôles hors IA → drafted / blocked
    GH->>API: mardi — check
    API->>API: recontrôle ; régénération bornée si échec
    API->>API: FR ET EN valides → eligible, sinon blocked + alerte
    GH->>API: mercredi 09:02 (EDT et EST)
    API->>API: fenêtre 09:00–09:59 Toronto ? verrou « sending »
    alt éligible
        API->>BR: campagne FR puis EN (clé d'idempotence, réconciliation)
    else non éligible ou créneau dépassé
        API->>API: annulation de la semaine, alerte e-mail, aucun rattrapage
    end
```

**State of BIB.** Chaque jour, `check_version.py` lit le manifeste de la source
(sans téléchargement lourd). Si une version est nouvelle ou en échec, le build
Python/DuckDB s'exécute, écrit dans un dossier temporaire, valide, puis
remplace `public/data`. Si l'historisation est activée, `publish_supabase.py`
téléverse des snapshots immuables, enregistre les observations et déplace
atomiquement le pointeur « version courante ». Un échec laisse la version
précédente en ligne.

## Séparation des responsabilités

- **Le code calcule, l'IA rédige.** Aucun chiffre n'est produit par le modèle :
  il utilise des marqueurs `{{fact:clé}}` remplacés par le code, et tout chiffre
  libre fait échouer les contrôles.
- **Brevo est la source de vérité des contacts.** BIB ne stocke qu'une empreinte
  de l'adresse et la version du texte de consentement.
- **Luma reste externe.** BIB ne lit ni n'écrit aucune donnée Luma.
- **Supabase BIB est dédié.** Aucun projet d'un autre produit n'est utilisé.
