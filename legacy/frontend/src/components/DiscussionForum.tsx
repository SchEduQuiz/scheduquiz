import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDiscussionComments, CreateCommentData } from '../hooks/useDiscussionComments';
import { Comment } from './Comment';
import { CommentForm } from './CommentForm';
import { ArrowLeft, MessageSquare, Users, AlertCircle } from 'lucide-react';

interface DiscussionForumProps {
  type: 'lesson' | 'assignment';
}

export function DiscussionForum({ type }: DiscussionForumProps) {
  const { courseId, lessonId, assignmentId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const {
    comments,
    loading,
    error,
    canComment,
    isCourseTeacher,
    createComment,
    updateComment,
    deleteComment,
    moderateComment,
    refreshComments
  } = useDiscussionComments(
    type === 'lesson' ? lessonId : undefined,
    type === 'assignment' ? assignmentId : undefined
  );

  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const targetId = type === 'lesson' ? lessonId : assignmentId;
  const targetName = type === 'lesson' ? 'Lesson' : 'Assignment';

  const handleCreateComment = async (content: string) => {
    if (!targetId) return;
    
    const commentData: CreateCommentData = {
      content,
      ...(type === 'lesson' ? { lesson_id: targetId } : { assignment_id: targetId })
    };

    await createComment(commentData);
    setShowCommentForm(false);
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!targetId) return;
    
    const commentData: CreateCommentData = {
      content,
      parent_id: parentId,
      ...(type === 'lesson' ? { lesson_id: targetId } : { assignment_id: targetId })
    };

    await createComment(commentData);
    setReplyingTo(null);
  };

  const handleEdit = async (commentId: string, content: string) => {
    setEditingComment(commentId);
    setEditingContent(content);
  };

  const handleUpdateComment = async (content: string) => {
    if (!editingComment) return;
    
    await updateComment(editingComment, { content });
    setEditingComment(null);
    setEditingContent('');
  };

  const handleDelete = async (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      await deleteComment(commentId);
    }
  };

  const handleModerate = async (commentId: string) => {
    if (window.confirm('Are you sure you want to remove this comment? This action cannot be undone.')) {
      await moderateComment(commentId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Error Loading Discussions</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={refreshComments}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={type === 'lesson' 
              ? `/courses/${courseId}/lessons/${lessonId}`
              : `/student/assignments/${assignmentId}`
            }
            className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 mb-6 min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to {targetName}</span>
          </Link>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                  Discussion Forum
                </h1>
                <p className="text-slate-600">
                  Join the conversation about this {type === 'lesson' ? 'lesson' : 'assignment'}
                </p>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-slate-500">
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{comments.length} {comments.length === 1 ? 'discussion' : 'discussions'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{new Set(comments.flatMap(c => [c.user_id, ...(c.replies?.map(r => r.user_id) || [])])).size} participants</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Comment Button */}
        {canComment && !showCommentForm && (
          <div className="mb-8">
            <button
              onClick={() => setShowCommentForm(true)}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
            >
              <MessageSquare className="h-5 w-5" />
              <span>Start a Discussion</span>
            </button>
          </div>
        )}

        {/* Comment Form */}
        {showCommentForm && (
          <div className="mb-8">
            <CommentForm
              onSubmit={handleCreateComment}
              onCancel={() => setShowCommentForm(false)}
              placeholder={`Share your thoughts about this ${type}...`}
              loading={loading}
            />
          </div>
        )}

        {/* Edit Form */}
        {editingComment && (
          <div className="mb-8">
            <CommentForm
              onSubmit={handleUpdateComment}
              onCancel={() => {
                setEditingComment(null);
                setEditingContent('');
              }}
              placeholder="Edit your comment..."
              initialContent={editingContent}
              isEditing={true}
              loading={loading}
            />
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {comments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <MessageSquare className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No discussions yet</h3>
              <p className="text-slate-500 mb-6">
                Be the first to start a conversation about this {type === 'lesson' ? 'lesson' : 'assignment'}!
              </p>
              {canComment && (
                <button
                  onClick={() => setShowCommentForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Start Discussion
                </button>
              )}
            </div>
          ) : (
            comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onReply={setReplyingTo}
                onEdit={handleEdit}
                onDelete={isCourseTeacher ? handleModerate : handleDelete}
                canEdit={user?.id === comment.user_id}
                canDelete={user?.id === comment.user_id || isCourseTeacher}
                showActions={!!user}
              />
            ))
          )}
        </div>

        {/* Reply Form */}
        {replyingTo && (
          <div className="mt-6">
            <CommentForm
              onSubmit={(content) => handleReply(replyingTo, content)}
              onCancel={() => setReplyingTo(null)}
              placeholder="Write your reply..."
              isReply={true}
              parentComment={comments.find(c => c.id === replyingTo)?.content || ''}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
}