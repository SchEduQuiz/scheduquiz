-- Migration: 999_final_rls_policies
-- Created: Consolidated all RLS policies
-- Purpose: Complete Row Level Security setup for all tables

-- Enable RLS on all core tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for courses
CREATE POLICY "Published courses viewable by everyone" ON courses
  FOR SELECT USING (is_published = true OR teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Teachers can insert their own courses" ON courses
  FOR INSERT WITH CHECK (
    auth.uid() = teacher_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Teachers can update their own courses" ON courses
  FOR UPDATE USING (
    teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can delete their own courses" ON courses
  FOR DELETE USING (
    teacher_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for lessons
CREATE POLICY "Lessons viewable for published courses or by course owner" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lessons.course_id 
      AND (courses.is_published = true OR courses.teacher_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can insert lessons for their courses" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lessons.course_id 
      AND (courses.teacher_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Teachers can update lessons for their courses" ON lessons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lessons.course_id 
      AND (courses.teacher_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Teachers can delete lessons for their courses" ON lessons
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lessons.course_id 
      AND (courses.teacher_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- RLS Policies for enrollments
CREATE POLICY "Users can view their own enrollments" ON enrollments
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can enroll in courses" ON enrollments
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

CREATE POLICY "Students can unenroll from courses" ON enrollments
  FOR DELETE USING (student_id = auth.uid());

-- RLS Policies for lesson progress
CREATE POLICY "Users can view their own progress" ON lesson_progress
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = lesson_progress.course_id 
      AND courses.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Students can insert their own progress" ON lesson_progress
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own progress" ON lesson_progress
  FOR UPDATE USING (student_id = auth.uid());

-- RLS Policies for questions
CREATE POLICY "Questions viewable for accessible quizzes" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND (quizzes.is_published = true OR
           EXISTS (
             SELECT 1 FROM courses 
             WHERE courses.id = quizzes.course_id 
             AND courses.teacher_id = auth.uid()
           ))
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage questions for their quizzes" ON questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes 
      WHERE quizzes.id = questions.quiz_id 
      AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = quizzes.course_id 
        AND courses.teacher_id = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for quizzes
CREATE POLICY "Quizzes viewable for accessible courses" ON quizzes
  FOR SELECT USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = quizzes.course_id 
      AND (courses.teacher_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM enrollments 
             WHERE enrollments.course_id = courses.id 
             AND enrollments.student_id = auth.uid()
           ))
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can manage their quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = quizzes.course_id 
      AND courses.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for quiz_scores
CREATE POLICY "Users view own quiz scores" ON quiz_scores
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own quiz scores" ON quiz_scores
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for user_quiz_responses
CREATE POLICY "Users view own quiz responses" ON user_quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_scores 
      WHERE quiz_scores.id = user_quiz_responses.score_id 
      AND quiz_scores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users manage own quiz responses" ON user_quiz_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quiz_scores 
      WHERE quiz_scores.id = user_quiz_responses.score_id 
      AND quiz_scores.user_id = auth.uid()
    )
  );

-- RLS Policies for quiz_attempts
CREATE POLICY "Users manage own quiz attempts" ON quiz_attempts
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for question_hints
CREATE POLICY "Users view own question hints" ON question_hints
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own question hints" ON question_hints
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for quiz_achievements
CREATE POLICY "Users view own quiz achievements" ON quiz_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own quiz achievements" ON quiz_achievements
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for lesson_quizzes
CREATE POLICY "Users view lesson quizzes for their courses" ON lesson_quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons 
      JOIN courses ON lessons.course_id = courses.id
      JOIN enrollments ON courses.id = enrollments.course_id
      WHERE lessons.id = lesson_quizzes.lesson_id
      AND (enrollments.student_id = auth.uid() OR courses.teacher_id = auth.uid())
    )
  );

CREATE POLICY "Teachers manage lesson quizzes for their courses" ON lesson_quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons 
      JOIN courses ON lessons.course_id = courses.id
      WHERE lessons.id = lesson_quizzes.lesson_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- RLS Policies for lesson_questions
CREATE POLICY "Users view lesson questions for accessible quizzes" ON lesson_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_quizzes lq
      JOIN lessons ON lq.lesson_id = lessons.id
      JOIN courses ON lessons.course_id = courses.id
      JOIN enrollments ON courses.id = enrollments.course_id
      WHERE lq.id = lesson_questions.quiz_id
      AND (enrollments.student_id = auth.uid() OR courses.teacher_id = auth.uid())
    )
  );

CREATE POLICY "Teachers manage lesson questions for their quizzes" ON lesson_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lesson_quizzes lq
      JOIN lessons ON lq.lesson_id = lessons.id
      JOIN courses ON lessons.course_id = courses.id
      WHERE lq.id = lesson_questions.quiz_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- RLS Policies for lesson_quiz_attempts
CREATE POLICY "Students manage their own lesson quiz attempts" ON lesson_quiz_attempts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Teachers view lesson quiz attempts for their courses" ON lesson_quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lesson_quizzes lq
      JOIN lessons ON lq.lesson_id = lessons.id
      JOIN courses ON lessons.course_id = courses.id
      WHERE lq.id = lesson_quiz_attempts.quiz_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- RLS Policies for lesson_quiz_responses
CREATE POLICY "Users can view responses for their attempts" ON lesson_quiz_responses
  FOR SELECT USING (
    attempt_id IN (
      SELECT id FROM lesson_quiz_attempts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert quiz responses" ON lesson_quiz_responses
  FOR INSERT WITH CHECK (true);

-- Admin policies for quiz-related tables
CREATE POLICY "Admins view all quiz data" ON quiz_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all quiz responses" ON user_quiz_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all quiz attempts" ON quiz_attempts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all quiz hints" ON question_hints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all quiz achievements" ON quiz_achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
