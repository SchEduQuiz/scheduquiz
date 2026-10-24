ALTER TABLE public.lesson_questions ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.lesson_questions ADD COLUMN IF NOT EXISTS options jsonb;
ALTER TABLE public.lesson_questions ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.lesson_questions ALTER COLUMN quiz_id DROP NOT NULL;
ALTER TABLE public.lesson_questions DROP CONSTRAINT IF EXISTS lesson_questions_question_type_check;
ALTER TABLE public.lesson_questions ADD CONSTRAINT lesson_questions_question_type_check CHECK (replace(question_type::text,'_','-') = ANY (ARRAY['multiple-choice','true-false','short-answer','fill-blank']));
CREATE INDEX IF NOT EXISTS idx_lesson_questions_lesson_order ON public.lesson_questions(lesson_id, order_index);
DROP POLICY IF EXISTS "Teachers manage lesson questions for their quizzes" ON public.lesson_questions;
DROP POLICY IF EXISTS "Users view lesson questions for accessible quizzes" ON public.lesson_questions;
CREATE POLICY "Teachers manage lesson questions" ON public.lesson_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=lesson_questions.lesson_id AND c.teacher_id=auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=lesson_questions.lesson_id AND c.teacher_id=auth.uid()));
CREATE POLICY "Enrolled students view lesson questions" ON public.lesson_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM lessons l JOIN enrollments e ON e.course_id=l.course_id WHERE l.id=lesson_questions.lesson_id AND e.student_id=auth.uid()));