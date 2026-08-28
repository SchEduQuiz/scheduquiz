// Student Pre-submit AI Feedback Interface
// Provides AI feedback and suggestions before final submission

// @ts-ignore - Type mismatches with AIPreSubmitFeedback structure
import React, { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  EnhancedAssignment, 
  AIPreSubmitFeedback,
  StudentPreSubmitInterfaceProps
} from '../../types/aiGrading'
import { 
  LoadingSpinner, 
  FadeIn, 
  ScaleIn,
  SuccessAnimation,
  Toast 
} from '../animations/FramerAnimations'

export const StudentPreSubmitInterface: React.FC<StudentPreSubmitInterfaceProps> = ({
  assignment,
  draftText,
  onFeedbackUpdate,
  onSubmitDraft,
  isSubmitting
}) => {
  const [feedback, setFeedback] = useState<AIPreSubmitFeedback | null>(null)
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // Calculate word count
  useEffect(() => {
    const words = draftText.trim().split(/\s+/).filter(word => word.length > 0)
    setWordCount(words.length)
  }, [draftText])

  // Get AI feedback mutation
  const getFeedbackMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      const { data, error } = await supabase.functions.invoke('ai-pre-submit-feedback', {
        body: {
          student_id: user.user.id,
          assignment_id: assignment.id,
          draft_text: draftText
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.success && data.data?.feedback) {
        setFeedback(data.data.feedback)
        onFeedbackUpdate(data.data.feedback)
        setFeedbackError(null)
      } else {
        setFeedbackError(data.error || 'Failed to get AI feedback')
      }
    },
    onError: (error: any) => {
      setFeedbackError(error.message || 'Failed to get AI feedback')
    }
  })

  const handleGetFeedback = () => {
    if (!draftText.trim()) {
      setFeedbackError('Please write something to get feedback')
      return
    }
    getFeedbackMutation.mutate()
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 80) return 'bg-green-100'
    if (percentage >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const wordCountFeedback = () => {
    if (assignment.word_limit_min && wordCount < assignment.word_limit_min) {
      return {
        message: `Below minimum (${assignment.word_limit_min} words)`,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      }
    } else if (assignment.word_limit_max && wordCount > assignment.word_limit_max) {
      return {
        message: `Exceeds maximum (${assignment.word_limit_max} words)`,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      }
    } else if (assignment.word_limit_min && assignment.word_limit_max) {
      return {
        message: 'Within range',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      }
    } else {
      return {
        message: 'No specific limits',
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
      }
    }
  }

  const wordCountStatus = wordCountFeedback()

  if (!assignment.enable_ai_pre_check) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">AI pre-submit feedback is not available for this assignment.</p>
        </div>
      </div>
    )
  }

  return (
    <FadeIn className="space-y-6">
      {/* Header with Word Count */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Pre-submit Feedback</h2>
            <p className="text-sm text-gray-600">Get feedback on your draft before submission</p>
          </div>
          <div className={`px-3 py-2 rounded-lg ${wordCountStatus.bgColor}`}>
            <div className="text-sm font-medium text-gray-700">Word Count</div>
            <div className="text-lg font-bold text-gray-900">{wordCount}</div>
            <div className={`text-xs ${wordCountStatus.color}`}>{wordCountStatus.message}</div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleGetFeedback}
            disabled={getFeedbackMutation.isPending || !draftText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {getFeedbackMutation.isPending ? (
              <div className="flex items-center">
                <LoadingSpinner size={16} />
                <span className="ml-2">Getting Feedback...</span>
              </div>
            ) : (
              'Get AI Feedback'
            )}
          </button>
          
          {feedback && (
            <button
              onClick={() => setShowDetailedFeedback(!showDetailedFeedback)}
              className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {showDetailedFeedback ? 'Hide' : 'Show'} Detailed Analysis
            </button>
          )}
        </div>

        {feedbackError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{feedbackError}</p>
          </div>
        )}
      </div>

      {/* Feedback Results */}
      {feedback && (
        <ScaleIn className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Summary Header */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Assessment</h3>
                <p className="text-sm text-gray-600">
                  Overall Score: {Math.round(feedback.overall_score * 100) / 100}%
                  • Confidence: {Math.round(feedback.confidence_level * 100)}%
                </p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${
                  feedback.overall_score >= 80 ? 'text-green-600' :
                  feedback.overall_score >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(feedback.overall_score)}%
                </div>
                <div className="text-sm text-gray-500">Overall</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Category Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <ScoreCard
                title="Content"
                score={feedback.feedback_sections.content.score}
                maxScore={20}
                color="blue"
                feedback={feedback.feedback_sections.content.feedback}
              />
              <ScoreCard
                title="Grammar"
                score={feedback.feedback_sections.grammar.score}
                maxScore={30}
                color="green"
                feedback={feedback.feedback_sections.grammar.feedback}
              />
              <ScoreCard
                title="Coherence"
                score={feedback.feedback_sections.coherence.score}
                maxScore={30}
                color="purple"
                feedback={feedback.feedback_sections.coherence.feedback}
              />
              <ScoreCard
                title="Relevance"
                score={feedback.feedback_sections.relevance.score}
                maxScore={20}
                color="orange"
                feedback={feedback.feedback_sections.relevance.feedback}
              />
            </div>

            {/* Detailed Feedback */}
            {showDetailedFeedback && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Detailed Analysis</h4>
                
                <FeedbackSection
                  title="Content"
                  score={feedback.feedback_sections.content.score}
                  maxScore={20}
                  feedback={feedback.feedback_sections.content.feedback}
                  suggestions={feedback.feedback_sections.content.suggestions}
                />
                
                <FeedbackSection
                  title="Grammar"
                  score={feedback.feedback_sections.grammar.score}
                  maxScore={30}
                  feedback={feedback.feedback_sections.grammar.feedback}
                  suggestions={feedback.feedback_sections.grammar.suggestions}
                />
                
                <FeedbackSection
                  title="Coherence"
                  score={feedback.feedback_sections.coherence.score}
                  maxScore={30}
                  feedback={feedback.feedback_sections.coherence.feedback}
                  suggestions={feedback.feedback_sections.coherence.suggestions}
                />
                
                <FeedbackSection
                  title="Relevance"
                  score={feedback.feedback_sections.relevance.score}
                  maxScore={20}
                  feedback={feedback.feedback_sections.relevance.feedback}
                  suggestions={feedback.feedback_sections.relevance.suggestions}
                />
              </div>
            )}

            {/* General Suggestions */}
            {feedback.general_suggestions.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">General Suggestions</h4>
                <ul className="space-y-1">
                  {feedback.general_suggestions.map((suggestion, index) => (
                    <li key={index} className="text-blue-800 text-sm flex items-start">
                      <span className="mr-2">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Priority Improvements */}
            {feedback.priority_improvements.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Priority Areas to Improve</h4>
                <div className="flex flex-wrap gap-2">
                  {feedback.priority_improvements.map((area, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-medium"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleString()}
              </div>
              <div className="space-x-3">
                <button
                  onClick={handleGetFeedback}
                  disabled={getFeedbackMutation.isPending}
                  className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Refresh Feedback
                </button>
                <button
                  onClick={onSubmitDraft}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <LoadingSpinner size={16} />
                      <span className="ml-2">Submitting...</span>
                    </div>
                  ) : (
                    'Submit Assignment'
                  )}
                </button>
              </div>
            </div>
          </div>
        </ScaleIn>
      )}

      {/* No Feedback State */}
      {!feedback && !getFeedbackMutation.isPending && !feedbackError && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for AI Feedback?</h3>
          <p className="text-gray-500 mb-4">
            Click "Get AI Feedback" to receive detailed analysis and suggestions for improvement.
          </p>
          <p className="text-sm text-gray-400">
            AI will analyze content, grammar, coherence, and relevance based on your lesson and assignment requirements.
          </p>
        </div>
      )}
    </FadeIn>
  )
}

// Score Card Component
const ScoreCard: React.FC<{
  title: string
  score: number
  maxScore: number
  color: 'blue' | 'green' | 'purple' | 'orange'
  feedback: string
}> = ({ title, score, maxScore, color, feedback }) => {
  const percentage = (score / maxScore) * 100
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100'
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="text-center">
        <div className={`text-2xl font-bold ${colorClasses[color].split(' ')[0]}`}>
          {Math.round(score * 100) / 100}
        </div>
        <div className="text-sm text-gray-600">/ {maxScore}</div>
        <div className="text-xs text-gray-500 mt-1">{title}</div>
      </div>
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full ${colorClasses[color].split(' ')[1]}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Feedback Section Component
const FeedbackSection: React.FC<{
  title: string
  score: number
  maxScore: number
  feedback: string
  suggestions: string[]
}> = ({ title, score, maxScore, feedback, suggestions }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-semibold text-gray-900">{title}</h5>
        <div className="text-sm font-medium text-gray-600">
          {score} / {maxScore}
        </div>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{feedback}</p>
      
      {suggestions.length > 0 && (
        <div>
          <h6 className="text-xs font-medium text-gray-600 mb-1">Suggestions:</h6>
          <ul className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-xs text-gray-600 flex items-start">
                <span className="mr-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}