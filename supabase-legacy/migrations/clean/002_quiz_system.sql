-- Migration: 002_quiz_system
-- Created: Consolidated from multiple quiz system migrations
-- Purpose: Complete quiz system with lesson integration

-- Quiz scores table (for traditional quizzes)
CREATE TABLE IF NOT EXISTS quiz_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0.00,
  time_taken INTEGER DEFAULT 0, -- in seconds
  correct_answers INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  hint_penalty INTEGER DEFAULT 0,
  time_bonus INTEGER DEFAULT 0,
  game_mode VARCHAR(50) DEFAULT 'practice',
  category TEXT,
  is_completed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User quiz responses table
CREATE TABLE IF NOT EXISTS user_quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID NOT NULL REFERENCES quiz_scores(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_answer VARCHAR(10) NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  response_time INTEGER DEFAULT 0, -- in milliseconds
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz attempts tracking
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
  current_question INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 15,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  hints_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quiz_id, status) 
);

-- Question hints tracking
CREATE TABLE IF NOT EXISTS question_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  hint_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, question_id, quiz_attempt_id)
);

-- Achievement badges for quiz performance
CREATE TABLE IF NOT EXISTS quiz_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL, -- perfect_score, fast_responder, no_hints_used, etc.
  achievement_data JSONB, -- additional data about the achievement
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create lesson_quizzes table (lesson-based quizzes)
CREATE TABLE lesson_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    
    -- Quiz configuration
    time_limit INTEGER, -- Overall quiz time limit in seconds
    allow_retry BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    passing_score INTEGER DEFAULT 70, -- Percentage required to pass
    
    -- Lesson integration settings
    is_required BOOLEAN DEFAULT false, -- Must pass before next lesson
    is_active BOOLEAN DEFAULT true,
    
    -- Auto-generation settings
    auto_generated BOOLEAN DEFAULT false,
    generation_settings JSONB, -- Stores generation configuration
    
    -- Analytics
    attempt_count INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    pass_rate DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lesson_questions table
CREATE TABLE lesson_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES lesson_quizzes(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- Question content
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('multiple-choice', 'true-false', 'short-answer', 'fill-blank')),
    
    -- Options (for multiple choice and true-false)
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    
    -- Answer handling
    correct_answer TEXT NOT NULL,
    correct_answers TEXT[], -- For multiple correct answers (fill-blank)
    
    -- Additional fields
    explanation TEXT,
    hint TEXT,
    points INTEGER DEFAULT 10,
    time_limit INTEGER DEFAULT 30, -- Per question time limit
    
    -- Content reference
    content_reference TEXT, -- Which part of lesson content this question relates to
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lesson_quiz_attempts table
CREATE TABLE lesson_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES lesson_quizzes(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    
    -- Attempt data
    attempt_number INTEGER NOT NULL DEFAULT 1,
    answers JSONB NOT NULL, -- Stores all answers as key-value pairs
    score DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- Timing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0, -- Total time in seconds
    
    -- Results
    passed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Monitoring (anti-cheat)
    focus_lost_count INTEGER DEFAULT 0,
    tab_switches INTEGER DEFAULT 0,
    
    -- Metadata
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lesson_quiz_responses table
CREATE TABLE lesson_quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES lesson_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
    
    -- Response data
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT false,
    points_earned INTEGER DEFAULT 0,
    response_time INTEGER DEFAULT 0, -- Time spent on this question in seconds
    
    -- Additional tracking
    used_hint BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_scores_user ON quiz_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_quiz ON quiz_scores(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_category ON quiz_scores(category);
CREATE INDEX IF NOT EXISTS idx_user_responses_score ON user_quiz_responses(score_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX IF NOT EXISTS idx_question_hints_user ON question_hints(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_achievements_user ON quiz_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_lesson_id ON lesson_quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quizzes_course_id ON lesson_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_questions_quiz_id ON lesson_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_quiz_id ON lesson_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_user_id ON lesson_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_attempts_lesson_id ON lesson_quiz_attempts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_quiz_responses_attempt_id ON lesson_quiz_responses(attempt_id);

-- Create function to update quiz analytics
CREATE OR REPLACE FUNCTION update_quiz_analytics(quiz_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE lesson_quizzes 
    SET 
        attempt_count = (
            SELECT COUNT(*) 
            FROM lesson_quiz_attempts 
            WHERE quiz_id = quiz_uuid
        ),
        average_score = (
            SELECT COALESCE(AVG(percentage), 0)
            FROM lesson_quiz_attempts 
            WHERE quiz_id = quiz_uuid
        ),
        pass_rate = (
            SELECT COALESCE(
                (COUNT(CASE WHEN passed THEN 1 END)::decimal / COUNT(*)) * 100, 
                0
            )
            FROM lesson_quiz_attempts 
            WHERE quiz_id = quiz_uuid
        ),
        updated_at = NOW()
    WHERE id = quiz_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle quiz attempt completion
CREATE OR REPLACE FUNCTION complete_quiz_attempt()
RETURNS TRIGGER AS $$
DECLARE
    quiz_uuid UUID;
    lesson_uuid UUID;
    user_uuid UUID;
    passed_score INTEGER;
BEGIN
    -- Get quiz details
    SELECT lq.id, lq.lesson_id, lq.passing_score, lq.is_required
    INTO quiz_uuid, lesson_uuid, passed_score, NEW.is_required
    FROM lesson_quizzes lq
    WHERE lq.id = NEW.quiz_id;
    
    -- Update attempt with completion data
    NEW.completed_at = NOW();
    NEW.end_time = NOW();
    NEW.time_spent = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INTEGER;
    
    -- Determine if passed
    NEW.passed = (NEW.percentage >= passed_score);
    
    -- Update lesson progress
    INSERT INTO lesson_progress (student_id, lesson_id, course_id, quiz_completed, quiz_passed, quiz_score, quiz_attempts, last_quiz_attempt_at)
    VALUES (NEW.user_id, lesson_uuid, 
            (SELECT course_id FROM lessons WHERE id = lesson_uuid),
            true, NEW.passed, NEW.percentage, 1, NOW())
    ON CONFLICT (student_id, lesson_id) 
    DO UPDATE SET 
        quiz_completed = true,
        quiz_passed = NEW.passed,
        quiz_score = NEW.percentage,
        quiz_attempts = lesson_progress.quiz_attempts + 1,
        last_quiz_attempt_at = NOW();
    
    -- Update quiz analytics
    PERFORM update_quiz_analytics(quiz_uuid);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quiz attempt completion
CREATE TRIGGER trigger_complete_quiz_attempt
    AFTER UPDATE ON lesson_quiz_attempts
    FOR EACH ROW
    WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION complete_quiz_attempt();
