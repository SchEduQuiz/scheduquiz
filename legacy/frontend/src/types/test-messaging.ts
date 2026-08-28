// Test file for the messaging system functionality
// This validates the Message TypeScript interface and basic functionality

import { Message, CreateMessageRequest, MessageFilters } from './lessonQuiz';

// Test Message interface
const testMessage: Message = {
  id: 'test-uuid-123',
  sender_id: 'sender-uuid-456',
  recipient_id: 'recipient-uuid-789',
  subject: 'Test Subject',
  content: 'This is a test message content.',
  read: false,
  created_at: '2024-01-01T00:00:00Z',
  sender: {
    id: 'sender-uuid-456',
    full_name: 'John Doe',
    email: 'john@example.com',
    role: 'teacher'
  },
  recipient: {
    id: 'recipient-uuid-789',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'student'
  }
};

// Test CreateMessageRequest interface
const testCreateRequest: CreateMessageRequest = {
  recipient_id: 'recipient-uuid-789',
  subject: 'Test Subject',
  content: 'This is a test message content.'
};

// Test MessageFilters interface
const testFilters: MessageFilters = {
  type: 'inbox',
  read: false,
  search: 'test'
};

// Validate Message interface properties
console.log('Message interface validation:');
console.log('- Message has id:', !!testMessage.id);
console.log('- Message has sender_id:', !!testMessage.sender_id);
console.log('- Message has recipient_id:', !!testMessage.recipient_id);
console.log('- Message has content:', !!testMessage.content);
console.log('- Message has created_at:', !!testMessage.created_at);
console.log('- Message has sender info:', !!testMessage.sender);
console.log('- Message has recipient info:', !!testMessage.recipient);

// Validate CreateMessageRequest interface
console.log('\nCreateMessageRequest interface validation:');
console.log('- CreateMessageRequest has recipient_id:', !!testCreateRequest.recipient_id);
console.log('- CreateMessageRequest has content:', !!testCreateRequest.content);
console.log('- CreateMessageRequest has optional subject:', testCreateRequest.subject !== undefined);

// Validate MessageFilters interface
console.log('\nMessageFilters interface validation:');
console.log('- MessageFilters has type:', !!testFilters.type);
console.log('- MessageFilters has optional read:', testFilters.read !== undefined);
console.log('- MessageFilters has optional search:', testFilters.search !== undefined);

export { testMessage, testCreateRequest, testFilters };