# State of BIB — entrepôt historique (implémentation 0014)

## Décisions fonctionnelles

- Supabase PostgreSQL + Storage privé constitue l'unique source de lecture du site en production.
- Chaque snapshot historique disponible est conservé sans réécriture des valeurs fournies.
- Les variations entre versions, les changements de périmètre et les écarts d'agrégats sont des **observations**, non des erreurs fatales par principe.
- Un fichier manquant/illisible, des valeurs de type incorrect, un objet Storage modifié (SHA-256) ou une version non conforme restent bloquants.
- Les métriques dérivées et les deltas sont séparés des données originelles et sont recalculables à partir des observations.

## Schéma (migration 0014, non appliquée automatiquement)

`dataset_versions` référence chaque version, `dataset_artifacts` les six JSON exacts dans Storage privé, `metric_observations` les métriques exploitables et `ingestion_runs` les opérations. La migration `20261118051801_sob_historical_deltas.sql` ajoute `dataset_version_deltas` (version actuelle, version antérieure, dimension, avant/après, écart, type de changement). Toutes les tables privées conservent RLS activée ; le rôle de service uniquement écrit les deltas. Les diagnostics au sein d'un lot sont également stockés dans `dataset_versions.validation_report.consistency_anomalies`.

## Procédure de déploiement prudente

1. Sauvegarder la base `akori` et les objets des buckets `bib-sob-candidates` et `bib-sob-snapshots`; vérifier la procédure de restauration.
2. Vérifier les secrets GitHub Production (`SUPABASE_SECRET_KEY`, `BIB_CRON_SECRET`) et la cible Supabase `zwfyuhgnbdrjhetkyanj`.
3. Revoir la migration 0014 et l'appliquer explicitement **avant** d'activer la nouvelle version du pipeline. Ne pas réexécuter les migrations 0001–0013.
4. Prévisualiser l'inventaire des archives : `python data-pipeline/backfill_history.py` (lecture seule, pas d'appel Supabase).
5. Une fois les hashes et sauvegardes validés, depuis un environnement de confiance muni des secrets serveur, lancer `SOB_SUPABASE_SYNC=true python data-pipeline/backfill_history.py --apply`. Cette commande écrit en base mais **ne déplace jamais** le pointeur `is_current`.
6. Vérifier les versions/artefacts/observations/imports en base, puis déclencher manuellement le pipeline normal pour publier la version la plus récente.
7. Contrôler les deltas, la page `/state_of_bib`, la sélection d'une version passée, les taux d'erreur et les journaux de publication.

La PR ne déclenche **ni migration distante, ni backfill, ni ingestion en production**. Les tests CI utilisent des bases jetables. Le site ne lit plus le repli Git local en production.

## Retour arrière

- Revenir au déploiement précédent pour l'interface/pipeline ; les snapshots déjà importés doivent rester conservés.
- Ne pas supprimer les archives ni la migration 0014 en cas de rollback applicatif ; le schéma est additif.
- Le pointeur courant est piloté par les RPC existantes, atomiques et protégées.

## Limites actuelles

Les snapshots historiques du dépôt sont des **données transformées** par une ancienne version du pipeline. Ils ne sont pas présentés comme les fichiers Parquet bruts originels. Les fichiers de la source externe restent gouvernés par leurs conditions d'accès/licences.

## Déclenchement depuis GitHub Actions

Le workflow `refresh-data.yml` propose désormais l'entrée manuelle `backfill_history=true`. Il importe les archives d'abord, puis vérifie si la source externe a une nouvelle version. Pour une release initiale automatisée, le message du commit arrivant sur `main` peut contenir `[sob-bootstrap]` afin d'activer une seule fois ce mécanisme. Les autres pushs sur `main` ne déclenchent pas le backfill et respectent le cycle d'ingestion ordinaire.

L'environnement GitHub `production` peut imposer une approbation humaine : ne jamais désactiver cette protection pour contourner une attente. La clé Supabase ne doit jamais être affichée dans les logs.
