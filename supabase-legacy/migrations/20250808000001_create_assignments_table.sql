-- Migration: Create Assignments Table
-- Purpose: Create the base assignments table before AI enhancements

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic assignment information
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Assignment settings
  due_date TIMESTAMPTZ,
  max_points NUMERIC(10,2) DEFAULT 100.00,
  weight NUMERIC(5,2) DEFAULT 1.00,
  
  -- Submission settings
  submission_type TEXT DEFAULT 'text', -- 'text', 'file', 'both'
  allow_late_submissions BOOLEAN DEFAULT true,
  late_penalty_percentage NUMERIC(5,2) DEFAULT 0.00,
  
  -- File settings
  max_file_size_mb INTEGER DEFAULT 10,
  allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'],
  
  -- Status and metadata
  status TEXT DEFAULT 'active', -- 'active', 'draft', 'archived'
  is_published BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Submission content
  text_content TEXT,
  file_urls TEXT[],
  
  -- Submission metadata
  submitted_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,
  attempt_number INTEGER DEFAULT 1,
  
  -- Status
  status TEXT DEFAULT 'submitted', -- 'draft', 'submitted', 'graded', 'returned'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Grade information
  total_score NUMERIC(10,2),
  max_score NUMERIC(10,2) NOT NULL,
  percentage NUMERIC(5,2),
  
  -- Grade details
  letter_grade VARCHAR(5),
  feedback TEXT,
  private_notes TEXT,
  
  -- Grade metadata
  is_final BOOLEAN DEFAULT false,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create grade_categories table for weighted grading
CREATE TABLE IF NOT EXISTS grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  category_name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points NUMERIC(10,2) NOT NULL,
  weight NUMERIC(5,2) NOT NULL, -- Percentage weight
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_course_id ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_submission_id ON grades(submission_id);
CREATE INDEX IF NOT EXISTS idx_grade_categories_assignment_id ON grade_categories(assignment_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at 
    BEFORE UPDATE ON submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grades_updated_at ON grades;
CREATE TRIGGER update_grades_updated_at 
    BEFORE UPDATE ON grades 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;

-- Assignments policies
CREATE POLICY "Teachers can view their own assignments" ON assignments
    FOR SELECT USING (teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Teachers can create assignments" ON assignments
    FOR INSERT WITH CHECK (teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Teachers can update their own assignments" ON assignments
    FOR UPDATE USING (teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Teachers can delete their own assignments" ON assignments
    FOR DELETE USING (teacher_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Students can view published assignments" ON assignments
    FOR SELECT USING (is_published = true AND EXISTS (
        SELECT 1 FROM enrollments e
        JOIN profiles p ON e.student_id = p.id
        WHERE p.id = auth.uid() AND e.course_id = assignments.course_id
    ));

-- Submissions policies
CREATE POLICY "Students can view their own submissions" ON submissions
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create their own submissions" ON submissions
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own submissions" ON submissions
    FOR UPDATE USING (student_id = auth.uid() AND status = 'draft');

CREATE POLICY "Teachers can view submissions for their assignments" ON submissions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
    ));

CREATE POLICY "Teachers can update submissions for their assignments" ON submissions
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
    ));

-- Grades policies
CREATE POLICY "Students can view their own grades" ON grades
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.id = grades.submission_id AND s.student_id = auth.uid()
    ));

CREATE POLICY "Teachers can view grades for their assignments" ON grades
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = grades.assignment_id AND a.teacher_id = auth.uid()
    ));

CREATE POLICY "Teachers can create grades" ON grades
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = grades.assignment_id AND a.teacher_id = auth.uid()
    ));

CREATE POLICY "Teachers can update grades for their assignments" ON grades
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = grades.assignment_id AND a.teacher_id = auth.uid()
    ));

-- Grade categories policies
CREATE POLICY "Teachers can manage grade categories for their assignments" ON grade_categories
    FOR ALL USING (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = grade_categories.assignment_id AND a.teacher_id = auth.uid()
    ));

CREATE POLICY "Students can view grade categories" ON grade_categories
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM assignments a
        WHERE a.id = grade_categories.assignment_id AND a.is_published = true
    ));