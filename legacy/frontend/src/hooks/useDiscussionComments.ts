import { useState, useEffect, useCallback } from 'react';
import { supabase, UserRole } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DiscussionComment {
  id: string;
  lesson_id?: string;
  assignment_id?: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    role: UserRole;
  };
  replies?: DiscussionComment[];
}

export interface CreateCommentData {
  content: string;
  parent_id?: string;
  lesson_id?: string;
  assignment_id?: string;
}

export interface UpdateCommentData {
  content: string;
}

export function useDiscussionComments(
  lessonId?: string,
  assignmentId?: string,
  parentCommentId?: string
) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user can comment (students and teachers)
  const canComment = user && (profile?.role === 'student' || profile?.role === 'teacher' || profile?.role === 'admin');

  // Check if user is teacher of the course (for moderation)
  const [isCourseTeacher, setIsCourseTeacher] = useState(false);

  useEffect(() => {
    loadComments();
    if (user) {
      checkCourseTeacherRole();
    }
  }, [user, lessonId, assignmentId, parentCommentId]);

  const checkCourseTeacherRole = async () => {
    if (!user || (!lessonId && !assignmentId)) return;

    try {
      let courseId;
      
      if (lessonId) {
        const { data: lesson } = await supabase
          .from('lessons')
          .select('course_id')
          .eq('id', lessonId)
          .single();
        courseId = lesson?.course_id;
      } else if (assignmentId) {
        const { data: assignment } = await supabase
          .from('assignments')
          .select('course_id')
          .eq('id', assignmentId)
          .single();
        courseId = assignment?.course_id;
      }

      if (courseId) {
        const { data: course } = await supabase
          .from('courses')
          .select('teacher_id')
          .eq('id', courseId)
          .single();

        setIsCourseTeacher(user.id === course?.teacher_id);
      }
    } catch (error) {
      console.error('Error checking course teacher role:', error);
    }
  };

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('discussion_comments')
        .select(`
          *,
          profiles (
            full_name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      } else if (assignmentId) {
        query = query.eq('assignment_id', assignmentId);
      } else {
        throw new Error('Either lessonId or assignmentId is required');
      }

      if (parentCommentId) {
        query = query.eq('parent_id', parentCommentId);
      } else {
        query = query.is('parent_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Build nested structure for parent comments
      const buildNestedComments = (comments: DiscussionComment[]): DiscussionComment[] => {
        const commentMap = new Map<string, DiscussionComment & { replies: DiscussionComment[] }>();
        const rootComments: (DiscussionComment & { replies: DiscussionComment[] })[] = [];

        // First pass: create map and separate root comments
        comments.forEach(comment => {
          commentMap.set(comment.id, { ...comment, replies: [] });
        });

        comments.forEach(comment => {
          const commentWithReplies = commentMap.get(comment.id)!;
          if (comment.parent_id) {
            const parent = commentMap.get(comment.parent_id);
            if (parent) {
              parent.replies.push(commentWithReplies);
            }
          } else {
            rootComments.push(commentWithReplies);
          }
        });

        return rootComments;
      };

      const nestedComments = buildNestedComments(data || []);
      setComments(nestedComments);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [lessonId, assignmentId, parentCommentId]);

  const createComment = async (commentData: CreateCommentData): Promise<DiscussionComment | null> => {
    if (!user || !canComment) {
      throw new Error('You must be logged in and have permission to comment');
    }

    try {
      const { data, error } = await supabase
        .from('discussion_comments')
        .insert({
          user_id: user.id,
          content: commentData.content.trim(),
          parent_id: commentData.parent_id,
          lesson_id: commentData.lesson_id || lessonId,
          assignment_id: commentData.assignment_id || assignmentId,
        })
        .select(`
          *,
          profiles (
            full_name,
            email,
            role
          )
        `)
        .single();

      if (error) throw error;

      // Reload comments to get updated nested structure
      await loadComments();
      
      return data;
    } catch (err) {
      console.error('Error creating comment:', err);
      throw err;
    }
  };

  const updateComment = async (commentId: string, updateData: UpdateCommentData): Promise<void> => {
    if (!user) {
      throw new Error('You must be logged in to update comments');
    }

    try {
      const { error } = await supabase
        .from('discussion_comments')
        .update({
          content: updateData.content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', user.id); // Users can only update their own comments

      if (error) throw error;

      await loadComments();
    } catch (err) {
      console.error('Error updating comment:', err);
      throw err;
    }
  };

  const deleteComment = async (commentId: string): Promise<void> => {
    if (!user) {
      throw new Error('You must be logged in to delete comments');
    }

    try {
      const { error } = await supabase
        .from('discussion_comments')
        .delete()
        .eq('id', commentId)
        .or(`user_id.eq.${user.id},${isCourseTeacher ? 'true' : 'false'}`); // Allow user to delete own comments or teacher to moderate

      if (error) throw error;

      await loadComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  const moderateComment = async (commentId: string): Promise<void> => {
    if (!user || !isCourseTeacher) {
      throw new Error('Only course teachers can moderate comments');
    }

    try {
      const { error } = await supabase
        .from('discussion_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      await loadComments();
    } catch (err) {
      console.error('Error moderating comment:', err);
      throw err;
    }
  };

  const refreshComments = () => {
    loadComments();
  };

  return {
    comments,
    loading,
    error,
    canComment,
    isCourseTeacher,
    createComment,
    updateComment,
    deleteComment,
    moderateComment,
    refreshComments,
  };
}