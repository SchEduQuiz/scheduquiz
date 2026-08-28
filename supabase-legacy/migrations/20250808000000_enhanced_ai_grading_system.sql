-- Migration: Enhanced AI Grading System
-- Purpose: Link assignments to lessons, add AI grading with rubrics, and pre-submit feedback

-- Note: Base assignments table created in migration 20250808000001
-- Enhanced assignments table with lesson linking and AI features
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS enable_ai_pre_check BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_rubric_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS submission_type_enhanced TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS word_limit_min INTEGER,
ADD COLUMN IF NOT EXISTS word_limit_max INTEGER,
ADD COLUMN IF NOT EXISTS ai_feedback_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS grading_approach TEXT DEFAULT 'manual', -- manual, ai_assisted, fully_ai
ADD COLUMN IF NOT EXISTS ai_model_config JSONB DEFAULT '{}';

-- AI Grading Results table
CREATE TABLE IF NOT EXISTS ai_grading_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  
  -- Overall AI assessment
  ai_overall_score NUMERIC(5,2),
  ai_total_possible NUMERIC(5,2) DEFAULT 100.00,
  ai_confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  ai_processing_time_ms INTEGER,
  
  -- Detailed rubric scores
  content_score NUMERIC(5,2),
  content_feedback TEXT,
  content_evidence JSONB, -- Evidence from lesson content
  
  grammar_score NUMERIC(5,2),
  grammar_feedback TEXT,
  grammar_issues JSONB, -- Specific grammar issues found
  
  coherence_score NUMERIC(5,2), 
  coherence_feedback TEXT,
  coherence_analysis JSONB, -- Structure and flow analysis
  
  relevance_score NUMERIC(5,2),
  relevance_feedback TEXT,
  relevance_alignment JSONB, -- How well it aligns with lesson content
  
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
  key_concepts JSONB, -- Extracted key concepts
  learning_objectives JSONB, -- Identified learning objectives
  content_summary TEXT,
  difficulty_level TEXT,
  subject_area TEXT,
  
  -- AI processing metadata
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_model TEXT,
  content_hash TEXT, -- To avoid reprocessing same content
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
  score_adjustments JSONB, -- Track what was changed
  
  -- Interaction tracking
  session_duration_ms INTEGER,
  ai_suggestions_accepted JSONB,
  manual_adjustments JSONB,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update rubric criteria to include AI-specific configurations
ALTER TABLE rubric_criteria
ADD COLUMN IF NOT EXISTS ai_weight_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS ai_evaluation_criteria JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_model_instructions TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_submission ON ai_grading_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_assignment ON ai_grading_results(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_pre_check_student_assignment ON ai_pre_submit_feedback(student_id, assignment_id);
CREATE INDEX IF NOT EXISTS idx_ai_pre_check_draft ON ai_pre_submit_feedback(draft_text);
CREATE INDEX IF NOT EXISTS idx_lesson_content_lesson ON lesson_content_analysis(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_sessions_submission ON ai_grading_sessions(submission_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_ai_weight ON rubric_criteria(ai_weight_percentage);

-- Enable RLS on new tables
ALTER TABLE ai_grading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_pre_submit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_grading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI Grading Results
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
      SELECT 1 FROM assignments 
      WHERE id = ai_grading_results.assignment_id 
      AND teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage AI grading results" ON ai_grading_results
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE id = ai_grading_results.assignment_id 
      AND teacher_id = auth.uid()
    )
  );

-- RLS Policies for Pre-submit Feedback
CREATE POLICY "Students manage own pre-submit feedback" ON ai_pre_submit_feedback
  FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers view pre-submit feedback for their assignments" ON ai_pre_submit_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments 
      WHERE id = ai_pre_submit_feedback.assignment_id 
      AND teacher_id = auth.uid()
    )
  );

-- RLS Policies for Lesson Content Analysis
CREATE POLICY "Teachers view lesson content analysis for their lessons" ON lesson_content_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = lesson_content_analysis.lesson_id 
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage lesson content analysis" ON lesson_content_analysis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = lesson_content_analysis.lesson_id 
      AND c.teacher_id = auth.uid()
    )
  );

-- RLS Policies for AI Grading Sessions
CREATE POLICY "Teachers manage their grading sessions" ON ai_grading_sessions
  FOR ALL USING (teacher_id = auth.uid());

-- Default AI Rubric Configuration Function
CREATE OR REPLACE FUNCTION create_default_ai_rubric(assignment_id UUID)
RETURNS JSONB AS $$
DECLARE
  default_rubric JSONB;
BEGIN
  default_rubric := '{
    "content": {
      "weight": 20,
      "max_points": 20,
      "ai_evaluation_criteria": {
        "addresses_prompt": "Does the response directly address the assignment prompt?",
        "demonstrates_understanding": "Shows clear understanding of lesson concepts?",
        "includes_relevant_examples": "Provides appropriate examples from lesson content?",
        "depth_of_analysis": "Goes beyond surface-level understanding?"
      },
      "ai_model_instructions": "Evaluate content quality based on lesson learning objectives. Look for evidence of understanding key concepts, proper use of lesson-specific terminology, and inclusion of relevant examples or applications from the lesson material."
    },
    "grammar": {
      "weight": 30,
      "max_points": 30,
      "ai_evaluation_criteria": {
        "sentence_structure": "Proper sentence construction and variety?",
        "grammar_accuracy": "Correct grammar, punctuation, and spelling?",
        "mechanical_errors": "Minimal mechanical errors?",
        "writing_clarity": "Clear and understandable writing?"
      },
      "ai_model_instructions": "Assess mechanical writing quality including grammar, punctuation, spelling, and sentence structure. Look for patterns of errors and overall readability."
    },
    "coherence": {
      "weight": 30,
      "max_points": 30,
      "ai_evaluation_criteria": {
        "logical_flow": "Ideas flow logically from one to the next?",
        "paragraph_organization": "Well-organized paragraphs with clear topics?",
        "transitions": "Smooth transitions between ideas?",
        "overall_structure": "Clear beginning, middle, and end?"
      },
      "ai_model_instructions": "Evaluate organizational structure, logical flow of ideas, paragraphing, and transitions. Assess how well the piece holds together as a cohesive whole."
    },
    "relevance": {
      "weight": 20,
      "max_points": 20,
      "ai_evaluation_criteria": {
        "lesson_alignment": "Addresses content taught in the associated lesson?",
        "prompt_adherence": "Stays focused on the assignment question/task?",
        "appropriate_depth": "Appropriate level of detail for the topic?",
        "on_topic": "Remains on topic throughout?"
      },
      "ai_model_instructions": "Compare response against lesson content and assignment requirements. Check for relevance to learning objectives and assignment prompt. Ensure content aligns with lesson material."
    }
  }'::jsonb;
  
  RETURN default_rubric;
END;
$$ LANGUAGE plpgsql;

-- Function to process lesson content for AI analysis
CREATE OR REPLACE FUNCTION process_lesson_content(lesson_uuid UUID)
RETURNS UUID AS $$
DECLARE
  content_hash TEXT;
  existing_analysis_id UUID;
  key_concepts_data JSONB;
  learning_objectives_data JSONB;
BEGIN
  -- Check if we already have processed this content
  SELECT id INTO existing_analysis_id
  FROM lesson_content_analysis
  WHERE lesson_id = lesson_uuid
  ORDER BY processed_at DESC
  LIMIT 1;
  
  IF existing_analysis_id IS NOT NULL THEN
    RETURN existing_analysis_id;
  END IF;
  
  -- For now, create a placeholder analysis
  -- In production, this would integrate with actual AI content analysis
  key_concepts_data := '[]'::jsonb;
  learning_objectives_data := '[]'::jsonb;
  
  INSERT INTO lesson_content_analysis (
    lesson_id,
    key_concepts,
    learning_objectives,
    content_summary,
    difficulty_level,
    subject_area
  ) VALUES (
    lesson_uuid,
    key_concepts_data,
    learning_objectives_data,
    'Content to be processed by AI analysis service',
    'medium',
    'general'
  ) RETURNING id INTO existing_analysis_id;
  
  RETURN existing_analysis_id;
END;
$$ LANGUAGE plpgsql;