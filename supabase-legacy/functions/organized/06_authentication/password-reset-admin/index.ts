// Password Reset Admin Handler
// Handles admin operations for password reset requests management

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../../../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

// Handle CORS preflight request
  ) {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

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

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      throw new Error('Access denied. Admin role required.');
    }

    // Get request method and path
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Handle different admin operations
    if (method === 'GET' && path.endsWith('/list')) {
      return await listPasswordResetRequests(supabaseClient, url);
    }
    
    if (method === 'GET' && path.includes('/stats')) {
      return await getPasswordResetStats(supabaseClient);
    }
    
    if (method === 'POST' && path.includes('/approve')) {
      const requestData: AdminPasswordResetRequest = await req.json();
      return await approvePasswordResetRequest(supabaseClient, requestData, profile.id);
    }
    
    if (method === 'POST' && path.includes('/reject')) {
      const requestData: AdminPasswordResetRequest = await req.json();
      return await rejectPasswordResetRequest(supabaseClient, requestData, profile.id);
    }
    
    if (method === 'POST' && path.includes('/generate-temp-password')) {
      const requestData: AdminPasswordResetRequest = await req.json();
      return await generateTemporaryPassword(supabaseClient, requestData, profile.id);
    }
    
    if (method === 'POST' && path.includes('/bulk-action')) {
      const requestData: AdminPasswordResetRequest = await req.json();
      return await bulkProcessRequests(supabaseClient, requestData, profile.id);
    }

    throw new Error('Invalid operation');

  } catch (error) {
    console.error('Function error:', error);
    
    const errorResponse = {
      error: {
        code: 'PASSWORD_RESET_ADMIN_ERROR',
        message: error.message || 'Failed to process admin request'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// List password reset requests with filtering
async function listPasswordResetRequests(supabaseClient: any, url: URL) {
  const searchParams = url.searchParams;
  const status = searchParams.get('status') || 'pending';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabaseClient
    .from('password_reset_requests')
    .select(`
      *,
      profiles:user_id(full_name, email, role),
      admin_profiles:admin_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: requests, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }

  // Get total count for pagination
  const { count } = await supabaseClient
    .from('password_reset_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);

  return new Response(JSON.stringify({
    data: requests || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Get password reset statistics
async function getPasswordResetStats(supabaseClient: any) {
  const { data: stats, error } = await supabaseClient
    .from('password_reset_requests')
    .select('status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }

  const now = new Date();
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const statusCounts = stats?.reduce((acc: any, req: any) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const recentActivity = {
    lastWeek: stats?.filter((req: any) => 
      new Date(req.created_at) > lastWeek
    ).length || 0,
    lastMonth: stats?.filter((req: any) => 
      new Date(req.created_at) > lastMonth
    ).length || 0
  };

  return new Response(JSON.stringify({
    data: {
      total_requests: stats?.length || 0,
      status_breakdown: statusCounts,
      recent_activity: recentActivity
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Approve password reset request
async function approvePasswordResetRequest(
  supabaseClient: any, 
  requestData: AdminPasswordResetRequest,
  adminId: string
) {
  if (!requestData.requestId) {
    throw new Error('Request ID is required');
  }

  // Generate temporary password if not provided
  let tempPassword = requestData.tempPassword;
  let tempPasswordExpiry = requestData.tempPasswordExpiry;

  if (!tempPassword) {
    const { data: tempPasswordData } = await supabaseClient.rpc('generate_temporary_password');
    tempPassword = tempPasswordData;
  }

  if (!tempPasswordExpiry) {
    tempPasswordExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
  }

  // Update the request
  const { error: updateError } = await supabaseClient
    .from('password_reset_requests')
    .update({
      status: 'approved',
      admin_id: adminId,
      admin_notes: requestData.adminNotes || null,
      temp_password: tempPassword,
      temp_password_expires_at: tempPasswordExpiry,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestData.requestId);

  if (updateError) {
    throw new Error(`Failed to approve request: ${updateError.message}`);
  }

  // Log the action
  const { data: request } = await supabaseClient
    .from('password_reset_requests')
    .select('user_id, user_email')
    .eq('id', requestData.requestId)
    .single();

  if (request) {
    await supabaseClient.rpc('log_password_reset_action', {
      p_request_id: requestData.requestId,
      p_user_id: request.user_id,
      p_action_type: 'request_approved',
      p_action_description: `Password reset request approved by admin`,
      p_admin_id: adminId,
      p_metadata: {
        temp_password_expiry: tempPasswordExpiry,
        admin_notes: requestData.adminNotes || null
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Password reset request approved successfully',
    data: {
      temporary_password: tempPassword,
      expires_at: tempPasswordExpiry
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Reject password reset request
async function rejectPasswordResetRequest(
  supabaseClient: any, 
  requestData: AdminPasswordResetRequest,
  adminId: string
) {
  if (!requestData.requestId) {
    throw new Error('Request ID is required');
  }

  // Update the request
  const { error: updateError } = await supabaseClient
    .from('password_reset_requests')
    .update({
      status: 'rejected',
      admin_id: adminId,
      admin_notes: requestData.adminNotes || null,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestData.requestId);

  if (updateError) {
    throw new Error(`Failed to reject request: ${updateError.message}`);
  }

  // Log the action
  const { data: request } = await supabaseClient
    .from('password_reset_requests')
    .select('user_id, user_email')
    .eq('id', requestData.requestId)
    .single();

  if (request) {
    await supabaseClient.rpc('log_password_reset_action', {
      p_request_id: requestData.requestId,
      p_user_id: request.user_id,
      p_action_type: 'request_rejected',
      p_action_description: `Password reset request rejected by admin`,
      p_admin_id: adminId,
      p_metadata: {
        admin_notes: requestData.adminNotes || null
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Password reset request rejected successfully'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Generate temporary password for existing approved request
async function generateTemporaryPassword(
  supabaseClient: any, 
  requestData: AdminPasswordResetRequest,
  adminId: string
) {
  if (!requestData.requestId) {
    throw new Error('Request ID is required');
  }

  // Check if request exists and is approved
  const { data: existingRequest } = await supabaseClient
    .from('password_reset_requests')
    .select('status, user_id, user_email')
    .eq('id', requestData.requestId)
    .single();

  if (!existingRequest || existingRequest.status !== 'approved') {
    throw new Error('Request not found or not approved');
  }

  // Generate new temporary password
  const { data: tempPassword } = await supabaseClient.rpc('generate_temporary_password');
  const tempPasswordExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Update the request with new temporary password
  const { error: updateError } = await supabaseClient
    .from('password_reset_requests')
    .update({
      temp_password: tempPassword,
      temp_password_expires_at: tempPasswordExpiry,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestData.requestId);

  if (updateError) {
    throw new Error(`Failed to generate temporary password: ${updateError.message}`);
  }

  // Log the action
  await supabaseClient.rpc('log_password_reset_action', {
    p_request_id: requestData.requestId,
    p_user_id: existingRequest.user_id,
    p_action_type: 'temp_password_generated',
    p_action_description: `New temporary password generated by admin`,
    p_admin_id: adminId,
    p_metadata: {
      temp_password_expiry: tempPasswordExpiry
    }
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Temporary password generated successfully',
    data: {
      temporary_password: tempPassword,
      expires_at: tempPasswordExpiry
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Bulk process requests
async function bulkProcessRequests(
  supabaseClient: any, 
  requestData: AdminPasswordResetRequest,
  adminId: string
) {
  if (!requestData.bulkAction?.requestIds?.length) {
    throw new Error('Request IDs are required for bulk action');
  }

  if (!requestData.bulkAction.status) {
    throw new Error('Status is required for bulk action');
  }

  const { requestIds, status, tempPasswordExpiry } = requestData.bulkAction;

  // Validate all request IDs exist
  const { data: existingRequests } = await supabaseClient
    .from('password_reset_requests')
    .select('id, user_id, user_email, status')
    .in('id', requestIds);

  if (!existingRequests?.length || existingRequests.length !== requestIds.length) {
    throw new Error('Some request IDs are invalid');
  }

  // Process each request
  const results = [];
  
  for (const request of existingRequests) {
    try {
      if (status === 'approved') {
        // Generate temporary password for each request
        const { data: tempPassword } = await supabaseClient.rpc('generate_temporary_password');
        const expiry = tempPasswordExpiry || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { error: updateError } = await supabaseClient
          .from('password_reset_requests')
          .update({
            status: 'approved',
            admin_id: adminId,
            temp_password: tempPassword,
            temp_password_expires_at: expiry,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id);

        if (!updateError) {
          await supabaseClient.rpc('log_password_reset_action', {
            p_request_id: request.id,
            p_user_id: request.user_id,
            p_action_type: 'request_approved',
            p_action_description: `Password reset request approved via bulk action`,
            p_admin_id: adminId,
            p_metadata: {
              bulk_action: true,
              temp_password_expiry: expiry
            }
          });

          results.push({
            id: request.id,
            success: true,
            temporary_password: tempPassword,
            expires_at: expiry
          });
        } else {
          results.push({
            id: request.id,
            success: false,
            error: updateError.message
          });
        }

      } else if (status === 'rejected') {
        const { error: updateError } = await supabaseClient
          .from('password_reset_requests')
          .update({
            status: 'rejected',
            admin_id: adminId,
            rejected_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id);

        if (!updateError) {
          await supabaseClient.rpc('log_password_reset_action', {
            p_request_id: request.id,
            p_user_id: request.user_id,
            p_action_type: 'request_rejected',
            p_action_description: `Password reset request rejected via bulk action`,
            p_admin_id: adminId,
            p_metadata: {
              bulk_action: true
            }
          });

          results.push({
            id: request.id,
            success: true
          });
        } else {
          results.push({
            id: request.id,
            success: false,
            error: updateError.message
          });
        }
      }

    } catch (error) {
      results.push({
        id: request.id,
        success: false,
        error: error.message
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Bulk action completed',
    data: results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}