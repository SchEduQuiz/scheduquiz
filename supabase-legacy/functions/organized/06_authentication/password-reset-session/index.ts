// Password Reset Session Handler
// Handles temporary password sessions and password change requirements

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../../../_shared/cors.ts';


interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  sessionToken?: string;
}

interface SessionValidationRequest {
  sessionToken: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

// Handle CORS preflight request
  ) {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

// Handle CORS
  ) {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get and validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Get request method and path
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle different operations
    if (req.method === 'POST' && path.includes('/validate-session')) {
      const requestData: SessionValidationRequest = await req.json();
      return await validateResetSession(supabaseClient, requestData, user.id);
    }
    
    if (req.method === 'POST' && path.includes('/change-password')) {
      const requestData: PasswordChangeRequest = await req.json();
      return await changePassword(supabaseClient, requestData, user.id, user.email);
    }
    
    if (req.method === 'GET' && path.includes('/check-status')) {
      return await checkPasswordChangeStatus(supabaseClient, user.id);
    }

    throw new Error('Invalid operation');

  } catch (error) {
    console.error('Function error:', error);
    
    const errorResponse = {
      error: {
        code: 'PASSWORD_RESET_SESSION_ERROR',
        message: error.message || 'Failed to process session request'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Validate reset session and check if password change is required
async function validateResetSession(
  supabaseClient: any, 
  requestData: SessionValidationRequest,
  userId: string
) {
  if (!requestData.sessionToken) {
    throw new Error('Session token is required');
  }

  // Find the reset session
  const { data: session, error: sessionError } = await supabaseClient
    .from('password_reset_sessions')
    .select(`
      *,
      password_reset_requests!inner(
        id,
        status,
        temp_password,
        temp_password_expires_at,
        temp_password_used,
        temp_password_used_at,
        user_email
      )
    `)
    .eq('session_token', requestData.sessionToken)
    .eq('user_id', userId)
    .eq('session_status', 'active')
    .single();

  if (sessionError || !session) {
    throw new Error('Invalid or expired session token');
  }

  // Check if session has expired
  if (new Date(session.expires_at) < new Date()) {
    // Mark session as expired
    await supabaseClient
      .from('password_reset_sessions')
      .update({
        session_status: 'expired',
        last_activity_at: new Date().toISOString()
      })
      .eq('id', session.id);

    throw new Error('Session has expired');
  }

  // Get password reset request details
  const resetRequest = session.password_reset_requests;

  // Update session activity
  await supabaseClient
    .from('password_reset_sessions')
    .update({
      login_count: session.login_count + 1,
      last_activity_at: new Date().toISOString()
    })
    .eq('id', session.id);

  const response = {
    requires_password_change: session.password_change_required,
    password_changed_at: session.password_changed_at,
    session_expires_at: session.expires_at,
    last_login: session.last_activity_at
  };

  // Log the session validation
  await supabaseClient.rpc('log_password_reset_action', {
    p_request_id: resetRequest.id,
    p_user_id: userId,
    p_action_type: 'session_validated',
    p_action_description: `Password reset session validated`,
    p_metadata: {
      session_id: session.id,
      requires_password_change: session.password_change_required
    }
  });

  return new Response(JSON.stringify({
    success: true,
    data: response
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Change password after using temporary password
async function changePassword(
  supabaseClient: any, 
  requestData: PasswordChangeRequest,
  userId: string,
  userEmail: string
) {
  const { currentPassword, newPassword, sessionToken } = requestData;

  if (!newPassword) {
    throw new Error('New password is required');
  }

  // Validate password strength
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Check if this is a password change from a temporary password
  let requiresOldPassword = true;
  let hasSessionToken = false;

  if (sessionToken) {
    // Find the session
    const { data: session, error: sessionError } = await supabaseClient
      .from('password_reset_sessions')
      .select(`
        *,
        password_reset_requests!inner(
          id,
          temp_password,
          temp_password_used,
          user_email
        )
      `)
      .eq('session_token', sessionToken)
      .eq('user_id', userId)
      .eq('session_status', 'active')
      .single();

    if (session && session.password_reset_requests) {
      const resetRequest = session.password_reset_requests;
      
      // If this user used a temporary password recently, don't require old password
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (resetRequest.temp_password_used && 
          new Date(resetRequest.temp_password_used_at) > oneHourAgo) {
        requiresOldPassword = false;
        hasSessionToken = true;

        // Mark temp password as used
        await supabaseClient
          .from('password_reset_requests')
          .update({
            temp_password_used: true,
            temp_password_used_at: new Date().toISOString()
          })
          .eq('id', resetRequest.id);
      }
    }
  }

  // Validate current password if required
  if (requiresOldPassword) {
    if (!currentPassword) {
      throw new Error('Current password is required');
    }

    // Sign in with current password to validate
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }
  }

  // Update password
  const { error: updateError } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    throw new Error(`Failed to update password: ${updateError.message}`);
  }

  // If we have a session, mark password as changed
  if (hasSessionToken && sessionToken) {
    const { data: session } = await supabaseClient
      .from('password_reset_sessions')
      .select('password_reset_requests(id)')
      .eq('session_token', sessionToken)
      .eq('user_id', userId)
      .single();

    if (session?.password_reset_requests) {
      // Update session
      await supabaseClient
        .from('password_reset_sessions')
        .update({
          password_change_required: false,
          password_changed_at: new Date().toISOString(),
          session_status: 'completed',
          last_activity_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken);

      // Log the action
      await supabaseClient.rpc('log_password_reset_action', {
        p_request_id: session.password_reset_requests.id,
        p_user_id: userId,
        p_action_type: 'password_changed',
        p_action_description: 'Password successfully changed after temporary password usage',
        p_metadata: {
          session_token: sessionToken,
          change_method: 'temporary_password'
        }
      });

      // Mark request as completed
      await supabaseClient
        .from('password_reset_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.password_reset_requests.id);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Password updated successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Check if user needs to change password
async function checkPasswordChangeStatus(
  supabaseClient: any,
  userId: string
) {
  // Check for active sessions requiring password change
  const { data: activeSessions } = await supabaseClient
    .from('password_reset_sessions')
    .select(`
      *,
      password_reset_requests!inner(
        id,
        temp_password_used,
        temp_password_used_at
      )
    `)
    .eq('user_id', userId)
    .eq('session_status', 'active')
    .eq('password_change_required', true);

  // Check recent temporary password usage
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const { data: recentTempPasswords } = await supabaseClient
    .from('password_reset_requests')
    .select('id, temp_password_used, temp_password_used_at')
    .eq('user_id', userId)
    .eq('temp_password_used', true)
    .gt('temp_password_used_at', oneHourAgo.toISOString())
    .order('temp_password_used_at', { ascending: false })
    .limit(1);

  let requiresPasswordChange = false;
  let reason = null;

  if (activeSessions?.length) {
    requiresPasswordChange = true;
    reason = 'temporary_password_session';
  } else if (recentTempPasswords?.length) {
    requiresPasswordChange = true;
    reason = 'recent_temporary_password_usage';
  }

  return new Response(JSON.stringify({
    success: true,
    data: {
      requires_password_change: requiresPasswordChange,
      reason: reason,
      active_sessions: activeSessions?.length || 0,
      recent_temp_password_used: recentTempPasswords?.length > 0
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});