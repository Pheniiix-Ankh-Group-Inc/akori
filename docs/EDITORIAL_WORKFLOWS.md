# Procédures éditoriales — Black in Blockchain

Administration : `/admin` (accès sur invitation). Toutes les actions
sensibles sont tracées dans le journal d'audit (auteur, date, objet, action).

## Événements

1. **Créer** — Administration > Événements > Nouvel événement. La fiche est
   créée en **brouillon**.
2. **Renseigner** — identifiant d'URL, fuseau IANA de l'événement (ex.
   `America/Toronto`, `Africa/Lagos`), début (heure locale), fin (facultative),
   format, lieu ou lien en ligne, visuel (image importée dans Médias), textes
   FR/EN/ES. Laisser vide une langue non disponible : aucune traduction n'est
   générée ; le site affiche alors une autre langue en le signalant.
3. **Lien Luma** — copier l'URL officielle de **cet** événement sur Luma
   (`https://lu.ma/…` ou `https://luma.com/…`). Le bouton « S'inscrire sur
   Luma » n'apparaît que si ce lien est renseigné, et plus après l'événement.
   Aucune donnée n'est importée depuis Luma (participants, billets, paiements).
4. **Aperçu** — bouton « Aperçu » (FR/EN/ES), images servies par lien signé
   temporaire.
5. **Publier** — exige au moins un titre ; le visuel doit avoir des droits
   approuvés et un texte alternatif.
6. **À venir / en cours / terminé** — calculé automatiquement depuis les dates ;
   un événement passé reste consultable avec la mention « Terminé ».
7. **Retirer / archiver / supprimer** — « Retirer du site » repasse en
   brouillon ; « Archiver » masque définitivement ; la suppression n'est
   possible que pour une fiche non publiée.

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
flux RSS/Atom, conditions de réutilisation vérifiées. Ajout par un
administrateur dans l'éditeur SQL Supabase :

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
conseil spéculatif) · langue attendue · au moins deux rubriques non vides ·
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

## Insights IA State of BIB

Administration > Insights : génération d'un brouillon (IA, chiffres insérés
par le code, limites explicitées). La publication sur le site est une action
**séparée**, réservée aux administrateurs. Rien n'est publié automatiquement.
