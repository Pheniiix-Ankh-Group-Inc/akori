-- =============================================================================
-- BIB — Activation (ou vérification) du mode automatique State of BIB
-- Projet Supabase BIB « akori » (zwfyuhgnbdrjhetkyanj).
--
-- La migration 0013 fait déjà ce réglage. Ce script sert à le REFAIRE seul si
-- un mode a été changé depuis (par exemple après une pause), ou à vérifier
-- l'état réel. Il ne touche pas au mode « newsletter ». Rejouable.
-- =============================================================================
begin;

update public.automation_settings
   set mode = 'auto', updated_at = now()
 where module in ('sob', 'sob_insights') and mode <> 'auto';

insert into public.editorial_audit (actor_id, action, entity_type, details)
values (null, 'automation.mode_change', 'automation',
        jsonb_build_object('modules', 'sob,sob_insights', 'mode', 'auto', 'by', 'script 07'));

commit;

-- État réel après exécution (doit afficher auto pour sob et sob_insights) :
select module, mode, updated_at from public.automation_settings order by module;

-- Pour suspendre la publication automatique en cas de besoin exceptionnel :
--   update public.automation_settings set mode = 'paused' where module = 'sob';
