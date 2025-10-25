/**
 * AI Tool Interface
 *
 * Standardized interface for AI tools that can be chained together
 * to handle complex requests flexibly.
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Base tool interface
export interface AITool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;
}

// Tool parameter definition
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: any;
  items?: {
    type: "string" | "number" | "boolean";
    enum?: string[];
  };
}

// Context passed to all tools
export interface ToolContext {
  currentUserId: string;
  appContext?: {
    currentScreen: "chats" | "conversation" | "profile" | "settings";
    currentConversationId?: string;
    recentConversations: string[];
  };
  requestId: string; // For tracing tool chains
  currentChainLength?: number; // For tool chaining
}

// Standardized tool result
export interface ToolResult {
  success: boolean;
  data?: any;
  next_action?: "continue" | "clarification_needed" | "complete" | "error";
  clarification?: {
    type: string;
    question: string;
    options: Array<{
      id: string;           // Actual entity ID (user_id, conversation_id, etc.)
      title: string;        // Display name
      subtitle: string;     // Additional context
      confidence: number;   // 0-1 confidence score
      metadata?: any;       // Extra data
    }>;
  };
  error?: string;
  instruction_for_ai?: string; // Single, clear instruction
  confidence?: number; // 0-1 confidence score
  metadata?: {
    executionTime?: number;
    cacheHit?: boolean;
    [key: string]: any;
  };
}

// Tool execution context for chaining
export interface ToolChainContext extends ToolContext {
  previousResults: Map<string, ToolResult>;
  maxChainLength: number;
  currentChainLength: number;
}

// Tool registry for dynamic tool discovery
export class AIToolRegistry {
  private tools: Map<string, AITool> = new Map();

  register(tool: AITool): void {
    this.tools.set(tool.name, tool);
    logger.info(`Registered AI tool: ${tool.name}`);
  }

  getTool(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // Get tools that match a description or capability
  findToolsByCapability(capability: string): AITool[] {
    return this.getAllTools().filter((tool) =>
      tool.description.toLowerCase().includes(capability.toLowerCase()) ||
      tool.name.toLowerCase().includes(capability.toLowerCase())
    );
  }
}

// Base tool implementation with common utilities
export abstract class BaseAITool implements AITool {
  abstract name: string;
  abstract description: string;
  abstract parameters: ToolParameter[];

  abstract execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult>;

  // Common utility methods for subclasses
  protected async findUserByEmail(email: string): Promise<any> {
    const userSnapshot = await admin.firestore()
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      return null;
    }

    const userDoc = userSnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data(),
    };
  }

  protected async findUserByName(name: string): Promise<any> {
    // Try exact match first
    const userSnapshot = await admin.firestore()
      .collection("users")
      .where("displayName", "==", name)
      .limit(1)
      .get();

    // If no exact match, try case-insensitive search
    if (userSnapshot.empty) {
      const allUsersSnapshot = await admin.firestore()
        .collection("users")
        .get();

      const matchingUser = allUsersSnapshot.docs.find((doc) => {
        const userData = doc.data();
        return userData.displayName?.toLowerCase() === name.toLowerCase();
      });

      if (matchingUser) {
        return {
          id: matchingUser.id,
          ...matchingUser.data(),
        };
      }
    } else {
      const userDoc = userSnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data(),
      };
    }

    return null;
  }

  protected async findConversationBetweenUsers(userId1: string, userId2: string): Promise<any> {
    const conversationsSnapshot = await admin.firestore()
      .collection("conversations")
      .where("type", "==", "direct")
      .where("participants", "array-contains", userId1)
      .get();

    for (const doc of conversationsSnapshot.docs) {
      const data = doc.data();
      if (data.participants.includes(userId2)) {
        return {
          id: doc.id,
          ...data,
        };
      }
    }

    return null;
  }

  protected async createConversation(participants: string[], name?: string): Promise<any> {
    // Get participant details
    const participantDetails: Record<string, { displayName: string; photoURL?: string }> = {};
    
    for (const userId of participants) {
      try {
        const userDoc = await admin.firestore().collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const displayName = userData?.displayName || userData?.email || 'Unknown';
          
          logger.info(`Creating conversation - User ${userId} details:`, {
            userId,
            displayName: userData?.displayName,
            email: userData?.email,
            hasPhotoURL: !!userData?.photoURL,
            finalDisplayName: displayName
          });
          
          const details: { displayName: string; photoURL?: string } = {
            displayName: displayName,
          };
          
          // Only include photoURL if it exists (Firestore doesn't accept undefined)
          if (userData?.photoURL) {
            details.photoURL = userData.photoURL;
          }
          
          participantDetails[userId] = details;
        } else {
          logger.warn(`User document not found for ${userId}, using fallback`);
          participantDetails[userId] = {
            displayName: 'Unknown',
          };
        }
      } catch (error) {
        logger.error(`Failed to fetch user details for ${userId}:`, error);
        participantDetails[userId] = {
          displayName: 'Unknown',
        };
      }
    }

    logger.info(`Creating conversation with participants:`, {
      participants,
      participantDetails: Object.keys(participantDetails).map(userId => ({
        userId,
        displayName: participantDetails[userId].displayName
      }))
    });

    const conversationData: any = {
      type: participants.length === 2 ? "direct" : "group",
      participants,
      participantDetails,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only add name field if it's provided and not undefined
    if (name !== undefined && name !== null) {
      conversationData.name = name;
    }

    const docRef = await admin.firestore().collection("conversations").add(conversationData);

    logger.info(`Conversation created successfully:`, {
      conversationId: docRef.id,
      type: conversationData.type,
      participantCount: participants.length
    });

    return {
      id: docRef.id,
      ...conversationData,
    };
  }

  protected async sendMessage(messageData: any): Promise<any> {
    const timestamp = admin.firestore.Timestamp.fromDate(new Date());
    const messageRef = await admin.firestore()
      .collection("conversations")
      .doc(messageData.conversationId)
      .collection("messages")
      .add({
        ...messageData,
        timestamp,
        status: "sent",
        deliveredTo: messageData.deliveredTo || [],
        readBy: messageData.readBy || {},
      });

    // Update conversation's lastMessage and lastMessageAt
    await admin.firestore()
      .collection("conversations")
      .doc(messageData.conversationId)
      .update({
        lastMessage: {
          text: messageData.content.text,
          senderId: messageData.senderId,
          timestamp: timestamp,
        },
        lastMessageAt: timestamp,
        updatedAt: timestamp,
      });

    return {
      id: messageRef.id,
      ...messageData,
    };
  }

  protected calculateConfidence(exactMatch: boolean, partialMatch: boolean, dataQuality: number): number {
    let confidence = 0.5; // Base confidence

    if (exactMatch) {
      confidence = 0.95;
    } else if (partialMatch) {
      confidence = 0.7;
    }

    // Adjust based on data quality (completeness, recency, etc.)
    confidence *= dataQuality;

    return Math.min(Math.max(confidence, 0), 1);
  }

  protected formatTimestamp(timestamp: any): string {
    if (!timestamp) return "Unknown";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  }

  protected truncateText(text: string, maxLength = 100): string {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }
}

// Tool chain executor for complex multi-step operations
export class ToolChainExecutor {
  private registry: AIToolRegistry;

  constructor(registry: AIToolRegistry) {
    this.registry = registry;
  }

  async executeChain(
    toolCalls: Array<{ tool: string; parameters: Record<string, any> }>,
    context: ToolChainContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (let i = 0; i < toolCalls.length && i < context.maxChainLength; i++) {
      const toolCall = toolCalls[i];
      const tool = this.registry.getTool(toolCall.tool);

      if (!tool) {
        results.push({
          success: false,
          data: {},
          next_action: "error",
          error: `Tool '${toolCall.tool}' not found`,
          instruction_for_ai: "Inform user that the requested tool is not available.",
          confidence: 0,
        });
        break; // Stop on error
      }

      // Add previous results to context for tool chaining
      const toolContext: ToolContext = {
        ...context,
        currentChainLength: i + 1,
      };

      try {
        const startTime = Date.now();
        const result = await tool.execute(toolCall.parameters, toolContext);
        const executionTime = Date.now() - startTime;

        result.metadata = {
          ...result.metadata,
          executionTime,
          toolName: tool.name,
          chainPosition: i,
        };

        results.push(result);
        context.previousResults.set(tool.name, result);

        // CHECK FOR STOP CONDITIONS IMMEDIATELY
        if (result.next_action === "clarification_needed") {
          logger.info(`Clarification needed from ${tool.name}, stopping chain immediately`, {
            clarification: result.clarification
          });
          break; // Stop chain immediately
        }

        if (result.next_action === "error" || !result.success) {
          logger.warn(`Tool ${tool.name} failed or errored, stopping chain`, {
            error: result.error
          });
          break; // Stop on error
        }

        if (result.next_action === "complete") {
          logger.info(`Tool ${tool.name} completed successfully, chain done`, {
            tool: tool.name
          });
          break; // Natural end of chain
        }

        // If next_action is "continue", proceed to next tool
        logger.info(`Tool ${tool.name} completed, continuing chain`, {
          next_action: result.next_action
        });

      } catch (error) {
        logger.error(`Error executing tool ${tool.name}:`, error);
        results.push({
          success: false,
          data: {},
          next_action: "error",
          error: error instanceof Error ? error.message : "Unknown error",
          instruction_for_ai: "Inform user that tool execution failed.",
          confidence: 0,
          metadata: {
            toolName: tool.name,
            chainPosition: i,
          },
        });
        break; // Stop on exception
      }
    }

    return results;
  }
}

// Export singleton registry
export const toolRegistry = new AIToolRegistry();
export const toolChainExecutor = new ToolChainExecutor(toolRegistry);
