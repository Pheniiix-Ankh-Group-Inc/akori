# Audit des pages incomplètes — Black in Blockchain

État au 15 novembre 2026, branche `feature/bib-architecture-cible-complete` (PR #32).

Cet audit est un **inventaire** : aucune page hors des trois modules prioritaires
(State of BIB, Luma, Newsletter) n'a été rédigée ni complétée, et aucun contenu
n'a été inventé.

## 1. Méthode (reproductible)

```bash
# Toutes les routes
find src/app -name "page.tsx" | sort

# Pages de substitution et formulations d'attente (FR / EN / ES)
grep -rniE "page in progress|work in progress|coming soon|under construction|en préparation|en cours de construction|bientôt|en preparación|próximamente|PlaceholderPage" \
  src --include=*.tsx --include=*.ts --include=*.json

# Liens de navigation
grep -n "href" src/components/sections/Header.tsx src/components/sections/Footer.tsx

# Politique d'indexation et accessibilité des routes, sur le site démarré
BASE_URL=http://localhost:3000 pnpm test:e2e:rules
```

Routage des langues (`src/i18n/routing.ts`) : anglais par défaut **sans préfixe**
(`/about`), français sous `/fr`, espagnol sous `/es`.

Résultat : **41 routes** inspectées — 19 publiques, 22 d'administration ou d'accès
opérateur. **6 pages de substitution**, **3 pages partielles**, aucune autre page
d'attente trouvée.

## 2. Pages de substitution (placeholder)

Les six pages utilisent `src/components/pages/PlaceholderPage.tsx` : une pastille
« Page en préparation / Page in progress / Página en preparación », le titre, un
chapeau d'une phrase, une note et quatre liens de repli. Toutes déclarent
`robots: { index: false, follow: true }` (vérifié sur le site servi).

| Page | URL FR | URL EN | Fichier source | Statut | Menu | Pied de page | Contenu actuel | Fonctionnalités manquantes | Priorité | Recommandation |
|---|---|---|---|---|---|---|---|---|---|---|
| À propos | `/fr/about` | `/about` | `src/app/[locale]/(public)/about/page.tsx` | Placeholder | Non | Non | Titre « À propos de Black in Blockchain », chapeau, note d'attente | Texte de présentation, histoire, gouvernance | P1 | Compléter, ou rediriger vers `/fondateurs` (le menu « À propos » pointe déjà vers `/fondateurs`) |
| Mission | `/fr/mission` | `/mission` | `src/app/[locale]/(public)/mission/page.tsx` | Placeholder | Non | Oui | Titre, chapeau, note d'attente | Énoncé de mission, objectifs, moyens d'action | P1 | Compléter |
| Rejoindre BIB | `/fr/membership` | `/membership` | `src/app/[locale]/(public)/membership/page.tsx` | Placeholder | Non | Oui | Titre, chapeau, note d'attente | Modalités de participation ; aucun parcours d'adhésion n'existe dans le code | P1 | Compléter (contenu informatif) ou masquer du pied de page tant qu'aucune modalité n'est définie |
| Contact | `/fr/contact` | `/contact` | `src/app/[locale]/(public)/contact/page.tsx` | Placeholder | Non | Oui | Titre, chapeau, note d'attente | Coordonnées ou formulaire, traitement des demandes | P1 | Compléter en priorité : la page légale « Données, méthodologie et sources » y renvoie pour les signalements |
| Ressources | `/fr/resources` | `/resources` | `src/app/[locale]/(public)/resources/page.tsx` | Placeholder | Non | Oui | Titre, chapeau, note d'attente | Sélection de guides et lectures | P2 | Conserver temporairement ou masquer du pied de page |
| Presse | `/fr/press` | `/press` | `src/app/[locale]/(public)/press/page.tsx` | Placeholder | Non | Oui | Titre, chapeau, note d'attente | Communiqués, kit média, contact presse | P2 | Conserver temporairement ou masquer du pied de page |

Variante espagnole : mêmes routes sous `/es/…`, mêmes fichiers, même statut.

## 3. Pages partielles

| Page | URL FR | URL EN | Fichier source | Statut | Menu | Pied de page | Contenu actuel | Fonctionnalités manquantes | Priorité | Recommandation |
|---|---|---|---|---|---|---|---|---|---|---|
| Conditions d'utilisation | `/fr/terms` | `/terms` | `src/app/[locale]/(public)/terms/page.tsx` | Partielle | Non | Oui | Texte complet, mais la rubrique « Éditeur » affiche des libellés **sans valeur** : numéro d'enregistrement, siège, représentant. Deux valeurs sont écrites en dur en anglais (« Non-profit organization (OBNL) registered in Canada ») quelle que soit la langue ; l'éditeur est nommé « ANBACHAIN ». Date : 12 mars 2026. | Mentions légales de l'éditeur à fournir par le propriétaire ; traduction des valeurs en dur ; cohérence du nom de l'organisme | P1 | Compléter avec les informations réelles (non inventées ici) |
| Confidentialité | `/fr/privacy` | `/privacy` | `src/app/[locale]/(public)/privacy/page.tsx` | Partielle | Non | Oui | Texte complet daté de mars 2026 | À relire au regard des traitements ajoutés depuis : inscription newsletter en double opt-in via Brevo, preuve de consentement conservée, synchronisation des événements Luma (aucune donnée de participant) | P0 | Compléter avant l'ouverture des inscriptions newsletter (conformité liée au module Newsletter) |
| Cookies | `/fr/cookies` | `/cookies` | `src/app/[locale]/(public)/cookies/page.tsx` | Partielle | Non | Oui | Texte complet daté de mars 2026 | À relire : le calendrier Luma embarqué (iframe `lu.ma`) peut déposer des cookies tiers | P0 | Compléter (conformité liée au module Luma) |

Ces trois pages utilisent encore l'ancienne mise en page (`section`, `wrap-sm`,
`legal-content`) et non la charte éditoriale (`ed-*`) du reste du site : écart
visuel, sans impact fonctionnel.

## 4. Pages fonctionnelles

| Page | URL FR | URL EN | Fichier source | Menu | Pied de page | Remarque |
|---|---|---|---|---|---|---|
| Accueil | `/fr` | `/` | `src/app/[locale]/(public)/page.tsx` | Logo | — | Les indicateurs State of BIB ne s'affichent que si une version valide existe ; sinon un message d'attente remplace les chiffres. Des sections non sourcées restent masquées par `HOME_SHOW_UNVERIFIED_SECTIONS` (désactivé). |
| Fondateurs | `/fr/fondateurs` | `/fondateurs` | `…/fondateurs/page.tsx` | Oui (« À propos ») | Oui | Fonctionnelle |
| Fondateur — Brice | `/fr/fondateurs/brice` | `/fondateurs/brice` | `…/fondateurs/brice/page.tsx` | Non | Non | Fonctionnelle |
| Fondatrice — Fadjiah | `/fr/fondateurs/fadjiah` | `/fondateurs/fadjiah` | `…/fondateurs/fadjiah/page.tsx` | Non | Non | Fonctionnelle |
| Événements | `/fr/evenements` | `/evenements` | `…/evenements/page.tsx` | Oui | Oui | Fonctionnelle ; les vues liste et mois sont vides tant qu'aucune synchronisation Luma n'a été exécutée (le calendrier Luma embarqué reste affiché) |
| Fiche événement | `/fr/evenements/[slug]` | `/evenements/[slug]` | `…/evenements/[slug]/page.tsx` | — | — | Fonctionnelle (dépend des événements synchronisés) |
| BIB en action | `/fr/en-action` | `/en-action` | `…/en-action/page.tsx` | Oui | Oui | Fonctionnelle ; liste vide tant qu'aucune rétrospective n'est publiée |
| Rétrospective | `/fr/en-action/[slug]` | `/en-action/[slug]` | `…/en-action/[slug]/page.tsx` | — | — | Fonctionnelle |
| State of BIB | `/fr/state_of_bib` | `/state_of_bib` | `…/state_of_bib/page.tsx` | Oui | Oui | Fonctionnelle ; affiche un **état d'indisponibilité** tant qu'aucune version vérifiée n'est publiée |
| Données, méthodologie et sources | `/fr/data-sources` | `/data-sources` | `…/data-sources/page.tsx` | Non | Oui (Légal) | **Créée dans cette livraison** (exigence State of BIB), FR/EN/ES |

Routes d'administration et d'accès (hors langue, protégées) : `/login`
(fonctionnelle), `/register` (route historique, affiche « Inscription fermée »),
`/dashboard` (redirige vers `/admin`), et 19 pages sous `/admin/…` — toutes
fonctionnelles, non indexées, sans page de substitution.

## 5. Navigation et référencement

**Liens menant vers des pages de substitution**

- Pied de page, colonne « Plus » : Mission, Rejoindre BIB, Ressources, Presse,
  Contact — cinq liens sur cinq mènent à une page en préparation.
- Page légale « Données, méthodologie et sources » : le lien « Contact » mène à
  la page Contact en préparation. Les pages Conditions, Confidentialité et
  Cookies donnent une adresse e-mail directement et ne sont pas concernées.
- La page `/about` n'est liée nulle part (accessible par URL directe uniquement).

**Indexation**

- Les six pages de substitution sont en `noindex, follow` : politique conservée.
- Le projet n'a ni `sitemap` ni `robots.txt` (`src/app/sitemap.ts` et
  `src/app/robots.ts` absents) : les pages fonctionnelles ne sont déclarées à
  aucun moteur. À prévoir pour une prochaine version.

**Incohérences de traduction**

- Conditions d'utilisation : deux valeurs en anglais affichées dans toutes les
  langues (voir § 3).
- L'éditeur est nommé « ANBACHAIN » dans les pages légales et l'adresse de
  contact est `contact@anbachain.org`, alors que le site se présente comme
  « Black in Blockchain » : à confirmer par le propriétaire.
- Les routes mêlent français et anglais (`/evenements`, `/en-action`,
  `/fondateurs`, `/state_of_bib`, `/mission`, `/press`…) dans toutes les
  langues : cohérent techniquement, mais non localisé.

**Pages annoncées comme disponibles alors qu'elles ne le sont pas**

- « Rejoindre BIB » (pied de page) : aucun parcours d'adhésion n'existe.
- « Contact » (pied de page et page légale) : aucun moyen de contact sur la page.

## 6. Priorités

| Priorité | Pages | Motif |
|---|---|---|
| P0 | Confidentialité, Cookies | Conformité liée à la newsletter (consentement, Brevo) et au calendrier Luma embarqué |
| P1 | Contact, À propos, Mission, Rejoindre BIB, Conditions d'utilisation | Confiance et crédibilité publiques ; Contact est la cible de liens légaux |
| P2 | Ressources, Presse | Secondaires |

## 7. Pages nécessaires à une prochaine version

1. Contact (coordonnées réelles ou formulaire).
2. Relecture de Confidentialité et Cookies avant l'ouverture des inscriptions.
3. Mentions de l'éditeur dans les Conditions d'utilisation.
4. `sitemap` et `robots.txt`.
5. Mission, À propos, Rejoindre BIB ; puis Ressources et Presse.
