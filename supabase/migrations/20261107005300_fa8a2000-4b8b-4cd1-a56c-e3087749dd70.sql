BEGIN;
DO $migration$ DECLARE p record; q text; c text; BEGIN
FOR p IN SELECT schemaname,tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' AND 'public'=ANY(roles) AND (qual LIKE '%has_role%' OR with_check LIKE '%has_role%') LOOP
q := regexp_replace(p.qual, '(?:public\.)?has_role\(auth.uid\(\), ''([^'']+)''::text\)', '(CASE WHEN auth.uid() IS NULL THEN false ELSE public.has_role(auth.uid(), ''\1'') END)', 'g');
c := regexp_replace(p.with_check, '(?:public\.)?has_role\(auth.uid\(\), ''([^'']+)''::text\)', '(CASE WHEN auth.uid() IS NULL THEN false ELSE public.has_role(auth.uid(), ''\1'') END)', 'g');
EXECUTE format('ALTER POLICY %I ON %I.%I %s %s',p.policyname,p.schemaname,p.tablename,CASE WHEN q IS NOT NULL THEN 'USING ('||q||')' ELSE '' END,CASE WHEN c IS NOT NULL THEN 'WITH CHECK ('||c||')' ELSE '' END);
END LOOP;
IF has_function_privilege('anon','public.get_password_reset_status(text)','execute') OR has_function_privilege('authenticated','public.get_password_reset_status(text)','execute') THEN RAISE EXCEPTION 'Reset lookup must be server-only'; END IF;
IF has_table_privilege('authenticated','public.lesson_quiz_responses','insert') THEN RAISE EXCEPTION 'Client scoring must be disabled'; END IF;
IF NOT has_function_privilege('authenticated','public.has_role(uuid,text)','execute') THEN RAISE EXCEPTION 'Authorization role check must remain callable'; END IF;
IF has_table_privilege('anon','public.user_leaderboard_entries','select') THEN RAISE EXCEPTION 'Private leaderboard must not be publicly readable'; END IF;
END $migration$;
COMMIT;