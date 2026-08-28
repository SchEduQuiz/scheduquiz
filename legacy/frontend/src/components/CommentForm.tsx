import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Send, X } from 'lucide-react';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  isReply?: boolean;
  parentComment?: string;
  initialContent?: string;
  isEditing?: boolean;
  loading?: boolean;
}

export function CommentForm({ 
  onSubmit, 
  onCancel, 
  placeholder = "Write a comment...", 
  isReply = false,
  parentComment = "",
  initialContent = "",
  isEditing = false,
  loading = false
}: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      if (!isEditing) {
        setContent('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-slate-600">Please log in to join the discussion.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      {isReply && parentComment && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 rounded-t-lg">
          <p className="text-sm text-slate-600">
            Replying to: <span className="font-medium text-slate-800">"{parentComment.slice(0, 100)}{parentComment.length > 100 ? '...' : ''}"</span>
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
          
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={isReply ? 3 : 4}
              maxLength={2000}
            />
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-slate-500">
                  {content.length}/2000 characters
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center space-x-1 px-4 py-2 text-slate-600 hover:text-slate-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={!content.trim() || isSubmitting || loading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmitting || loading ? 'Posting...' : (isEditing ? 'Update' : 'Post')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}