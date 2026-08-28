// Example Usage Page for AI Grading System
// Demonstrates how to integrate the new AI grading features

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssignmentCreationForm } from '../components/assignments/AssignmentCreationForm'
import { TeacherGradingInterface } from '../components/grading/TeacherGradingInterface'
import { StudentPreSubmitInterface } from '../components/grading/StudentPreSubmitInterface'
import { 
  EnhancedAssignment, 
  EnhancedSubmission, 
  AIGradingResult,
  useAssignments,
  useSubmissions,
  useAIGradingResult
} from '../hooks/useAIGrading'

const queryClient = new QueryClient()

// Example page demonstrating AI grading system integration
export const AIGradingExamplePage: React.FC = () => {
  const [selectedAssignment, setSelectedAssignment] = useState<EnhancedAssignment | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<EnhancedSubmission | null>(null)
  const [view, setView] = useState<'assignments' | 'grading' | 'student'>('assignments')

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Enhanced AI Grading System
            </h1>
            <p className="text-gray-600">
              Complete implementation of lesson-linked AI grading with Gemini API integration
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setView('assignments')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'assignments'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Assignment Management
              </button>
              <button
                onClick={() => setView('grading')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'grading'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Teacher Grading
              </button>
              <button
                onClick={() => setView('student')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  view === 'student'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Student Interface
              </button>
            </nav>
          </div>

          {/* Content based on selected view */}
          {view === 'assignments' && (
            <AssignmentManagementDemo 
              onSelectAssignment={setSelectedAssignment}
              selectedAssignment={selectedAssignment}
            />
          )}

          {view === 'grading' && selectedAssignment && (
            <TeacherGradingDemo assignment={selectedAssignment} />
          )}

          {view === 'student' && selectedAssignment && (
            <StudentInterfaceDemo assignment={selectedAssignment} />
          )}

          {!selectedAssignment && (view === 'grading' || view === 'student') && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Please select an assignment first to view the {view} interface.
              </p>
              <button
                onClick={() => setView('assignments')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Assignment Management
              </button>
            </div>
          )}
        </div>
      </div>
    </QueryClientProvider>
  )
}

// Demo component for assignment management
const AssignmentManagementDemo: React.FC<{
  onSelectAssignment: (assignment: EnhancedAssignment | null) => void
  selectedAssignment: EnhancedAssignment | null
}> = ({ onSelectAssignment, selectedAssignment }) => {
  const { data: assignments, isLoading } = useAssignments('demo-course-id')
  const [showCreateForm, setShowCreateForm] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading assignments...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Assignment Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : 'Create New Assignment'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6">
          <AssignmentCreationForm
            courseId="demo-course-id"
            onSuccess={(assignment) => {
              setShowCreateForm(false)
              onSelectAssignment(assignment)
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Assignment List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Existing Assignments ({assignments?.length || 0})
          </h3>
        </div>
        <div className="divide-y">
          {assignments?.map((assignment) => (
            <div
              key={assignment.id}
              className={`p-6 hover:bg-gray-50 cursor-pointer ${
                selectedAssignment?.id === assignment.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
              onClick={() => onSelectAssignment(assignment)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {assignment.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {assignment.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-gray-500">
                      Points: {assignment.points_possible}
                    </span>
                    {assignment.lesson_id && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Linked to Lesson
                      </span>
                    )}
                    {assignment.enable_ai_pre_check && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        AI Pre-submit Enabled
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {assignment.grading_approach}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(assignment.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )) || (
            <div className="p-6 text-center text-gray-500">
              No assignments found. Create your first assignment to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Demo component for teacher grading interface
const TeacherGradingDemo: React.FC<{ assignment: EnhancedAssignment }> = ({ assignment }) => {
  const { data: submissions, isLoading } = useSubmissions(assignment.id)
  const [selectedSubmission, setSelectedSubmission] = useState<EnhancedSubmission | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading submissions...</div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Submissions List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Submissions ({submissions?.length || 0})
            </h3>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {submissions?.map((submission) => (
              <div
                key={submission.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${
                  selectedSubmission?.id === submission.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedSubmission(submission)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      Student ID: {submission.student_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {submission.ai_grading_result ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        AI Graded
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )) || (
              <div className="p-4 text-center text-gray-500">
                No submissions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grading Interface */}
      <div className="lg:col-span-2">
        {selectedSubmission ? (
          <SubmissionGradingWrapper 
            assignment={assignment} 
            submission={selectedSubmission} 
          />
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">
              Select a submission to view the AI grading interface.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrapper for the teacher grading interface with mock data
const SubmissionGradingWrapper: React.FC<{
  assignment: EnhancedAssignment
  submission: EnhancedSubmission
}> = ({ assignment, submission }) => {
  const { data: aiGradingResult } = useAIGradingResult(submission.id)

  const handleScoreAdjustment = (submissionId: string, adjustments: any) => {
    console.log('Score adjustment:', submissionId, adjustments)
  }

  const handleApproveGrade = (submissionId: string, finalScore: number, notes: string) => {
    console.log('Grade approved:', submissionId, finalScore, notes)
  }

  const handleRequestRegrade = (submissionId: string, reason: string) => {
    console.log('Regrade requested:', submissionId, reason)
  }

  return (
    <TeacherGradingInterface
      assignment={assignment}
      submission={submission}
      aiGradingResult={aiGradingResult || undefined}
      onScoreAdjustment={handleScoreAdjustment}
      onApproveGrade={handleApproveGrade}
      onRequestRegrade={handleRequestRegrade}
    />
  )
}

// Demo component for student interface
const StudentInterfaceDemo: React.FC<{ assignment: EnhancedAssignment }> = ({ assignment }) => {
  const [draftText, setDraftText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFeedbackUpdate = (feedback: any) => {
    console.log('Feedback updated:', feedback)
  }

  const handleSubmitDraft = () => {
    setIsSubmitting(true)
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false)
      console.log('Draft submitted:', draftText)
    }, 2000)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Assignment Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {assignment.title}
        </h2>
        <p className="text-gray-600 mb-4">{assignment.description}</p>
        
        {assignment.requirements && (
          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Requirements:</h3>
            <p className="text-sm text-gray-700">{assignment.requirements}</p>
          </div>
        )}

        {assignment.word_limit_min && assignment.word_limit_max && (
          <div className="text-sm text-gray-600">
            Word Count: {assignment.word_limit_min} - {assignment.word_limit_max} words
          </div>
        )}
      </div>

      {/* Draft Editor */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Your Draft</h3>
        <textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Start writing your assignment here..."
        />
        <div className="mt-2 text-sm text-gray-500">
          Word count: {draftText.trim().split(/\s+/).filter(word => word.length > 0).length}
        </div>
      </div>

      {/* AI Feedback Interface */}
      {assignment.enable_ai_pre_check && (
        <StudentPreSubmitInterface
          assignment={assignment}
          draftText={draftText}
          onFeedbackUpdate={handleFeedbackUpdate}
          onSubmitDraft={handleSubmitDraft}
          isSubmitting={isSubmitting}
        />
      )}

      {!assignment.enable_ai_pre_check && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">
            AI pre-submit feedback is not available for this assignment.
          </p>
          <button
            onClick={handleSubmitDraft}
            disabled={isSubmitting || !draftText.trim()}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
          </button>
        </div>
      )}
    </div>
  )
}

export default AIGradingExamplePage