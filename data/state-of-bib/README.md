# Données internes State of BIB

Ce dossier n'est **pas servi par le site** (il est hors de `public/`).

- `current/` : copie technique d'une version publiée dans Supabase, mise à
  jour **à la main** (la synchronisation automatique `repo-sync` a été retirée
  en novembre 2026 pour éviter des PR répétées). Elle sert à la reprise interne
  et au développement local et, **uniquement si elle passe les contrôles de
  validité** (cohérence, provenance, moins de 120 jours), de repli d'affichage
  quand Supabase est indisponible. Copie actuelle : version `20261118T130441`
  (données au 10 novembre 2026), empreintes SHA-256 identiques aux artefacts
  publiés dans Supabase.
- `history/` : copies exactes des lots précédents avec leurs empreintes SHA-256.

Pour la rafraîchir : récupérer les six artefacts d'une version publiée
(`dataset_artifacts` de Supabase, bucket privé `bib-sob-candidates`), vérifier
leurs empreintes SHA-256 contre la base, puis lancer
`python data-pipeline/validate.py data/state-of-bib/current`. Au-delà de
120 jours, la copie est de nouveau refusée comme repli.

Les sources, licences et la méthodologie publiques sont présentées dans la
page légale « Données, méthodologie et sources ».
