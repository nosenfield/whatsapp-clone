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
  error?: string;
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
          const details: { displayName: string; photoURL?: string } = {
            displayName: userData?.displayName || 'Unknown',
          };
          
          // Only include photoURL if it exists (Firestore doesn't accept undefined)
          if (userData?.photoURL) {
            details.photoURL = userData.photoURL;
          }
          
          participantDetails[userId] = details;
        } else {
          // Fallback for missing user data
          participantDetails[userId] = {
            displayName: 'Unknown',
          };
        }
      } catch (error) {
        logger.warn(`Failed to fetch user details for ${userId}:`, error);
        participantDetails[userId] = {
          displayName: 'Unknown',
        };
      }
    }

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
          error: `Tool '${toolCall.tool}' not found`,
        });
        continue;
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

        // If tool failed and it's critical, break the chain
        if (!result.success && this.isCriticalTool(tool.name)) {
          logger.warn(`Critical tool ${tool.name} failed, breaking chain`);
          break;
        }
      } catch (error) {
        logger.error(`Error executing tool ${tool.name}:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          metadata: {
            toolName: tool.name,
            chainPosition: i,
          },
        });
      }
    }

    return results;
  }

  private isCriticalTool(toolName: string): boolean {
    // Define which tools are critical for the chain to continue
    const criticalTools = ["resolve_conversation", "lookup_contacts"];
    return criticalTools.includes(toolName);
  }
}

// Export singleton registry
export const toolRegistry = new AIToolRegistry();
export const toolChainExecutor = new ToolChainExecutor(toolRegistry);
