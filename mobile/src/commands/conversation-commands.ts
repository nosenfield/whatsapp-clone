import { QueryClient } from '@tanstack/react-query';
import { 
  createOrGetConversation, 
  createGroupConversation,
  getConversationById 
} from '../services/conversation-service';
import { upsertConversation } from '../services/database';
import { Conversation } from '../types';

export interface FindOrCreateConversationCommand {
  contactName: string;
  userId: string;
}

export interface CreateGroupCommand {
  name: string;
  creatorId: string;
  participantIds: string[];
}

export class ConversationCommands {
  constructor(
    private queryClient: QueryClient
  ) {}

  /**
   * Find or create direct conversation with contact
   */
  async findOrCreateConversation(
    command: FindOrCreateConversationCommand
  ): Promise<Conversation> {
    const { searchUsersByEmail, searchUsersByDisplayName } = await import('../services/user-search');
    
    // 1. Try to find contact by email first
    let contacts = await searchUsersByEmail(command.contactName);
    
    // 2. If no email match, try display name search
    if (contacts.length === 0) {
      contacts = await searchUsersByDisplayName(command.contactName);
    }
    
    if (contacts.length === 0) {
      throw new Error(`Contact "${command.contactName}" not found`);
    }
    
    const contact = contacts[0];
    
    // 3. Create or get conversation
    const conversationId = await createOrGetConversation(
      command.userId,
      contact.id
    );
    
    // 4. Fetch conversation data
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      throw new Error('Failed to create conversation');
    }
    
    // 5. Store in SQLite
    await upsertConversation(conversation);
    
    // 6. Invalidate conversation list
    await this.queryClient.invalidateQueries({
      queryKey: ['conversations', command.userId],
    });
    
    console.log('✅ Conversation ready:', conversationId);
    return conversation;
  }

  /**
   * Create group conversation
   */
  async createGroup(command: CreateGroupCommand): Promise<Conversation> {
    // 1. Create group in Firestore
    const conversationId = await createGroupConversation(
      command.creatorId,
      command.participantIds,
      command.name
    );
    
    // 2. Fetch conversation data
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      throw new Error('Failed to create group');
    }
    
    // 3. Store in SQLite
    await upsertConversation(conversation);
    
    // 4. Invalidate conversation list
    await this.queryClient.invalidateQueries({
      queryKey: ['conversations', command.creatorId],
    });
    
    console.log('✅ Group created:', conversationId);
    return conversation;
  }

  /**
   * Load conversation (ensures it's in SQLite)
   */
  async loadConversation(conversationId: string): Promise<Conversation> {
    // 1. Fetch from Firestore
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    // 2. Store in SQLite (required for foreign key constraints)
    await upsertConversation(conversation);
    
    return conversation;
  }
}
