import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../hooks/useMessages';
import { Message } from '../../types/lessonQuiz';
import { 
  ArrowLeft, 
  Reply, 
  Trash2, 
  User, 
  Mail,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function MessageView() {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { getMessageById, markAsRead, deleteMessage } = useMessages();
  
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const loadMessage = async () => {
      if (!messageId) {
        setError('Message ID not provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getMessageById(messageId);
        
        if (result.success && result.data) {
          setMessage(result.data);
          
          // Mark as read if this is a received message and not yet read
          if (result.data.recipient_id === profile?.id && !result.data.read) {
            await markAsRead(messageId);
          }
        } else {
          setError(result.error || 'Message not found');
        }
      } catch (err) {
        setError('Failed to load message');
      } finally {
        setLoading(false);
      }
    };

    loadMessage();
  }, [messageId, profile?.id, getMessageById, markAsRead]);

  const handleDelete = async () => {
    if (!message) return;

    if (window.confirm('Are you sure you want to delete this message?')) {
      setActionLoading(true);
      
      try {
        const result = await deleteMessage(message.id);
        
        if (result.success) {
          navigate('/messages');
        } else {
          setError(result.error || 'Failed to delete message');
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'teacher':
        return 'bg-purple-100 text-purple-800';
      case 'administrator':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-gray-600">Loading message...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-800 font-medium mb-2">Error loading message</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <div className="space-x-2">
              <button
                onClick={() => navigate('/messages')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Messages
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-800 font-medium mb-2">Message not found</p>
            <button
              onClick={() => navigate('/messages')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Messages
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isReceived = message.recipient_id === profile?.id;
  const otherUser = isReceived ? message.sender : message.recipient;
  const isUnread = !message.read && isReceived;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/messages')}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <Mail className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {isReceived ? 'Inbox' : 'Sent Message'}
                    </h1>
                    <p className="text-gray-600">Message Details</p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center space-x-2">
                {isReceived && (
                  <Link
                    to={`/messages/compose?replyTo=${otherUser?.id}&subject=Re: ${message.subject || ''}`}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Reply className="h-4 w-4" />
                    <span>Reply</span>
                  </Link>
                )}
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Message Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${
                  isUnread ? 'bg-blue-600' : 'bg-gray-400'
                }`}>
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {otherUser?.full_name || 'Unknown User'}
                    </h2>
                    {otherUser?.role && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(otherUser.role)}`}>
                        {otherUser.role}
                      </span>
                    )}
                    {isUnread && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(message.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject */}
            {message.subject && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Subject:</h3>
                <p className="text-gray-900 font-medium">{message.subject}</p>
              </div>
            )}

            {/* From/To Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">From:</p>
                  <p className="text-sm text-gray-900">
                    {message.sender?.full_name || 'Unknown'} ({message.sender?.email || 'No email'})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">To:</p>
                  <p className="text-sm text-gray-900">
                    {message.recipient?.full_name || 'Unknown'} ({message.recipient?.email || 'No email'})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message Body */}
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/messages')}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                >
                  ← Back to Messages
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                {isReceived && (
                  <Link
                    to={`/messages/compose?replyTo=${otherUser?.id}&subject=Re: ${message.subject || ''}`}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Reply className="h-4 w-4" />
                    <span>Reply</span>
                  </Link>
                )}
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}