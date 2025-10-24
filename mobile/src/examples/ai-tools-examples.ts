/**
 * AI Tools Usage Examples
 * 
 * Comprehensive examples showing how to use the new flexible AI tool architecture
 * for various messaging scenarios.
 */

import { enhancedAICommandService, EnhancedAppContext } from '../services/enhanced-ai-command-service';

// Example app context
const exampleAppContext: EnhancedAppContext = {
  currentScreen: 'chats',
  currentUserId: 'user123',
  currentConversationId: 'conv456',
  recentConversations: ['conv456', 'conv789'],
  deviceInfo: {
    platform: 'ios',
    version: '1.0.0',
  },
};

/**
 * Example 1: Simple Message Sending
 * 
 * This example shows how to send a message using the enhanced AI service.
 * The system will automatically resolve the conversation and send the message.
 */
export async function exampleSendMessage() {
  try {
    const result = await enhancedAICommandService.processCommand(
      'Tell John I am running 10 minutes late',
      exampleAppContext
    );

    if (result.success) {
      console.log('✅ Message sent successfully!');
      console.log('Response:', result.response);
      console.log('Action:', result.action);
      
      if (result.toolChain) {
        console.log('Tools used:', result.toolChain.toolsUsed);
        console.log('Execution time:', result.toolChain.totalExecutionTime + 'ms');
      }
    } else {
      console.error('❌ Failed to send message:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 2: Complex Tool Chaining
 * 
 * This example shows how the system can chain multiple tools together
 * to handle complex requests like finding and summarizing conversations.
 */
export async function exampleComplexCommand() {
  try {
    const result = await enhancedAICommandService.executeComplexCommand(
      'Find conversations with Sarah and summarize the messages about the project',
      exampleAppContext,
      5 // Maximum 5 tools in chain
    );

    if (result.success) {
      console.log('✅ Complex command executed successfully!');
      console.log('Response:', result.response);
      
      if (result.toolChain) {
        console.log('Tool chain executed:', result.toolChain.toolsUsed.join(' → '));
        console.log('Total execution time:', result.toolChain.totalExecutionTime + 'ms');
        
        // Process individual tool results
        result.toolChain.results.forEach((toolResult, index) => {
          console.log(`Tool ${index + 1} (${result.toolChain!.toolsUsed[index]}):`, toolResult.success ? 'Success' : 'Failed');
        });
      }
    } else {
      console.error('❌ Complex command failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 3: Contact Lookup and Conversation Creation
 * 
 * This example shows how to find a contact and create a conversation
 * using the flexible tool system.
 */
export async function exampleContactLookup() {
  try {
    // First, lookup contacts
    const lookupResult = await enhancedAICommandService.lookupContacts(
      {
        user_id: exampleAppContext.currentUserId,
        query: 'john',
        limit: 5,
        include_recent: true,
        min_confidence: 0.5,
      },
      exampleAppContext
    );

    if (lookupResult.success && lookupResult.data) {
      console.log('✅ Found contacts:', lookupResult.data.contacts.length);
      
      // Use the first contact to resolve/create conversation
      const firstContact = lookupResult.data.contacts[0];
      const resolveResult = await enhancedAICommandService.resolveConversation(
        {
          user_id: exampleAppContext.currentUserId,
          contact_identifier: firstContact.name,
          create_if_missing: true,
        },
        exampleAppContext
      );

      if (resolveResult.success && resolveResult.data) {
        console.log('✅ Conversation resolved:', resolveResult.data.conversation_id);
        console.log('Was created:', resolveResult.data.was_created);
        console.log('Participants:', resolveResult.data.participants.length);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 4: Message Search and Analysis
 * 
 * This example shows how to search for messages and analyze conversation data
 * using multiple tools in sequence.
 */
export async function exampleMessageAnalysis() {
  try {
    // Get conversation info with statistics
    const infoResult = await enhancedAICommandService.getConversationInfo(
      {
        conversation_id: exampleAppContext.currentConversationId!,
        user_id: exampleAppContext.currentUserId,
        include_participants: true,
        include_statistics: true,
        include_recent_activity: true,
      },
      exampleAppContext
    );

    if (infoResult.success && infoResult.data) {
      console.log('✅ Conversation info retrieved');
      console.log('Total messages:', infoResult.data.statistics?.total_messages);
      console.log('Most active sender:', infoResult.data.statistics?.most_active_sender);
      console.log('Recent activity:', infoResult.data.recent_activity?.activity_summary);

      // Now search for specific messages
      const messagesResult = await enhancedAICommandService.getMessages(
        {
          conversation_id: exampleAppContext.currentConversationId!,
          search_text: 'meeting',
          limit: 20,
          include_metadata: true,
        },
        exampleAppContext
      );

      if (messagesResult.success && messagesResult.data) {
        console.log('✅ Found messages about "meeting":', messagesResult.data.messages.length);
        
        // Process the messages
        messagesResult.data.messages.forEach((message, index) => {
          console.log(`Message ${index + 1}:`, {
            sender: message.sender_name,
            content: message.content.text,
            timestamp: message.timestamp,
            readCount: message.metadata?.read_count || 0,
          });
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 5: Smart Conversation Management
 * 
 * This example shows how to use the AI tools for intelligent conversation
 * management, including finding unread conversations and prioritizing them.
 */
export async function exampleSmartConversationManagement() {
  try {
    // Get conversations with unread messages
    const conversationsResult = await enhancedAICommandService.getConversations(
      {
        user_id: exampleAppContext.currentUserId,
        limit: 20,
        include_preview: true,
        unread_only: true,
        sort_by: 'last_message',
      },
      exampleAppContext
    );

    if (conversationsResult.success && conversationsResult.data) {
      console.log('✅ Found unread conversations:', conversationsResult.data.conversations.length);
      
      // Process each unread conversation
      for (const conversation of conversationsResult.data.conversations) {
        console.log(`Unread conversation with ${conversation.other_participants[0]?.displayName}:`);
        console.log(`- Unread count: ${conversation.unread_count}`);
        console.log(`- Last message: ${conversation.last_message_preview?.text}`);
        console.log(`- Last activity: ${conversation.last_message_at}`);
        
        // Get detailed info for high-priority conversations
        if (conversation.unread_count > 5) {
          const detailResult = await enhancedAICommandService.getConversationInfo(
            {
              conversation_id: conversation.id,
              user_id: exampleAppContext.currentUserId,
              include_statistics: true,
            },
            exampleAppContext
          );
          
          if (detailResult.success && detailResult.data) {
            console.log(`High-priority conversation: ${detailResult.data.statistics?.total_messages} total messages`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Example 6: Natural Language Command Processing
 * 
 * This example shows how the AI can understand and execute natural language
 * commands that require multiple tools to be chained together.
 */
export async function exampleNaturalLanguageCommands() {
  const commands = [
    'Send a message to Sarah saying I will be there in 15 minutes',
    'Show me all my conversations with unread messages',
    'Find messages from John about the project deadline',
    'Create a new conversation with Mike and send him the meeting notes',
    'Summarize my recent conversation with Lisa',
  ];

  for (const command of commands) {
    try {
      console.log(`\n🤖 Processing: "${command}"`);
      
      const result = await enhancedAICommandService.executeComplexCommand(
        command,
        exampleAppContext,
        5
      );

      if (result.success) {
        console.log('✅ Success:', result.response);
        if (result.toolChain) {
          console.log('🔗 Tools used:', result.toolChain.toolsUsed.join(' → '));
        }
      } else {
        console.log('❌ Failed:', result.error);
      }
    } catch (error) {
      console.error('Error processing command:', error);
    }
  }
}

/**
 * Example 7: Error Handling and Fallbacks
 * 
 * This example shows how to handle errors gracefully and provide fallbacks
 * when AI commands fail.
 */
export async function exampleErrorHandling() {
  try {
    // Try a command that might fail
    const result = await enhancedAICommandService.processCommand(
      'Send a message to nonexistentuser saying hello',
      exampleAppContext
    );

    if (!result.success) {
      console.log('❌ Command failed:', result.error);
      
      // Provide fallback suggestions
      if (result.error?.includes('not found')) {
        console.log('💡 Suggestion: Try searching for contacts first');
        
        // Fallback: search for similar contacts
        const searchResult = await enhancedAICommandService.lookupContacts(
          {
            user_id: exampleAppContext.currentUserId,
            query: 'user',
            limit: 5,
          },
          exampleAppContext
        );
        
        if (searchResult.success && searchResult.data) {
          console.log('🔍 Found similar contacts:', searchResult.data.contacts.map(c => c.name));
        }
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 8: Performance Monitoring
 * 
 * This example shows how to monitor the performance of AI tool execution
 * and optimize based on execution times.
 */
export async function examplePerformanceMonitoring() {
  const commands = [
    'Show me my conversations',
    'Find contacts matching "john"',
    'Send a message to John saying hello',
    'Get conversation info for the current conversation',
  ];

  const performanceData: Array<{
    command: string;
    executionTime: number;
    toolsUsed: string[];
    success: boolean;
  }> = [];

  for (const command of commands) {
    const startTime = Date.now();
    
    try {
      const result = await enhancedAICommandService.processCommand(
        command,
        exampleAppContext
      );
      
      const executionTime = Date.now() - startTime;
      
      performanceData.push({
        command,
        executionTime,
        toolsUsed: result.toolChain?.toolsUsed || [],
        success: result.success,
      });
      
      console.log(`⏱️ "${command}" took ${executionTime}ms`);
    } catch (error) {
      console.error(`Error with command "${command}":`, error);
    }
  }

  // Analyze performance
  const avgExecutionTime = performanceData.reduce((sum, data) => sum + data.executionTime, 0) / performanceData.length;
  const slowestCommand = performanceData.reduce((slowest, current) => 
    current.executionTime > slowest.executionTime ? current : slowest
  );
  
  console.log(`\n📊 Performance Analysis:`);
  console.log(`Average execution time: ${avgExecutionTime.toFixed(2)}ms`);
  console.log(`Slowest command: "${slowestCommand.command}" (${slowestCommand.executionTime}ms)`);
  console.log(`Success rate: ${performanceData.filter(d => d.success).length / performanceData.length * 100}%`);
}

// Export all examples for easy testing
export const aiToolExamples = {
  sendMessage: exampleSendMessage,
  complexCommand: exampleComplexCommand,
  contactLookup: exampleContactLookup,
  messageAnalysis: exampleMessageAnalysis,
  smartConversationManagement: exampleSmartConversationManagement,
  naturalLanguageCommands: exampleNaturalLanguageCommands,
  errorHandling: exampleErrorHandling,
  performanceMonitoring: examplePerformanceMonitoring,
};
