-- Migration: 007_password_reset_system
-- Created: Consolidated from multiple password reset migrations
-- Purpose: Comprehensive password reset workflow with admin approval

-- Password Reset Requests Table
CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reason TEXT, -- Optional reason for password reset request
    request_details JSONB, -- Additional request metadata
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'expired')),
    
    -- Admin approval fields
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_notes TEXT,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    
    -- Temporary password fields
    temp_password TEXT,
    temp_password_expires_at TIMESTAMPTZ,
    temp_password_used BOOLEAN DEFAULT false,
    temp_password_used_at TIMESTAMPTZ,
    
    -- Security tracking
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password Reset Sessions Table (for tracking active sessions)
CREATE TABLE password_reset_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES password_reset_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Session state
    session_token TEXT NOT NULL UNIQUE,
    session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'expired', 'revoked')),
    
    -- Password change tracking
    old_password_hashed TEXT,
    new_password_hashed TEXT,
    password_change_required BOOLEAN DEFAULT true,
    password_changed_at TIMESTAMPTZ,
    
    -- Security tracking
    ip_address INET,
    user_agent TEXT,
    login_count INTEGER DEFAULT 0,
    
    -- Session lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password Reset Logs Table (for audit trail)
CREATE TABLE password_reset_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES password_reset_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Log details
    action_type TEXT NOT NULL CHECK (action_type IN ('request_created', 'request_approved', 'request_rejected', 'temp_password_generated', 'temp_password_used', 'password_changed', 'session_expired')),
    action_description TEXT NOT NULL,
    metadata JSONB, -- Additional context data
    
    -- Security tracking
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_password_reset_requests_email ON password_reset_requests(user_email);
CREATE INDEX idx_password_reset_requests_status ON password_reset_requests(status);
CREATE INDEX idx_password_reset_requests_created_at ON password_reset_requests(created_at);
CREATE INDEX idx_password_reset_requests_admin ON password_reset_requests(admin_id);

CREATE INDEX idx_password_reset_sessions_token ON password_reset_sessions(session_token);
CREATE INDEX idx_password_reset_sessions_user ON password_reset_sessions(user_id);
CREATE INDEX idx_password_reset_sessions_status ON password_reset_sessions(session_status);
CREATE INDEX idx_password_reset_sessions_expires ON password_reset_sessions(expires_at);

CREATE INDEX idx_password_reset_logs_request ON password_reset_logs(request_id);
CREATE INDEX idx_password_reset_logs_user ON password_reset_logs(user_id);
CREATE INDEX idx_password_reset_logs_created_at ON password_reset_logs(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_reset_requests
-- Users can view their own requests
CREATE POLICY "Users can view their own reset requests" ON password_reset_requests
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Allow anyone to insert password reset requests (for forgot password form)
CREATE POLICY "Anyone can submit password reset requests" ON password_reset_requests
    FOR INSERT WITH CHECK (true);

-- Only admins can manage requests
CREATE POLICY "Only admins can manage reset requests" ON password_reset_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for password_reset_sessions
-- Users can view their own sessions
CREATE POLICY "Users can view their own reset sessions" ON password_reset_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Only admins and system can manage sessions
CREATE POLICY "Admins can manage reset sessions" ON password_reset_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for password_reset_logs
-- Admins can view all logs
CREATE POLICY "Admins can view all reset logs" ON password_reset_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Users can view their own logs
CREATE POLICY "Users can view their own reset logs" ON password_reset_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to automatically create log entries
CREATE OR REPLACE FUNCTION log_password_reset_action(
    p_request_id UUID,
    p_user_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_action_type TEXT,
    p_action_description TEXT,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO password_reset_logs (
        request_id,
        user_id,
        admin_id,
        action_type,
        action_description,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_request_id,
        p_user_id,
        p_admin_id,
        p_action_type,
        p_action_description,
        p_metadata,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate secure temporary passwords
CREATE OR REPLACE FUNCTION generate_temporary_password()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    password TEXT := '';
    i INTEGER;
    random_byte bytea;
BEGIN
    FOR i IN 1..12 LOOP
        random_byte := gen_random_bytes(1);
        password := password || substr(chars, (ascii(random_byte) % length(chars)) + 1, 1);
    END LOOP;
    
    RETURN password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up expired requests and sessions
CREATE OR REPLACE FUNCTION cleanup_expired_reset_data()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Clean up expired requests
    UPDATE password_reset_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Clean up expired sessions
    DELETE FROM password_reset_sessions 
    WHERE session_status = 'active' 
    AND expires_at < NOW() - INTERVAL '1 day';
    
    -- Mark expired sessions in logs
    UPDATE password_reset_logs
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb), 
        '{expired}', 
        'true'::jsonb
    )
    WHERE request_id IN (
        SELECT id FROM password_reset_requests 
        WHERE status = 'expired'
    );
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get latest password reset status by email (no auth required)
CREATE OR REPLACE FUNCTION get_password_reset_status(user_email TEXT)
RETURNS TABLE (
  id UUID,
  status TEXT,
  temp_password TEXT,
  admin_notes TEXT,
  temp_password_expires_at TIMESTAMPTZ,
  temp_password_used BOOLEAN,
  created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.status,
    pr.temp_password,
    pr.admin_notes,
    pr.temp_password_expires_at,
    pr.temp_password_used,
    pr.created_at
  FROM password_reset_requests pr
  WHERE pr.user_email = user_email
  ORDER BY pr.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_password_reset_status(TEXT) TO authenticated, anon;

-- Add comments for documentation
COMMENT ON TABLE password_reset_requests IS 'Stores password reset requests with optional user reason and admin approval workflow';
COMMENT ON TABLE password_reset_sessions IS 'Tracks active password reset sessions and enforces password change requirements';
COMMENT ON TABLE password_reset_logs IS 'Audit trail for all password reset actions for security and compliance';

COMMENT ON COLUMN password_reset_requests.reason IS 'Optional reason provided by user for password reset request';
COMMENT ON COLUMN password_reset_requests.temp_password IS 'Admin-generated temporary password for emergency access';
COMMENT ON COLUMN password_reset_requests.temp_password_expires_at IS 'Expiration time for temporary password';
COMMENT ON COLUMN password_reset_requests.temp_password_used IS 'Flag indicating if temporary password has been used';
