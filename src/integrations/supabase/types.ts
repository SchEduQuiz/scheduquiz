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
      admin_activity_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_entity_type: string | null
          target_question_id: string | null
          target_user_id: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_entity_type?: string | null
          target_question_id?: string | null
          target_user_id?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_entity_type?: string | null
          target_question_id?: string | null
          target_user_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_activity_logs_target_question_id_fkey"
            columns: ["target_question_id"]
            isOneToOne: false
            referencedRelation: "lesson_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_activity_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_grading_results: {
        Row: {
          ai_confidence_score: number | null
          ai_improvement_areas: Json | null
          ai_model_version: string | null
          ai_overall_score: number | null
          ai_processing_time_ms: number | null
          ai_specific_suggestions: Json | null
          ai_summary_feedback: string | null
          ai_total_possible: number | null
          assignment_id: string
          coherence_analysis: Json | null
          coherence_feedback: string | null
          coherence_score: number | null
          content_evidence: Json | null
          content_feedback: string | null
          content_score: number | null
          created_at: string | null
          final_score: number | null
          grammar_feedback: string | null
          grammar_issues: Json | null
          grammar_score: number | null
          id: string
          processing_timestamp: string | null
          relevance_alignment: Json | null
          relevance_feedback: string | null
          relevance_score: number | null
          submission_id: string
          teacher_adjusted: boolean | null
          teacher_approved: boolean | null
          teacher_notes: string | null
          updated_at: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_improvement_areas?: Json | null
          ai_model_version?: string | null
          ai_overall_score?: number | null
          ai_processing_time_ms?: number | null
          ai_specific_suggestions?: Json | null
          ai_summary_feedback?: string | null
          ai_total_possible?: number | null
          assignment_id: string
          coherence_analysis?: Json | null
          coherence_feedback?: string | null
          coherence_score?: number | null
          content_evidence?: Json | null
          content_feedback?: string | null
          content_score?: number | null
          created_at?: string | null
          final_score?: number | null
          grammar_feedback?: string | null
          grammar_issues?: Json | null
          grammar_score?: number | null
          id?: string
          processing_timestamp?: string | null
          relevance_alignment?: Json | null
          relevance_feedback?: string | null
          relevance_score?: number | null
          submission_id: string
          teacher_adjusted?: boolean | null
          teacher_approved?: boolean | null
          teacher_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          ai_improvement_areas?: Json | null
          ai_model_version?: string | null
          ai_overall_score?: number | null
          ai_processing_time_ms?: number | null
          ai_specific_suggestions?: Json | null
          ai_summary_feedback?: string | null
          ai_total_possible?: number | null
          assignment_id?: string
          coherence_analysis?: Json | null
          coherence_feedback?: string | null
          coherence_score?: number | null
          content_evidence?: Json | null
          content_feedback?: string | null
          content_score?: number | null
          created_at?: string | null
          final_score?: number | null
          grammar_feedback?: string | null
          grammar_issues?: Json | null
          grammar_score?: number | null
          id?: string
          processing_timestamp?: string | null
          relevance_alignment?: Json | null
          relevance_feedback?: string | null
          relevance_score?: number | null
          submission_id?: string
          teacher_adjusted?: boolean | null
          teacher_approved?: boolean | null
          teacher_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_grading_results_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_grading_results_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_grading_sessions: {
        Row: {
          ai_suggestions_accepted: Json | null
          completed_at: string | null
          created_at: string | null
          final_approved_score: number | null
          id: string
          initial_ai_score: number | null
          manual_adjustments: Json | null
          score_adjustments: Json | null
          session_duration_ms: number | null
          started_at: string | null
          submission_id: string
          teacher_id: string
        }
        Insert: {
          ai_suggestions_accepted?: Json | null
          completed_at?: string | null
          created_at?: string | null
          final_approved_score?: number | null
          id?: string
          initial_ai_score?: number | null
          manual_adjustments?: Json | null
          score_adjustments?: Json | null
          session_duration_ms?: number | null
          started_at?: string | null
          submission_id: string
          teacher_id: string
        }
        Update: {
          ai_suggestions_accepted?: Json | null
          completed_at?: string | null
          created_at?: string | null
          final_approved_score?: number | null
          id?: string
          initial_ai_score?: number | null
          manual_adjustments?: Json | null
          score_adjustments?: Json | null
          session_duration_ms?: number | null
          started_at?: string | null
          submission_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_grading_sessions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_grading_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pre_submit_feedback: {
        Row: {
          assignment_id: string
          created_at: string | null
          draft_text: string
          feedback_generated_at: string | null
          id: string
          improvement_suggestions: Json | null
          pre_check_feedback: Json | null
          pre_check_score: number | null
          student_id: string
          word_count: number | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          draft_text: string
          feedback_generated_at?: string | null
          id?: string
          improvement_suggestions?: Json | null
          pre_check_feedback?: Json | null
          pre_check_score?: number | null
          student_id: string
          word_count?: number | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          draft_text?: string
          feedback_generated_at?: string | null
          id?: string
          improvement_suggestions?: Json | null
          pre_check_feedback?: Json | null
          pre_check_score?: number | null
          student_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_pre_submit_feedback_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_pre_submit_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          id: string
          priority: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          priority?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          priority?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          ai_feedback_enabled: boolean | null
          ai_model_config: Json | null
          ai_rubric_config: Json | null
          allow_late_submissions: boolean | null
          allowed_file_types: string[] | null
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          enable_ai_pre_check: boolean | null
          grading_approach: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          late_penalty_percentage: number | null
          lesson_id: string | null
          max_file_size_mb: number | null
          max_points: number | null
          status: string | null
          submission_type: string | null
          submission_type_enhanced: string | null
          teacher_id: string
          title: string
          updated_at: string | null
          weight: number | null
          word_limit_max: number | null
          word_limit_min: number | null
        }
        Insert: {
          ai_feedback_enabled?: boolean | null
          ai_model_config?: Json | null
          ai_rubric_config?: Json | null
          allow_late_submissions?: boolean | null
          allowed_file_types?: string[] | null
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          enable_ai_pre_check?: boolean | null
          grading_approach?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          late_penalty_percentage?: number | null
          lesson_id?: string | null
          max_file_size_mb?: number | null
          max_points?: number | null
          status?: string | null
          submission_type?: string | null
          submission_type_enhanced?: string | null
          teacher_id: string
          title: string
          updated_at?: string | null
          weight?: number | null
          word_limit_max?: number | null
          word_limit_min?: number | null
        }
        Update: {
          ai_feedback_enabled?: boolean | null
          ai_model_config?: Json | null
          ai_rubric_config?: Json | null
          allow_late_submissions?: boolean | null
          allowed_file_types?: string[] | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          enable_ai_pre_check?: boolean | null
          grading_approach?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          late_penalty_percentage?: number | null
          lesson_id?: string | null
          max_file_size_mb?: number | null
          max_points?: number | null
          status?: string | null
          submission_type?: string | null
          submission_type_enhanced?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string | null
          weight?: number | null
          word_limit_max?: number | null
          word_limit_min?: number | null
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
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
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
      bookmarks: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          lesson_id: string | null
          notes: string | null
          resource_id: string | null
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          resource_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          notes?: string | null
          resource_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "course_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          event_date: string
          event_type: string | null
          id: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_url: string | null
          course_id: string
          id: string
          issued_at: string | null
          user_id: string
        }
        Insert: {
          certificate_url?: string | null
          course_id: string
          id?: string
          issued_at?: string | null
          user_id: string
        }
        Update: {
          certificate_url?: string | null
          course_id?: string
          id?: string
          issued_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_templates: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          teacher_id: string
          template_content: string
          template_name: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          teacher_id: string
          template_content: string
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          teacher_id?: string
          template_content?: string
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_templates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_analytics: {
        Row: {
          active_students: number | null
          average_grade: number | null
          completion_rate: number | null
          course_id: string
          id: string
          total_assignments: number | null
          total_enrollments: number | null
          updated_at: string | null
        }
        Insert: {
          active_students?: number | null
          average_grade?: number | null
          completion_rate?: number | null
          course_id: string
          id?: string
          total_assignments?: number | null
          total_enrollments?: number | null
          updated_at?: string | null
        }
        Update: {
          active_students?: number | null
          average_grade?: number | null
          completion_rate?: number | null
          course_id?: string
          id?: string
          total_assignments?: number | null
          total_enrollments?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_analytics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string | null
          resource_type: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id?: string | null
          resource_type?: string | null
          title: string
          uploaded_by: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string | null
          resource_type?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
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
      discussion_comments: {
        Row: {
          assignment_id: string | null
          content: string
          created_at: string | null
          id: string
          lesson_id: string | null
          parent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_comments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_comments_user_id_fkey"
            columns: ["user_id"]
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
      grade_analytics: {
        Row: {
          assignment_id: string | null
          average_score: number | null
          course_id: string
          grade_distribution: Json | null
          graded_count: number | null
          highest_score: number | null
          id: string
          last_updated: string | null
          lowest_score: number | null
          median_score: number | null
          pending_count: number | null
          total_submissions: number | null
        }
        Insert: {
          assignment_id?: string | null
          average_score?: number | null
          course_id: string
          grade_distribution?: Json | null
          graded_count?: number | null
          highest_score?: number | null
          id?: string
          last_updated?: string | null
          lowest_score?: number | null
          median_score?: number | null
          pending_count?: number | null
          total_submissions?: number | null
        }
        Update: {
          assignment_id?: string | null
          average_score?: number | null
          course_id?: string
          grade_distribution?: Json | null
          graded_count?: number | null
          highest_score?: number | null
          id?: string
          last_updated?: string | null
          lowest_score?: number | null
          median_score?: number | null
          pending_count?: number | null
          total_submissions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_analytics_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_analytics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      grade_history: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          grade_id: string
          id: string
          new_feedback: string | null
          new_points: number | null
          previous_feedback: string | null
          previous_points: number | null
          teacher_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          grade_id: string
          id?: string
          new_feedback?: string | null
          new_points?: number | null
          previous_feedback?: string | null
          previous_points?: number | null
          teacher_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          grade_id?: string
          id?: string
          new_feedback?: string | null
          new_points?: number | null
          previous_feedback?: string | null
          previous_points?: number | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_history_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_history_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      grading_rubrics: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_template: boolean | null
          name: string
          teacher_id: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name: string
          teacher_id: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_template?: boolean | null
          name?: string
          teacher_id?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_rubrics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grading_rubrics_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      lesson_content_analysis: {
        Row: {
          content_hash: string | null
          content_summary: string | null
          difficulty_level: string | null
          id: string
          key_concepts: Json | null
          learning_objectives: Json | null
          lesson_id: string
          processed_at: string | null
          processing_model: string | null
          subject_area: string | null
          updated_at: string | null
        }
        Insert: {
          content_hash?: string | null
          content_summary?: string | null
          difficulty_level?: string | null
          id?: string
          key_concepts?: Json | null
          learning_objectives?: Json | null
          lesson_id: string
          processed_at?: string | null
          processing_model?: string | null
          subject_area?: string | null
          updated_at?: string | null
        }
        Update: {
          content_hash?: string | null
          content_summary?: string | null
          difficulty_level?: string | null
          id?: string
          key_concepts?: Json | null
          learning_objectives?: Json | null
          lesson_id?: string
          processed_at?: string | null
          processing_model?: string | null
          subject_area?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_content_analysis_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
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
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_logs: {
        Row: {
          action_description: string
          action_type: string
          admin_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          request_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          request_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          request_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "password_reset_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          approved_at: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          reason: string | null
          rejected_at: string | null
          request_details: Json | null
          status: string
          temp_password: string | null
          temp_password_expires_at: string | null
          temp_password_used: boolean | null
          temp_password_used_at: string | null
          updated_at: string | null
          user_agent: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          rejected_at?: string | null
          request_details?: Json | null
          status?: string
          temp_password?: string | null
          temp_password_expires_at?: string | null
          temp_password_used?: boolean | null
          temp_password_used_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          reason?: string | null
          rejected_at?: string | null
          request_details?: Json | null
          status?: string
          temp_password?: string | null
          temp_password_expires_at?: string | null
          temp_password_used?: boolean | null
          temp_password_used_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity_at: string | null
          login_count: number | null
          new_password_hashed: string | null
          old_password_hashed: string | null
          password_change_required: boolean | null
          password_changed_at: string | null
          request_id: string
          session_status: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          login_count?: number | null
          new_password_hashed?: string | null
          old_password_hashed?: string | null
          password_change_required?: boolean | null
          password_changed_at?: string | null
          request_id: string
          session_status?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          login_count?: number | null
          new_password_hashed?: string | null
          old_password_hashed?: string | null
          password_change_required?: boolean | null
          password_changed_at?: string | null
          request_id?: string
          session_status?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "password_reset_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      rubric_criteria: {
        Row: {
          ai_evaluation_criteria: Json | null
          ai_model_instructions: string | null
          ai_weight_percentage: number | null
          created_at: string | null
          criterion_name: string
          description: string | null
          id: string
          max_points: number
          order_index: number | null
          rubric_id: string
        }
        Insert: {
          ai_evaluation_criteria?: Json | null
          ai_model_instructions?: string | null
          ai_weight_percentage?: number | null
          created_at?: string | null
          criterion_name: string
          description?: string | null
          id?: string
          max_points: number
          order_index?: number | null
          rubric_id: string
        }
        Update: {
          ai_evaluation_criteria?: Json | null
          ai_model_instructions?: string | null
          ai_weight_percentage?: number | null
          created_at?: string | null
          criterion_name?: string
          description?: string | null
          id?: string
          max_points?: number
          order_index?: number | null
          rubric_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "grading_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_performance: {
        Row: {
          average_grade: number | null
          completed_assignments: number | null
          course_id: string
          id: string
          progress_percentage: number | null
          student_id: string
          total_assignments: number | null
          total_study_time: number | null
          updated_at: string | null
        }
        Insert: {
          average_grade?: number | null
          completed_assignments?: number | null
          course_id: string
          id?: string
          progress_percentage?: number | null
          student_id: string
          total_assignments?: number | null
          total_study_time?: number | null
          updated_at?: string | null
        }
        Update: {
          average_grade?: number | null
          completed_assignments?: number | null
          course_id?: string
          id?: string
          progress_percentage?: number | null
          student_id?: string
          total_assignments?: number | null
          total_study_time?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_performance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_performance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          course_id: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          lesson_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          started_at: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          lesson_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          current_streak: number | null
          id: string
          last_study_date: string | null
          longest_streak: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_streak?: number | null
          id?: string
          last_study_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_streak?: number | null
          id?: string
          last_study_date?: string | null
          longest_streak?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_type: string | null
          setting_value: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_type?: string | null
          setting_value: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_type?: string | null
          setting_value?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
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
      user_activity_logs: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_user_id_fkey"
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
      cleanup_expired_reset_data: { Args: never; Returns: number }
      generate_temporary_password: { Args: never; Returns: string }
      get_password_reset_status: {
        Args: { user_email: string }
        Returns: {
          admin_notes: string
          created_at: string
          id: string
          status: string
          temp_password: string
          temp_password_expires_at: string
          temp_password_used: boolean
        }[]
      }
      log_password_reset_action: {
        Args: {
          p_action_description?: string
          p_action_type?: string
          p_admin_id?: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_request_id?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
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
