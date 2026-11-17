# Données internes State of BIB

Ce dossier n'est **pas servi par le site** (il est hors de `public/`).

- `current/` : dernière copie technique du lot JSON, synchronisée depuis la
  version courante publiée dans Supabase (workflow `refresh-data.yml`, job
  `repo-sync`). Elle sert à la reprise interne et, **uniquement si elle passe
  les contrôles de validité** (cohérence, provenance, ancienneté), de repli
  d'affichage quand Supabase est indisponible.
- `history/` : copies exactes des lots précédents avec leurs empreintes SHA-256.

Le lot `current/` d'avril 2026 est incohérent et antérieur au pipeline actuel :
il est refusé comme repli (le site affiche un état d'indisponibilité) tant
qu'une version valide n'a pas été publiée puis synchronisée ici.

Les sources, licences et la méthodologie publiques sont présentées dans la
page légale « Données, méthodologie et sources ».
