import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Assignment } from '../../lib/supabase';
import { FileText, Clock, AlertCircle, CheckCircle, ArrowLeft, MessageSquare } from 'lucide-react';

export default function AssignmentSubmission() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (assignmentId) {
      loadAssignment();
      loadExistingSubmission();
    }
  }, [assignmentId]);

  async function loadAssignment() {
    try {
      const { data: assignment, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (error) {
        console.error('Error loading assignment:', error);
        setError('Failed to load assignment');
        return;
      }

      setAssignment(assignment);
    } catch (error) {
      console.error('Error loading assignment:', error);
      setError('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingSubmission() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: submission } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .single();

      if (submission) {
        setExistingSubmission(submission);
        setSubmissionText(submission.submission_text || '');
      }
    } catch (error) {
      // No existing submission - that's fine
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assignmentId) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit assignments');
        return;
      }

      const submissionData = {
        assignment_id: assignmentId,
        student_id: user.id,
        submission_text: submissionText.trim(),
        status: 'submitted',
        submitted_at: new Date().toISOString()
      };

      let result;
      if (existingSubmission) {
        // Update existing submission
        result = await supabase
          .from('submissions')
          .update({
            submission_text: submissionData.submission_text,
            status: 'submitted',
            submitted_at: submissionData.submitted_at
          })
          .eq('id', existingSubmission.id)
          .select()
          .single();
      } else {
        // Create new submission
        result = await supabase
          .from('submissions')
          .insert([submissionData])
          .select()
          .single();
      }

      if (result.error) {
        console.error('Database error:', result.error);
        setError('Failed to submit assignment. Please try again.');
        return;
      }

      setSuccess('Assignment submitted successfully!');
      setExistingSubmission({ 
        ...result.data,
        submission_text: submissionText, 
        status: 'submitted',
        submitted_at: submissionData.submitted_at
      });
      setSubmissionText(''); // Clear the form

    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      setError(error.message || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  }

  const isOverdue = assignment?.due_date && new Date(assignment.due_date) < new Date();
  const canSubmit = !existingSubmission && !isOverdue;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Assignment Not Found</h2>
          <p className="text-slate-600 mb-4">The assignment you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">
            {assignment.title}
          </h1>
          <p className="text-slate-600">Complete and submit your assignment</p>
        </div>

        {/* Assignment Details */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Assignment Details</h2>
              <p className="text-slate-600 mb-4">{assignment.description}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Due Date</p>
                    <p className="font-medium">
                      {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Points Possible</p>
                    <p className="font-medium">{assignment.points_possible} points</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-600">Submission Type</p>
                    <p className="font-medium capitalize">{assignment.submission_type}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="ml-4">
              {existingSubmission ? (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Submitted
                </span>
              ) : isOverdue ? (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  Overdue
                </span>
              ) : (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Open
                </span>
              )}
            </div>
          </div>

          {isOverdue && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <div>
                  <p className="text-red-800 font-medium">Assignment Overdue</p>
                  <p className="text-red-700 text-sm">This assignment was due on {new Date(assignment.due_date!).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Your Submission</h2>
          
          {assignment && (
            <Link
              to={`/courses/${assignment.course_id}/assignments/${assignmentId}/discussions`}
              className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Join Discussion</span>
            </Link>
          )}
        </div>

        {/* Submission Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
                <p className="text-green-600">{success}</p>
              </div>
            </div>
          )}

          {existingSubmission && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <p className="text-blue-800 font-medium">Assignment Already Submitted</p>
                  <p className="text-blue-700 text-sm">
                    Submitted on {new Date(existingSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Answer
              </label>
              <textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={8}
                placeholder="Enter your assignment submission here..."
                required
                disabled={!canSubmit}
              />
              <p className="text-sm text-slate-500 mt-2">
                {submissionText.length} characters
              </p>
            </div>

            {canSubmit && (
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !submissionText.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmissionText('')}
                  className="bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-400 transition min-h-[44px]"
                >
                  Clear
                </button>
              </div>
            )}

            {!canSubmit && (
              <div className="text-sm text-slate-500">
                {!existingSubmission ? (
                  isOverdue ? 'This assignment is overdue and can no longer be submitted.' : 'Submission not available'
                ) : 'This assignment has already been submitted.'}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
