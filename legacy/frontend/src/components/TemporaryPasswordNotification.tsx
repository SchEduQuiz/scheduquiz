import React, { useState, useEffect } from 'react';
import { X, Copy, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TemporaryPasswordNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  userEmail: string;
}

interface TemporaryPasswordData {
  tempPassword: string;
  expiresAt: string;
  reason?: string;
  requestId: string;
}

export default function TemporaryPasswordNotification({ 
  isVisible, 
  onClose, 
  userEmail 
}: TemporaryPasswordNotificationProps) {
  const [passwordData, setPasswordData] = useState<TemporaryPasswordData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchTemporaryPassword();
    }
  }, [isVisible, userEmail]);

  async function fetchTemporaryPassword() {
    try {
      setLoading(true);
      
      // Get the most recent approved password reset request for this user
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select(`
          id,
          temp_password,
          temp_password_expires_at,
          reason,
          approved_at,
          temp_password_used
        `)
        .eq('user_email', userEmail)
        .eq('status', 'approved')
        .eq('temp_password_used', false)
        .order('approved_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.log('No temporary password found for user');
        return;
      }

      // Check if password has expired
      const expiresAt = new Date(data.temp_password_expires_at);
      const now = new Date();
      
      if (expiresAt < now) {
        console.log('Temporary password has expired');
        return;
      }

      setPasswordData({
        tempPassword: data.temp_password,
        expiresAt: data.temp_password_expires_at,
        reason: data.reason,
        requestId: data.id
      });

    } catch (error) {
      console.error('Error fetching temporary password:', error);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  function formatExpiryTime(expiryString: string) {
    const expiry = new Date(expiryString);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  }

  if (!isVisible || loading || !passwordData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 rounded-full p-2">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-orange-900">Temporary Password Ready</h2>
                <p className="text-sm text-orange-700">Your password reset has been approved</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-orange-600 hover:text-orange-700 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Important Security Notice</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You must change your password after using this temporary password. 
                  This is for your security and account protection.
                </p>
              </div>
            </div>
          </div>

          {/* Temporary Password Display */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Temporary Password
              </label>
              <div className="relative">
                <div className="flex items-center bg-slate-50 border border-slate-300 rounded-lg p-3">
                  <code className="flex-1 font-mono text-sm text-slate-800 bg-transparent border-none p-0 focus:outline-none">
                    {showPassword ? passwordData.tempPassword : '••••••••••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(passwordData.tempPassword)}
                    className="ml-2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
              </div>
            </div>

            {/* Expiry Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Expires in:</span>
                <span className="text-sm font-bold text-blue-900">
                  {formatExpiryTime(passwordData.expiresAt)}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Expires at: {new Date(passwordData.expiresAt).toLocaleString()}
              </p>
            </div>

            {/* Reason */}
            {passwordData.reason && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-slate-700 mb-1">Request Reason:</h4>
                <p className="text-sm text-slate-600">{passwordData.reason}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">How to use:</h4>
              <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Copy the temporary password above</li>
                <li>Log out of your current session (if any)</li>
                <li>Go to the login page</li>
                <li>Enter your email and the temporary password</li>
                <li>You will be prompted to change your password immediately</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
              >
                I've Saved the Password
              </button>
            </div>

            {/* Security Tips */}
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Security Tips:</h4>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>• Don't share this temporary password with anyone</li>
                <li>• Change to a strong, unique password</li>
                <li>• Use a password manager for secure storage</li>
                <li>• This password expires automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}