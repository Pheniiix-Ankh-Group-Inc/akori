# Procédures éditoriales — Black in Blockchain

Administration : `/admin` (accès sur invitation). Toutes les actions
sensibles sont tracées dans le journal d'audit (auteur, date, objet, action).

## Événements

**Luma est la source de vérité.** Un événement se crée, se modifie et s'annule
dans Luma ; la synchronisation le reporte dans Supabase puis sur le site. Il
n'y a pas de création d'événement dans l'administration.

1. **Suivre la synchronisation** — Administration > Événements : journal des
   exécutions, « Synchroniser maintenant », import d'un fichier `.ics` pour
   les événements anciens absents du flux.
2. **Compléter** — sur une fiche synchronisée : visuel (image importée dans
   Médias, droits approuvés et texte alternatif) et textes BIB par langue.
   Les champs issus de Luma (titre, dates, lieu, lien) sont en lecture seule.
3. **À venir / en cours / terminé** — calculé automatiquement depuis les dates ;
   un événement passé reste consultable.
4. **Annulation, disparition** — un événement annulé dans Luma reste affiché
   comme annulé ; un événement absent du flux est marqué, jamais supprimé.
5. Aucune donnée de participant, de billet ou de paiement n'est importée.

## Médias et consentements

1. **Importer** — Administration > Médias. Photos JPEG/PNG/WebP/AVIF (15 Mo),
   vidéo MP4 **déjà optimisée** (200 Mo), affiche, sous-titres WebVTT. Les
   fichiers restent privés.
2. **Décrire** — texte alternatif par langue (obligatoire pour une photo
   publiée), crédit, titulaire des droits.
3. **Droits** — saisir la référence d'autorisation (ex. « Accord signé le …,
   dossier … »), joindre la preuve (PDF/image, stockée en privé), puis passer
   les droits à **Approuvés**. Sans cela, le média n'est jamais diffusé.
4. **Vidéo** — associer une affiche et des sous-titres. Lecture au clic, sans
   son automatique.
5. **Révocation** — passer les droits à **Révoqués** retire immédiatement la
   copie publique et invalide le cache.

## Rétrospectives (BIB en action)

1. Administration > BIB en action > Nouvelle rétrospective : identifiant,
   date, événement lié (facultatif), couverture, vidéo phare, textes.
2. **Galerie** — cocher les médias, fixer l'ordre et les légendes.
3. **Aperçu**, puis **Publier** : la publication est refusée si un média
   associé n'a pas de droits approuvés ou de texte alternatif.
4. **Retirer / archiver** — les copies publiques devenues inutilisées sont
   supprimées.

## Témoignages

Uniquement des témoignages **authentiques**, dans leur langue d'origine, avec
une **référence de consentement écrit** obligatoire. Publication et retrait
dans Administration > Témoignages.

## Sources d'actualités (veille)

Une source n'est collectée que si elle est **explicitement autorisée** :
flux RSS/Atom, conditions de réutilisation vérifiées. Ajout et activation dans
Administration > Newsletter > Sources (le flux est lu et contrôlé avant
d'être enregistré). Équivalent SQL, pour mémoire :

```sql
insert into public.news_sources
  (name, kind, feed_url, homepage_url, language, region_tags, usage_terms, enabled, authorized_by, authorized_at)
values
  ('<Nom>', 'rss', 'https://…/feed', 'https://…', 'en', '{africa}',
   '<Conditions de réutilisation vérifiées, lien vers la page>', true, '<Nom de la personne>', now());
```

Désactiver : `update public.news_sources set enabled = false where id = '…';`
Aucun scraping n'est effectué.

## Newsletter

- **Rubriques** (fixes, dans cet ordre) : Blockchain Insights, Blockchain News,
  BIB Events, BIB Highlights.
- **Thèmes** : innovation, adoption / cas d'usage, entrepreneuriat /
  écosystèmes, talents, éducation, réglementation. Pas de trading ni de
  spéculation.
- **Sources** : Insights ← statistiques State of BIB versionnées ; News ←
  sources autorisées ; Events ← événements publiés à venir ; Highlights ←
  rétrospectives publiées récentes.
- **Langues** : FR et EN, chaque abonné reçoit une seule langue.

### Calendrier (America/Toronto)

| Jour | Étape | Résultat |
| --- | --- | --- |
| Lundi | Génération FR + EN, rendu, contrôles | `drafted` ou `blocked` |
| Mardi | Recontrôle, régénération bornée (`NEWSLETTER_MAX_REGENERATIONS`) | `eligible` ou `blocked` |
| Mercredi 09:00–09:59 | Contrôle final puis envoi FR et EN | `sent`, `cancelled`, `partially_sent` ou `failed` |

### Contrôles automatiques (tous bloquants)

Éléments cités connus (aucune source inventée) · pas de doublon · marqueurs
d'indicateurs valides · aucun chiffre non issu des données · événements encore
à venir au moment de l'envoi · titres disponibles dans la langue · licences et
citations des actualités · attribution State of BIB · ligne éditoriale (pas de
conseil spéculatif) · aucune formulation de conseil financier (« achetez »,
« rendement garanti »…) · aucun lien rédigé par le modèle · langue attendue
(heuristique : jamais une preuve linguistique) · au moins deux rubriques non vides ·
liens HTTPS autorisés · lien de désabonnement · rubriques dans l'ordre · mêmes
éléments en FR et EN.

### Blocage et annulation

- Si **une** langue échoue, **les deux** sont bloquées.
- Si l'édition n'est pas éligible à 09:00 le mercredi, ou si le créneau est
  dépassé : la semaine est **annulée**, l'équipe est prévenue **par e-mail**,
  **aucun rattrapage** ; le cycle reprend la semaine suivante.
- Envoi partiel chez Brevo (FR envoyée, EN en échec) : incident **critique**,
  aucun renvoi automatique (les e-mails délivrés ne sont pas rappelables).
  Vérifier manuellement l'état des campagnes dans Brevo.
- Suivi : Administration > Newsletter (suivi).

### Désabonnement

Chaque e-mail contient le lien de désabonnement Brevo. Brevo reste la source
de vérité des consentements et désabonnements.

### Paire validée

Le mardi, la paire FR/EN contrôlée est validée en une seule transaction ; son
contenu devient immuable. Le mercredi, c'est exactement cette paire (même
version) qui est recontrôlée puis envoyée, et la fenêtre 09:00–09:59 est
revérifiée avant chaque langue : une langue n'est jamais envoyée après 09:59.

## Modifications concurrentes

Deux opérateurs ouvrant la même fiche : le second enregistrement est refusé
(« modifié par une autre personne ») ; recharger la page pour repartir de la
dernière version. Un double clic sur « Publier » n'a aucun effet supplémentaire.

## Contenus non sourcés de l'accueil

Inventaire : `docs/EDITORIAL_CLAIMS.md`. Pour publier un élément : obtenir et
consigner la source, puis le retirer du registre `src/lib/content/claims.ts`
par pull request. Ne jamais remplacer un chiffre par un autre non sourcé.

## State of BIB : publication automatique

Une nouvelle version de la source est construite, contrôlée et publiée sans
intervention de l'équipe (`SOB_AUTOMATION.md`). `/admin/state-of-bib` sert à
surveiller : version courante, rapport de validation, quarantaine, incidents,
restauration d'une version précédente. Les sources et licences ne sont
présentées que sur la page légale `/data-sources`.

## Insights IA State of BIB

Les analyses sont générées après chaque publication (IA, chiffres insérés par
le code, contrôles hors IA). En mode `auto` (réglage actuel), une analyse
valide est publiée automatiquement ; en mode `review`, elle attend la
publication par un administrateur dans Administration > Insights.
