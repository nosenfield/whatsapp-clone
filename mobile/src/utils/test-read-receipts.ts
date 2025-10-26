import { updateUserLastSeen, getUsersWhoReadMessage } from '../services/read-receipt-service';
import { Message } from '../types';

/**
 * Test function to verify read receipt system is working
 * This can be called manually from the console or a test button
 */
export const testReadReceiptSystem = async (
  conversationId: string,
  userId: string,
  messageId: string,
  conversationLastSeenBy?: Record<string, { lastMessageId?: string; seenAt: Date }>,
  conversationParticipants?: string[]
) => {
  console.log('🧪 Testing timestamp-based read receipt system...');
  
  try {
    // 1. Update user's last seen timestamp
    console.log('📖 Step 1: Updating last seen timestamp...');
    await updateUserLastSeen(conversationId, userId, messageId);
    
    // 2. Wait a moment for Firestore to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 3. Test the read receipt logic with a mock message
    const mockMessage: Message = {
      id: messageId,
      conversationId,
      senderId: 'other-user',
      content: { text: 'Test message', type: 'text' },
      timestamp: new Date(),
      status: 'sent',
      syncStatus: 'synced',
      deliveredTo: [],
      readBy: {},
    };
    
    console.log('📖 Step 2: Testing read receipt logic...');
    const usersWhoRead = getUsersWhoReadMessage(
      mockMessage,
      conversationLastSeenBy,
      conversationParticipants
    );
    
    console.log('📖 Step 3: Users who read message:', usersWhoRead.length);
    usersWhoRead.forEach(user => {
      console.log('  - User:', user.userId, 'Read at:', user.readAt);
    });
    
    if (usersWhoRead.length > 0) {
      console.log('✅ Timestamp-based read receipt system is working!');
      return true;
    } else {
      console.log('❌ No read receipts found - system may not be working');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Make it available globally for testing
if (typeof global !== 'undefined') {
  (global as any).testReadReceiptSystem = testReadReceiptSystem;
}
