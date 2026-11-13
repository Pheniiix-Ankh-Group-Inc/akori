-- =============================================================================
-- BIB — Migration corrective 0008 : intégrité newsletter et consentements
-- -----------------------------------------------------------------------------
-- Additive. Objet :
--   * validation ATOMIQUE de la paire FR/EN (une seule transaction) ;
--   * immutabilité d'une édition validée ou envoyée (seul le statut évolue,
--     et jamais en arrière depuis « sent ») ;
--   * un envoi confirmé (send_runs.status = 'sent') ne peut plus changer ;
--   * états explicites de la demande de consentement (traçabilité honnête :
--     « demandée » ≠ « confirmée » ; la confirmation et le désabonnement
--     restent dans Brevo, source de vérité).
-- Le nombre de tables reste inchangé (26).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Consentements : états de la DEMANDE (pas de la confirmation)
--   pending        : demande enregistrée, appel Brevo non encore abouti
--   requested      : Brevo a accepté la demande de double opt-in
--   request_failed : Brevo a refusé ou n'a pas répondu
-- ---------------------------------------------------------------------------
alter table public.newsletter_consents
  add column if not exists status text not null default 'requested'
    check (status in ('pending', 'requested', 'request_failed')),
  add column if not exists brevo_requested_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists newsletter_consents_recent_idx
  on public.newsletter_consents (email_sha256, created_at desc);

drop trigger if exists newsletter_consents_set_updated_at on public.newsletter_consents;
create trigger newsletter_consents_set_updated_at
  before update on public.newsletter_consents
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Validation atomique de la paire FR/EN d'un cycle (service uniquement)
-- ---------------------------------------------------------------------------
create or replace function public.newsletter_validate_pair(p_cycle_id uuid, p_edition_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_versions integer;
  v_locales text[];
begin
  if cardinality(p_edition_ids) <> 2 then
    raise exception 'a pair requires exactly two editions' using errcode = '22023';
  end if;
  -- Sérialise les validations concurrentes du même cycle.
  perform 1 from public.newsletter_cycles where id = p_cycle_id for update;
  if not found then
    raise exception 'cycle not found' using errcode = 'BIB02';
  end if;

  select count(*), count(distinct version), array_agg(locale order by locale)
    into v_count, v_versions, v_locales
  from public.newsletter_editions
  where id = any (p_edition_ids) and cycle_id = p_cycle_id and status not in ('sent', 'cancelled');
  if v_count <> 2 or v_versions <> 1 or v_locales is distinct from array['en', 'fr'] then
    raise exception 'invalid pair (count=%, versions=%, locales=%)', v_count, v_versions, v_locales using errcode = 'BIB04';
  end if;

  update public.newsletter_editions
     set status = 'cancelled'
   where cycle_id = p_cycle_id and not (id = any (p_edition_ids)) and status not in ('sent', 'cancelled');
  update public.newsletter_editions set status = 'validated' where id = any (p_edition_ids);
end $$;

revoke all on function public.newsletter_validate_pair(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.newsletter_validate_pair(uuid, uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Immutabilité des éditions validées / envoyées
-- ---------------------------------------------------------------------------
create or replace function private.guard_edition_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('validated', 'sent') and (
       new.subject is distinct from old.subject
       or new.preheader is distinct from old.preheader
       or new.content is distinct from old.content
       or new.html is distinct from old.html
       or new.locale is distinct from old.locale
       or new.version is distinct from old.version
       or new.cycle_id is distinct from old.cycle_id) then
    raise exception 'edition % is %, its content is immutable', old.id, old.status using errcode = 'BIB04';
  end if;
  if old.status = 'sent' and new.status is distinct from 'sent' then
    raise exception 'a sent edition cannot change status' using errcode = 'BIB04';
  end if;
  return new;
end $$;

drop trigger if exists newsletter_editions_immutable on public.newsletter_editions;
create trigger newsletter_editions_immutable
  before update on public.newsletter_editions
  for each row execute function private.guard_edition_immutability();

-- ---------------------------------------------------------------------------
-- Un envoi confirmé est définitif
-- ---------------------------------------------------------------------------
create or replace function private.guard_send_run()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'sent' and (new.status is distinct from 'sent' or new.brevo_campaign_id is distinct from old.brevo_campaign_id) then
    raise exception 'a confirmed send cannot be modified' using errcode = 'BIB04';
  end if;
  return new;
end $$;

drop trigger if exists send_runs_guard on public.send_runs;
create trigger send_runs_guard
  before update on public.send_runs
  for each row execute function private.guard_send_run();
