-- Migration: 005_notifications_and_achievements
-- Created: Consolidated from notification-related migrations
-- Purpose: Notifications, announcements, and communication features

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- grade, assignment, announcement, achievement, system
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_type TEXT, -- assignment_due, exam, class, holiday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Discussion comments
CREATE TABLE IF NOT EXISTS discussion_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Direct messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_course ON calendar_events(course_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_lesson ON discussion_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_assignment ON discussion_comments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users view course announcements" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = announcements.course_id
    ) OR teacher_id = auth.uid()
  );

CREATE POLICY "Teachers create announcements" ON announcements
  FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Users view relevant calendar events" ON calendar_events
  FOR SELECT USING (
    course_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = calendar_events.course_id
    ) OR
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = calendar_events.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers create course events" ON calendar_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = calendar_events.course_id 
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Users view course discussions" ON discussion_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN enrollments e ON e.course_id = l.course_id
      WHERE l.id = discussion_comments.lesson_id 
      AND e.student_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN courses c ON c.id = l.course_id
      WHERE l.id = discussion_comments.lesson_id 
      AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = discussion_comments.assignment_id 
      AND c.teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN enrollments e ON e.course_id = a.course_id
      WHERE a.id = discussion_comments.assignment_id 
      AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "Users create discussions" ON discussion_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view sent and received messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());
