import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = 'student' | 'teacher' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  duration_minutes: number | null;
  has_quiz: boolean;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  completed_at: string | null;
  last_viewed_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  due_date: string | null;
  points_possible: number;
  allow_late_submission: boolean;
  submission_type: string;
  created_at: string;
  updated_at: string;
  category_id?: string | null;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_text: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  submission_id: string;
  assignment_id: string;
  student_id: string;
  teacher_id: string;
  points_earned: number;
  feedback: string | null;
  graded_at: string;
  created_at: string;
  updated_at: string;
  assignments?: {
    id: string;
    title: string;
    points_possible: number;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

export interface CourseResource {
  id: string;
  course_id: string;
  lesson_id: string | null;
  uploaded_by: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  resource_type: string;
  created_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  lesson_id: string | null;
  course_id: string | null;
  resource_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  course_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string | null;
  created_at: string;
}

// Gamification and Analytics Types (UUID-based)
export interface UserPoints {
  id: string;
  user_id: string; // UUID reference to profiles.id
  total_points: number;
  current_level: number;
  streak_count: number;
  longest_streak: number;
  achievements_unlocked: any; // JSONB array
  last_quiz_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestionResponse {
  id: string;
  result_id: string; // UUID reference to quiz_scores.id
  user_id: string; // UUID reference to profiles.id
  quiz_id: number;
  question_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_taken: number; // milliseconds
  points_earned: number;
  time_bonus: number;
  streak_bonus: number;
  difficulty: string | null;
  created_at: string;
}

export interface UserLeaderboardEntry {
  id: string;
  user_id: string; // UUID reference to profiles.id
  user_name: string;
  total_score: number;
  games_played: number;
  average_accuracy: number; // decimal(5,2)
  total_time_spent: number; // seconds
  perfect_scores: number;
  current_rank: number | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string; // UUID reference to profiles.id
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  achievement_data: any; // JSONB
  points_awarded: number;
  icon: string | null;
  unlocked_at: string;
}

export interface QuizAnalytics {
  id: string;
  user_id: string; // UUID reference to profiles.id
  quiz_id: number;
  category: string | null;
  total_attempts: number;
  best_score: number;
  best_percentage: number; // decimal(5,2)
  average_score: number; // decimal(10,2)
  average_time: number; // seconds
  total_correct: number;
  total_questions: number;
  improvement_rate: number; // decimal(5,2)
  last_attempt_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizScore {
  id: string;
  user_id: string; // UUID reference to profiles.id
  quiz_id: number;
  score: number;
  max_score: number;
  percentage: number;
  time_taken: number; // seconds
  correct_answers: number;
  total_questions: number;
  hints_used: number;
  hint_penalty: number;
  time_bonus: number;
  game_mode: string;
  is_completed: boolean;
  created_at: string;
}

// Lesson Questions (for AI-generated and manual quizzes)
export interface LessonQuestion {
  id: string;
  lesson_id: string; // UUID reference to lessons.id
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options: any | null; // JSONB: [{"text": "Option A", "is_correct": true}, ...]
  correct_answer: string | null;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  order_index: number;
  points: number;
  created_by: string; // UUID reference to profiles.id
  created_at: string;
  updated_at: string;
}

// Messages interface for user communications
export interface Message {
  id: string;
  sender_id: string; // UUID reference to profiles.id
  recipient_id: string | null; // UUID reference to profiles.id
  course_id: string | null; // UUID reference to courses.id
  subject: string | null;
  content: string;
  message_type: 'direct' | 'course' | 'system' | 'announcement';
  parent_message_id: string | null; // For threaded conversations
  read: boolean;
  created_at: string;
  updated_at: string;
}

// User Activity Logs for tracking user behavior
export interface UserActivityLog {
  id: string;
  user_id: string; // UUID reference to profiles.id
  activity_type: string;
  activity_description: string | null;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_data: any | null; // JSONB
  created_at: string;
}

// System Settings for application configuration
export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any; // JSONB
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  category: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// Study Sessions for tracking learning periods
export interface StudySession {
  id: string;
  user_id: string; // UUID reference to profiles.id
  course_id: string | null; // UUID reference to courses.id
  lesson_id: string | null; // UUID reference to lessons.id
  quiz_id: string | null;
  session_type: 'lesson' | 'quiz' | 'assignment' | 'study';
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  activities_completed: number | null;
  points_earned: number | null;
  created_at: string;
  updated_at: string;
}

// Certificates for course completion
export interface Certificate {
  id: string;
  user_id: string; // UUID reference to profiles.id
  course_id: string; // UUID reference to courses.id
  certificate_name: string;
  description: string | null;
  issued_date: string;
  expiry_date: string | null;
  certificate_url: string | null;
  verification_code: string | null;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
}

// Study Streaks for gamification
export interface StudyStreak {
  id: string;
  user_id: string; // UUID reference to profiles.id
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  streak_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// Grade Categories for organizing assignments
export interface GradeCategory {
  id: string;
  course_id: string; // UUID reference to courses.id
  category_name: string;
  description: string | null;
  weight_percentage: number | null;
  drop_lowest: boolean;
  drop_lowest_count: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Course Analytics for performance tracking
export interface CourseAnalytics {
  id: string;
  course_id: string; // UUID reference to courses.id
  total_enrollments: number;
  active_students: number;
  completion_rate: number; // decimal(5,2)
  average_grade: number | null; // decimal(5,2)
  total_quizzes_taken: number;
  average_quiz_score: number | null; // decimal(5,2)
  total_assignments_submitted: number;
  engagement_score: number | null; // decimal(5,2)
  last_updated: string;
  created_at: string;
}

// Student Performance tracking
export interface StudentPerformance {
  id: string;
  student_id: string; // UUID reference to profiles.id
  course_id: string; // UUID reference to courses.id
  overall_grade: number | null; // decimal(5,2)
  quizzes_completed: number;
  assignments_submitted: number;
  lessons_completed: number;
  total_study_time: number; // minutes
  engagement_score: number | null; // decimal(5,2)
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

// Quiz Attempts tracking
export interface QuizAttempt {
  id: string;
  user_id: string; // UUID reference to profiles.id
  quiz_id: number;
  course_id: string | null; // UUID reference to courses.id
  lesson_id: string | null; // UUID reference to lessons.id
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null; // decimal(5,2)
  time_taken: number | null; // seconds
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

// Question Hints for providing assistance
export interface QuestionHint {
  id: string;
  question_id: string; // UUID reference to lesson_questions.id
  hint_text: string;
  hint_type: 'text' | 'image' | 'video' | 'link';
  hint_order: number;
  hint_cost: number | null; // points to use this hint
  created_by: string; // UUID reference to profiles.id
  created_at: string;
  updated_at: string;
}

// Quiz Achievements for gamification
export interface QuizAchievement {
  id: string;
  user_id: string; // UUID reference to profiles.id
  quiz_id: number;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string | null;
  points_awarded: number;
  badge_icon: string | null;
  unlocked_at: string;
  created_at: string;
}

// Lesson Quizzes structure
export interface LessonQuiz {
  id: string;
  lesson_id: string; // UUID reference to lessons.id
  quiz_title: string;
  quiz_description: string | null;
  quiz_config: any | null; // JSONB: time limits, difficulty settings, etc.
  is_required: boolean;
  passing_score: number | null; // decimal(5,2)
  max_attempts: number | null;
  time_limit_minutes: number | null;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  created_by: string; // UUID reference to profiles.id
  created_at: string;
  updated_at: string;
}

// Lesson Quiz Attempts tracking
export interface LessonQuizAttempt {
  id: string;
  user_id: string; // UUID reference to profiles.id
  lesson_quiz_id: string; // UUID reference to lesson_quizzes.id
  attempt_number: number;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null; // decimal(5,2)
  time_taken: number | null; // seconds
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

// Lesson Quiz Responses for answer tracking
export interface LessonQuizResponse {
  id: string;
  attempt_id: string; // UUID reference to lesson_quiz_attempts.id
  question_id: string; // UUID reference to lesson_questions.id
  selected_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean | null;
  time_taken: number | null; // milliseconds
  hints_used: number | null;
  points_earned: number | null;
  created_at: string;
  updated_at: string;
}

// Quiz Question Responses for detailed answer tracking
// Legacy Quiz Question Response Detail (for lesson questions)
export interface QuizQuestionResponseDetail {
  id: string;
  attempt_id: string; // UUID reference to quiz_attempts.id
  user_id: string; // UUID reference to profiles.id
  quiz_id: number;
  question_id: string; // UUID reference to lesson_questions.id
  selected_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean | null;
  time_taken: number | null; // milliseconds
  hints_used: number | null;
  points_earned: number | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  created_at: string;
  updated_at: string;
}

// General Achievements system
export interface Achievement {
  id: string;
  achievement_key: string;
  achievement_name: string;
  achievement_description: string | null;
  achievement_type: 'quiz' | 'study' | 'engagement' | 'milestone';
  criteria: any | null; // JSONB: requirements to unlock
  points_reward: number;
  badge_icon: string | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Learning Achievements tracking
export interface LearningAchievement {
  id: string;
  user_id: string; // UUID reference to profiles.id
  achievement_id: string; // UUID reference to achievements.id
  progress_percentage: number; // decimal(5,2)
  criteria_met: boolean;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
}

// User Learning Achievements linking
export interface UserLearningAchievement {
  id: string;
  user_id: string; // UUID reference to profiles.id
  achievement_id: string; // UUID reference to achievements.id
  learning_achievement_id: string | null; // UUID reference to learning_achievements.id
  unlocked_at: string;
  points_awarded: number;
  badge_earned: boolean;
  created_at: string;
  updated_at: string;
}

// Discussion Comments for forum-style discussions
export interface DiscussionComment {
  id: string;
  discussion_id: string | null; // UUID reference to discussions.id
  user_id: string; // UUID reference to profiles.id
  course_id: string | null; // UUID reference to courses.id
  parent_comment_id: string | null; // UUID reference to discussion_comments.id
  content: string;
  comment_type: 'discussion' | 'reply' | 'question' | 'answer';
  upvotes: number;
  downvotes: number;
  is_pinned: boolean;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

// Admin Activity Logs for tracking administrative actions
export interface AdminActivityLog {
  id: string;
  admin_id: string; // UUID reference to profiles.id
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  action_description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any | null; // JSONB
  created_at: string;
}

// Password Reset Requests tracking
export interface PasswordResetRequest {
  id: string;
  user_id: string; // UUID reference to profiles.id
  email: string;
  reset_token: string;
  ip_address: string | null;
  user_agent: string | null;
  status: 'pending' | 'completed' | 'expired';
  requested_at: string;
  completed_at: string | null;
  expires_at: string;
}

// Password Reset Sessions for tracking active sessions
export interface PasswordResetSession {
  id: string;
  user_id: string; // UUID reference to profiles.id
  reset_token: string;
  session_data: any | null; // JSONB
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

// Password Reset Logs for audit trail
export interface PasswordResetLog {
  id: string;
  user_id: string | null; // UUID reference to profiles.id
  email: string | null;
  action: 'request' | 'success' | 'failure' | 'expired';
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  timestamp: string;
}

// Questions interface for quiz questions
export interface Question {
  id: string;
  quiz_id: string | null; // UUID reference to lesson_quizzes.id
  lesson_id: string | null; // UUID reference to lessons.id
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options: any | null; // JSONB array
  correct_answer: string | null;
  explanation: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  points: number;
  order_index: number;
  time_limit: number | null; // seconds
  created_by: string; // UUID reference to profiles.id
  created_at: string;
  updated_at: string;
}

// Quizzes interface for quiz sessions
export interface Quiz {
  id: string;
  course_id: string | null; // UUID reference to courses.id
  lesson_id: string | null; // UUID reference to lessons.id
  title: string;
  description: string | null;
  quiz_type: 'lesson' | 'practice' | 'assessment' | 'final';
  time_limit_minutes: number | null;
  max_attempts: number | null;
  passing_score: number | null; // decimal(5,2)
  randomize_questions: boolean;
  show_results_immediately: boolean;
  allow_review: boolean;
  shuffle_answers: boolean;
  is_published: boolean;
  created_by: string; // UUID reference to profiles.id
  created_at: string;
  updated_at: string;
}

// User Quiz Responses for detailed tracking
export interface UserQuizResponse {
  id: string;
  user_id: string; // UUID reference to profiles.id
  quiz_id: string; // UUID reference to quizzes.id or lesson_quizzes.id
  question_id: string; // UUID reference to questions.id or lesson_questions.id
  selected_answer: string | null;
  correct_answer: string | null;
  is_correct: boolean | null;
  time_spent: number | null; // milliseconds
  hints_used: number | null;
  points_awarded: number | null;
  attempt_number: number;
  submitted_at: string;
  created_at: string;
}

// Database table names
export const TABLES = {
  PROFILES: 'profiles',
  COURSES: 'courses',
  LESSONS: 'lessons',
  ENROLLMENTS: 'enrollments',
  LESSON_PROGRESS: 'lesson_progress',
  QUIZZES: 'quizzes',
  QUESTIONS: 'questions',
  QUIZ_ATTEMPTS: 'quiz_attempts',
  QUIZ_SCORES: 'quiz_scores',
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  ASSIGNMENTS: 'assignments',
  SUBMISSIONS: 'submissions',
  GRADES: 'grades',
  NOTIFICATIONS: 'notifications',
} as const;

// Utility functions for common operations
export class SupabaseService {
  // Auth operations
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  static async getUserProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return data;
  }

  // Course operations
  static async getCourses() {
    const { data, error } = await supabase
      .from(TABLES.COURSES)
      .select(`
        *,
        profiles:teacher_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as (Course & { profiles: Profile | null })[];
  }

  static async getCourseDetails(courseId: string) {
    const { data, error } = await supabase
      .from(TABLES.COURSES)
      .select(`
        *,
        profiles:teacher_id (
          id,
          full_name,
          avatar_url
        ),
        lessons:lessons (
          id,
          title,
          order_index,
          duration_minutes,
          has_quiz
        )
      `)
      .eq('id', courseId)
      .single();
    
    if (error) throw error;
    return data as Course & { profiles: Profile | null; lessons: Lesson[] };
  }

  // Lesson operations
  static async getLessonDetails(lessonId: string) {
    const { data, error } = await supabase
      .from(TABLES.LESSONS)
      .select(`
        *,
        courses:course_id (
          id,
          title,
          description
        )
      `)
      .eq('id', lessonId)
      .single();
    
    if (error) throw error;
    return data as Lesson & { courses: Course | null };
  }

  // Quiz operations
  static async getQuizDetails(quizId: string) {
    const { data, error } = await supabase
      .from(TABLES.QUIZZES)
      .select(`
        *,
        questions:questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          explanation,
          difficulty,
          points,
          order_index
        )
      `)
      .eq('id', quizId)
      .single();
    
    if (error) throw error;
    return data as Quiz & { questions: any[] };
  }

  // Messaging operations
  static async getUserMessages(userId: string) {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .select(`
        *,
        sender:sender_id (
          id,
          full_name,
          avatar_url
        ),
        recipient:recipient_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  // Analytics operations
  static async getUserAnalytics(userId: string) {
    const { data, error } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data;
  }

  // Real-time subscriptions
  static subscribeToMessages(userId: string, callback: (message: any) => void) {
    return supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.MESSAGES,
          filter: `recipient_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }

  static subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: TABLES.NOTIFICATIONS,
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe();
  }
}

// File upload utilities
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean }
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
    });

  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Storage bucket names
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  COURSE_MATERIALS: 'course-materials',
  ASSIGNMENT_SUBMISSIONS: 'assignment-submissions',
} as const;
