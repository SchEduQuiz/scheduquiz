// React Query Hooks for AI Grading System
// Provides data fetching and mutations for AI grading features

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  EnhancedAssignment,
  EnhancedSubmission,
  AIGradingResult,
  AIPreSubmitFeedback,
  AssignmentCreationData,
  AIGradingDashboard,
  AssignmentStatistics
} from '../types/aiGrading'

// Re-export types for convenience
export type {
  EnhancedAssignment,
  EnhancedSubmission,
  AIGradingResult,
  AIPreSubmitFeedback,
  AssignmentCreationData,
  AIGradingDashboard,
  AssignmentStatistics
}

// Assignment Hooks
export const useAssignments = (courseId?: string) => {
  return useQuery<EnhancedAssignment[]>({
    queryKey: ['assignments', courseId],
    queryFn: async () => {
      if (!courseId) return []
      
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          lessons (
            id,
            title,
            content,
            learning_objectives
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!courseId
  })
}

export const useAssignment = (assignmentId: string) => {
  return useQuery<EnhancedAssignment>({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          lessons (
            id,
            title,
            content,
            learning_objectives
          )
        `)
        .eq('id', assignmentId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!assignmentId
  })
}

export const useCreateAssignment = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (assignmentData: AssignmentCreationData) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('assignments')
        .insert({
          course_id: assignmentData.course_id,
          teacher_id: user.user.id,
          title: assignmentData.title,
          description: assignmentData.description,
          requirements: assignmentData.requirements,
          due_date: assignmentData.due_date,
          points_possible: assignmentData.points_possible,
          submission_type_enhanced: assignmentData.submission_type_enhanced,
          allow_late_submission: assignmentData.allow_late_submission,
          lesson_id: assignmentData.lesson_id,
          enable_ai_pre_check: assignmentData.enable_ai_pre_check,
          ai_rubric_config: assignmentData.custom_rubric,
          ai_feedback_enabled: assignmentData.ai_feedback_enabled,
          grading_approach: assignmentData.grading_approach,
          word_limit_min: assignmentData.word_limit_min,
          word_limit_max: assignmentData.word_limit_max
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      queryClient.setQueryData(['assignment', assignment.id], assignment)
    }
  })
}

// Submission Hooks
export const useSubmissions = (assignmentId: string) => {
  return useQuery<EnhancedSubmission[]>({
    queryKey: ['submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles!submissions_student_id_fkey (
            id,
            full_name,
            email
          ),
          ai_grading_results (*)
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!assignmentId
  })
}

export const useSubmission = (submissionId: string) => {
  return useQuery<EnhancedSubmission>({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          profiles!submissions_student_id_fkey (
            id,
            full_name,
            email
          ),
          assignments!submissions_assignment_id_fkey (
            *,
            lessons (
              id,
              title,
              content,
              learning_objectives
            )
          ),
          ai_grading_results (*)
        `)
        .eq('id', submissionId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!submissionId
  })
}

export const useCreateSubmission = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (submissionData: {
      assignment_id: string
      submission_text?: string
      file_url?: string
      file_name?: string
    }) => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('submissions')
        .insert({
          assignment_id: submissionData.assignment_id,
          student_id: user.user.id,
          submission_text: submissionData.submission_text,
          file_url: submissionData.file_url,
          file_name: submissionData.file_name,
          status: 'submitted'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] })
      queryClient.setQueryData(['submission', submission.id], submission)
    }
  })
}

// AI Grading Hooks
export const useAIGradingResult = (submissionId: string) => {
  return useQuery<AIGradingResult>({
    queryKey: ['ai-grading', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_grading_results')
        .select('*')
        .eq('submission_id', submissionId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!submissionId
  })
}

export const useTriggerAIGrading = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: {
      submission_id: string
      assignment_id: string
      draft_text: string
      word_count: number
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-essay-grading', {
        body: params
      })

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['ai-grading', variables.submission_id] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
      }
    }
  })
}

export const useAIGradingDashboard = (assignmentId: string) => {
  return useQuery<AIGradingDashboard>({
    queryKey: ['ai-grading-dashboard', assignmentId],
    queryFn: async () => {
      // This would typically be a custom function or view
      const { data, error } = await supabase
        .from('ai_grading_results')
        .select(`
          *,
          submissions!ai_grading_results_submission_id_fkey (
            id,
            student_id,
            profiles!submissions_student_id_fkey (
              full_name
            )
          )
        `)
        .eq('assignment_id', assignmentId)

      if (error) throw error

      // Process the data to create dashboard metrics
      const results = data || []
      const totalSubmissions = results.length
      const aiGradedCount = results.filter(r => r.ai_overall_score !== null).length
      const teacherReviewedCount = results.filter(r => r.teacher_approved).length
      const pendingReview = totalSubmissions - teacherReviewedCount

      const averageAIScore = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.ai_overall_score || 0), 0) / results.length
        : 0

      const averageFinalScore = results
        .filter(r => r.teacher_approved && r.final_score)
        .reduce((sum, r) => sum + (r.final_score || 0), 0) / 
        (results.filter(r => r.teacher_approved && r.final_score).length || 1)

      const aiTeacherAgreement = teacherReviewedCount > 0
        ? results
            .filter(r => r.teacher_approved && r.final_score && r.ai_overall_score)
            .filter(r => Math.abs((r.final_score || 0) - r.ai_overall_score) <= 5)
            .length / teacherReviewedCount
        : 0

      return {
        assignment_id: assignmentId,
        total_submissions: totalSubmissions,
        ai_graded_count: aiGradedCount,
        teacher_review_count: teacherReviewedCount,
        pending_review: pendingReview,
        average_ai_score: Math.round(averageAIScore * 100) / 100,
        average_final_score: Math.round(averageFinalScore * 100) / 100,
        ai_teacher_agreement: Math.round(aiTeacherAgreement * 100) / 100,
        recent_gradings: results
          .filter(r => r.teacher_approved)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map(r => ({
            submission_id: r.submission_id,
            student_name: r.submissions?.profiles?.full_name || 'Unknown',
            ai_score: r.ai_overall_score || 0,
            final_score: r.final_score || 0,
            review_time: r.created_at,
            ai_confidence: r.ai_confidence_score || 0
          }))
      }
    },
    enabled: !!assignmentId
  })
}

// Pre-submit Feedback Hooks
export const usePreSubmitFeedback = (studentId: string, assignmentId: string) => {
  return useQuery<AIPreSubmitFeedback[]>({
    queryKey: ['pre-submit-feedback', studentId, assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_pre_submit_feedback')
        .select('*')
        .eq('student_id', studentId)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data || []
    },
    enabled: !!studentId && !!assignmentId
  })
}

export const useGetPreSubmitFeedback = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: {
      student_id: string
      assignment_id: string
      draft_text: string
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-pre-submit-feedback', {
        body: params
      })

      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ 
          queryKey: ['pre-submit-feedback', variables.student_id, variables.assignment_id] 
        })
      }
    }
  })
}

// Statistics Hooks
export const useAssignmentStatistics = (assignmentId: string) => {
  return useQuery<AssignmentStatistics>({
    queryKey: ['assignment-statistics', assignmentId],
    queryFn: async () => {
      // Get submissions with grades
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          id,
          status,
          ai_grading_results (
            ai_overall_score,
            ai_confidence_score,
            teacher_approved
          ),
          grades (
            points_earned
          )
        `)
        .eq('assignment_id', assignmentId)

      if (submissionsError) throw submissionsError

      // Process statistics
      const totalSubmissions = submissions?.length || 0
      const gradedCount = submissions?.filter(s => s.grades && s.grades.length > 0).length || 0
      const pendingCount = totalSubmissions - gradedCount

      const scores = submissions
        ?.filter(s => s.grades && s.grades.length > 0)
        .map(s => s.grades![0].points_earned) || []

      const averageScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0

      // Score distribution
      const distribution = {
        '0-20': scores.filter(s => s >= 0 && s <= 20).length,
        '21-40': scores.filter(s => s > 20 && s <= 40).length,
        '41-60': scores.filter(s => s > 40 && s <= 60).length,
        '61-80': scores.filter(s => s > 60 && s <= 80).length,
        '81-100': scores.filter(s => s > 80 && s <= 100).length
      }

      // AI performance metrics
      const aiResults = submissions
        ?.filter(s => s.ai_grading_results && s.ai_grading_results.length > 0)
        .map(s => s.ai_grading_results![0]) || []

      const averageAIConfidence = aiResults.length > 0
        ? aiResults.reduce((sum, result) => sum + (result.ai_confidence_score || 0), 0) / aiResults.length
        : 0

      const teacherAdjustmentRate = aiResults.length > 0
        ? aiResults.filter(result => result.teacher_approved && !result.teacher_adjusted).length / aiResults.length
        : 0

      // Most common feedback themes (this would need more sophisticated analysis in production)
      const commonFeedbackThemes = [
        'Content depth and understanding',
        'Writing mechanics and grammar',
        'Organization and flow',
        'Relevance to assignment'
      ]

      const completionRate = totalSubmissions > 0 ? (gradedCount / totalSubmissions) * 100 : 0

      return {
        assignment_id: assignmentId,
        total_submissions: totalSubmissions,
        graded_count: gradedCount,
        pending_count: pendingCount,
        average_score: Math.round(averageScore * 100) / 100,
        score_distribution: distribution,
        ai_performance: {
          average_ai_confidence: Math.round(averageAIConfidence * 100) / 100,
          teacher_adjustment_rate: Math.round(teacherAdjustmentRate * 100) / 100,
          most_common_adjustments: commonFeedbackThemes
        },
        common_feedback_themes: commonFeedbackThemes,
        completion_rate: Math.round(completionRate * 100) / 100
      }
    },
    enabled: !!assignmentId
  })
}

// Bulk Operations Hooks
export const useBulkAIGrading = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (params: {
      assignment_id: string
      submission_ids: string[]
    }) => {
      const results = []
      const errors = []

      for (const submissionId of params.submission_ids) {
        try {
          // This would trigger AI grading for each submission
          // Implementation depends on your batch processing strategy
          results.push({ submission_id: submissionId, success: true })
        } catch (error) {
          errors.push({ submission_id: submissionId, error: error.message })
        }
      }

      return {
        total_processed: params.submission_ids.length,
        successful: results.length,
        failed: errors.length,
        errors,
        results
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', variables.assignment_id] })
      queryClient.invalidateQueries({ queryKey: ['ai-grading-dashboard', variables.assignment_id] })
    }
  })
}

// Real-time Subscriptions
export const useAIGradingRealtime = (assignmentId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`ai-grading-${assignmentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'ai_grading_results',
        filter: `assignment_id=eq.${assignmentId}`
      },
      callback
    )
    .subscribe()
}