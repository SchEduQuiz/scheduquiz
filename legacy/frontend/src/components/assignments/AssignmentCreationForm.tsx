// Enhanced Assignment Creation Form
// Links assignments to lessons and configures AI grading features

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  EnhancedAssignment, 
  AssignmentCreationData, 
  AIRubricConfig,
  LessonSelectionProps 
} from '../../types/aiGrading'
import { LoadingSpinner } from '../animations/FramerAnimations'

interface AssignmentCreationFormProps {
  courseId: string
  onSuccess?: (assignment: EnhancedAssignment) => void
  onCancel?: () => void
  initialData?: Partial<EnhancedAssignment>
}

interface Lesson {
  id: string
  title: string
  content: string
  learning_objectives: any[]
}

const DEFAULT_AI_RUBRIC: AIRubricConfig = {
  content: {
    weight: 20,
    max_points: 20,
    ai_evaluation_criteria: {
      addresses_prompt: "Does the response directly address the assignment prompt?",
      demonstrates_understanding: "Shows clear understanding of lesson concepts?",
      includes_relevant_examples: "Provides appropriate examples from lesson content?",
      depth_of_analysis: "Goes beyond surface-level understanding?"
    },
    ai_model_instructions: "Evaluate content quality based on lesson learning objectives. Look for evidence of understanding key concepts, proper use of lesson-specific terminology, and inclusion of relevant examples or applications from the lesson material."
  },
  grammar: {
    weight: 30,
    max_points: 30,
    ai_evaluation_criteria: {
      sentence_structure: "Proper sentence construction and variety?",
      grammar_accuracy: "Correct grammar, punctuation, and spelling?",
      mechanical_errors: "Minimal mechanical errors?",
      writing_clarity: "Clear and understandable writing?"
    },
    ai_model_instructions: "Assess mechanical writing quality including grammar, punctuation, spelling, and sentence structure. Look for patterns of errors and overall readability."
  },
  coherence: {
    weight: 30,
    max_points: 30,
    ai_evaluation_criteria: {
      logical_flow: "Ideas flow logically from one to the next?",
      paragraph_organization: "Well-organized paragraphs with clear topics?",
      transitions: "Smooth transitions between ideas?",
      overall_structure: "Clear beginning, middle, and end?"
    },
    ai_model_instructions: "Evaluate organizational structure, logical flow of ideas, paragraphing, and transitions. Assess how well the piece holds together as a cohesive whole."
  },
  relevance: {
    weight: 20,
    max_points: 20,
    ai_evaluation_criteria: {
      lesson_alignment: "Addresses content taught in the associated lesson?",
      prompt_adherence: "Stays focused on the assignment question/task?",
      appropriate_depth: "Appropriate level of detail for the topic?",
      on_topic: "Remains on topic throughout?"
    },
    ai_model_instructions: "Compare response against lesson content and assignment requirements. Check for relevance to learning objectives and assignment prompt. Ensure content aligns with lesson material."
  }
}

export const AssignmentCreationForm: React.FC<AssignmentCreationFormProps> = ({
  courseId,
  onSuccess,
  onCancel,
  initialData
}) => {
  const queryClient = useQueryClient()
  const [selectedLessonId, setSelectedLessonId] = useState<string>('')
  const [customRubric, setCustomRubric] = useState<AIRubricConfig | null>(null)
  const [showAdvancedAI, setShowAdvancedAI] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<AssignmentCreationData>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      requirements: initialData?.requirements || '',
      due_date: initialData?.due_date || '',
      points_possible: initialData?.points_possible || 100,
      submission_type_enhanced: initialData?.submission_type_enhanced || 'ai_enhanced_text',
      allow_late_submission: initialData?.allow_late_submission ?? true,
      enable_ai_pre_check: initialData?.enable_ai_pre_check ?? false,
      ai_feedback_enabled: initialData?.ai_feedback_enabled ?? true,
      grading_approach: initialData?.grading_approach || 'ai_assisted',
      word_limit_min: initialData?.word_limit_min,
      word_limit_max: initialData?.word_limit_max,
      lesson_id: initialData?.lesson_id
    }
  })

  // Fetch lessons for the course
  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, content, learning_objectives')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true })
      
      if (error) throw error
      return data || []
    }
  })

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentCreationData) => {
      const { data: assignment, error } = await supabase
        .from('assignments')
        .insert({
          course_id: courseId,
          teacher_id: (await supabase.auth.getUser()).data.user?.id,
          title: data.title,
          description: data.description,
          requirements: data.requirements,
          due_date: data.due_date,
          points_possible: data.points_possible,
          submission_type_enhanced: data.submission_type_enhanced,
          allow_late_submission: data.allow_late_submission,
          lesson_id: data.lesson_id,
          enable_ai_pre_check: data.enable_ai_pre_check,
          ai_rubric_config: customRubric || DEFAULT_AI_RUBRIC,
          ai_feedback_enabled: data.ai_feedback_enabled,
          grading_approach: data.grading_approach,
          word_limit_min: data.word_limit_min,
          word_limit_max: data.word_limit_max
        })
        .select()
        .single()

      if (error) throw error
      return assignment
    },
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      onSuccess?.(assignment)
    }
  })

  const onSubmit = (data: AssignmentCreationData) => {
    createAssignmentMutation.mutate({
      ...data,
      lesson_id: selectedLessonId || undefined,
      custom_rubric: customRubric || undefined
    })
  }

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId)
    setValue('lesson_id', lessonId)
  }

  const handleRubricChange = (criterion: keyof AIRubricConfig, field: string, value: any) => {
    setCustomRubric(prev => ({
      ...prev!,
      [criterion]: {
        ...prev![criterion],
        [field]: value
      }
    }))
  }

  if (lessonsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size={32} />
        <span className="ml-2">Loading lessons...</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Assignment</h2>
        <p className="text-gray-600 mt-1">
          Create an assignment with AI grading capabilities and lesson integration
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Assignment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assignment Title *
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter assignment title"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the assignment objectives"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements *
            </label>
            <textarea
              {...register('requirements', { required: 'Requirements are required' })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Specify what students need to include in their responses"
            />
            {errors.requirements && (
              <p className="text-red-500 text-sm mt-1">{errors.requirements.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="datetime-local"
              {...register('due_date')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Points Possible
            </label>
            <input
              type="number"
              {...register('points_possible', { min: 1, max: 1000 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="100"
            />
          </div>
        </div>

        {/* Lesson Linking */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Link to Lesson (Optional)</h3>
          <LessonSelection
            courseId={courseId}
            selectedLessonId={selectedLessonId}
            onLessonSelect={handleLessonSelect}
            lessons={lessons || []}
          />
        </div>

        {/* Word Limits */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Word Count Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Words
              </label>
              <input
                type="number"
                {...register('word_limit_min', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Words
              </label>
              <input
                type="number"
                {...register('word_limit_max', { min: 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 500"
              />
            </div>
          </div>
        </div>

        {/* AI Features Configuration */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Grading Features</h3>
            <button
              type="button"
              onClick={() => setShowAdvancedAI(!showAdvancedAI)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showAdvancedAI ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('enable_ai_pre_check')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Enable AI Pre-submit Feedback
                <span className="block text-xs text-gray-500">
                  Students can get AI feedback before final submission
                </span>
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register('ai_feedback_enabled')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                AI-assisted Grading
                <span className="block text-xs text-gray-500">
                  AI provides initial grading suggestions for teacher review
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grading Approach
              </label>
              <select
                {...register('grading_approach')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual Grading Only</option>
                <option value="ai_assisted">AI-Assisted (Recommended)</option>
                <option value="fully_ai">Fully Automated AI</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Submission Type
              </label>
              <select
                {...register('submission_type_enhanced')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text Only</option>
                <option value="file">File Upload</option>
                <option value="both">Text + File</option>
                <option value="ai_enhanced_text">AI-Enhanced Text (Recommended)</option>
              </select>
            </div>
          </div>

          {/* Advanced AI Configuration */}
          {showAdvancedAI && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">AI Rubric Configuration</h4>
              <RubricConfiguration
                rubric={customRubric || DEFAULT_AI_RUBRIC}
                onChange={setCustomRubric}
              />
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="border-t pt-6 flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={createAssignmentMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {createAssignmentMutation.isPending ? (
              <div className="flex items-center">
                <LoadingSpinner size={16} />
                <span className="ml-2">Creating...</span>
              </div>
            ) : (
              'Create Assignment'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// Lesson Selection Component
const LessonSelection: React.FC<LessonSelectionProps & { lessons: Lesson[] }> = ({
  courseId,
  selectedLessonId,
  onLessonSelect,
  lessons,
  disabled
}) => {
  if (lessons.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No lessons available in this course.</p>
        <p className="text-sm">Create lessons first to link assignments.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <input
          type="radio"
          id="no-lesson"
          name="lesson"
          checked={!selectedLessonId}
          onChange={() => onLessonSelect('')}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
        />
        <label htmlFor="no-lesson" className="ml-2 text-sm text-gray-700">
          No specific lesson (General assignment)
        </label>
      </div>
      
      {lessons.map((lesson) => (
        <div key={lesson.id} className="flex items-start">
          <input
            type="radio"
            id={lesson.id}
            name="lesson"
            checked={selectedLessonId === lesson.id}
            onChange={() => onLessonSelect(lesson.id)}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
          />
          <label htmlFor={lesson.id} className="ml-2 text-sm text-gray-700">
            <div className="font-medium">{lesson.title}</div>
            {lesson.learning_objectives && lesson.learning_objectives.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {lesson.learning_objectives.length} learning objectives
              </div>
            )}
          </label>
        </div>
      ))}
    </div>
  )
}

// Rubric Configuration Component
const RubricConfiguration: React.FC<{
  rubric: AIRubricConfig
  onChange: (rubric: AIRubricConfig) => void
}> = ({ rubric, onChange }) => {
  const criteria = Object.keys(rubric) as Array<keyof AIRubricConfig>

  return (
    <div className="space-y-4">
      {criteria.map((criterion) => (
        <div key={criterion} className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-900 capitalize mb-2">{criterion}</h5>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Weight (%)
              </label>
              <input
                type="number"
                value={rubric[criterion].weight}
                onChange={(e) => onChange({
                  ...rubric,
                  [criterion]: {
                    ...rubric[criterion],
                    weight: Number(e.target.value)
                  }
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                max="100"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Points
              </label>
              <input
                type="number"
                value={rubric[criterion].max_points}
                onChange={(e) => onChange({
                  ...rubric,
                  [criterion]: {
                    ...rubric[criterion],
                    max_points: Number(e.target.value)
                  }
                })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="1"
                max="100"
              />
            </div>
          </div>
          
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              AI Instructions
            </label>
            <textarea
              value={rubric[criterion].ai_model_instructions}
              onChange={(e) => onChange({
                ...rubric,
                [criterion]: {
                  ...rubric[criterion],
                  ai_model_instructions: e.target.value
                }
              })}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Instructions for AI grading this criterion..."
            />
          </div>
        </div>
      ))}
      
      <div className="text-xs text-gray-500">
        Total weight: {criteria.reduce((sum, key) => sum + rubric[key].weight, 0)}%
        {criteria.reduce((sum, key) => sum + rubric[key].weight, 0) !== 100 && (
          <span className="text-red-500 ml-1">(Should equal 100%)</span>
        )}
      </div>
    </div>
  )
}