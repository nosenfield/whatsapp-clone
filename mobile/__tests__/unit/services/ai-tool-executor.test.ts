import { AIToolExecutor } from '../../../src/services/ai-tool-executor';
import { createUserFriendlyError } from '../../../src/utils/ai-error-handling';

// Mock the dependencies
jest.mock('../../../src/services/user-search', () => ({
  searchUsersByEmail: jest.fn(),
  searchUsersByDisplayName: jest.fn(),
}));

jest.mock('../../../src/services/conversation-service', () => ({
  createOrGetConversation: jest.fn(),
  getConversationById: jest.fn(),
}));

jest.mock('../../../src/services/message-service', () => ({
  sendMessageToFirestore: jest.fn(),
}));

jest.mock('../../../src/services/database', () => ({
  getConversationMessages: jest.fn(),
}));

describe('AIToolExecutor', () => {
  let executor: AIToolExecutor;
  const mockUserId = 'user123';
  const mockConversationId = 'conv456';

  beforeEach(() => {
    executor = new AIToolExecutor({
      currentUserId: mockUserId,
      currentConversationId: mockConversationId,
    });
  });

  describe('search_contacts', () => {
    it('should return matching users', async () => {
      const { searchUsersByEmail } = require('../../../src/services/user-search');
      searchUsersByEmail.mockResolvedValue([
        {
          id: 'user1',
          displayName: 'John Smith',
          email: 'john@example.com',
          photoURL: 'https://example.com/photo.jpg',
        },
      ]);

      const result = await executor.execute({
        name: 'search_contacts',
        parameters: { query: 'John' },
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].displayName).toBe('John Smith');
    });

    it('should handle no results gracefully', async () => {
      const { searchUsersByEmail, searchUsersByDisplayName } = require('../../../src/services/user-search');
      searchUsersByEmail.mockResolvedValue([]);
      searchUsersByDisplayName.mockResolvedValue([]);

      const result = await executor.execute({
        name: 'search_contacts',
        parameters: { query: 'NonExistentUser' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_RESULTS');
      expect(result.suggestions).toBeDefined();
    });

    it('should handle search errors', async () => {
      const { searchUsersByEmail } = require('../../../src/services/user-search');
      searchUsersByEmail.mockRejectedValue(new Error('Network error'));

      const result = await executor.execute({
        name: 'search_contacts',
        parameters: { query: 'John' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEARCH_FAILED');
    });
  });

  describe('get_conversation_with_user', () => {
    it('should create or get conversation successfully', async () => {
      const { createOrGetConversation, getConversationById } = require('../../../src/services/conversation-service');
      createOrGetConversation.mockResolvedValue(mockConversationId);
      getConversationById.mockResolvedValue({
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId, 'user2'],
        participantDetails: {
          [mockUserId]: { displayName: 'Current User' },
          user2: { displayName: 'John Smith' },
        },
        lastMessageAt: new Date(),
      });

      const result = await executor.execute({
        name: 'get_conversation_with_user',
        parameters: { userId: 'user2' },
      });

      expect(result.success).toBe(true);
      expect(result.data.conversationId).toBe(mockConversationId);
      expect(result.data.otherParticipant.displayName).toBe('John Smith');
    });

    it('should handle conversation creation errors', async () => {
      const { createOrGetConversation } = require('../../../src/services/conversation-service');
      createOrGetConversation.mockRejectedValue(new Error('Permission denied'));

      const result = await executor.execute({
        name: 'get_conversation_with_user',
        parameters: { userId: 'user2' },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONVERSATION_ERROR');
    });
  });

  describe('send_message', () => {
    it('should send message successfully', async () => {
      const { sendMessageToFirestore } = require('../../../src/services/message-service');
      sendMessageToFirestore.mockResolvedValue('msg123');

      const result = await executor.execute({
        name: 'send_message',
        parameters: {
          conversationId: mockConversationId,
          content: 'Hello world',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.messageId).toBe('msg123');
      expect(result.data.content).toBe('Hello world');
    });

    it('should handle send message errors', async () => {
      const { sendMessageToFirestore } = require('../../../src/services/message-service');
      sendMessageToFirestore.mockRejectedValue(new Error('Network error'));

      const result = await executor.execute({
        name: 'send_message',
        parameters: {
          conversationId: mockConversationId,
          content: 'Hello world',
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEND_FAILED');
    });
  });

  describe('get_current_conversation', () => {
    it('should return current conversation when available', async () => {
      const { getConversationById } = require('../../../src/services/conversation-service');
      getConversationById.mockResolvedValue({
        id: mockConversationId,
        type: 'direct',
        participants: [mockUserId, 'user2'],
        participantDetails: {
          [mockUserId]: { displayName: 'Current User' },
          user2: { displayName: 'John Smith' },
        },
        lastMessageAt: new Date(),
      });

      const result = await executor.execute({
        name: 'get_current_conversation',
        parameters: {},
      });

      expect(result.success).toBe(true);
      expect(result.data.conversationId).toBe(mockConversationId);
    });

    it('should handle no current conversation', async () => {
      const executorWithoutConversation = new AIToolExecutor({
        currentUserId: mockUserId,
        currentConversationId: undefined,
      });

      const result = await executorWithoutConversation.execute({
        name: 'get_current_conversation',
        parameters: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_CURRENT_CONVERSATION');
    });
  });

  describe('get_latest_message', () => {
    it('should return latest message', async () => {
      const { getConversationMessages } = require('../../../src/services/database');
      getConversationMessages.mockResolvedValue([
        {
          id: 'msg123',
          conversationId: mockConversationId,
          senderId: 'user2',
          content: { text: 'Hello', type: 'text' },
          timestamp: new Date(),
        },
      ]);

      const result = await executor.execute({
        name: 'get_latest_message',
        parameters: { conversationId: mockConversationId },
      });

      expect(result.success).toBe(true);
      expect(result.data.messageId).toBe('msg123');
      expect(result.data.direction).toBe('received');
    });

    it('should handle no messages', async () => {
      const { getConversationMessages } = require('../../../src/services/database');
      getConversationMessages.mockResolvedValue([]);

      const result = await executor.execute({
        name: 'get_latest_message',
        parameters: { conversationId: mockConversationId },
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_MESSAGES');
    });
  });

  describe('unknown tool', () => {
    it('should handle unknown tool gracefully', async () => {
      const result = await executor.execute({
        name: 'unknown_tool',
        parameters: {},
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNKNOWN_TOOL');
    });
  });
});

describe('AI Error Handling', () => {
  it('should create user-friendly error messages', () => {
    const error = createUserFriendlyError({ code: 'NO_RESULTS' });
    expect(error.message).toBe('No contacts found matching your search');
    expect(error.suggestions).toContain('Try a different name or email');
  });

  it('should handle network errors', () => {
    const error = createUserFriendlyError({ message: 'network error' });
    expect(error.message).toBe('Network connection error');
    expect(error.suggestions).toContain('Check your internet connection');
  });

  it('should handle unknown errors', () => {
    const error = createUserFriendlyError({ message: 'random error' });
    expect(error.message).toBe('An unexpected error occurred');
    expect(error.suggestions).toContain('Try again');
  });
});
