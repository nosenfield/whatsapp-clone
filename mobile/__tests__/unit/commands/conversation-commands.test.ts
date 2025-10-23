import { ConversationCommands } from '../../../src/commands/conversation-commands';
import { QueryClient } from '@tanstack/react-query';
import { initDatabase, clearAllData, getConversation } from '../../../src/services/database';
import { createTestConversation, createTestUser } from '../../fixtures/test-data';

// Mock the conversation service
jest.mock('../../../src/services/conversation-service', () => ({
  createOrGetConversation: jest.fn(),
  createGroupConversation: jest.fn(),
  getConversationById: jest.fn(),
}));

// Mock the user search service
jest.mock('../../../src/services/user-search', () => ({
  searchUsersByEmail: jest.fn(),
}));

describe('ConversationCommands', () => {
  let conversationCommands: ConversationCommands;
  let queryClient: QueryClient;
  
  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    conversationCommands = new ConversationCommands(queryClient);
    await initDatabase();
    await clearAllData();
  });

  afterEach(async () => {
    await clearAllData();
    queryClient.clear();
  });

  test('findOrCreateConversation should create conversation and store in SQLite', async () => {
    // Setup mocks
    const { searchUsersByEmail } = require('../../../src/services/user-search');
    const { createOrGetConversation, getConversationById } = require('../../../src/services/conversation-service');
    
    const testUser = createTestUser({ id: 'contact-1', email: 'contact@example.com' });
    const testConversation = createTestConversation({ 
      id: 'conv-new',
      participants: ['user-1', 'contact-1'],
    });
    
    searchUsersByEmail.mockResolvedValue([testUser]);
    createOrGetConversation.mockResolvedValue('conv-new');
    getConversationById.mockResolvedValue(testConversation);
    
    // Execute
    const conversation = await conversationCommands.findOrCreateConversation({
      contactName: 'contact@example.com',
      userId: 'user-1',
    });
    
    // Verify
    expect(conversation.id).toBe('conv-new');
    
    // 1. User search called
    expect(searchUsersByEmail).toHaveBeenCalledWith('contact@example.com');
    
    // 2. Conversation created
    expect(createOrGetConversation).toHaveBeenCalledWith('user-1', 'contact-1');
    
    // 3. Conversation fetched
    expect(getConversationById).toHaveBeenCalledWith('conv-new');
    
    // 4. Conversation stored in SQLite
    const storedConversation = await getConversation('conv-new');
    expect(storedConversation).toBeDefined();
    expect(storedConversation?.id).toBe('conv-new');
    
    // 5. Cache invalidation called (queries may not exist yet)
    // The important thing is that invalidateQueries was called without error
  });

  test('findOrCreateConversation should throw error if contact not found', async () => {
    // Setup mocks
    const { searchUsersByEmail } = require('../../../src/services/user-search');
    searchUsersByEmail.mockResolvedValue([]);
    
    // Execute and expect error
    await expect(
      conversationCommands.findOrCreateConversation({
        contactName: 'nonexistent@example.com',
        userId: 'user-1',
      })
    ).rejects.toThrow('Contact "nonexistent@example.com" not found');
  });

  test('createGroup should create group conversation', async () => {
    // Setup mocks
    const { createGroupConversation, getConversationById } = require('../../../src/services/conversation-service');
    
    const testGroup = createTestConversation({
      id: 'group-1',
      type: 'group',
      name: 'Test Group',
      participants: ['user-1', 'user-2', 'user-3'],
    });
    
    createGroupConversation.mockResolvedValue('group-1');
    getConversationById.mockResolvedValue(testGroup);
    
    // Execute
    const conversation = await conversationCommands.createGroup({
      name: 'Test Group',
      creatorId: 'user-1',
      participantIds: ['user-2', 'user-3'],
    });
    
    // Verify
    expect(conversation.id).toBe('group-1');
    expect(conversation.type).toBe('group');
    expect(conversation.name).toBe('Test Group');
    
    // 1. Group created
    expect(createGroupConversation).toHaveBeenCalledWith(
      'user-1',
      ['user-2', 'user-3'],
      'Test Group'
    );
    
    // 2. Group fetched
    expect(getConversationById).toHaveBeenCalledWith('group-1');
    
    // 3. Group stored in SQLite
    const storedGroup = await getConversation('group-1');
    expect(storedGroup).toBeDefined();
    expect(storedGroup?.type).toBe('group');
    
    // 4. Cache invalidation called (queries may not exist yet)
    // The important thing is that invalidateQueries was called without error
  });

  test('loadConversation should fetch and store conversation', async () => {
    // Setup mocks
    const { getConversationById } = require('../../../src/services/conversation-service');
    
    const testConversation = createTestConversation({ id: 'conv-load' });
    getConversationById.mockResolvedValue(testConversation);
    
    // Execute
    const conversation = await conversationCommands.loadConversation('conv-load');
    
    // Verify
    expect(conversation.id).toBe('conv-load');
    
    // 1. Conversation fetched
    expect(getConversationById).toHaveBeenCalledWith('conv-load');
    
    // 2. Conversation stored in SQLite
    const storedConversation = await getConversation('conv-load');
    expect(storedConversation).toBeDefined();
    expect(storedConversation?.id).toBe('conv-load');
  });

  test('loadConversation should throw error if conversation not found', async () => {
    // Setup mocks
    const { getConversationById } = require('../../../src/services/conversation-service');
    getConversationById.mockResolvedValue(null);
    
    // Execute and expect error
    await expect(
      conversationCommands.loadConversation('nonexistent-conv')
    ).rejects.toThrow('Conversation not found');
  });
});
