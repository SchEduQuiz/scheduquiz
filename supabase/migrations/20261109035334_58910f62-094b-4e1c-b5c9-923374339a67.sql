ALTER TABLE public.challenge_attempts ADD COLUMN IF NOT EXISTS result jsonb;
CREATE OR REPLACE FUNCTION public.finalize_challenge_attempt(p_attempt_id uuid, p_user_id uuid, p_quiz_id bigint, p_responses jsonb, p_result jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path = public AS $$
DECLARE a public.challenge_attempts%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.challenge_attempts WHERE id=p_attempt_id AND user_id=p_user_id AND quiz_id=p_quiz_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quiz attempt not found'; END IF;
  IF a.status='completed' THEN
    IF a.result IS NULL THEN RAISE EXCEPTION 'Saved result is unavailable; no scores were changed'; END IF;
    RETURN a.result;
  END IF;
  IF a.status <> 'in_progress' THEN RAISE EXCEPTION 'Quiz attempt is not active'; END IF;
  IF jsonb_typeof(p_responses) <> 'array' OR jsonb_array_length(p_responses) <> cardinality(a.question_ids) THEN RAISE EXCEPTION 'Incomplete quiz responses'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_responses) AS r(question_id bigint) WHERE NOT (r.question_id=ANY(a.question_ids))) OR (SELECT count(DISTINCT r.question_id) FROM jsonb_to_recordset(p_responses) AS r(question_id bigint)) <> cardinality(a.question_ids) THEN RAISE EXCEPTION 'Invalid quiz responses'; END IF;
  INSERT INTO public.challenge_responses (attempt_id, question_id, user_id, user_answer, correct_answer, is_correct, base_points, time_bonus, points_earned, response_time, used_hint)
  SELECT a.id,r.question_id,a.user_id,r.user_answer,r.correct_answer,r.is_correct,r.base_points,r.time_bonus,r.points_earned,r.response_time,r.used_hint
  FROM jsonb_to_recordset(p_responses) AS r(question_id bigint,user_answer text,correct_answer text,is_correct boolean,base_points integer,time_bonus integer,points_earned integer,response_time integer,used_hint boolean)
  ON CONFLICT (attempt_id,question_id) DO UPDATE SET user_answer=EXCLUDED.user_answer,correct_answer=EXCLUDED.correct_answer,is_correct=EXCLUDED.is_correct,base_points=EXCLUDED.base_points,time_bonus=EXCLUDED.time_bonus,points_earned=EXCLUDED.points_earned,response_time=EXCLUDED.response_time,used_hint=EXCLUDED.used_hint;
  UPDATE public.challenge_attempts SET status='completed',score=(p_result->>'final_score')::integer,max_score=(p_result->>'max_possible_score')::integer,percentage=(p_result->>'percentage')::numeric,correct_answers=(p_result->>'correct_answers')::integer,total_questions=(p_result->>'total_questions')::integer,hints_used=(p_result->>'hints_used')::integer,hint_penalty=(p_result->>'hint_penalty')::integer,time_bonus=(p_result->>'time_bonus')::integer,time_taken=(p_result->>'time_taken')::integer,submitted_at=now(),result=p_result WHERE id=a.id;
  RETURN p_result;
END; $$;
REVOKE ALL ON FUNCTION public.finalize_challenge_attempt(uuid,uuid,bigint,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_challenge_attempt(uuid,uuid,bigint,jsonb,jsonb) TO service_role;