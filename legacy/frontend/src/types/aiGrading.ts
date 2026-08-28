// Enhanced Assignment and AI Grading Types
// Integrates lesson linking, AI grading, and pre-submit feedback

// Enhanced Assignment Interface
export interface EnhancedAssignment {
  id: string
  course_id: string
  teacher_id: string
  title: string
  description?: string
  requirements?: string
  due_date?: string
  points_possible: number
  allow_late_submission: boolean
  submission_type_enhanced: 'text' | 'file' | 'both' | 'ai_enhanced_text'
  
  // Lesson Integration
  lesson_id?: string
  lesson?: {
    id: string
    title: string
    content: string
    learning_objectives: any[]
  }
  
  // AI Features
  enable_ai_pre_check: boolean
  ai_rubric_config: AIRubricConfig
  ai_feedback_enabled: boolean
  grading_approach: 'manual' | 'ai_assisted' | 'fully_ai'
  ai_model_config: AIModelConfig
  
  // Word Limits
  word_limit_min?: number
  word_limit_max?: number
  
  created_at: string
  updated_at: string
}

// AI Rubric Configuration
export interface AIRubricConfig {
  content: RubricCriterion
  grammar: RubricCriterion
  coherence: RubricCriterion
  relevance: RubricCriterion
}

export interface RubricCriterion {
  weight: number
  max_points: number
  ai_evaluation_criteria: Record<string, string>
  ai_model_instructions: string
}

export interface AIModelConfig {
  model_version: string
  confidence_threshold: number
  enable_detailed_feedback: boolean
  custom_instructions?: string
}

// AI Grading Results
export interface AIGradingResult {
  id: string
  submission_id: string
  assignment_id: string
  
  // Overall Assessment
  ai_overall_score: number
  ai_total_possible: number
  ai_confidence_score: number
  ai_processing_time_ms: number
  
  // Detailed Scores
  content_score: number
  content_feedback: string
  content_evidence: any
  
  grammar_score: number
  grammar_feedback: string
  grammar_issues: any
  
  coherence_score: number
  coherence_feedback: string
  coherence_analysis: any
  
  relevance_score: number
  relevance_feedback: string
  relevance_alignment: any
  
  // AI Feedback
  ai_summary_feedback: string
  ai_specific_suggestions: any
  ai_improvement_areas: any
  
  // Processing
  ai_model_version: string
  processing_timestamp: string
  
  // Teacher Approval
  teacher_approved: boolean
  teacher_adjusted: boolean
  final_score?: number
  teacher_notes?: string
  
  created_at: string
  updated_at: string
}

// Pre-submit AI Feedback
export interface AIPreSubmitFeedback {
  id: string
  student_id: string
  assignment_id: string
  draft_text: string
  word_count: number
  
  // AI Analysis
  pre_check_score: number
  pre_check_feedback: {
    overall_score: number
    word_count: number
    feedback_sections: {
      content: FeedbackSection
      grammar: FeedbackSection
      coherence: FeedbackSection
      relevance: FeedbackSection
    }
    general_suggestions: string[]
    priority_improvements: string[]
    confidence_level: number
  }
  improvement_suggestions: {
    general_suggestions: string[]
    priority_improvements: string[]
  }
  
  feedback_generated_at: string
  created_at: string
}

export interface FeedbackSection {
  score: number
  feedback: string
  suggestions: string[]
}

// Lesson Content Analysis
export interface LessonContentAnalysis {
  id: string
  lesson_id: string
  
  // Processed Content
  key_concepts: any[]
  learning_objectives: any[]
  content_summary: string
  difficulty_level: 'easy' | 'medium' | 'hard'
  subject_area: string
  
  // Processing Metadata
  processed_at: string
  processing_model: string
  content_hash: string
  updated_at: string
}

// AI Grading Session (Teacher Interaction)
export interface AIGradingSession {
  id: string
  submission_id: string
  teacher_id: string
  
  // Scores
  initial_ai_score: number
  final_approved_score: number
  score_adjustments: any
  
  // Interaction Tracking
  session_duration_ms: number
  ai_suggestions_accepted: any
  manual_adjustments: any
  
  // Timestamps
  started_at: string
  completed_at?: string
  created_at: string
}

// Enhanced Submission Interface
export interface EnhancedSubmission {
  id: string
  assignment_id: string
  student_id: string
  submission_text?: string
  file_url?: string
  file_name?: string
  status: 'draft' | 'submitted' | 'ai_reviewed' | 'graded' | 'returned'
  submitted_at: string
  
  // AI Integration
  has_ai_pre_feedback?: boolean
  ai_pre_feedback_count?: number
  last_ai_feedback_at?: string
  
  // Grading
  grade?: {
    id: string
    points_earned: number
    feedback: string
    graded_at: string
  }
  ai_grading_result?: AIGradingResult
  
  created_at: string
  updated_at: string
}

// Assignment Creation Form Data
export interface AssignmentCreationData {
  title: string
  description: string
  requirements: string
  due_date: string
  points_possible: number
  submission_type_enhanced: 'text' | 'file' | 'both' | 'ai_enhanced_text'
  allow_late_submission: boolean
  
  // Lesson Linking
  lesson_id?: string
  
  // AI Features
  enable_ai_pre_check: boolean
  ai_feedback_enabled: boolean
  grading_approach: 'manual' | 'ai_assisted' | 'fully_ai'
  
  // Word Limits
  word_limit_min?: number
  word_limit_max?: number
  
  // Rubric Configuration
  custom_rubric?: AIRubricConfig
}

// AI Grading Dashboard Data
export interface AIGradingDashboard {
  assignment_id: string
  total_submissions: number
  ai_graded_count: number
  teacher_review_count: number
  pending_review: number
  
  // Statistics
  average_ai_score: number
  average_final_score: number
  ai_teacher_agreement: number
  
  // Recent Activity
  recent_gradings: {
    submission_id: string
    student_name: string
    ai_score: number
    final_score: number
    review_time: string
    ai_confidence: number
  }[]
}

// Teacher Grading Interface Props
export interface TeacherGradingInterfaceProps {
  assignment: EnhancedAssignment
  submission: EnhancedSubmission
  aiGradingResult?: AIGradingResult
  onScoreAdjustment: (submissionId: string, adjustments: ScoreAdjustments) => void
  onApproveGrade: (submissionId: string, finalScore: number, notes: string) => void
  onRequestRegrade: (submissionId: string, reason: string) => void
}

export interface ScoreAdjustments {
  content_adjustment?: number
  grammar_adjustment?: number
  coherence_adjustment?: number
  relevance_adjustment?: number
  overall_notes?: string
}

// Student Pre-submit Interface Props
export interface StudentPreSubmitInterfaceProps {
  assignment: EnhancedAssignment
  draftText: string
  onFeedbackUpdate: (feedback: AIPreSubmitFeedback) => void
  onSubmitDraft: () => void
  isSubmitting: boolean
}

// Lesson Selection Component Props
export interface LessonSelectionProps {
  courseId: string
  selectedLessonId?: string
  onLessonSelect: (lessonId: string | null) => void
  disabled?: boolean
}

// Rubric Configuration Component Props
export interface RubricConfigurationProps {
  assignmentId?: string
  initialConfig?: AIRubricConfig
  onConfigChange: (config: AIRubricConfig) => void
  onSave: () => void
  onReset: () => void
  isSaving: boolean
}

// AI Feedback Summary
export interface AIFeedbackSummary {
  overall_score: number
  confidence_level: number
  primary_strengths: string[]
  areas_for_improvement: string[]
  specific_suggestions: {
    content: string[]
    grammar: string[]
    coherence: string[]
    relevance: string[]
  }
  word_count_analysis: {
    current: number
    target?: { min?: number; max?: number }
    feedback: string
    suggestions: string[]
  }
  next_steps: string[]
}

// Assignment Statistics
export interface AssignmentStatistics {
  assignment_id: string
  total_submissions: number
  graded_count: number
  pending_count: number
  average_score: number
  score_distribution: {
    '0-20': number
    '21-40': number
    '41-60': number
    '61-80': number
    '81-100': number
  }
  ai_performance: {
    average_ai_confidence: number
    teacher_adjustment_rate: number
    most_common_adjustments: string[]
  }
  common_feedback_themes: string[]
  completion_rate: number
}

// Enhanced Grade with AI Integration
export interface EnhancedGrade {
  id: string
  submission_id: string
  assignment_id: string
  student_id: string
  teacher_id: string
  
  // Traditional Grading
  points_earned: number
  feedback: string
  
  // AI Integration
  ai_assisted: boolean
  initial_ai_score?: number
  ai_confidence?: number
  teacher_adjustments?: ScoreAdjustments
  ai_summary_included: boolean
  
  // Metadata
  graded_at: string
  ai_processing_time?: number
  created_at: string
  updated_at: string
}

// API Response Types
export interface AIGradingResponse {
  success: boolean
  data?: {
    grading_result: any
    processing_time_ms: number
    saved_result?: AIGradingResult
  }
  error?: string
}

export interface PreSubmitResponse {
  success: boolean
  data?: {
    feedback: AIPreSubmitFeedback
    word_count: number
    feedback_generated_at: string
    saved_feedback_id?: string
  }
  error?: string
  assignment_id?: string
  enabled?: boolean
}

// Error Types
export interface AIGradingError {
  code: 'ASSIGNMENT_NOT_FOUND' | 'STUDENT_NOT_ENROLLED' | 'AI_FEEDBACK_DISABLED' | 'GRADING_FAILED' | 'INVALID_CONFIG'
  message: string
  details?: any
}

// Form Validation Types
export interface AssignmentFormValidation {
  title?: string
  description?: string
  due_date?: string
  points_possible?: string
  lesson_id?: string
  word_limit_min?: string
  word_limit_max?: string
  custom_rubric?: {
    content?: string
    grammar?: string
    coherence?: string
    relevance?: string
  }
}

// Real-time Updates
export interface GradingRealtimeUpdate {
  type: 'ai_scoring_complete' | 'teacher_approval' | 'grade_adjusted' | 'feedback_submitted'
  submission_id: string
  assignment_id: string
  data: any
  timestamp: string
}

// Bulk Operations
export interface BulkGradingOperation {
  assignment_id: string
  submission_ids: string[]
  operation: 'ai_grade_all' | 'approve_all' | 'export_grades' | 'request_regrade'
  parameters?: any
}

export interface BulkOperationResult {
  operation: string
  total_processed: number
  successful: number
  failed: number
  errors: string[]
  results: any[]
}