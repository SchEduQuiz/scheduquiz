BEGIN;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reset_data(), public.generate_temporary_password(), public.get_password_reset_status(text), public.log_password_reset_action(uuid,uuid,uuid,text,text,jsonb,inet,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reset_data(), public.generate_temporary_password(), public.get_password_reset_status(text), public.log_password_reset_action(uuid,uuid,uuid,text,text,jsonb,inet,text) TO service_role;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) AND (_user_id = auth.uid() OR auth.role() = 'service_role') $$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,text) TO authenticated, service_role;
-- Replace compatibility profile role checks without altering course/ownership predicates.
DO $migration$ DECLARE p record; q text; c text; BEGIN
FOR p IN SELECT schemaname,tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' LOOP
q := regexp_replace(p.qual, 'EXISTS \( SELECT 1\s+FROM profiles\s+WHERE \(\(profiles.id = auth.uid\(\)\) AND \(profiles.role = ''([^'']+)''::text\)\)\)', 'public.has_role(auth.uid(), ''\1'')', 'g');
c := regexp_replace(p.with_check, 'EXISTS \( SELECT 1\s+FROM profiles\s+WHERE \(\(profiles.id = auth.uid\(\)\) AND \(profiles.role = ''([^'']+)''::text\)\)\)', 'public.has_role(auth.uid(), ''\1'')', 'g');
q := replace(q, 'EXISTS ( SELECT 1' || chr(10) || '   FROM profiles' || chr(10) || '  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY[''teacher''::text, ''admin''::text]))))', '(public.has_role(auth.uid(), ''teacher'') OR public.has_role(auth.uid(), ''admin''))');
c := replace(c, 'EXISTS ( SELECT 1' || chr(10) || '   FROM profiles' || chr(10) || '  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY[''teacher''::text, ''admin''::text]))))', '(public.has_role(auth.uid(), ''teacher'') OR public.has_role(auth.uid(), ''admin''))');
IF q IS DISTINCT FROM p.qual OR c IS DISTINCT FROM p.with_check THEN EXECUTE format('ALTER POLICY %I ON %I.%I %s %s',p.policyname,p.schemaname,p.tablename,CASE WHEN q IS NOT NULL THEN 'USING ('||q||')' ELSE '' END, CASE WHEN c IS NOT NULL THEN 'WITH CHECK ('||c||')' ELSE '' END); END IF;
END LOOP; END $migration$;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile or admins read profiles" ON public.profiles;
CREATE POLICY "Users read own profile or admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "System can insert quiz responses" ON public.lesson_quiz_responses;
REVOKE INSERT, UPDATE, DELETE ON public.lesson_quiz_responses FROM anon, authenticated;
GRANT SELECT ON public.lesson_quiz_responses TO authenticated;
GRANT ALL ON public.lesson_quiz_responses TO service_role;
DROP POLICY IF EXISTS "Anyone can submit password reset requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Submit pending password reset request" ON public.password_reset_requests;
CREATE POLICY "Submit pending password reset request" ON public.password_reset_requests FOR INSERT TO anon, authenticated WITH CHECK (
status='pending' AND user_id IS NULL AND admin_id IS NULL AND admin_notes IS NULL AND approved_at IS NULL AND rejected_at IS NULL AND temp_password IS NULL AND temp_password_expires_at IS NULL AND temp_password_used=false AND temp_password_used_at IS NULL
AND char_length(user_email) BETWEEN 3 AND 254 AND user_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
AND (reason IS NULL OR char_length(reason)<=2000) AND (request_details IS NULL OR octet_length(request_details::text)<=8192)
AND created_at >= now() - interval '5 minutes' AND created_at <= now() + interval '1 minute' AND updated_at >= now() - interval '5 minutes' AND updated_at <= now() + interval '1 minute');
DROP POLICY IF EXISTS "Everyone can view leaderboards" ON public.user_leaderboard_entries;
DROP POLICY IF EXISTS "Users manage own leaderboard entry" ON public.user_leaderboard_entries;
DROP POLICY IF EXISTS "Users view own leaderboard entry" ON public.user_leaderboard_entries;
CREATE POLICY "Users view own leaderboard entry" ON public.user_leaderboard_entries FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.user_leaderboard_entries FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.user_leaderboard_entries FROM authenticated;
GRANT SELECT ON public.user_leaderboard_entries TO authenticated;
GRANT ALL ON public.user_leaderboard_entries TO service_role;
ALTER POLICY "All users view learning achievements" ON public.learning_achievements TO authenticated USING(auth.uid() IS NOT NULL);
ALTER POLICY "All users view achievements" ON public.achievements TO authenticated USING(auth.uid() IS NOT NULL);
REVOKE ALL ON public.learning_achievements,public.achievements FROM anon;
GRANT SELECT ON public.learning_achievements,public.achievements TO authenticated;
GRANT ALL ON public.learning_achievements,public.achievements TO service_role;
REVOKE ALL ON public.challenge_questions,public.challenge_hint_uses FROM anon,authenticated;
GRANT ALL ON public.challenge_questions,public.challenge_hint_uses TO service_role;
DROP POLICY IF EXISTS "Server manages challenge questions" ON public.challenge_questions;
CREATE POLICY "Server manages challenge questions" ON public.challenge_questions TO service_role USING(true) WITH CHECK(true);
DROP POLICY IF EXISTS "Server manages challenge hint uses" ON public.challenge_hint_uses;
CREATE POLICY "Server manages challenge hint uses" ON public.challenge_hint_uses TO service_role USING(true) WITH CHECK(true);
COMMIT;