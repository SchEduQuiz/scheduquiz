-- Migration: 006_resources_bookmarks_messaging
-- Created: Consolidated from resource and messaging migrations
-- Purpose: Course resources, bookmarks, and system features

-- Course resources/materials
CREATE TABLE IF NOT EXISTS course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  resource_type TEXT DEFAULT 'document', -- document, video, audio, image, link
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES course_resources(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, lesson_id, course_id, resource_id)
);

-- User activity logs
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- login, logout, view_lesson, submit_assignment, etc
  description TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Study sessions tracking
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Course completion certificates
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  certificate_url TEXT,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Study streaks
CREATE TABLE IF NOT EXISTS study_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Course analytics summary (materialized for performance)
CREATE TABLE IF NOT EXISTS course_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_enrollments INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,
  average_grade NUMERIC(5,2),
  total_assignments INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(course_id)
);

-- Student performance summary
CREATE TABLE IF NOT EXISTS student_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_assignments INTEGER DEFAULT 0,
  completed_assignments INTEGER DEFAULT 0,
  average_grade NUMERIC(5,2),
  total_study_time INTEGER DEFAULT 0,
  progress_percentage NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_course ON course_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_resources_lesson ON course_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_course ON study_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_study_streaks_user ON study_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_course ON course_analytics(course_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_student ON student_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_course ON student_performance(course_id);

-- RLS Policies
ALTER TABLE course_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view course resources" ON course_resources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = course_resources.course_id
    ) OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_resources.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers upload resources" ON course_resources
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users manage own bookmarks" ON bookmarks
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users view own activity logs" ON user_activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins view system settings" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users manage own study sessions" ON study_sessions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users view own certificates" ON certificates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users view own streaks" ON study_streaks
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users view course analytics" ON course_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = course_analytics.course_id
    ) OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_analytics.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students view own performance" ON student_performance
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers view student performance" ON student_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = student_performance.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );
