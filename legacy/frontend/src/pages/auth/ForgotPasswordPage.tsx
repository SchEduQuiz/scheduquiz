import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock, AlertCircle, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
import ForgotPasswordForm from '../../components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(true);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleSuccess = (email: string) => {
    setSubmittedEmail(email);
    setShowForgotPasswordForm(false);
  };

  const handleStartOver = () => {
    setSubmittedEmail('');
    setShowForgotPasswordForm(true);
  };

  if (!showForgotPasswordForm && submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">Request Submitted</h2>
              <p className="text-sm sm:text-base text-slate-600 mb-6">
                Your password reset request has been submitted successfully for <strong>{submittedEmail}</strong>. 
                An administrator will review your request and you'll be notified via email when your temporary password is ready.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Administrator reviews your request</li>
                  <li>• Temporary password is generated (if approved)</li>
                  <li>• You'll receive an email notification</li>
                  <li>• Use temporary password to log in</li>
                  <li>• You must change your password after logging in</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleStartOver}
                  className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition"
                >
                  Submit Another Request
                </button>
                
                <Link
                  to="/login"
                  className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="bg-orange-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Lock className="h-7 w-7 sm:h-8 sm:w-8 text-orange-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Forgot Password?</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Request a password reset with administrator approval
            </p>
          </div>

          <ForgotPasswordForm
            onSuccess={handleSuccess}
          />

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
