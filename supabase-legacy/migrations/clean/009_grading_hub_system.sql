-- Migration: 009_grading_hub_system
-- Created: Consolidated grading hub functionality
-- Purpose: Advanced grading system with rubrics, AI integration, and comprehensive analytics

-- Grading Rubrics table
CREATE TABLE IF NOT EXISTS grading_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_points NUMERIC DEFAULT 100,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rubric Criteria table
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES grading_rubrics(id) ON DELETE CASCADE,
  criterion_name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points NUMERIC NOT NULL,
  order_index INT DEFAULT 0,
  ai_weight_percentage NUMERIC(5,2) DEFAULT 0.00,
  ai_evaluation_criteria JSONB DEFAULT '{}',
  ai_model_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment Templates table
CREATE TABLE IF NOT EXISTS comment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_content TEXT NOT NULL,
  category VARCHAR(100),
  usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grade History table for audit trail
CREATE TABLE IF NOT EXISTS grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  previous_points NUMERIC,
  new_points NUMERIC,
  previous_feedback TEXT,
  new_feedback TEXT,
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grade Analytics cache table
CREATE TABLE IF NOT EXISTS grade_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  total_submissions INT DEFAULT 0,
  graded_count INT DEFAULT 0,
  pending_count INT DEFAULT 0,
  average_score NUMERIC,
  median_score NUMERIC,
  highest_score NUMERIC,
  lowest_score NUMERIC,
  grade_distribution JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- AI Grading Results table
CREATE TABLE IF NOT EXISTS ai_grading_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  
  -- Overall AI assessment
  ai_overall_score NUMERIC(5,2),
  ai_total_possible NUMERIC(5,2) DEFAULT 100.00,
  ai_confidence_score NUMERIC(3,2),
  ai_processing_time_ms INTEGER,
  
  -- Detailed rubric scores
  content_score NUMERIC(5,2),
  content_feedback TEXT,
  content_evidence JSONB,
  
  grammar_score NUMERIC(5,2),
  grammar_feedback TEXT,
  grammar_issues JSONB,
  
  coherence_score NUMERIC(5,2), 
  coherence_feedback TEXT,
  coherence_analysis JSONB,
  
  relevance_score NUMERIC(5,2),
  relevance_feedback TEXT,
  relevance_alignment JSONB,
  
  -- AI-generated feedback and suggestions
  ai_summary_feedback TEXT,
  ai_specific_suggestions JSONB,
  ai_improvement_areas JSONB,
  
  -- Processing metadata
  ai_model_version TEXT,
  processing_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Teacher final approval
  teacher_approved BOOLEAN DEFAULT false,
  teacher_adjusted BOOLEAN DEFAULT false,
  final_score NUMERIC(5,2),
  teacher_notes TEXT
);

-- Pre-submit AI Feedback table
CREATE TABLE IF NOT EXISTS ai_pre_submit_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  
  -- Student input
  draft_text TEXT NOT NULL,
  word_count INTEGER,
  
  -- AI feedback
  pre_check_score NUMERIC(5,2),
  pre_check_feedback JSONB,
  improvement_suggestions JSONB,
  
  -- Timestamps
  feedback_generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson-AI Content Alignment table
CREATE TABLE IF NOT EXISTS lesson_content_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Processed lesson content
  key_concepts JSONB,
  learning_objectives JSONB,
  content_summary TEXT,
  difficulty_level TEXT,
  subject_area TEXT,
  
  -- AI processing metadata
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_model TEXT,
  content_hash TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Grading Sessions (for tracking teacher interaction)
CREATE TABLE IF NOT EXISTS ai_grading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Session data
  initial_ai_score NUMERIC(5,2),
  final_approved_score NUMERIC(5,2),
  score_adjustments JSONB,
  
  -- Interaction tracking
  session_duration_ms INTEGER,
  ai_suggestions_accepted JSONB,
  manual_adjustments JSONB,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_teacher ON grading_rubrics(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_course ON grading_rubrics(course_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_ai_weight ON rubric_criteria(ai_weight_percentage);
CREATE INDEX IF NOT EXISTS idx_comment_templates_teacher ON comment_templates(teacher_id);
CREATE INDEX IF NOT EXISTS idx_grade_history_grade ON grade_history(grade_id);
CREATE INDEX IF NOT EXISTS idx_grade_analytics_course ON grade_analytics(course_id);
CREATE INDEX IF NOT EXISTS idx_grade_analytics_assignment ON grade_analytics(assignment_id);

CREATE INDEX IF NOT EXISTS idx_ai_grading_submission ON ai_grading_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_assignment ON ai_grading_results(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_pre_check_student_assignment ON ai_pre_submit_feedback(student_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_pre_check_draft ON ai_pre_submit_feedback(draft_text);
CREATE INDEX IF NOT EXISTS idx_lesson_content_lesson ON lesson_content_analysis(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_sessions_submission ON ai_grading_sessions(submission_id);

-- Enable RLS on all new tables
ALTER TABLE grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_grading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pre_submit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_grading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grading rubrics
CREATE POLICY "Teachers manage own rubrics" ON grading_rubrics
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "Students view rubrics for their courses" ON grading_rubrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = auth.uid()
      AND c.id = grading_rubrics.course_id
    )
  );

-- RLS Policies for rubric criteria
CREATE POLICY "Teachers manage rubric criteria" ON rubric_criteria
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM grading_rubrics 
      WHERE id = rubric_criteria.rubric_id 
      AND teacher_id = auth.uid()
    )
  );

-- RLS Policies for comment templates
CREATE POLICY "Teachers manage own templates" ON comment_templates
  FOR ALL USING (teacher_id = auth.uid());

-- RLS Policies for grade history
CREATE POLICY "Teachers view grade history" ON grade_history
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Teachers insert grade history" ON grade_history
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students view own grade history" ON grade_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM grades 
      WHERE id = grade_history.grade_id 
      AND student_id = auth.uid()
    )
  );

-- RLS Policies for grade analytics
CREATE POLICY "Teachers view course analytics" ON grade_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE id = grade_analytics.course_id 
      AND teacher_id = auth.uid()
    )
  );

-- RLS Policies for AI grading results
CREATE POLICY "Students view own AI grading results" ON ai_grading_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions 
      WHERE id = ai_grading_results.submission_id 
      AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers view AI grading for their assignments" ON ai_grading_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = ai_grading_results.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage AI grading results" ON ai_grading_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = ai_grading_results.assignment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for pre-submit feedback
CREATE POLICY "Students view own pre-submit feedback" ON ai_pre_submit_feedback
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students create own pre-submit feedback" ON ai_pre_submit_feedback
  FOR INSERT WITH CHECK (student_id = auth.uid());

-- RLS Policies for lesson content analysis
CREATE POLICY "Teachers view lesson content analysis" ON lesson_content_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = lesson_content_analysis.lesson_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students view content analysis for enrolled courses" ON lesson_content_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      JOIN enrollments e ON e.course_id = c.id
      WHERE l.id = lesson_content_analysis.lesson_id
      AND e.student_id = auth.uid()
    )
  );

-- RLS Policies for AI grading sessions
CREATE POLICY "Teachers view own grading sessions" ON ai_grading_sessions
  FOR ALL USING (teacher_id = auth.uid());

-- Comments
COMMENT ON TABLE grading_rubrics IS 'Grading rubrics created by teachers for consistent evaluation';
COMMENT ON TABLE rubric_criteria IS 'Individual criteria within a grading rubric with optional AI configuration';
COMMENT ON TABLE comment_templates IS 'Reusable comment templates for grading feedback';
COMMENT ON TABLE grade_history IS 'Audit trail for all grade changes';
COMMENT ON TABLE grade_analytics IS 'Pre-computed analytics for assignment performance';
COMMENT ON TABLE ai_grading_results IS 'AI-generated grading results for submissions';
COMMENT ON TABLE ai_pre_submit_feedback IS 'AI feedback provided before final submission';
COMMENT ON TABLE lesson_content_analysis IS 'AI-processed lesson content for grading alignment';
COMMENT ON TABLE ai_grading_sessions IS 'Teacher interaction tracking with AI grading results';