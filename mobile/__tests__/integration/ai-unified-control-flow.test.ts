import { AICommandService } from '../../src/services/ai-command-service-unified';
import { QueryClient } from '@tanstack/react-query';
import { initDatabase, clearAllData, getConversationMessages } from '../../src/services/database';
import { createTestUser, createTestConversation } from '../fixtures/test-data';

// Mock the services
jest.mock('../../src/services/conversation-service', () => ({
  createOrGetConversation: jest.fn(),
  getConversationById: jest.fn(),
}));

jest.mock('../../src/services/user-search', () => ({
  searchUsersByEmail: jest.fn(),
}));

jest.mock('../../src/services/message-service', () => ({
  sendMessageToFirestore: jest.fn(),
}));

describe('AI Commands Integration', () => {
  let aiService: AICommandService;
  let queryClient: QueryClient;
  
  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    aiService = new AICommandService(queryClient);
    await initDatabase();
    await clearAllData();
  });

  afterEach(async () => {
    await clearAllData();
    queryClient.clear();
  });

  test('AI "send message" should update all state like UI', async () => {
    // Setup mocks
    const { searchUsersByEmail } = require('../../src/services/user-search');
    const { createOrGetConversation, getConversationById } = require('../../src/services/conversation-service');
    const { sendMessageToFirestore } = require('../../src/services/message-service');
    
    const testUser = createTestUser({ id: 'contact-1', email: 'john@example.com' });
    const testConversation = createTestConversation({ 
      id: 'conv-ai',
      participants: ['user-1', 'contact-1'],
    });
    
    searchUsersByEmail.mockResolvedValue([testUser]);
    createOrGetConversation.mockResolvedValue('conv-ai');
    getConversationById.mockResolvedValue(testConversation);
    sendMessageToFirestore.mockResolvedValue('ai-message-id');
    
    // Execute: AI sends message
    const response = await aiService.processCommand(
      'Tell John hello',
      {
        currentScreen: 'chats',
        currentUserId: 'user-1',
        recentConversations: [],
        deviceInfo: { platform: 'ios', version: '1.0.0' },
      }
    );
    
    // Verify: All state updated correctly
    expect(response.success).toBe(true);
    expect(response.action).toBe('navigate_to_conversation');
    
    const conversationId = response.result.conversationId;
    
    // 1. Message in SQLite
    const messages = await getConversationMessages(conversationId);
    expect(messages).toHaveLength(1);
    expect(messages[0].content.text).toBe('hello');
    expect(messages[0].id).toBe('ai-message-id');
    expect(messages[0].status).toBe('sent');
    expect(messages[0].syncStatus).toBe('synced');
    
    // 2. All services called correctly
    expect(searchUsersByEmail).toHaveBeenCalledWith('john');
    expect(createOrGetConversation).toHaveBeenCalledWith('user-1', 'contact-1');
    expect(sendMessageToFirestore).toHaveBeenCalledWith('conv-ai', {
      senderId: 'user-1',
      content: { text: 'hello', type: 'text' },
    });
  });
  
  test('AI commands should produce same result as UI commands', async () => {
    // This test ensures parity between AI and UI flows
    
    const { searchUsersByEmail } = require('../../src/services/user-search');
    const { createOrGetConversation, getConversationById } = require('../../src/services/conversation-service');
    const { sendMessageToFirestore } = require('../../src/services/message-service');
    
    const testUser = createTestUser({ id: 'contact-2', email: 'jane@example.com' });
    const testConversation = createTestConversation({ 
      id: 'conv-parity',
      participants: ['user-1', 'contact-2'],
    });
    
    searchUsersByEmail.mockResolvedValue([testUser]);
    createOrGetConversation.mockResolvedValue('conv-parity');
    getConversationById.mockResolvedValue(testConversation);
    sendMessageToFirestore.mockResolvedValue('parity-message-id');
    
    // 1. Send via AI
    const aiResponse = await aiService.processCommand(
      'Tell Jane hello from AI',
      {
        currentScreen: 'chats',
        currentUserId: 'user-1',
        recentConversations: [],
        deviceInfo: { platform: 'ios', version: '1.0.0' },
      }
    );
    
    const aiConversationId = aiResponse.result.conversationId;
    const aiMessages = await getConversationMessages(aiConversationId);
    
    // 2. Verify AI message structure
    expect(aiMessages[0].syncStatus).toBe('synced');
    expect(aiMessages[0].status).toBe('sent');
    expect(aiMessages[0].deliveredTo).toEqual([]);
    expect(aiMessages[0].readBy).toEqual({});
    
    // 3. Verify all the same services were called
    expect(searchUsersByEmail).toHaveBeenCalledWith('jane');
    expect(createOrGetConversation).toHaveBeenCalledWith('user-1', 'contact-2');
    expect(sendMessageToFirestore).toHaveBeenCalledWith('conv-parity', {
      senderId: 'user-1',
      content: { text: 'hello from ai', type: 'text' },
    });
  });
});
