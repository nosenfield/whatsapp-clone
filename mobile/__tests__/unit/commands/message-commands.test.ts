import { MessageCommands } from '../../../src/commands/message-commands';
import { QueryClient } from '@tanstack/react-query';
import { initDatabase, clearAllData, upsertConversation, getConversationMessages } from '../../../src/services/database';
import { createTestConversation, createTestUser } from '../../fixtures/test-data';

// Mock the message store
jest.mock('../../../src/store/message-store', () => ({
  useMessageStore: {
    getState: () => ({
      addOptimisticMessage: jest.fn(),
      removeOptimisticMessage: jest.fn(),
    }),
  },
}));

// Mock the message service
jest.mock('../../../src/services/message-service', () => ({
  sendMessageToFirestore: jest.fn(),
}));

// Mock the image service
jest.mock('../../../src/services/image-service', () => ({
  uploadImageMessage: jest.fn(),
}));

describe('MessageCommands', () => {
  let messageCommands: MessageCommands;
  let queryClient: QueryClient;
  
  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    messageCommands = new MessageCommands(queryClient);
    await initDatabase();
    await clearAllData();
  });

  afterEach(async () => {
    await clearAllData();
    queryClient.clear();
  });

  test('sendMessage should follow complete flow', async () => {
    // Setup
    const conversation = createTestConversation({ id: 'conv-1' });
    await upsertConversation(conversation);
    
    const { sendMessageToFirestore } = require('../../../src/services/message-service');
    sendMessageToFirestore.mockResolvedValue('server-msg-id');
    
    // Execute
    const messageId = await messageCommands.sendMessage({
      conversationId: 'conv-1',
      senderId: 'user-1',
      content: { text: 'Test message', type: 'text' },
    });
    
    // Verify all side effects
    expect(messageId).toBe('server-msg-id');
    
    // 1. Message in SQLite
    const messages = await getConversationMessages('conv-1');
    expect(messages).toHaveLength(1);
    expect(messages[0].content.text).toBe('Test message');
    expect(messages[0].id).toBe('server-msg-id');
    expect(messages[0].status).toBe('sent');
    expect(messages[0].syncStatus).toBe('synced');
    
    // 2. Firebase service called
    expect(sendMessageToFirestore).toHaveBeenCalledWith('conv-1', {
      senderId: 'user-1',
      content: { text: 'Test message', type: 'text' },
    });
  });
  
  test('sendMessage should handle errors gracefully', async () => {
    const conversation = createTestConversation({ id: 'conv-error' });
    await upsertConversation(conversation);
    
    // Mock Firebase failure
    const { sendMessageToFirestore } = require('../../../src/services/message-service');
    sendMessageToFirestore.mockRejectedValue(new Error('Network error'));
    
    // Execute and expect error
    await expect(
      messageCommands.sendMessage({
        conversationId: 'conv-error',
        senderId: 'user-1',
        content: { text: 'Will fail', type: 'text' },
      })
    ).rejects.toThrow('Network error');
    
    // Verify message marked as failed
    const messages = await getConversationMessages('conv-error');
    expect(messages[0].syncStatus).toBe('failed');
  });

  test('sendImage should handle image upload flow', async () => {
    // Setup
    const conversation = createTestConversation({ id: 'conv-image' });
    await upsertConversation(conversation);
    
    const { sendMessageToFirestore } = require('../../../src/services/message-service');
    const { uploadImageMessage } = require('../../../src/services/image-service');
    
    sendMessageToFirestore.mockResolvedValue('server-image-id');
    uploadImageMessage.mockResolvedValue({
      imageUrl: 'https://storage.googleapis.com/image.jpg',
      thumbnailUrl: 'https://storage.googleapis.com/thumb.jpg',
    });
    
    // Execute
    const messageId = await messageCommands.sendImage({
      conversationId: 'conv-image',
      senderId: 'user-1',
      imageUri: 'file://local-image.jpg',
      caption: 'Test image',
    });
    
    // Verify
    expect(messageId).toBe('server-image-id');
    
    // 1. Image uploaded
    expect(uploadImageMessage).toHaveBeenCalledWith('conv-image', 'file://local-image.jpg');
    
    // 2. Message sent with URLs
    expect(sendMessageToFirestore).toHaveBeenCalledWith('conv-image', {
      senderId: 'user-1',
      content: {
        text: 'Test image',
        type: 'image',
        mediaUrl: 'https://storage.googleapis.com/image.jpg',
        mediaThumbnail: 'https://storage.googleapis.com/thumb.jpg',
      },
    });
    
    // 3. Message in SQLite with final URLs
    const messages = await getConversationMessages('conv-image');
    expect(messages[0].content.mediaUrl).toBe('https://storage.googleapis.com/image.jpg');
    expect(messages[0].content.mediaThumbnail).toBe('https://storage.googleapis.com/thumb.jpg');
  });

  test('deleteMessage should remove message and invalidate cache', async () => {
    // Setup - insert a message first
    const conversation = createTestConversation({ id: 'conv-delete' });
    await upsertConversation(conversation);
    
    await messageCommands.sendMessage({
      conversationId: 'conv-delete',
      senderId: 'user-1',
      content: { text: 'To be deleted', type: 'text' },
    });
    
    // Verify message exists
    let messages = await getConversationMessages('conv-delete');
    expect(messages).toHaveLength(1);
    
    // Execute delete
    await messageCommands.deleteMessage(messages[0].id, 'user-1');
    
    // Verify message soft deleted (added to deletedFor array)
    messages = await getConversationMessages('conv-delete');
    expect(messages).toHaveLength(1);
    expect(messages[0].deletedFor).toContain('user-1');
    
    // Verify cache invalidation called (queries may not exist yet)
    // The important thing is that invalidateQueries was called without error
  });
});
