-- All privileged implementations stay in a non-API schema.
-- Public call sites are INVOKER wrappers, not privileged direct RPC endpoints.
do $$
declare
 v_name text;
 v_spec text;
 v_pub oid;
 v_private oid;
begin
 for v_name,v_spec in
 select * from (values
   ('current_editor_role',''),
   ('publish_dataset_candidate','uuid,text'),
   ('reject_dataset_candidate','uuid,text'),
   ('restore_dataset_version','uuid'),
   ('set_automation_mode','text,text'),
   ('verify_current_dataset','text')) as ops(name,args)
 loop
  v_pub := to_regprocedure('public.'||v_name||'('||v_spec||')');
  if v_pub is null then raise exception 'Missing API wrapper: %', v_name; end if;
  if (select prosecdef from pg_proc where oid=v_pub) then
    raise exception 'SECURITY DEFINER exposed in public: %',v_name;
  end if;
  if has_function_privilege('anon',v_pub,'execute') then
    raise exception 'Anonymous EXECUTE grant exposed: %',v_name;
  end if;
  if not has_function_privilege('authenticated',v_pub,'execute') then
    raise exception 'Authorized login cannot use wrapper: %',v_name;
  end if;
  if not has_function_privilege('service_role',v_pub,'execute') then
    raise exception 'Pipeline cannot use wrapper: %',v_name;
  end if;
  if v_name<>'current_editor_role' then
    v_private := to_regprocedure('private.'||v_name||'('||v_spec||')');
    if v_private is null or not (select prosecdef from pg_proc where oid=v_private) then
      raise exception 'Missing private privileged implementation: %',v_name;
    end if;
  end if;
 end loop;
end $$;

-- Non-privileged authenticated users cannot become admins.
set role authenticated;
select tests.act_as('00000000-0000-0000-0000-00000000000f');
select tests.assert(public.current_editor_role() is null, 'unregistered user has no editor role');
select tests.assert(tests.try($$select public.set_automation_mode('sob','paused')$$)='42501',
  'non-admin cannot adjust automations');
reset role;

\echo 'SECURITY DEFINER RPC exposure tests passed.'
