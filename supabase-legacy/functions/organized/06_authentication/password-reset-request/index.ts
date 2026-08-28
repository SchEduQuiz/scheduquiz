// Password Reset Request Handler
// Handles user password reset requests with optional reason and temporary password support

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../../../_shared/cors.ts';


interface PasswordResetRequest {
  email: string;
  reason?: string;
  requestDetails?: {
    ipAddress?: string;
    userAgent?: string;
    additionalInfo?: any;
  };
}

interface SupabaseUser {
  id: string;
  email: string;
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
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get and validate user authentication (optional for password reset requests)
    const authHeader = req.headers.get('Authorization');
    let currentUserId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        
        if (!authError && user) {
          currentUserId = user.id;
        }
      } catch (error) {
        // Continue without authentication - allow password reset requests
        console.log('No valid auth token, continuing without authentication');
      }
    }

    // Parse request body
    const { email, reason, requestDetails }: PasswordResetRequest = await req.json();

    // Validate required fields
    if (!email) {
      throw new Error('Email is required');
    }

    // Check if email belongs to a valid user
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      // Don't reveal whether email exists or not for security
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'If your email is registered, a password reset request has been submitted.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if there's already a pending request for this user
    const { data: existingRequest } = await supabaseClient
      .from('password_reset_requests')
      .select('id, status, created_at')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingRequest) {
      const timeSinceRequest = new Date().getTime() - new Date(existingRequest.created_at).getTime();
      const hoursSinceRequest = timeSinceRequest / (1000 * 60 * 60);
      
      if (hoursSinceRequest < 1) {
        throw new Error('A password reset request is already pending. Please wait before submitting another request.');
      }
    }

    // Create password reset request
    const { data: resetRequest, error: createError } = await supabaseClient
      .from('password_reset_requests')
      .insert({
        user_email: email,
        user_id: profile.id,
        reason: reason || null,
        request_details: requestDetails || {},
        status: 'pending',
        ip_address: requestDetails?.ipAddress || null,
        user_agent: requestDetails?.userAgent || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create password reset request: ${createError.message}`);
    }

    // Log the action
    await supabaseClient.rpc('log_password_reset_action', {
      p_request_id: resetRequest.id,
      p_user_id: profile.id,
      p_action_type: 'request_created',
      p_action_description: `Password reset request created for ${email}`,
      p_admin_id: null,
      p_metadata: {
        reason: reason || null,
        request_details: requestDetails || {},
        email_provided: currentUserId === profile.id,
        authenticated_request: currentUserId !== null
      },
      p_ip_address: requestDetails?.ipAddress || null,
      p_user_agent: requestDetails?.userAgent || null
    });

    // Get admin email for notifications (you can customize this)
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('role', 'admin')
      .limit(1)
      .single();

    // Prepare notification data (for email integration)
    const notificationData = {
      request_id: resetRequest.id,
      user_email: email,
      user_name: profile.full_name || email.split('@')[0],
      request_reason: reason || 'No reason provided',
      admin_notification: {
        admin_email: adminProfile?.email,
        admin_name: adminProfile?.full_name || 'Administrator',
        request_id: resetRequest.id,
        dashboard_link: `${Deno.env.get('SUPABASE_URL')}/admin/dashboard?tab=password-resets`
      }
    };

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset request submitted successfully. Your request will be reviewed by an administrator.',
      data: {
        request_id: resetRequest.id,
        status: 'pending',
        estimated_processing_time: '24 hours'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Function error:', error);
    
    const errorResponse = {
      error: {
        code: 'PASSWORD_RESET_REQUEST_ERROR',
        message: error.message || 'Failed to process password reset request'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});