export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_icon: string | null
          created_at: string | null
          criteria_type: string | null
          criteria_value: number | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          badge_icon?: string | null
          created_at?: string | null
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          badge_icon?: string | null
          created_at?: string | null
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          allow_late_submissions: boolean | null
          allowed_file_types: string[] | null
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          late_penalty_percentage: number | null
          max_file_size_mb: number | null
          max_points: number | null
          status: string | null
          submission_type: string | null
          teacher_id: string
          title: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          allow_late_submissions?: boolean | null
          allowed_file_types?: string[] | null
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          late_penalty_percentage?: number | null
          max_file_size_mb?: number | null
          max_points?: number | null
          status?: string | null
          submission_type?: string | null
          teacher_id: string
          title: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          allow_late_submissions?: boolean | null
          allowed_file_types?: string[] | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          late_penalty_percentage?: number | null
          max_file_size_mb?: number | null
          max_points?: number | null
          status?: string | null
          submission_type?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          level: string | null
          price: number | null
          teacher_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          level?: string | null
          price?: number | null
          teacher_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          level?: string | null
          price?: number | null
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earned_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earned_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earned_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string | null
          id: string
          progress_percentage: number | null
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number | null
          student_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_categories: {
        Row: {
          assignment_id: string
          category_name: string
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          max_points: number
          weight: number
        }
        Insert: {
          assignment_id: string
          category_name: string
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_points: number
          weight: number
        }
        Update: {
          assignment_id?: string
          category_name?: string
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_points?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_categories_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_id: string
          created_at: string | null
          feedback: string | null
          graded_at: string | null
          grader_id: string
          id: string
          is_final: boolean | null
          letter_grade: string | null
          max_score: number
          percentage: number | null
          private_notes: string | null
          submission_id: string
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          grader_id: string
          id?: string
          is_final?: boolean | null
          letter_grade?: string | null
          max_score: number
          percentage?: number | null
          private_notes?: string | null
          submission_id: string
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          grader_id?: string
          id?: string
          is_final?: boolean | null
          letter_grade?: string | null
          max_score?: number
          percentage?: number | null
          private_notes?: string | null
          submission_id?: string
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_grader_id_fkey"
            columns: ["grader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_achievements: {
        Row: {
          badge_icon: string | null
          created_at: string | null
          criteria_type: string | null
          criteria_value: number | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          badge_icon?: string | null
          created_at?: string | null
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          badge_icon?: string | null
          created_at?: string | null
          criteria_type?: string | null
          criteria_value?: number | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_quiz_attempt_at: string | null
          lesson_id: string
          notes: string | null
          quiz_attempts: number | null
          quiz_completed: boolean | null
          quiz_passed: boolean | null
          quiz_score: number | null
          student_id: string
          time_spent: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_quiz_attempt_at?: string | null
          lesson_id: string
          notes?: string | null
          quiz_attempts?: number | null
          quiz_completed?: boolean | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          student_id: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_quiz_attempt_at?: string | null
          lesson_id?: string
          notes?: string | null
          quiz_attempts?: number | null
          quiz_completed?: boolean | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          student_id?: string
          time_spent?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_questions: {
        Row: {
          content_reference: string | null
          correct_answer: string
          correct_answers: string[] | null
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          hint: string | null
          id: string
          lesson_id: string
          option_a: string | null
          option_b: string | null
          option_c: string | null
          option_d: string | null
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string
          time_limit: number | null
        }
        Insert: {
          content_reference?: string | null
          correct_answer: string
          correct_answers?: string[] | null
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          hint?: string | null
          id?: string
          lesson_id: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          points?: number | null
          question_text: string
          question_type: string
          quiz_id: string
          time_limit?: number | null
        }
        Update: {
          content_reference?: string | null
          correct_answer?: string
          correct_answers?: string[] | null
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          hint?: string | null
          id?: string
          lesson_id?: string
          option_a?: string | null
          option_b?: string | null
          option_c?: string | null
          option_d?: string | null
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string
          time_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lesson_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          completed_at: string | null
          created_at: string | null
          end_time: string | null
          focus_lost_count: number | null
          id: string
          ip_address: unknown
          lesson_id: string
          passed: boolean | null
          percentage: number
          quiz_id: string
          score: number
          start_time: string
          tab_switches: number | null
          time_spent: number | null
          total_points: number
          total_questions: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          answers: Json
          attempt_number?: number
          completed_at?: string | null
          created_at?: string | null
          end_time?: string | null
          focus_lost_count?: number | null
          id?: string
          ip_address?: unknown
          lesson_id: string
          passed?: boolean | null
          percentage?: number
          quiz_id: string
          score?: number
          start_time: string
          tab_switches?: number | null
          time_spent?: number | null
          total_points?: number
          total_questions?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          answers?: Json
          attempt_number?: number
          completed_at?: string | null
          created_at?: string | null
          end_time?: string | null
          focus_lost_count?: number | null
          id?: string
          ip_address?: unknown
          lesson_id?: string
          passed?: boolean | null
          percentage?: number
          quiz_id?: string
          score?: number
          start_time?: string
          tab_switches?: number | null
          time_spent?: number | null
          total_points?: number
          total_questions?: number
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "lesson_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_responses: {
        Row: {
          attempt_id: string
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          response_time: number | null
          used_hint: boolean | null
          user_answer: string | null
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          response_time?: number | null
          used_hint?: boolean | null
          user_answer?: string | null
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          response_time?: number | null
          used_hint?: boolean | null
          user_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "lesson_quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lesson_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quizzes: {
        Row: {
          allow_retry: boolean | null
          attempt_count: number | null
          auto_generated: boolean | null
          average_score: number | null
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          generation_settings: Json | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          lesson_id: string
          max_retries: number | null
          pass_rate: number | null
          passing_score: number | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_retry?: boolean | null
          attempt_count?: number | null
          auto_generated?: boolean | null
          average_score?: number | null
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          generation_settings?: Json | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          lesson_id: string
          max_retries?: number | null
          pass_rate?: number | null
          passing_score?: number | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_retry?: boolean | null
          attempt_count?: number | null
          auto_generated?: boolean | null
          average_score?: number | null
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          generation_settings?: Json | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          lesson_id?: string
          max_retries?: number | null
          pass_rate?: number | null
          passing_score?: number | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quizzes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string | null
          description: string | null
          duration: number | null
          has_quiz: boolean | null
          id: string
          is_published: boolean | null
          order_index: number | null
          quiz_pass_score: number | null
          quiz_settings: Json | null
          quiz_time_limit: number | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          has_quiz?: boolean | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          quiz_pass_score?: number | null
          quiz_settings?: Json | null
          quiz_time_limit?: number | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          has_quiz?: boolean | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          quiz_pass_score?: number | null
          quiz_settings?: Json | null
          quiz_time_limit?: number | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      question_hints: {
        Row: {
          hint_used_at: string | null
          id: string
          question_id: string
          quiz_attempt_id: string | null
          user_id: string
        }
        Insert: {
          hint_used_at?: string | null
          id?: string
          question_id: string
          quiz_attempt_id?: string | null
          user_id: string
        }
        Update: {
          hint_used_at?: string | null
          id?: string
          question_id?: string
          quiz_attempt_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_hints_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_hints_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_hints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          hint: string | null
          id: string
          options: Json | null
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          hint?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text: string
          question_type: string
          quiz_id?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          hint?: string | null
          id?: string
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_achievements: {
        Row: {
          achievement_data: Json | null
          achievement_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_data?: Json | null
          achievement_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_data?: Json | null
          achievement_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_analytics: {
        Row: {
          average_score: number | null
          average_time: number | null
          best_percentage: number | null
          best_score: number | null
          category: string | null
          created_at: string | null
          id: string
          improvement_rate: number | null
          last_attempt_date: string | null
          quiz_id: string
          total_attempts: number | null
          total_correct: number | null
          total_questions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          average_time?: number | null
          best_percentage?: number | null
          best_score?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          improvement_rate?: number | null
          last_attempt_date?: string | null
          quiz_id: string
          total_attempts?: number | null
          total_correct?: number | null
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          average_time?: number | null
          best_percentage?: number | null
          best_score?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          improvement_rate?: number | null
          last_attempt_date?: string | null
          quiz_id?: string
          total_attempts?: number | null
          total_correct?: number | null
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          created_at: string | null
          current_question: number | null
          end_time: string | null
          hints_used: number | null
          id: string
          quiz_id: string
          start_time: string | null
          status: string | null
          total_questions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_question?: number | null
          end_time?: string | null
          hints_used?: number | null
          id?: string
          quiz_id: string
          start_time?: string | null
          status?: string | null
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_question?: number | null
          end_time?: string | null
          hints_used?: number | null
          id?: string
          quiz_id?: string
          start_time?: string | null
          status?: string | null
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_responses: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          id: string
          is_correct: boolean
          points_earned: number | null
          question_id: string
          quiz_id: string
          result_id: string
          selected_answer: string
          streak_bonus: number | null
          time_bonus: number | null
          time_taken: number
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_correct: boolean
          points_earned?: number | null
          question_id: string
          quiz_id: string
          result_id: string
          selected_answer: string
          streak_bonus?: number | null
          time_bonus?: number | null
          time_taken: number
          user_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number | null
          question_id?: string
          quiz_id?: string
          result_id?: string
          selected_answer?: string
          streak_bonus?: number | null
          time_bonus?: number | null
          time_taken?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_scores: {
        Row: {
          category: string | null
          correct_answers: number | null
          created_at: string | null
          game_mode: string | null
          hint_penalty: number | null
          hints_used: number | null
          id: string
          is_completed: boolean | null
          max_score: number
          percentage: number | null
          quiz_id: string
          score: number
          time_bonus: number | null
          time_taken: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          correct_answers?: number | null
          created_at?: string | null
          game_mode?: string | null
          hint_penalty?: number | null
          hints_used?: number | null
          id?: string
          is_completed?: boolean | null
          max_score?: number
          percentage?: number | null
          quiz_id: string
          score?: number
          time_bonus?: number | null
          time_taken?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          correct_answers?: number | null
          created_at?: string | null
          game_mode?: string | null
          hint_penalty?: number | null
          hints_used?: number | null
          id?: string
          is_completed?: boolean | null
          max_score?: number
          percentage?: number | null
          quiz_id?: string
          score?: number
          time_bonus?: number | null
          time_taken?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_scores_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          max_attempts: number | null
          passing_score: number | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          attempt_number: number | null
          created_at: string | null
          file_urls: string[] | null
          id: string
          is_late: boolean | null
          status: string | null
          student_id: string
          submitted_at: string | null
          text_content: string | null
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          attempt_number?: number | null
          created_at?: string | null
          file_urls?: string[] | null
          id?: string
          is_late?: boolean | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          text_content?: string | null
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          attempt_number?: number | null
          created_at?: string | null
          file_urls?: string[] | null
          id?: string
          is_late?: boolean | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          text_content?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_data: Json
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          icon: string | null
          id: string
          points_awarded: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_data?: Json
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          icon?: string | null
          id?: string
          points_awarded?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_data?: Json
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          icon?: string | null
          id?: string
          points_awarded?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_leaderboard_entries: {
        Row: {
          average_accuracy: number | null
          category: string | null
          created_at: string | null
          current_rank: number | null
          games_played: number | null
          id: string
          perfect_scores: number | null
          total_score: number
          total_time_spent: number | null
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          average_accuracy?: number | null
          category?: string | null
          created_at?: string | null
          current_rank?: number | null
          games_played?: number | null
          id?: string
          perfect_scores?: number | null
          total_score?: number
          total_time_spent?: number | null
          updated_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          average_accuracy?: number | null
          category?: string | null
          created_at?: string | null
          current_rank?: number | null
          games_played?: number | null
          id?: string
          perfect_scores?: number | null
          total_score?: number
          total_time_spent?: number | null
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_achievements: {
        Row: {
          achievement_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "learning_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          achievements_unlocked: Json | null
          created_at: string | null
          current_level: number | null
          id: string
          last_quiz_date: string | null
          longest_streak: number | null
          streak_count: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements_unlocked?: Json | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_quiz_date?: string | null
          longest_streak?: number | null
          streak_count?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements_unlocked?: Json | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_quiz_date?: string | null
          longest_streak?: number | null
          streak_count?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quiz_responses: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          response_time: number | null
          score_id: string
          user_answer: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          response_time?: number | null
          score_id: string
          user_answer: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          response_time?: number | null
          score_id?: string
          user_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_responses_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "quiz_scores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_quiz_analytics: { Args: { quiz_uuid: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
