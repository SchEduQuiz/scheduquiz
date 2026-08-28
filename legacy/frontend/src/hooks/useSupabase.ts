import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase, SupabaseService, TABLES } from '@/lib/supabase';
import { queryKeys } from '@/providers/QueryProvider';
import { toast } from 'sonner';
import type { Profile, Course, Lesson, Message, Quiz } from '@/lib/supabase';

// Auth hooks
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.auth.profile(userId || ''),
    queryFn: () => SupabaseService.getUserProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserSession() {
  return useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return user;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Course hooks
export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.all(),
    queryFn: () => SupabaseService.getCourses(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCourseDetails(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.details(courseId),
    queryFn: () => SupabaseService.getCourseDetails(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCourseLessons(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.lessons(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.LESSONS)
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');
      
      if (error) throw error;
      return data as Lesson[];
    },
    enabled: !!courseId,
  });
}

// Lesson hooks
export function useLessonDetails(lessonId: string) {
  return useQuery({
    queryKey: queryKeys.lessons.details(lessonId),
    queryFn: () => SupabaseService.getLessonDetails(lessonId),
    enabled: !!lessonId,
  });
}

export function useLessonProgress(lessonId: string, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.lessons.progress(lessonId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('student_id', userId!)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!lessonId && !!userId,
  });
}

export function useUpdateLessonProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ lessonId, userId, completed }: { 
      lessonId: string; 
      userId: string; 
      completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: lessonId,
          student_id: userId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          last_viewed_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { lessonId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.progress(lessonId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lessons.details(lessonId) });
    },
    onError: (error) => {
      console.error('Failed to update lesson progress:', error);
      toast.error('Failed to update progress');
    },
  });
}

// Quiz hooks
export function useQuizDetails(quizId: string) {
  return useQuery({
    queryKey: queryKeys.quizzes.details(quizId),
    queryFn: () => SupabaseService.getQuizDetails(quizId),
    enabled: !!quizId,
  });
}

export function useQuizAttempts(userId: string | undefined, quizId: string) {
  return useQuery({
    queryKey: queryKeys.quizzes.attempts(userId || '', quizId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId!)
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!quizId,
  });
}

export function useSubmitQuizAnswer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      attemptId,
      questionId,
      selectedAnswer,
      timeSpent,
    }: {
      attemptId: string;
      questionId: string;
      selectedAnswer: string;
      timeSpent: number;
    }) => {
      const { data, error } = await supabase
        .from('quiz_responses')
        .insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_answer: selectedAnswer,
          time_spent: timeSpent,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', 'responses'] });
    },
    onError: (error) => {
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
    },
  });
}

// Message hooks
export function useUserMessages(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.inbox(userId || ''),
    queryFn: () => SupabaseService.getUserMessages(userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      senderId,
      recipientId,
      subject,
      content,
      messageType = 'direct',
    }: {
      senderId: string;
      recipientId: string;
      subject?: string;
      content: string;
      messageType?: string;
    }) => {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          subject,
          content,
          message_type: messageType,
          read: false,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { senderId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.sent(senderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.messages.inbox(senderId) });
      toast.success('Message sent successfully');
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    },
  });
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { data, error } = await supabase
        .from(TABLES.MESSAGES)
        .update({ read: true })
        .eq('id', messageId);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

// Analytics hooks
export function useUserAnalytics(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.analytics.user(userId || ''),
    queryFn: () => SupabaseService.getUserAnalytics(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCourseAnalytics(courseId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.course(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_analytics')
        .select('*')
        .eq('course_id', courseId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Achievement hooks
export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.achievements(userId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements:achievement_id (
            achievement_name,
            achievement_description,
            badge_icon
          )
        `)
        .eq('user_id', userId!)
        .order('unlocked_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// File upload hooks
export function useUploadFile() {
  return useMutation({
    mutationFn: async ({
      bucket,
      path,
      file,
      options,
    }: {
      bucket: string;
      path: string;
      file: File;
      options?: { cacheControl?: string; upsert?: boolean };
    }) => {
      const { supabase } = await import('@/lib/supabase');
      return supabase.storage.from(bucket).upload(path, file, options);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      toast.error('Failed to upload file');
    },
  });
}

// Real-time subscription hook
export function useRealtimeSubscription(
  channel: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  filter: string,
  callback: (payload: any) => void
) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['realtime', channel],
    queryFn: () => {
      const subscription = supabase
        .channel(channel)
        .on('postgres_changes', { event, schema: 'public', table, filter }, callback)
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    },
    enabled: false, // Manual activation
  });
}