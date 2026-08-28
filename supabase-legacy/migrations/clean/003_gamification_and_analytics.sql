-- Migration: 003_gamification_and_analytics
-- Created: Consolidated from multiple gamification migrations
-- Purpose: Advanced gamification and analytics features

-- User Points & Achievements System
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  streak_count INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  last_quiz_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Individual Question Response Tracking
CREATE TABLE IF NOT EXISTS quiz_question_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  time_bonus INTEGER DEFAULT 0,
  streak_bonus INTEGER DEFAULT 0,
  difficulty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Leaderboard Entries
CREATE TABLE IF NOT EXISTS user_leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  average_accuracy DECIMAL(5,2) DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  perfect_scores INTEGER DEFAULT 0,
  current_rank INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- User Achievement Records
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  achievement_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  points_awarded INTEGER DEFAULT 0,
  icon TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz Performance Analytics (aggregated data for dashboard)
CREATE TABLE IF NOT EXISTS quiz_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL,
  category TEXT,
  total_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  best_percentage DECIMAL(5,2) DEFAULT 0,
  average_score DECIMAL(10,2) DEFAULT 0,
  average_time INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  improvement_rate DECIMAL(5,2) DEFAULT 0,
  last_attempt_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

-- Learning achievements (badge definitions for course achievements)
CREATE TABLE IF NOT EXISTS learning_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  criteria_type TEXT, -- course_completion, assignment_score, streak, engagement
  criteria_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User learning achievements (earned badges)
CREATE TABLE IF NOT EXISTS user_learning_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES learning_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Achievements table (badge definitions)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  criteria_type TEXT, -- course_completion, assignment_score, streak, engagement
  criteria_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (earned badges)
CREATE TABLE IF NOT EXISTS earned_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_points_user ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_responses_user ON quiz_question_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_responses_quiz ON quiz_question_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_responses_result ON quiz_question_responses(result_id);
CREATE INDEX IF NOT EXISTS idx_user_leaderboard_entries_user ON user_leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_user_leaderboard_entries_rank ON user_leaderboard_entries(current_rank);
CREATE INDEX IF NOT EXISTS idx_user_leaderboard_entries_category ON user_leaderboard_entries(category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_user ON quiz_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_quiz ON quiz_analytics(quiz_id);

CREATE INDEX IF NOT EXISTS idx_user_learning_achievements_user ON user_learning_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_earned_achievements_user ON earned_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_earned_achievements_achievement ON earned_achievements(achievement_id);

-- Enable RLS (Row Level Security)
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE earned_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users view own points" ON user_points
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own points" ON user_points
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for quiz_question_responses
CREATE POLICY "Users view own responses" ON quiz_question_responses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own responses" ON quiz_question_responses
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for user_leaderboard_entries (everyone can view, only own can update)
CREATE POLICY "Everyone can view leaderboards" ON user_leaderboard_entries
  FOR SELECT USING (true);

CREATE POLICY "Users manage own leaderboard entry" ON user_leaderboard_entries
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for user_achievements
CREATE POLICY "Users view own achievements" ON user_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own achievements" ON user_achievements
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for quiz_analytics
CREATE POLICY "Users view own analytics" ON quiz_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users manage own analytics" ON quiz_analytics
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for learning_achievements
CREATE POLICY "All users view learning achievements" ON learning_achievements
  FOR SELECT USING (true);

-- RLS Policies for user_learning_achievements
CREATE POLICY "Users view own earned achievements" ON user_learning_achievements
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for achievements
CREATE POLICY "All users view achievements" ON achievements
  FOR SELECT USING (true);

-- RLS Policies for earned_achievements
CREATE POLICY "Users view own earned badges" ON earned_achievements
  FOR SELECT USING (user_id = auth.uid());

-- Admin policies for all tables
CREATE POLICY "Admins view all user_points" ON user_points
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all quiz_question_responses" ON quiz_question_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all leaderboards" ON user_leaderboard_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all achievements" ON user_achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins view all quiz_analytics" ON quiz_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins manage learning achievements" ON learning_achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins manage achievements" ON achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
