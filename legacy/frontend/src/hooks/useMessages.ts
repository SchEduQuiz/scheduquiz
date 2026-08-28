import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Message, CreateMessageRequest, MessageFilters, MessageOperationResult } from '../types/lessonQuiz';

export function useMessages(filters?: MessageFilters) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!user || !profile) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email, role),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email, role)
        `);

      // Apply filters
      if (filters?.type === 'inbox') {
        query = query.eq('recipient_id', user.id);
      } else if (filters?.type === 'sent') {
        query = query.eq('sender_id', user.id);
      } else {
        // 'all' - show both sent and received messages
        query = query.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);
      }

      if (filters?.read !== undefined) {
        query = query.eq('read', filters.read);
      }

      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      // Order by creation date, newest first
      query = query.order('created_at', { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setMessages(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageData: CreateMessageRequest): Promise<MessageOperationResult> => {
    if (!user || !profile) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // Validate recipient
      const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', messageData.recipient_id)
        .single();

      if (recipientError || !recipient) {
        return { success: false, error: 'Recipient not found' };
      }

      // Prevent self-messaging
      if (messageData.recipient_id === user.id) {
        return { success: false, error: 'Cannot send message to yourself' };
      }

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: messageData.recipient_id,
          subject: messageData.subject,
          content: messageData.content,
        })
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email, role),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email, role)
        `)
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Refresh messages list to include the new message
      await fetchMessages();

      return { success: true, data: data as Message };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      return { success: false, error: errorMessage };
    }
  };

  const markAsRead = async (messageId: string): Promise<MessageOperationResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error: updateError } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId)
        .eq('recipient_id', user.id) // Ensure user can only mark their own received messages as read
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email, role),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email, role)
        `)
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, read: true, sender: data?.sender, recipient: data?.recipient }
            : msg
        )
      );

      return { success: true, data: data as Message };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark message as read';
      return { success: false, error: errorMessage };
    }
  };

  const deleteMessage = async (messageId: string): Promise<MessageOperationResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`); // Allow deletion by either sender or recipient

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete message';
      return { success: false, error: errorMessage };
    }
  };

  const getMessageById = async (messageId: string): Promise<MessageOperationResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email, role),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email, role)
        `)
        .eq('id', messageId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return { success: true, data: data as Message };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch message';
      return { success: false, error: errorMessage };
    }
  };

  const getUnreadCount = async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error fetching unread count:', err);
      return 0;
    }
  };

  // Get list of users for message composition
  const getUserList = async (role?: string): Promise<Array<{ id: string; full_name: string; email?: string; role?: string }>> => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, role');

      if (role) {
        query = query.eq('role', role);
      }

      // Exclude current user
      if (user) {
        query = query.neq('id', user.id);
      }

      const { data, error } = await query.order('full_name');

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (err) {
      console.error('Error fetching user list:', err);
      return [];
    }
  };

  // Fetch messages when filters change
  useEffect(() => {
    fetchMessages();
  }, [user, profile, filters?.type, filters?.read, filters?.search]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteMessage,
    getMessageById,
    getUnreadCount,
    getUserList,
    refreshMessages: fetchMessages,
  };
}