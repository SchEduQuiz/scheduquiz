import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DiscussionComment } from '../hooks/useDiscussionComments';
import { MessageSquare, Reply, Edit3, Trash2, MoreVertical } from 'lucide-react';

interface CommentProps {
  comment: DiscussionComment;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  showActions: boolean;
}

export function Comment({ 
  comment, 
  onReply, 
  onEdit, 
  onDelete, 
  canEdit, 
  canDelete, 
  showActions 
}: CommentProps) {
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const userName = comment.profiles?.full_name || comment.profiles?.email || 'Anonymous';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="group">
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
            {userInitial}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-800">{userName}</span>
                <span className="text-xs text-slate-500 capitalize px-2 py-1 bg-slate-100 rounded-full">
                  {comment.profiles?.role}
                </span>
                <span className="text-xs text-slate-400">{formatDate(comment.created_at)}</span>
              </div>
              
              {showActions && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      {canEdit && (
                        <button
                          onClick={() => {
                            onEdit(comment.id, comment.content);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      )}
                      
                      {canDelete && (
                        <button
                          onClick={() => {
                            onDelete(comment.id);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-slate-700 whitespace-pre-wrap break-words">
              {comment.content}
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Reply className="h-4 w-4" />
                <span>Reply</span>
              </button>
              
              {comment.replies && comment.replies.length > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center space-x-1 text-sm text-slate-500 hover:text-slate-600 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                </button>
              )}
            </div>
          </div>
          
          {comment.replies && comment.replies.length > 0 && isExpanded && (
            <div className="mt-4 ml-6 space-y-4">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  showActions={showActions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}