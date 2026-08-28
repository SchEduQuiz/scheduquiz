import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../hooks/useMessages';
import { Message } from '../../types/lessonQuiz';
import { 
  Inbox, 
  Send, 
  Search, 
  Trash2, 
  Eye, 
  EyeOff,
  User,
  MessageSquare,
  Clock,
  RefreshCw
} from 'lucide-react';

export default function Messages() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { messages, loading, error, markAsRead, deleteMessage, refreshMessages } = useMessages({
    type: activeTab,
    read: showUnreadOnly ? false : undefined,
    search: searchQuery || undefined,
  });

  const handleMarkAsRead = async (message: Message) => {
    if (!message.read) {
      await markAsRead(message.id);
    }
  };

  const handleDeleteMessage = async (messageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const unreadCount = messages.filter(msg => !msg.read && msg.recipient_id === profile?.id).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <p className="text-red-800 font-medium mb-2">Error loading messages</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={refreshMessages}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                  <p className="text-gray-600">Manage your conversations</p>
                </div>
              </div>
              <Link
                to="/messages/compose"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Send className="h-4 w-4" />
                <span>Compose</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation and Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            {/* Tab Navigation */}
            <div className="flex space-x-8 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('inbox')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'inbox'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Inbox className="h-4 w-4" />
                  <span>Inbox</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Sent</span>
                </div>
              </button>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              {activeTab === 'inbox' && (
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={(e) => setShowUnreadOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Unread only</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
            <p className="text-gray-500 mb-6">
              {activeTab === 'inbox' 
                ? "You don't have any messages yet." 
                : "You haven't sent any messages yet."
              }
            </p>
            <Link
              to="/messages/compose"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Compose New Message
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message) => {
              const isReceived = message.recipient_id === profile?.id;
              const otherUser = isReceived ? message.sender : message.recipient;
              const isUnread = !message.read && isReceived;

              return (
                <Link
                  key={message.id}
                  to={`/messages/${message.id}`}
                  onClick={() => handleMarkAsRead(message)}
                  className={`block p-4 rounded-lg border transition-colors hover:shadow-md ${
                    isUnread
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      isUnread ? 'bg-blue-600' : 'bg-gray-400'
                    }`}>
                      <User className="h-5 w-5 text-white" />
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <p className={`text-sm font-medium truncate ${
                            isUnread ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {otherUser?.full_name || 'Unknown User'}
                          </p>
                          {otherUser?.role && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              otherUser.role === 'teacher' ? 'bg-purple-100 text-purple-800' :
                              otherUser.role === 'administrator' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {otherUser.role}
                            </span>
                          )}
                          {isUnread && (
                            <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            <span className="text-xs">{formatDate(message.created_at)}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteMessage(message.id, e)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete message"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {message.subject && (
                        <p className={`text-sm font-medium mb-1 truncate ${
                          isUnread ? 'text-blue-800' : 'text-gray-700'
                        }`}>
                          {message.subject}
                        </p>
                      )}
                      
                      <p className={`text-sm truncate ${
                        isUnread ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {message.content}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}