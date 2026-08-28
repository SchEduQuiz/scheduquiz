// Lesson-based quiz system interfaces
// Integrates with existing course/lesson structure

// Main Question interface - matches lesson_questions table schema
export interface Question {
  id: string; // UUID
  lesson_id?: string; // UUID reference to lessons.id
  quiz_id?: string | number; // For legacy quiz system compatibility
  question_text: string;
  question_type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  type?: string; // Alias for question_type
  options?: any; // JSONB field in database: [{"text": "Option A", "is_correct": true}, ...]
  // Legacy format support for quiz challenge
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer: string;
  explanation?: string;
  hint?: string;
  difficulty?: "easy" | "medium" | "hard";
  order_index?: number;
  points: number;
  time_limit?: number;
  created_by?: string; // UUID
  created_at?: Date | string;
  updated_at?: Date | string;
  
  // Frontend compatibility aliases
  question?: string; // Alias for question_text
  correctAnswer?: string; // Alias for correct_answer
  timeLimit?: number; // Alias for time_limit
  lessonId?: string;
  contentReference?: string;
}

export interface LessonQuiz {
  id: string;
  lesson_id: string;
  title: string;
  description?: string;
  quiz_settings?: any; // JSONB field
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  questions?: Question[];
  // Aliases for frontend compatibility
  lessonId: string;
  courseId?: string;
  createdBy?: string;
  timeLimit?: number;
  allowRetry?: boolean;
  maxRetries?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  passingScore?: number;
  isRequired?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  attemptCount?: number;
  averageScore?: number;
  passRate?: number;
}

// Quiz attempt/score record - matches quiz_scores table
export interface QuizAttempt {
  id: string; // UUID
  quiz_id: string | number;
  student_id?: string; // UUID - old field name
  user_id?: string; // UUID - matches quiz_scores.user_id
  started_at?: Date | string;
  completed_at?: Date | string;
  score?: number;
  max_score?: number;
  total_questions: number;
  correct_answers: number;
  score_percentage?: number; // Old field name
  percentage?: number; // Matches quiz_scores.percentage
  time_spent?: number; // Old field name
  time_taken?: number; // Matches quiz_scores.time_taken
  passed?: boolean;
  attempt_number?: number;
  focus_lost_count?: number;
  tab_switches?: number;
  hints_used?: number;
  hint_penalty?: number;
  time_bonus?: number;
  game_mode?: string;
  is_completed?: boolean;
  created_at?: string;
  
  // Frontend compatibility aliases
  quizId?: string;
  lessonId?: string;
  userId?: string;
  answers?: Record<string, any>;
  totalQuestions?: number;
  totalPoints?: number;
  startTime?: Date;
  endTime?: Date;
  completedAt?: Date;
  attemptNumber?: number;
  responses?: QuestionResponse[];
}

// Individual question response - matches quiz_question_responses table
export interface QuestionResponse {
  id: string; // UUID
  attempt_id?: string; // UUID - old field name
  result_id?: string; // UUID - matches quiz_question_responses.result_id
  question_id: string | number;
  student_answer?: string; // Old field name
  selected_answer?: string; // Matches quiz_question_responses.selected_answer
  user_answer?: any; // Frontend alias
  correct_answer?: string;
  is_correct: boolean;
  time_spent?: number; // Old field name
  time_taken?: number; // Matches quiz_question_responses.time_taken
  response_time?: number; // Frontend alias
  points_earned?: number;
  time_bonus?: number;
  streak_bonus?: number;
  difficulty?: string;
  created_at?: Date | string;
  
  // Additional frontend fields
  questionId?: string;
  question?: string;
  points?: number;
  maxPoints?: number;
  responseTime?: number;
  usedHint?: boolean;
  hint?: string;
  explanation?: string;
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: LessonQuiz;
  detailedResults: QuestionResponse[];
  performance: {
    strength: string[]; // Areas student excels in
    weakness: string[]; // Areas needing improvement
    recommendations: string[];
  };
}

// Lesson integration types
export interface LessonQuizSettings {
  lessonId: string;
  quizEnabled: boolean;
  isRequired: boolean;
  autoGenerate: boolean; // Auto-create quiz from lesson content
  customQuizId?: string; // Use existing quiz instead of auto-generating
  
  // Generation settings (for auto-generation)
  questionCount: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypes: {
    multipleChoice: boolean;
    trueFalse: boolean;
    shortAnswer: boolean;
    fillBlank: boolean;
  };
  
  // Assessment settings
  passingScore: number;
  timeLimit?: number;
  allowRetries: boolean;
  maxRetries: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export interface LessonProgressWithQuiz {
  id: string;
  studentId: string;
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt?: Date;
  lastViewedAt: Date;
  
  // Quiz-related progress
  quizCompleted?: boolean;
  quizPassed?: boolean;
  quizScore?: number;
  quizAttempts: QuizAttempt[];
  currentQuizStatus: {
    hasAttempted: boolean;
    passed: boolean;
    bestScore: number;
    attemptsLeft: number;
    lastAttemptAt?: Date;
  };
}

// Existing lesson progress extension
export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt?: Date;
  lastViewedAt: Date;
  
  // Quiz-related progress
  quizCompleted?: boolean;
  quizPassed?: boolean;
  quizScore?: number;
}

// Quiz generation from lesson content
export interface QuizGenerationRequest {
  lessonId: string;
  content: string; // Lesson content text
  settings: LessonQuizSettings;
}

export interface GeneratedQuestion {
  type: "multiple-choice" | "true-false" | "short-answer" | "fill-blank";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  contentReference: string;
}

// Teacher quiz management
export interface TeacherQuizDashboard {
  courseId: string;
  lessons: {
    lesson: any;
    quiz?: LessonQuiz;
    stats: {
      totalStudents: number;
      completedQuizzes: number;
      passedQuizzes: number;
      averageScore: number;
      commonMistakes: string[];
    };
  }[];
}

// Gamification Types - match backend tables
export interface GamificationResult {
  score_id: string;
  new_streak: number;
  total_points: number;
  achievements_unlocked: string[];
  message: string;
}

export interface UserPointsData {
  id: string;
  user_id: string;
  total_points: number;
  current_level: number;
  streak_count: number;
  longest_streak: number;
  achievements_unlocked: any[];
  last_quiz_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  user_name: string;
  total_score: number;
  games_played: number;
  average_accuracy: number;
  total_time_spent: number;
  perfect_scores: number;
  current_rank: number | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  achievement_data: any;
  points_awarded: number;
  icon: string | null;
  unlocked_at: string;
}// Message interface for the messaging system
export interface Message {
  id: string; // UUID
  sender_id: string; // UUID reference to profiles(id)
  recipient_id: string; // UUID reference to profiles(id)
  subject?: string; // Optional subject line
  content: string; // Message content
  read: boolean; // Whether message has been read
  created_at: string; // ISO timestamp
  
  // Extended frontend properties
  sender?: {
    id: string;
    full_name: string;
    email?: string;
    role?: string;
  };
  recipient?: {
    id: string;
    full_name: string;
    email?: string;
    role?: string;
  };
}

// Message creation request
export interface CreateMessageRequest {
  recipient_id: string;
  subject?: string;
  content: string;
}

// Message list filters
export interface MessageFilters {
  type?: 'inbox' | 'sent' | 'all';
  read?: boolean;
  search?: string;
}

// Message operations response
export interface MessageOperationResult {
  success: boolean;
  data?: Message;
  error?: string;
}