/**
 * Enhanced AI Command Processor
 *
 * Uses the flexible tool architecture to handle complex AI requests
 * with tool chaining and intelligent command parsing.
 */

import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {toolRegistry} from "./tools";
import {ToolChainExecutor, ToolContext, ToolChainContext} from "./tools/ai-tool-interface";
import {initializeLangSmith} from "./services/langsmith-config";
import {RunTree} from "langsmith";

// Enhanced command request interface
interface EnhancedAICommandRequest {
  command: string;
  appContext: {
    currentScreen: "chats" | "conversation" | "profile" | "settings";
    currentConversationId?: string;
    currentUserId: string;
    recentConversations: string[];
    deviceInfo: {
      platform: "ios" | "android";
      version: string;
    };
  };
  currentUserId: string;
  enableToolChaining?: boolean;
  maxChainLength?: number;
}

// Enhanced command response interface
interface EnhancedAICommandResponse {
  success: boolean;
  result: any;
  response: string;
  action: "navigate_to_conversation" | "show_summary" | "show_error" | "no_action" | "tool_chain";
  error?: string;
  runId?: string;
  toolChain?: {
    toolsUsed: string[];
    results: any[];
    totalExecutionTime: number;
  };
}

/**
 * Enhanced AI Command Processing Function
 *
 * Supports tool chaining and complex multi-step operations
 */
export const processEnhancedAICommand = onCall(
  {cors: true},
  async (request): Promise<EnhancedAICommandResponse> => {
    try {
      const {command, appContext, currentUserId, enableToolChaining = true, maxChainLength = 5} = request.data as EnhancedAICommandRequest;

      // Validate request
      if (!command || !currentUserId) {
        return {
          success: false,
          result: null,
          response: "Invalid request: missing command or user ID",
          action: "show_error",
          error: "Missing required parameters",
        };
      }

      logger.info("Processing enhanced AI command", {
        command: command.substring(0, 100),
        userId: currentUserId,
        screen: appContext?.currentScreen,
        enableToolChaining,
        maxChainLength,
      });

      // Parse command and determine tool chain
      const parsedCommand = await parseCommandWithToolChain(command, appContext, enableToolChaining);

      if (!parsedCommand.success) {
        return {
          success: false,
          result: null,
          response: "Sorry, I couldn't understand that command.",
          action: "show_error",
          error: parsedCommand.error,
        };
      }

      // Execute tool chain if multiple tools are needed
      if (parsedCommand.toolChain && parsedCommand.toolChain.length > 1) {
        const toolChainResult = await executeToolChain(parsedCommand.toolChain, currentUserId, appContext, maxChainLength);

        return {
          success: toolChainResult.success,
          result: toolChainResult.result,
          response: toolChainResult.response,
          action: toolChainResult.action,
          runId: parsedCommand.runId,
          toolChain: toolChainResult.toolChain,
        };
      } else if (parsedCommand.toolChain && parsedCommand.toolChain.length === 1) {
        // Single tool execution
        const toolResult = await executeSingleTool(parsedCommand.toolChain[0], currentUserId, appContext);

        return {
          success: toolResult.success,
          result: toolResult.result,
          response: toolResult.response,
          action: toolResult.action,
          runId: parsedCommand.runId,
        };
      } else {
        return {
          success: false,
          result: null,
          response: "No appropriate tools found for this command.",
          action: "show_error",
          error: "No tools available",
        };
      }
    } catch (error) {
      logger.error("Error processing enhanced AI command", {error});
      return {
        success: false,
        result: null,
        response: "Sorry, I encountered an error processing your command.",
        action: "show_error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);

/**
 * Parse command using AI with proper tool calling
 */
async function parseCommandWithToolChain(
  command: string,
  appContext: any,
  enableToolChaining: boolean
): Promise<{ success: boolean; toolChain?: any[]; error?: string; runId?: string }> {
  try {
    // Initialize LangSmith for logging
    const langsmithClient = initializeLangSmith();
    let runTree: RunTree | null = null;

    if (langsmithClient) {
      runTree = new RunTree({
        name: "AI Command Processing with Tool Calling",
        run_type: "chain",
        inputs: {
          command: command.substring(0, 100),
          userId: appContext?.currentUserId || "unknown",
          screen: appContext?.currentScreen || "unknown",
          enableToolChaining,
        },
        project_name: "whatsapp-clone-ai-enhanced",
        tags: ["ai-command", "tool-calling", "whatsapp-clone"],
        metadata: {
          userId: appContext?.currentUserId || "unknown",
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || "development",
        },
      });

      await runTree.postRun();
    }

    // Get available tools and their definitions
    const availableTools = toolRegistry.getAllTools();
    const toolDefinitions = availableTools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: tool.parameters.reduce((props, param) => {
            const paramDef: any = {
              type: param.type,
              description: param.description,
            };
            
            // Add items property for array types
            if (param.type === "array" && param.items) {
              paramDef.items = {
                type: param.items.type,
              };
              if (param.items.enum) {
                paramDef.items.enum = param.items.enum;
              }
            }
            
            props[param.name] = paramDef;
            return props;
          }, {} as any),
          required: tool.parameters.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));

    // Use OpenAI to parse the command and select tools
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const openai = require("openai");
    
    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey === "your-openai-api-key-here") {
      logger.warn("OpenAI API key not available, falling back to simple parsing");
      
      if (runTree) {
        await runTree.end({
          outputs: {success: false, error: "OpenAI API key not configured"},
        });
        await runTree.patchRun();
      }
      
      return {
        success: false,
        error: "AI service not configured. Please set up OpenAI API key.",
      };
    }
    
    const client = new openai.OpenAI({
      apiKey: openaiApiKey,
    });

    const systemPrompt = `You are an AI assistant for a WhatsApp-like messaging app. You have access to several tools to help users with messaging tasks.

Current context:
- User ID: ${appContext?.currentUserId || "unknown"}
- Current screen: ${appContext?.currentScreen || "unknown"}
- Current conversation ID: ${appContext?.currentConversationId || "none"}

IMPORTANT: When sending messages to people by name, you MUST first use lookup_contacts to find their user ID, then use send_message with the recipient_id.

Examples of proper tool chaining:
- "Tell John hello" → FIRST: lookup_contacts(query="John") THEN: send_message(content="hello", recipient_id="[from lookup_contacts result]")
- "Say hello to Sarah" → FIRST: lookup_contacts(query="Sarah") THEN: send_message(content="hello", recipient_id="[from lookup_contacts result]")
- "Find my conversation with Mike" → lookup_contacts(query="Mike") then resolve_conversation
- "Show me my recent conversations" → get_conversations
- "What messages do I have with Mike?" → lookup_contacts(query="Mike") then get_messages

CRITICAL: For any "Tell [Name] [message]" or "Say [message] to [Name]" commands, you MUST:
1. First call lookup_contacts to find the person
2. Then call send_message with the recipient_id from step 1

Always use the appropriate tools in the correct sequence to accomplish the user's request.`;

    let completion;
    try {
      completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: command},
        ],
        tools: toolDefinitions,
        tool_choice: "auto",
        temperature: 0.1,
      });
    } catch (openaiError: any) {
      logger.error("OpenAI API error:", openaiError);
      
      if (runTree) {
        await runTree.end({
          outputs: {success: false, error: "OpenAI API error: " + openaiError.message},
        });
        await runTree.patchRun();
      }
      
      return {
        success: false,
        error: "AI service not configured. Please set up OpenAI API key.",
      };
    }

    const response = completion.choices[0];
    const toolCalls = response.message.tool_calls || [];

    if (toolCalls.length === 0) {
      if (runTree) {
        await runTree.end({
          outputs: {success: false, error: "No tools selected by AI"},
        });
        await runTree.patchRun();
      }

      return {
        success: false,
        error: "No appropriate tools found for this command",
      };
    }

    // Convert OpenAI tool calls to our format
    const toolChain = toolCalls.map((toolCall: any) => ({
      tool: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
    }));

    if (runTree) {
      await runTree.end({
        outputs: {
          success: true,
          toolChain: toolChain.map((tc: any) => tc.tool),
          toolCount: toolChain.length,
          tokensUsed: completion.usage?.total_tokens || 0,
        },
      });
      await runTree.patchRun();
    }

    return {
      success: true,
      toolChain,
      runId: runTree?.id,
    };
  } catch (error) {
    logger.error("Error parsing command with AI tool calling", {error});
    return {
      success: false,
      error: "Failed to parse command with AI",
    };
  }
}

/**
 * Execute a single tool
 */
async function executeSingleTool(toolCall: any, currentUserId: string, appContext: any): Promise<any> {
  const tool = toolRegistry.getTool(toolCall.tool);
  if (!tool) {
    return {
      success: false,
      result: null,
      response: `Tool '${toolCall.tool}' not found`,
      action: "show_error",
    };
  }

  const context: ToolContext = {
    currentUserId,
    appContext,
    requestId: `single-${Date.now()}`,
  };

  try {
    const result = await tool.execute(toolCall.parameters, context);

    return {
      success: result.success,
      result: result.data,
      response: generateResponse(result, toolCall.tool),
      action: determineAction(result, toolCall.tool),
    };
  } catch (error) {
    logger.error(`Error executing single tool ${toolCall.tool}:`, error);
    return {
      success: false,
      result: null,
      response: `Error executing ${toolCall.tool}`,
      action: "show_error",
    };
  }
}

/**
 * Execute a tool chain
 */
async function executeToolChain(
  toolChain: any[],
  currentUserId: string,
  appContext: any,
  maxChainLength: number
): Promise<any> {
  const startTime = Date.now();
  const context: ToolChainContext = {
    currentUserId,
    appContext,
    requestId: `chain-${Date.now()}`,
    previousResults: new Map(),
    maxChainLength,
    currentChainLength: 0,
  };

  const toolChainExecutor = new ToolChainExecutor(toolRegistry);

  try {
    const results = await toolChainExecutor.executeChain(toolChain, context);
    const executionTime = Date.now() - startTime;

    // Process results and generate final response
    const finalResult = processToolChainResults(results, toolChain);

    return {
      success: finalResult.success,
      result: finalResult.data,
      response: finalResult.response,
      action: finalResult.action,
      toolChain: {
        toolsUsed: toolChain.map((tc) => tc.tool),
        results: results,
        totalExecutionTime: executionTime,
      },
    };
  } catch (error) {
    logger.error("Error executing tool chain:", error);
    return {
      success: false,
      result: null,
      response: "Error executing command chain",
      action: "show_error",
      toolChain: {
        toolsUsed: toolChain.map((tc) => tc.tool),
        results: [],
        totalExecutionTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Process tool chain results and generate final response
 */
function processToolChainResults(results: any[], toolChain: any[]): any {
  // Check if any tool failed
  const failedTools = results.filter((r) => !r.success);
  if (failedTools.length > 0) {
    return {
      success: false,
      data: null,
      response: `Command failed: ${failedTools[0].error}`,
      action: "show_error",
    };
  }

  // Use the result from the last tool as the primary result
  const lastResult = results[results.length - 1];

  return {
    success: true,
    data: lastResult.data,
    response: generateChainResponse(results, toolChain),
    action: determineAction(lastResult, toolChain[toolChain.length - 1].tool),
  };
}

/**
 * Generate response for tool chain execution
 */
function generateChainResponse(results: any[], toolChain: any[]): string {
  const toolNames = toolChain.map((tc) => tc.tool);

  if (toolNames.includes("send_message")) {
    return "Message sent successfully!";
  } else if (toolNames.includes("lookup_contacts") && toolNames.includes("get_conversations")) {
    return "Found conversations and contacts as requested.";
  } else if (toolNames.includes("get_messages")) {
    return "Retrieved messages as requested.";
  } else {
    return "Command executed successfully.";
  }
}

/**
 * Generate response for single tool execution
 */
function generateResponse(result: any, toolName: string): string {
  if (!result.success) {
    return result.error || "Command failed";
  }

  switch (toolName) {
  case "send_message":
    return "Message sent successfully!";
  case "get_conversations":
    return `Found ${result.data?.conversations?.length || 0} conversations.`;
  case "lookup_contacts":
    return `Found ${result.data?.contacts?.length || 0} contacts.`;
  case "get_messages":
    return `Retrieved ${result.data?.messages?.length || 0} messages.`;
  case "resolve_conversation":
    return result.data?.was_created ? "Created new conversation." : "Found existing conversation.";
  case "get_conversation_info":
    return "Retrieved conversation information.";
  default:
    return "Command executed successfully.";
  }
}

/**
 * Determine action based on tool result
 */
function determineAction(result: any, toolName: string): string {
  if (!result.success) {
    return "show_error";
  }

  switch (toolName) {
  case "send_message":
  case "resolve_conversation":
    return "navigate_to_conversation";
  case "get_conversations":
  case "lookup_contacts":
  case "get_messages":
  case "get_conversation_info":
    return "show_summary";
  default:
    return "no_action";
  }
}
