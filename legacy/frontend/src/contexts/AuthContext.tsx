import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Password reset related methods and state
  hasTemporaryPassword: boolean;
  checkPasswordResetStatus: () => Promise<void>;
  requestPasswordReset: (email: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  changePasswordAfterReset: (newPassword: string, currentPassword?: string, sessionToken?: string) => Promise<{ success: boolean; message: string }>;
  checkForTemporaryPassword: () => Promise<{ hasTempPassword: boolean; password?: string; expiresAt?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTemporaryPassword, setHasTemporaryPassword] = useState(false);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          setProfile(profileData);
        }
      } finally {
        setLoading(false);
      }
    }
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle()
            .then(({ data }) => setProfile(data));
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function getPasswordResetStatusByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('status, temp_password, temp_password_expires_at, temp_password_used, admin_notes, created_at')
        .eq('user_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking password reset status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error checking password reset status:', error);
      return null;
    }
  }

  async function signIn(email: string, password: string) {
    // Check password reset status by email first
    const resetStatus = await getPasswordResetStatusByEmail(email);
    
    if (resetStatus) {
      if (resetStatus.status === 'pending') {
        throw new Error('PENDING_RESET');
      } else if (resetStatus.status === 'rejected') {
        throw new Error('REJECTED_RESET');
      } else if (resetStatus.status === 'approved' && !resetStatus.temp_password_used) {
        // User has approved password reset but hasn't used temporary password yet
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password: resetStatus.temp_password 
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('INVALID_TEMP_PASSWORD');
          }
          throw error;
        }
        return;
      }
    }
    
    // Normal login flow
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string, fullName: string, role: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role
        }
      }
    });
    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  }

  async function checkPasswordResetStatus() {
    if (!user) {
      setHasTemporaryPassword(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('password-reset-session/check-status');
      
      if (error) {
        // Silently handle error - password reset is optional functionality
        setHasTemporaryPassword(false);
        return;
      }

      if (data?.data?.requires_password_change) {
        setHasTemporaryPassword(true);
      } else {
        setHasTemporaryPassword(false);
      }
    } catch (error) {
      // Silently handle error - password reset is optional functionality
      setHasTemporaryPassword(false);
    }
  }

  async function changePasswordAfterReset(
    newPassword: string,
    currentPassword?: string,
    sessionToken?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!user) {
        throw new Error('User must be logged in to change password');
      }

      const requestData: any = {
        newPassword,
        sessionToken: sessionToken || undefined
      };

      // Include current password if not from temporary password session
      if (currentPassword) {
        requestData.currentPassword = currentPassword;
      }

      const { data, error } = await supabase.functions.invoke('password-reset-session/change-password', {
        body: requestData
      });

      if (error) {
        throw new Error(error.message || 'Failed to change password');
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Failed to change password');
      }

      // Update local state
      setHasTemporaryPassword(false);

      return {
        success: true,
        message: data?.message || 'Password changed successfully'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to change password'
      };
    }
  }

  async function checkForTemporaryPassword(): Promise<{ hasTempPassword: boolean; password?: string; expiresAt?: string }> {
    if (!user) {
      return { hasTempPassword: false };
    }

    try {
      // Get the most recent approved password reset request for this user
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select(`
          temp_password,
          temp_password_expires_at,
          temp_password_used,
          approved_at
        `)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .eq('temp_password_used', false)
        .order('approved_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { hasTempPassword: false };
      }

      // Check if password has expired
      const expiresAt = new Date(data.temp_password_expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        return { hasTempPassword: false };
      }

      setHasTemporaryPassword(true);
      
      return {
        hasTempPassword: true,
        password: data.temp_password,
        expiresAt: data.temp_password_expires_at
      };

    } catch (error) {
      console.error('Error checking for temporary password:', error);
      return { hasTempPassword: false };
    }
  }

  async function requestPasswordReset(
    email: string, 
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Remove login requirement - users should be able to request password reset without being logged in
      const requestDetails = {
        ipAddress: null, // Would need backend to get real IP
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('password-reset-request', {
        body: {
          email: email,
          reason: reason || undefined,
          requestDetails
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit password reset request');
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Failed to submit password reset request');
      }

      return {
        success: true,
        message: data?.message || 'Password reset request submitted successfully'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to submit password reset request'
      };
    }
  }

  // Note: Password reset status check is only called explicitly when needed
  // (e.g., on password reset pages), not on every page load to avoid unnecessary API calls

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword, 
      hasTemporaryPassword, 
      checkPasswordResetStatus, 
      requestPasswordReset,
      changePasswordAfterReset,
      checkForTemporaryPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
