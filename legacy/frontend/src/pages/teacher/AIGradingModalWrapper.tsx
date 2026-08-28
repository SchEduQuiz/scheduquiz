// AI Grading Modal Wrapper
// Wraps TeacherGradingInterface and provides fallback to manual grading
// Integrates AI grading system with teacher dashboard

import React, { useState, useEffect } from 'react';
import { TeacherGradingInterface } from '../../components/grading/TeacherGradingInterface';
import { 
  useSubmission, 
  useAIGradingResult, 
  useAssignment as useAssignmentAI,
  useTriggerAIGrading
} from '../../hooks/useAIGrading';
import { supabase } from '../../lib/supabase';
import { X, Sparkles, FileText, Award } from 'lucide-react';
import type { EnhancedAssignment, EnhancedSubmission, AIGradingResult, ScoreAdjustments } from '../../types/aiGrading';

interface AIGradingModalWrapperProps {
  submissionId: string;
  assignmentId: string;
  submission: any;
  onClose: () => void;
  onGradeComplete: () => void;
}

export function AIGradingModalWrapper({
  submissionId,
  assignmentId,
  submission: initialSubmission,
  onClose,
  onGradeComplete
}: AIGradingModalWrapperProps) {
  const [useManualGrading, setUseManualGrading] = useState(false);
  const [gradingData, setGradingData] = useState({ points: 0, feedback: '' });
  const [isTriggeringAI, setIsTriggeringAI] = useState(false);

  // Fetch enhanced submission and assignment data
  const { data: enhancedSubmission, isLoading: submissionLoading } = useSubmission(submissionId);
  const { data: assignment, isLoading: assignmentLoading } = useAssignmentAI(assignmentId);
  const { data: aiGradingResult, isLoading: aiLoading, refetch: refetchAI } = useAIGradingResult(submissionId);
  const triggerAIGrading = useTriggerAIGrading();

  // Determine if assignment has AI grading enabled
  const hasAIGrading = assignment?.grading_approach === 'ai_assisted' || assignment?.grading_approach === 'fully_ai';
  const hasAIFeedback = assignment?.ai_feedback_enabled;

  // Load existing grade if any
  useEffect(() => {
    async function loadExistingGrade() {
      try {
        const { data: existingGrade } = await supabase
          .from('grades')
          .select('points_earned, feedback')
          .eq('submission_id', submissionId)
          .maybeSingle();

        if (existingGrade) {
          setGradingData({
            points: existingGrade.points_earned || 0,
            feedback: existingGrade.feedback || ''
          });
        }
      } catch (error) {
        console.error('Error loading existing grade:', error);
      }
    }

    loadExistingGrade();
  }, [submissionId]);

  // Trigger AI grading if assignment has AI enabled and no result exists
  useEffect(() => {
    if (
      assignment &&
      enhancedSubmission &&
      hasAIGrading &&
      !aiGradingResult &&
      enhancedSubmission.submission_text &&
      !isTriggeringAI &&
      enhancedSubmission.status === 'submitted'
    ) {
      triggerAIGradingAutomatically();
    }
  }, [assignment, enhancedSubmission, hasAIGrading, aiGradingResult, isTriggeringAI]);

  async function triggerAIGradingAutomatically() {
    if (!assignment || !enhancedSubmission || !enhancedSubmission.submission_text) return;

    setIsTriggeringAI(true);
    try {
      const wordCount = enhancedSubmission.submission_text.split(/\s+/).filter(Boolean).length;
      await triggerAIGrading.mutateAsync({
        submission_id: submissionId,
        assignment_id: assignmentId,
        draft_text: enhancedSubmission.submission_text,
        word_count: wordCount
      });
      // Refetch AI grading result
      await refetchAI();
    } catch (error) {
      console.error('Error triggering AI grading:', error);
      // Fall back to manual grading if AI fails
      setUseManualGrading(true);
    } finally {
      setIsTriggeringAI(false);
    }
  }

  async function handleScoreAdjustment(submissionId: string, adjustments: ScoreAdjustments) {
    // This is handled by TeacherGradingInterface
    console.log('Score adjustments:', adjustments);
  }

  async function handleApproveGrade(submissionId: string, finalScore: number, notes: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to approve grades');
        return;
      }

      // Get submission details
      const submission = enhancedSubmission || initialSubmission;
      if (!submission) return;

      // Create or update grade
      const { error: gradeError } = await supabase
        .from('grades')
        .upsert({
          submission_id: submissionId,
          assignment_id: assignmentId,
          student_id: submission.student_id,
          teacher_id: user.id,
          points_earned: finalScore,
          feedback: notes || '',
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'submission_id'
        });

      if (gradeError) {
        console.error('Error saving grade:', gradeError);
        alert(`Error saving grade: ${gradeError.message}`);
        return;
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ 
          status: 'graded',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Error updating submission status:', updateError);
        alert(`Error updating submission status: ${updateError.message}`);
        return;
      }

      onGradeComplete();
    } catch (error: any) {
      console.error('Error approving grade:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    }
  }

  async function handleRequestRegrade(submissionId: string, reason: string) {
    try {
      // Trigger new AI grading
      if (enhancedSubmission?.submission_text) {
        const wordCount = enhancedSubmission.submission_text.split(/\s+/).filter(Boolean).length;
        await triggerAIGrading.mutateAsync({
          submission_id: submissionId,
          assignment_id: assignmentId,
          draft_text: enhancedSubmission.submission_text,
          word_count: wordCount
        });
        await refetchAI();
      }
    } catch (error) {
      console.error('Error requesting regrade:', error);
      alert('Error requesting regrade. Please try again.');
    }
  }

  async function handleManualGradeSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to grade submissions');
        return;
      }

      const submission = enhancedSubmission || initialSubmission;
      if (!submission) return;

      // Validate points
      const maxPoints = assignment?.points_possible || 100;
      if (gradingData.points < 0 || gradingData.points > maxPoints) {
        alert(`Points must be between 0 and ${maxPoints}`);
        return;
      }

      // Create or update grade
      const { error: gradeError } = await supabase
        .from('grades')
        .upsert({
          submission_id: submissionId,
          assignment_id: assignmentId,
          student_id: submission.student_id,
          teacher_id: user.id,
          points_earned: gradingData.points,
          feedback: gradingData.feedback || null,
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'submission_id'
        });

      if (gradeError) {
        console.error('Error saving grade:', gradeError);
        alert(`Error saving grade: ${gradeError.message}`);
        return;
      }

      // Update submission status
      const { error: updateError } = await supabase
        .from('submissions')
        .update({ 
          status: 'graded',
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (updateError) {
        console.error('Error updating submission status:', updateError);
        alert(`Error updating submission status: ${updateError.message}`);
        return;
      }

      onGradeComplete();
    } catch (error: any) {
      console.error('Error submitting grade:', error);
      alert(`Error submitting grade: ${error.message || 'Unknown error'}`);
    }
  }

  const isLoading = submissionLoading || assignmentLoading;
  const submission = enhancedSubmission || initialSubmission;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading submission data...</p>
        </div>
      </div>
    );
  }

  // Use AI grading interface if:
  // 1. Assignment has AI grading enabled
  // 2. AI grading result exists or is loading
  // 3. User hasn't explicitly chosen manual grading
  const shouldUseAIGrading = hasAIGrading && (aiGradingResult || aiLoading || isTriggeringAI) && !useManualGrading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">Grade Submission</h2>
              {hasAIGrading && (
                <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI-Enhanced
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasAIGrading && !useManualGrading && (
                <button
                  onClick={() => setUseManualGrading(true)}
                  className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Switch to Manual
                </button>
              )}
              {useManualGrading && hasAIGrading && (
                <button
                  onClick={() => setUseManualGrading(false)}
                  className="px-3 py-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Use AI Grading
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {shouldUseAIGrading && assignment && submission && (
            <>
              {isTriggeringAI || aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-slate-600">AI is analyzing the submission...</p>
                  <p className="text-sm text-slate-500 mt-2">This may take a few moments</p>
                </div>
              ) : aiGradingResult ? (
                <TeacherGradingInterface
                  assignment={assignment as EnhancedAssignment}
                  submission={submission as EnhancedSubmission}
                  aiGradingResult={aiGradingResult}
                  onScoreAdjustment={handleScoreAdjustment}
                  onApproveGrade={handleApproveGrade}
                  onRequestRegrade={handleRequestRegrade}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800">
                    AI grading result not available. Please use manual grading or trigger AI grading.
                  </p>
                  <button
                    onClick={triggerAIGradingAutomatically}
                    disabled={isTriggeringAI}
                    className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                  >
                    {isTriggeringAI ? 'Processing...' : 'Trigger AI Grading'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Manual Grading Fallback */}
          {(useManualGrading || !hasAIGrading || (!aiGradingResult && !aiLoading && !isTriggeringAI)) && (
            <div className="space-y-6">
              {/* Submission Details */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Submission Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Student:</span> {submission?.profiles?.full_name || (submission as any)?.profiles?.full_name || 'Unknown'}</p>
                  <p><span className="font-medium">Assignment:</span> {assignment?.title || (submission as any)?.assignments?.title || 'Unknown'}</p>
                  {assignment?.due_date && (
                    <p>
                      <span className="font-medium">Due Date:</span> {new Date(assignment.due_date).toLocaleDateString()}
                      {new Date(assignment.due_date) < new Date() && (
                        <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Overdue</span>
                      )}
                    </p>
                  )}
                  <p><span className="font-medium">Submitted:</span> {submission?.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'Not submitted yet'}</p>
                  {assignment?.points_possible && (
                    <p><span className="font-medium">Max Points:</span> {assignment.points_possible}</p>
                  )}
                  {assignment?.lesson_id && assignment?.lesson && (
                    <p><span className="font-medium">Linked Lesson:</span> {assignment.lesson.title}</p>
                  )}
                </div>
              </div>

              {/* Submission Content */}
              {submission?.submission_text && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3">Student Submission</h3>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{submission.submission_text}</p>
                  </div>
                </div>
              )}

              {/* File Submission */}
              {submission?.file_url && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3">File Submission</h3>
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <a 
                      href={submission.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {submission.file_name || 'Download File'}
                    </a>
                  </div>
                </div>
              )}

              {/* Manual Grading Form */}
              <form onSubmit={handleManualGradeSubmit} className="space-y-4 border-t pt-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Points Awarded</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gradingData.points}
                    onChange={(e) => setGradingData({ ...gradingData, points: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max={assignment?.points_possible || 100}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Out of {assignment?.points_possible || 100} points
                    {assignment?.points_possible && (
                      <span className="ml-2">
                        ({Math.round((gradingData.points / assignment.points_possible) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Feedback (Optional)</label>
                  <textarea
                    value={gradingData.feedback}
                    onChange={(e) => setGradingData({ ...gradingData, feedback: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Provide constructive feedback to the student..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Award className="h-4 w-4" />
                    Submit Grade
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-slate-300 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-400 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

