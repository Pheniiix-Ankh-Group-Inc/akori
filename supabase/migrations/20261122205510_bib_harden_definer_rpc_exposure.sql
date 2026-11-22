-- BIB: do not expose privileged SECURITY DEFINER functions via PostgREST.
-- Retain explicit server/user checks in private implementations and invoker wrappers.
alter function public.current_editor_role() security invoker;

alter function public.publish_dataset_candidate(uuid,text) set schema private;
alter function public.reject_dataset_candidate(uuid,text) set schema private;
alter function public.restore_dataset_version(uuid) set schema private;
alter function public.set_automation_mode(text,text) set schema private;
alter function public.verify_current_dataset(text) set schema private;

create function public.publish_dataset_candidate(p_version_id uuid, p_note text default null)
returns text language plpgsql security invoker set search_path = ''
as $body$
begin
  if not private.is_admin() and not private.is_service() then
    raise exception 'not authorized' using errcode='42501';
  end if;
  return private.publish_dataset_candidate(p_version_id,p_note);
end
$body$;

create function public.reject_dataset_candidate(p_version_id uuid,p_reason text)
returns text language plpgsql security invoker set search_path = ''
as $body$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode='42501';
  end if;
  return private.reject_dataset_candidate(p_version_id,p_reason);
end
$body$;

create function public.restore_dataset_version(p_version_id uuid)
returns text language plpgsql security invoker set search_path = ''
as $body$
begin
  if not private.is_admin() and not private.is_service() then
    raise exception 'not authorized' using errcode='42501';
  end if;
  return private.restore_dataset_version(p_version_id);
end
$body$;

create function public.set_automation_mode(p_module text,p_mode text)
returns text language plpgsql security invoker set search_path = ''
as $body$
begin
  if not private.is_admin() then
    raise exception 'admin only' using errcode='42501';
  end if;
  return private.set_automation_mode(p_module,p_mode);
end
$body$;

create function public.verify_current_dataset(p_source_id text)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $body$
begin
  if not private.is_service() and not private.is_editor() then
    raise exception 'not authorized' using errcode='42501';
  end if;
  return private.verify_current_dataset(p_source_id);
end
$body$;

revoke all on function public.publish_dataset_candidate(uuid,text) from public,anon,authenticated;
revoke all on function public.reject_dataset_candidate(uuid,text) from public,anon,authenticated;
revoke all on function public.restore_dataset_version(uuid) from public,anon,authenticated;
revoke all on function public.set_automation_mode(text,text) from public,anon,authenticated;
revoke all on function public.verify_current_dataset(text) from public,anon,authenticated;

grant execute on function public.publish_dataset_candidate(uuid,text) to authenticated,service_role;
grant execute on function public.reject_dataset_candidate(uuid,text) to authenticated,service_role;
grant execute on function public.restore_dataset_version(uuid) to authenticated,service_role;
grant execute on function public.set_automation_mode(text,text) to authenticated,service_role;
grant execute on function public.verify_current_dataset(text) to authenticated,service_role;

-- Private implementation is unavailable to public/anonymous callers.
revoke all on function private.publish_dataset_candidate(uuid,text) from public,anon;
revoke all on function private.reject_dataset_candidate(uuid,text) from public,anon;
revoke all on function private.restore_dataset_version(uuid) from public,anon;
revoke all on function private.set_automation_mode(text,text) from public,anon;
revoke all on function private.verify_current_dataset(text) from public,anon;

-- Preserve the authenticated admin portal and service role pipelines.
grant execute on function private.publish_dataset_candidate(uuid,text) to authenticated,service_role;
grant execute on function private.reject_dataset_candidate(uuid,text) to authenticated,service_role;
grant execute on function private.restore_dataset_version(uuid) to authenticated,service_role;
grant execute on function private.set_automation_mode(text,text) to authenticated,service_role;
grant execute on function private.verify_current_dataset(text) to authenticated,service_role;

revoke all on function public.current_editor_role() from public,anon;
grant execute on function public.current_editor_role() to authenticated,service_role;
