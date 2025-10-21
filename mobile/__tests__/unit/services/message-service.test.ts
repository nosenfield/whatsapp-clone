/**
 * Unit tests for message service
 * Tests Firestore integration for sending and updating messages
 * 
 * Note: These tests mock Firebase since we can't use real Firestore in tests
 * The mocks validate that our code calls Firebase correctly
 */

import {
  sendMessageToFirestore,
  updateMessageStatus,
  deleteMessageForUser,
} from '../../../src/services/message-service';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockCollection(...args),
  addDoc: (ref: any, data: any) => mockAddDoc(ref, data),
  doc: (...args: any[]) => mockDoc(...args),
  updateDoc: (ref: any, data: any) => mockUpdateDoc(ref, data),
  Timestamp: {
    now: () => ({
      toDate: () => new Date('2025-01-15T10:00:00'),
      seconds: 1705315200,
      nanoseconds: 0,
    }),
  },
}));

jest.mock('../../../firebase.config', () => ({
  firestore: {
    _isMocked: true,
  },
}));

describe('Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock behaviors
    mockCollection.mockReturnValue({ _type: 'collection' });
    mockDoc.mockReturnValue({ _type: 'doc' });
    mockAddDoc.mockResolvedValue({ id: 'mock-message-id' });
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  describe('sendMessageToFirestore', () => {
    test('should send message to Firestore messages subcollection', async () => {
      const conversationId = 'conv-123';
      const messageData = {
        senderId: 'user-1',
        content: {
          text: 'Hello world',
          type: 'text' as const,
        },
      };

      const messageId = await sendMessageToFirestore(conversationId, messageData);

      // Verify collection was called correctly
      expect(mockCollection).toHaveBeenCalledWith(
        expect.objectContaining({ _isMocked: true }),
        'conversations',
        conversationId,
        'messages'
      );

      // Verify addDoc was called with correct data
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          senderId: 'user-1',
          content: {
            text: 'Hello world',
            type: 'text',
          },
          status: 'sent',
          deliveredTo: [],
          readBy: {},
        })
      );

      // Verify return value
      expect(messageId).toBe('mock-message-id');
    });

    test('should update conversation metadata after sending message', async () => {
      const conversationId = 'conv-456';
      const messageData = {
        senderId: 'user-2',
        content: {
          text: 'Test message',
          type: 'text' as const,
        },
      };

      await sendMessageToFirestore(conversationId, messageData);

      // Verify doc and updateDoc were called for conversation
      expect(mockDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _isMocked: true }),
        'conversations',
        conversationId
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastMessage: expect.objectContaining({
            text: 'Test message',
            senderId: 'user-2',
          }),
          lastMessageAt: expect.anything(),
        })
      );
    });

    test('should handle image messages', async () => {
      const conversationId = 'conv-789';
      const imageMessage = {
        senderId: 'user-3',
        content: {
          text: 'Check this out',
          type: 'image' as const,
          mediaUrl: 'https://example.com/image.jpg',
        },
      };

      await sendMessageToFirestore(conversationId, imageMessage);

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: {
            text: 'Check this out',
            type: 'image',
            mediaUrl: 'https://example.com/image.jpg',
          },
        })
      );
    });

    test('should throw error if Firestore fails', async () => {
      mockAddDoc.mockRejectedValue(new Error('Firestore error'));

      const conversationId = 'conv-error';
      const messageData = {
        senderId: 'user-1',
        content: {
          text: 'This will fail',
          type: 'text' as const,
        },
      };

      await expect(
        sendMessageToFirestore(conversationId, messageData)
      ).rejects.toThrow('Firestore error');
    });

    test('should use server timestamp', async () => {
      const conversationId = 'conv-timestamp';
      const messageData = {
        senderId: 'user-1',
        content: {
          text: 'Timestamp test',
          type: 'text' as const,
        },
      };

      await sendMessageToFirestore(conversationId, messageData);

      // Verify timestamp is included in message
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          timestamp: expect.anything(), // Timestamp.now() mock
        })
      );

      // Verify timestamp is included in conversation update
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastMessage: expect.objectContaining({
            timestamp: expect.anything(),
          }),
          lastMessageAt: expect.anything(),
        })
      );
    });
  });

  describe('updateMessageStatus', () => {
    test('should update message status', async () => {
      const conversationId = 'conv-status';
      const messageId = 'msg-123';
      const updates = {
        status: 'delivered' as const,
      };

      await updateMessageStatus(conversationId, messageId, updates);

      // Verify correct document path
      expect(mockDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _isMocked: true }),
        'conversations',
        conversationId,
        'messages',
        messageId
      );

      // Verify updateDoc was called with status
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'delivered',
        })
      );
    });

    test('should update deliveredTo array', async () => {
      const conversationId = 'conv-delivered';
      const messageId = 'msg-456';
      const updates = {
        deliveredTo: ['user-1', 'user-2'],
      };

      await updateMessageStatus(conversationId, messageId, updates);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deliveredTo: ['user-1', 'user-2'],
        })
      );
    });

    test('should update readBy object', async () => {
      const conversationId = 'conv-read';
      const messageId = 'msg-789';
      const updates = {
        readBy: {
          'user-1': new Date('2025-01-15T10:00:00'),
          'user-2': new Date('2025-01-15T10:01:00'),
        },
      };

      await updateMessageStatus(conversationId, messageId, updates);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          readBy: expect.objectContaining({
            'user-1': expect.any(Date),
            'user-2': expect.any(Date),
          }),
        })
      );
    });

    test('should handle Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      const conversationId = 'conv-error';
      const messageId = 'msg-error';
      const updates = { status: 'delivered' as const };

      await expect(
        updateMessageStatus(conversationId, messageId, updates)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteMessageForUser', () => {
    test('should add user to deletedFor array', async () => {
      const conversationId = 'conv-delete';
      const messageId = 'msg-delete';
      const userId = 'user-1';

      await deleteMessageForUser(conversationId, messageId, userId);

      // Verify correct document path
      expect(mockDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _isMocked: true }),
        'conversations',
        conversationId,
        'messages',
        messageId
      );

      // Verify updateDoc was called with deletedFor
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          deletedFor: expect.arrayContaining([userId]),
        })
      );
    });

    test('should handle Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Delete failed'));

      const conversationId = 'conv-delete-error';
      const messageId = 'msg-delete-error';
      const userId = 'user-error';

      await expect(
        deleteMessageForUser(conversationId, messageId, userId)
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('Error Handling', () => {
    test('should log errors when sending message fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAddDoc.mockRejectedValue(new Error('Network error'));

      const conversationId = 'conv-log';
      const messageData = {
        senderId: 'user-1',
        content: { text: 'Test', type: 'text' as const },
      };

      await expect(
        sendMessageToFirestore(conversationId, messageData)
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error sending message to Firestore'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should log errors when updating status fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockUpdateDoc.mockRejectedValue(new Error('Update error'));

      await expect(
        updateMessageStatus('conv-1', 'msg-1', { status: 'delivered' })
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating message status'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Message Flow Integration', () => {
    test('should complete full send flow', async () => {
      const conversationId = 'conv-flow';
      const messageData = {
        senderId: 'user-1',
        content: { text: 'Integration test', type: 'text' as const },
      };

      // Send message
      const messageId = await sendMessageToFirestore(conversationId, messageData);

      // Verify both message and conversation were updated
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(messageId).toBeDefined();

      // Now update the status
      await updateMessageStatus(conversationId, messageId, {
        status: 'delivered',
        deliveredTo: ['user-2'],
      });

      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });
  });
});

