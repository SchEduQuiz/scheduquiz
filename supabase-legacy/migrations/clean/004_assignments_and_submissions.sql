-- Migration: 004_assignments_and_submissions
-- Created: Consolidated from assignment-related migrations
-- Purpose: Assignment and grading system

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  points_possible INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT true,
  submission_type TEXT DEFAULT 'text', -- text, file, both
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_text TEXT,
  file_url TEXT,
  file_name TEXT,
  status TEXT DEFAULT 'submitted', -- draft, submitted, graded, returned
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Grades table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_earned NUMERIC(5,2),
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(submission_id)
);

-- Grade categories (for weighted grading)
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link assignments to grade categories
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES grade_categories(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_assignment ON grades(assignment_id);
CREATE INDEX IF NOT EXISTS idx_grade_categories_course ON grade_categories(course_id);

-- RLS Policies
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;

-- Assignments: Teachers can CRUD their own, students can view published ones
CREATE POLICY "Teachers manage own assignments" ON assignments
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students view course assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = assignments.course_id
    )
  );

-- Submissions: Students manage own, teachers view their course submissions
CREATE POLICY "Students manage own submissions" ON submissions
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers view course submissions" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE assignments.id = submissions.assignment_id 
      AND assignments.teacher_id = auth.uid()
    )
  );

-- Grades: Students view own, teachers manage grades they gave
CREATE POLICY "Students view own grades" ON grades
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers manage grades" ON grades
  FOR ALL USING (teacher_id = auth.uid());

-- Grade categories policies
CREATE POLICY "Users view course grade categories" ON grade_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = grade_categories.course_id
    ) OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = grade_categories.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage grade categories" ON grade_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = grade_categories.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );
