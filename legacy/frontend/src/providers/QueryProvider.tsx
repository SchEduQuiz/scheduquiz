import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

// Create a client with proper configuration for production
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 3;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// Query Keys for consistent caching
export const queryKeys = {
  // Auth
  auth: {
    profile: (userId: string) => ['auth', 'profile', userId] as const,
    session: () => ['auth', 'session'] as const,
  },
  
  // Courses
  courses: {
    all: () => ['courses'] as const,
    lists: () => [...queryKeys.courses.all(), 'list'] as const,
    list: (filters: string) => [...queryKeys.courses.lists(), { filters }] as const,
    details: (courseId: string) => [...queryKeys.courses.all(), 'detail', courseId] as const,
    lessons: (courseId: string) => [...queryKeys.courses.details(courseId), 'lessons'] as const,
  },
  
  // Lessons
  lessons: {
    all: () => ['lessons'] as const,
    details: (lessonId: string) => ['lessons', 'detail', lessonId] as const,
    progress: (lessonId: string) => ['lessons', 'progress', lessonId] as const,
    discussions: (lessonId: string) => ['lessons', 'discussions', lessonId] as const,
  },
  
  // Quizzes
  quizzes: {
    all: () => ['quizzes'] as const,
    details: (quizId: string) => ['quizzes', 'detail', quizId] as const,
    attempts: (userId: string, quizId: string) => ['quizzes', 'attempts', userId, quizId] as const,
    questions: (quizId: string) => ['quizzes', 'questions', quizId] as const,
    results: (attemptId: string) => ['quizzes', 'results', attemptId] as const,
  },
  
  // Analytics
  analytics: {
    user: (userId: string) => ['analytics', 'user', userId] as const,
    course: (courseId: string) => ['analytics', 'course', courseId] as const,
    overview: () => ['analytics', 'overview'] as const,
  },
  
  // Messages
  messages: {
    all: () => ['messages'] as const,
    inbox: (userId: string) => ['messages', 'inbox', userId] as const,
    sent: (userId: string) => ['messages', 'sent', userId] as const,
    details: (messageId: string) => ['messages', 'detail', messageId] as const,
  },
  
  // User Management
  users: {
    all: () => ['users'] as const,
    profiles: (filters?: string) => ['users', 'profiles', filters || 'all'] as const,
    details: (userId: string) => ['users', 'detail', userId] as const,
    achievements: (userId: string) => ['users', 'achievements', userId] as const,
  },
  
  // Assignments
  assignments: {
    all: () => ['assignments'] as const,
    course: (courseId: string) => ['assignments', 'course', courseId] as const,
    details: (assignmentId: string) => ['assignments', 'detail', assignmentId] as const,
    submissions: (assignmentId: string) => ['assignments', 'submissions', assignmentId] as const,
  },
} as const;