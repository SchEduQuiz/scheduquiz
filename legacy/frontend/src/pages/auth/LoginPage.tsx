import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import TemporaryPasswordNotification from '../../components/TemporaryPasswordNotification';
import ForgotPasswordForm from '../../components/ForgotPasswordForm';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTempPasswordNotification, setShowTempPasswordNotification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showReRequest, setShowReRequest] = useState(false);
  const { signIn, user, profile, hasTemporaryPassword } = useAuth();
  const navigate = useNavigate();

  // Redirect already authenticated users to their dashboard
  React.useEffect(() => {
    if (user && profile) {
      navigate(`/${profile.role}/dashboard`);
    }
  }, [user, profile, navigate]);

  // Show temporary password notification if user has one
  React.useEffect(() => {
    if (hasTemporaryPassword) {
      setShowTempPasswordNotification(true);
    }
  }, [hasTemporaryPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // AuthContext will automatically handle the redirect based on profile role
      // No need for manual API calls or navigation here
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle password reset status errors
      if (err.message === 'PENDING_RESET') {
        setError('Your password reset request is currently pending administrator approval. You will be notified via email when your temporary password is ready.');
      } else if (err.message === 'REJECTED_RESET') {
        setError('Your password reset request was rejected. You can submit a new request using the button below.');
        setShowReRequest(true);
      } else if (err.message === 'INVALID_TEMP_PASSWORD') {
        setError('The temporary password for your approved reset request has expired or been used. Please submit a new password reset request.');
        setShowReRequest(true);
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReRequest() {
    setError('');
    setShowReRequest(false);
    setShowForgotPassword(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="bg-blue-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <LogIn className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 sm:py-3.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 sm:py-3.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base active:scale-95"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Password Reset Status Actions */}
          {showReRequest && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleReRequest}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Submit New Reset Request</span>
              </button>
            </div>
          )}

          {/* Forgot Password Links */}
          {!showReRequest && (
            <div className="mt-4 text-center space-y-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center space-x-1"
              >
                <Lock className="h-4 w-4" />
                <span>Quick Reset Request</span>
              </button>
              <div className="text-xs text-slate-500">
                or{' '}
                <Link 
                  to="/forgot-password" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  open full reset form
                </Link>
              </div>
            </div>
          )}

          <p className="text-center text-sm sm:text-base text-slate-600 mt-4 sm:mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Temporary Password Notification */}
      {hasTemporaryPassword && (
        <TemporaryPasswordNotification
          isVisible={showTempPasswordNotification}
          onClose={() => setShowTempPasswordNotification(false)}
          userEmail={email || user?.email || ''}
        />
      )}

      {/* Forgot Password Form Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <ForgotPasswordForm
              onClose={() => setShowForgotPassword(false)}
              onSuccess={(submittedEmail) => {
                setEmail(submittedEmail);
                setShowForgotPassword(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
