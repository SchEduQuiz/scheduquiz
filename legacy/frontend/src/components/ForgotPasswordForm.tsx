import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ForgotPasswordFormProps {
  onClose?: () => void;
  onSuccess?: (email: string) => void;
}

export default function ForgotPasswordForm({ onClose, onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showReasonField, setShowReasonField] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { requestPasswordReset } = useAuth();

  const commonReasons = [
    'I forgot my password',
    'My account was compromised',
    'I need to change my password for security',
    'I\'m having trouble logging in',
    'Other reason'
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate custom reason if "Other reason" is selected
    if (reason === 'Other reason' && !customReason.trim()) {
      setError('Please describe your situation when selecting "Other reason"');
      return;
    }

    setLoading(true);

    try {
      // Prepare the final reason
      let finalReason = reason;
      if (reason === 'Other reason' && customReason.trim()) {
        finalReason = `Other: ${customReason.trim()}`;
      }

      const result = await requestPasswordReset(email.trim(), finalReason || undefined);

      if (!result.success) {
        throw new Error(result.message);
      }

      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(email);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset request');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full" role="alert" aria-live="polite">
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4" aria-hidden="true">
            <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Request Submitted</h2>
          <p className="text-sm sm:text-base text-slate-600 mb-6">
            Your password reset request has been submitted successfully. An administrator will review your request and you'll be notified via email when your temporary password is ready.
          </p>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Administrator reviews your request</li>
                <li>• Temporary password is generated (if approved)</li>
                <li>• You'll receive an email notification</li>
                <li>• Use temporary password to log in</li>
                <li>• You must change your password after logging in</li>
              </ul>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-green-900 mb-1">Your Request Details:</h4>
              <p className="text-sm text-green-700">
                <strong>Email:</strong> {email}
              </p>
              {reason && (
                <p className="text-sm text-green-700">
                  <strong>Reason:</strong> {reason}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              autoFocus
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full">
      <div className="text-center mb-6 sm:mb-8">
        <div className="bg-orange-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Forgot Password?</h2>
        <p className="text-sm sm:text-base text-slate-600 mt-2">
          Request a password reset with administrator approval
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>
        <div>
          <label htmlFor="forgot-password-email" className="block text-sm font-medium text-slate-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden="true" />
            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
              placeholder="your@email.com"
              required
              autoComplete="email"
              aria-describedby="email-help"
              disabled={loading}
            />
          </div>
          <p id="email-help" className="text-xs text-slate-500 mt-1">
            Enter the email associated with your account
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="reset-reason" className="block text-sm font-medium text-slate-700">
              Reason for Reset (Optional)
            </label>
            <button
              type="button"
              onClick={() => setShowReasonField(!showReasonField)}
              className="text-sm text-orange-600 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 rounded"
              aria-expanded={showReasonField}
              aria-controls="reason-field-container"
            >
              {showReasonField ? 'Hide' : 'Add Reason'}
            </button>
          </div>
          
          {showReasonField && (
            <div id="reason-field-container" className="space-y-3">
              <select
                id="reset-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                aria-describedby="reason-help"
                disabled={loading}
              >
                <option value="">Select a reason...</option>
                {commonReasons.map((reasonOption) => (
                  <option key={reasonOption} value={reasonOption}>
                    {reasonOption}
                  </option>
                ))}
              </select>
              
              {reason === 'Other reason' && (
                <div>
                  <label htmlFor="custom-reason" className="block text-sm font-medium text-slate-700 mb-2">
                    Please describe your situation
                  </label>
                  <textarea
                    id="custom-reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-base"
                    placeholder="Please describe your situation..."
                    rows={3}
                    disabled={loading}
                    aria-describedby="reason-help"
                    required={reason === 'Other reason'}
                  />
                </div>
              )}
            </div>
          )}
          
          <p id="reason-help" className="text-xs text-slate-500 mt-1">
            Providing a reason helps administrators process your request faster
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <h4 className="font-medium text-yellow-800 mb-1">Important Information:</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Your request will be reviewed by an administrator</li>
            <li>• Processing typically takes 24 hours</li>
            <li>• You'll receive a temporary password if approved</li>
            <li>• Must change your password after using temporary password</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading || !email.trim() || (reason === 'Other reason' && !customReason.trim())}
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center justify-center"
          aria-describedby="submit-help"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Submitting Request...
            </>
          ) : (
            'Request Password Reset'
          )}
        </button>
        <p id="submit-help" className="sr-only">
          Submit your password reset request for administrator review
        </p>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition"
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}