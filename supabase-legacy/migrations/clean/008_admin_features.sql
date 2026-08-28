-- Migration: 008_admin_features
-- Created: Consolidated from admin-related migrations
-- Purpose: Admin activity logging and system administration features

-- Admin activity logs
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    target_question_id UUID REFERENCES lesson_questions(id) ON DELETE SET NULL,
    target_entity_type TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action ON admin_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_timestamp ON admin_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_user ON admin_activity_logs(target_user_id);

-- Enable RLS
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to view all logs
CREATE POLICY "Admins can view all activity logs" ON admin_activity_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Create policy to allow admins to insert logs
CREATE POLICY "Admins can insert activity logs" ON admin_activity_logs
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

COMMENT ON TABLE admin_activity_logs IS 'Tracks all admin actions for audit purposes';
COMMENT ON COLUMN admin_activity_logs.admin_id IS 'The admin user who performed the action';
COMMENT ON COLUMN admin_activity_logs.action IS 'Type of action performed (e.g., create_user, delete_question)';
COMMENT ON COLUMN admin_activity_logs.target_user_id IS 'The user affected by the action (if applicable)';
COMMENT ON COLUMN admin_activity_logs.target_question_id IS 'The question affected by the action (if applicable)';
COMMENT ON COLUMN admin_activity_logs.target_entity_type IS 'Type of entity affected (e.g., user, question)';
COMMENT ON COLUMN admin_activity_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN admin_activity_logs.timestamp IS 'When the action was performed';
COMMENT ON COLUMN admin_activity_logs.created_at IS 'When this log entry was created';

-- Add hint field to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS hint TEXT;
