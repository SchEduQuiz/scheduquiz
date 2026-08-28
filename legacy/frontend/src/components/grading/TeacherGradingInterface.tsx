// AI Grading Interface for Teachers
// Shows AI results and allows teacher adjustment and approval

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  EnhancedAssignment, 
  EnhancedSubmission, 
  AIGradingResult,
  TeacherGradingInterfaceProps,
  ScoreAdjustments 
} from '../../types/aiGrading'
import { 
  LoadingSpinner, 
  FadeIn, 
  ScaleIn 
} from '../animations/FramerAnimations'

export const TeacherGradingInterface: React.FC<TeacherGradingInterfaceProps> = ({
  assignment,
  submission,
  aiGradingResult,
  onScoreAdjustment,
  onApproveGrade,
  onRequestRegrade
}) => {
  const queryClient = useQueryClient()
  const [adjustments, setAdjustments] = useState<ScoreAdjustments>({})
  const [showAdvancedControls, setShowAdvancedControls] = useState(false)
  const [notes, setNotes] = useState('')
  const [isApproving, setIsApproving] = useState(false)

  // Update grade mutation
  const updateGradeMutation = useMutation({
    mutationFn: async ({ submissionId, adjustments, notes }: { 
      submissionId: string
      adjustments: ScoreAdjustments 
      notes: string 
    }) => {
      const { data, error } = await supabase
        .from('ai_grading_sessions')
        .insert({
          submission_id: submissionId,
          teacher_id: (await supabase.auth.getUser()).data.user?.id,
          initial_ai_score: aiGradingResult?.ai_overall_score || 0,
          final_approved_score: calculateFinalScore(adjustments),
          score_adjustments: adjustments,
          session_duration_ms: Date.now(), // This would be calculated properly
          completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update AI grading result with teacher adjustments
      if (aiGradingResult) {
        const { error: updateError } = await supabase
          .from('ai_grading_results')
          .update({
            teacher_approved: true,
            teacher_adjusted: Object.keys(adjustments).length > 0,
            final_score: calculateFinalScore(adjustments),
            teacher_notes: notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', aiGradingResult.id)

        if (updateError) throw updateError
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.invalidateQueries({ queryKey: ['ai-grading'] })
    }
  })

  const calculateFinalScore = (adj: ScoreAdjustments): number => {
    if (!aiGradingResult) return 0
    
    let totalScore = 0
    
    // Calculate with adjustments
    const contentScore = (aiGradingResult.content_score || 0) + (adj.content_adjustment || 0)
    const grammarScore = (aiGradingResult.grammar_score || 0) + (adj.grammar_adjustment || 0)
    const coherenceScore = (aiGradingResult.coherence_score || 0) + (adj.coherence_adjustment || 0)
    const relevanceScore = (aiGradingResult.relevance_score || 0) + (adj.relevance_adjustment || 0)
    
    // Apply weights (assuming the weights from the assignment config)
    const weights = {
      content: 0.2, // 20%
      grammar: 0.3, // 30%
      coherence: 0.3, // 30%
      relevance: 0.2  // 20%
    }
    
    totalScore = (contentScore * weights.content) + 
                (grammarScore * weights.grammar) + 
                (coherenceScore * weights.coherence) + 
                (relevanceScore * weights.relevance)
    
    return Math.round(totalScore * 100) / 100
  }

  const handleAdjustmentChange = (criterion: keyof ScoreAdjustments, value: number) => {
    setAdjustments(prev => ({
      ...prev,
      [criterion]: value
    }))
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await updateGradeMutation.mutateAsync({
        submissionId: submission.id,
        adjustments,
        notes
      })
      onApproveGrade(submission.id, calculateFinalScore(adjustments), notes)
    } catch (error) {
      console.error('Failed to approve grade:', error)
    } finally {
      setIsApproving(false)
    }
  }

  const handleRequestRegrade = () => {
    onRequestRegrade(submission.id, notes)
  }

  if (!aiGradingResult) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size={32} />
          <span className="ml-2 text-gray-600">AI grading in progress...</span>
        </div>
      </div>
    )
  }

  return (
    <FadeIn className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Grading Review</h2>
            <p className="text-sm text-gray-600 mt-1">
              Student: {submission.student_id} • Assignment: {assignment.title}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              {calculateFinalScore(adjustments)} / {assignment.points_possible}
            </div>
            <div className="text-sm text-gray-500">
              {Math.round((calculateFinalScore(adjustments) / assignment.points_possible) * 100)}%
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* AI Confidence and Processing Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">AI Assessment</h3>
              <p className="text-sm text-gray-600">
                AI Confidence: {Math.round(aiGradingResult.ai_confidence_score * 100)}% • 
                Processing Time: {aiGradingResult.ai_processing_time_ms}ms
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              aiGradingResult.ai_confidence_score > 0.8 
                ? 'bg-green-100 text-green-800'
                : aiGradingResult.ai_confidence_score > 0.6
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {aiGradingResult.ai_confidence_score > 0.8 ? 'High Confidence' : 
               aiGradingResult.ai_confidence_score > 0.6 ? 'Medium Confidence' : 'Low Confidence'}
            </div>
          </div>
        </div>

        {/* Detailed Scoring */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900">Detailed Assessment</h3>
          
          {/* Content Score */}
          <ScoreRow
            label="Content"
            maxPoints={20}
            originalScore={aiGradingResult.content_score}
            currentScore={aiGradingResult.content_score + (adjustments.content_adjustment || 0)}
            adjustment={adjustments.content_adjustment || 0}
            onAdjustmentChange={(value) => handleAdjustmentChange('content_adjustment', value)}
            feedback={aiGradingResult.content_feedback}
            evidence={aiGradingResult.content_evidence}
          />

          {/* Grammar Score */}
          <ScoreRow
            label="Grammar"
            maxPoints={30}
            originalScore={aiGradingResult.grammar_score}
            currentScore={aiGradingResult.grammar_score + (adjustments.grammar_adjustment || 0)}
            adjustment={adjustments.grammar_adjustment || 0}
            onAdjustmentChange={(value) => handleAdjustmentChange('grammar_adjustment', value)}
            feedback={aiGradingResult.grammar_feedback}
            evidence={aiGradingResult.grammar_issues}
          />

          {/* Coherence Score */}
          <ScoreRow
            label="Coherence"
            maxPoints={30}
            originalScore={aiGradingResult.coherence_score}
            currentScore={aiGradingResult.coherence_score + (adjustments.coherence_adjustment || 0)}
            adjustment={adjustments.coherence_adjustment || 0}
            onAdjustmentChange={(value) => handleAdjustmentChange('coherence_adjustment', value)}
            feedback={aiGradingResult.coherence_feedback}
            evidence={aiGradingResult.coherence_analysis}
          />

          {/* Relevance Score */}
          <ScoreRow
            label="Relevance"
            maxPoints={20}
            originalScore={aiGradingResult.relevance_score}
            currentScore={aiGradingResult.relevance_score + (adjustments.relevance_adjustment || 0)}
            adjustment={adjustments.relevance_adjustment || 0}
            onAdjustmentChange={(value) => handleAdjustmentChange('relevance_adjustment', value)}
            feedback={aiGradingResult.relevance_feedback}
            evidence={aiGradingResult.relevance_alignment}
          />
        </div>

        {/* AI Summary */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">AI Summary</h4>
          <p className="text-blue-800 text-sm">{aiGradingResult.ai_summary_feedback}</p>
        </div>

        {/* AI Suggestions */}
        {aiGradingResult.ai_specific_suggestions && Array.isArray(aiGradingResult.ai_specific_suggestions) && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">AI Suggestions</h4>
            <ul className="space-y-1">
              {aiGradingResult.ai_specific_suggestions.map((suggestion: any, index: number) => (
                <li key={index} className="text-yellow-800 text-sm flex items-start">
                  <span className="mr-2">•</span>
                  <span>{suggestion.suggestion}</span>
                  {suggestion.priority && (
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                      suggestion.priority === 'high' ? 'bg-red-200 text-red-800' :
                      suggestion.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {suggestion.priority}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Advanced Controls */}
        <div className="mb-6">
          <button
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showAdvancedControls ? 'Hide' : 'Show'} Advanced Controls
          </button>
        </div>

        {showAdvancedControls && (
          <ScaleIn className="mb-6 p-4 border rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Teacher Notes & Adjustments</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add overall feedback and notes for the student..."
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <strong>Original AI Score:</strong> {aiGradingResult.ai_overall_score} / {aiGradingResult.ai_total_possible}
                <br />
                <strong>Adjusted Score:</strong> {calculateFinalScore(adjustments)} / {assignment.points_possible}
                <br />
                <strong>Adjustment:</strong> {calculateFinalScore(adjustments) - aiGradingResult.ai_overall_score > 0 ? '+' : ''}
                {calculateFinalScore(adjustments) - aiGradingResult.ai_overall_score} points
              </div>
            </div>
          </ScaleIn>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div>
            <button
              onClick={handleRequestRegrade}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Request Re-grade
            </button>
          </div>
          
          <div className="space-x-3">
            <button
              onClick={() => onScoreAdjustment(submission.id, adjustments)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Save for Later
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving || updateGradeMutation.isPending}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isApproving || updateGradeMutation.isPending ? (
                <div className="flex items-center">
                  <LoadingSpinner size={16} />
                  <span className="ml-2">Approving...</span>
                </div>
              ) : (
                'Approve & Submit Grade'
              )}
            </button>
          </div>
        </div>
      </div>
    </FadeIn>
  )
}

// Individual Score Row Component
const ScoreRow: React.FC<{
  label: string
  maxPoints: number
  originalScore: number
  currentScore: number
  adjustment: number
  onAdjustmentChange: (value: number) => void
  feedback: string
  evidence: any
}> = ({ label, maxPoints, originalScore, currentScore, adjustment, onAdjustmentChange, feedback, evidence }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{label}</h4>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-600">Original: {originalScore} / {maxPoints}</div>
            <div className="font-semibold">Current: {currentScore} / {maxPoints}</div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Adjust:</label>
            <input
              type="number"
              value={adjustment}
              onChange={(e) => onAdjustmentChange(Number(e.target.value))}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              min={-maxPoints}
              max={maxPoints}
              step="0.5"
            />
          </div>
        </div>
      </div>
      
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Score Progress</span>
          <span>{Math.round((currentScore / maxPoints) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              currentScore / maxPoints >= 0.8 ? 'bg-green-500' :
              currentScore / maxPoints >= 0.6 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min((currentScore / maxPoints) * 100, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="text-sm text-gray-700">
        <p>{feedback}</p>
        {evidence && Array.isArray(evidence) && evidence.length > 0 && (
          <div className="mt-2">
            <p className="font-medium">Evidence:</p>
            <ul className="list-disc list-inside text-gray-600">
              {evidence.slice(0, 3).map((item: any, index: number) => (
                <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}