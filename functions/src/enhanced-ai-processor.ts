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
import {ToolChainParameterMapper} from "./tools/tool-chain-mapper";
import {ToolChainValidator} from "./tools/tool-chain-validator";
import {initializeLangSmith} from "./services/langsmith-config";
import {getOpenAIApiKey, logEnvironmentStatus} from "./services/env-config";
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
  {
    cors: true,
    secrets: ["OPENAI_API_KEY", "LANGSMITH_API_KEY", "PINECONE_API_KEY"]
  },
  async (request): Promise<EnhancedAICommandResponse> => {
    try {
      // Log environment status on first call
      logEnvironmentStatus();
      
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

      // Validate tool chain if multiple tools are needed
      if (parsedCommand.toolChain && parsedCommand.toolChain.length > 1) {
        const validation = ToolChainValidator.validateChain(parsedCommand.toolChain);
        
        logger.info("Tool chain validation", {
          valid: validation.valid,
          pattern: ToolChainValidator.getChainPattern(parsedCommand.toolChain),
          errors: validation.errors,
          warnings: validation.warnings
        });

        if (!validation.valid) {
          logger.error("Invalid tool chain generated", {
            errors: validation.errors,
            toolChain: parsedCommand.toolChain.map(tc => tc.tool)
          });
          
          return {
            success: false,
            result: null,
            response: `Invalid tool sequence: ${validation.errors.join(", ")}`,
            action: "show_error",
            error: `Invalid tool sequence: ${validation.errors.join(", ")}`,
          };
        }

        if (validation.warnings.length > 0) {
          logger.warn("Tool chain warnings", {warnings: validation.warnings});
        }
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
 * Parse command using AI with iterative tool calling
 * This implements proper tool chaining by calling the AI multiple times
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
    
    // Debug logging
    logger.info("Available tools for AI", {
      toolCount: availableTools.length,
      toolNames: availableTools.map((t) => t.name),
    });
    
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
    let openaiApiKey: string;
    try {
      openaiApiKey = getOpenAIApiKey();
    } catch (error) {
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

CRITICAL RULE: For ANY command that involves sending a message to someone by name, you MUST use this exact sequence:

1. FIRST: Call lookup_contacts(query="[person's name]") to find their user ID
2. CHECK: If lookup_contacts returns needs_clarification=true, you MUST call request_clarification tool BEFORE proceeding
3. SECOND: Use the results from step 1 (or user selection from clarification) to call send_message(content="[message text]", recipient_id="[user_id from lookup_contacts result]", sender_id="${appContext?.currentUserId || "unknown"}")

EXAMPLES OF REQUIRED TOOL CHAINING:
- "Tell John hello" → FIRST: lookup_contacts(query="John") THEN: send_message(content="hello", recipient_id="[result from lookup_contacts]")
- "Say hello to Sarah" → FIRST: lookup_contacts(query="Sarah") THEN: send_message(content="hello", recipient_id="[result from lookup_contacts]")
- "Tell George I'm working on something really important" → FIRST: lookup_contacts(query="George") THEN: send_message(content="I'm working on something really important", recipient_id="[result from lookup_contacts]")

CLARIFICATION HANDLING:
- If lookup_contacts returns needs_clarification=true, you MUST call request_clarification tool
- Do NOT proceed with send_message until user provides clarification
- Use the clarification_options from lookup_contacts result for the request_clarification tool

IMPORTANT: 
- You MUST call BOTH tools for message sending commands (unless clarification is needed)
- Do not call lookup_contacts twice
- Use the contact ID from the first lookup_contacts result to call send_message
- The user expects the message to actually be sent
- ALWAYS respect clarification requests - do not guess which contact the user meant

SINGLE TOOL COMMANDS (no chaining needed):
- "Show me my recent conversations" → get_conversations
- "Find my conversation with Mike" → lookup_contacts(query="Mike") then resolve_conversation
- "What messages do I have with Mike?" → lookup_contacts(query="Mike") then get_messages

When you see tool results, analyze them carefully and decide what to do next based on the user's original request.`;

    // Implement iterative tool calling for proper chaining
    const messages: any[] = [
      {role: "system", content: systemPrompt},
      {role: "user", content: command},
    ];
    
    const toolChain: any[] = [];
    let iterationCount = 0;
    const maxIterations = enableToolChaining ? 3 : 1;

    while (iterationCount < maxIterations) {
      let completion;
      try {
        completion = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages,
          tools: toolDefinitions,
          tool_choice: iterationCount === 0 ? "auto" : "auto",
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

      // Debug logging
      logger.info(`AI tool calls generated (iteration ${iterationCount + 1})`, {
        toolCallsCount: toolCalls.length,
        toolCalls: toolCalls.map((tc: any) => ({
          name: tc.function.name,
          arguments: tc.function.arguments,
        })),
        command: command.substring(0, 100),
      });

      // If no tool calls, we're done
      if (toolCalls.length === 0) {
        break;
      }

      // Add assistant message with tool calls to conversation
      messages.push(response.message);

      // Execute tools and add results to conversation
      const toolResults: any[] = [];
      
      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        const toolName = toolCall.function.name;
        let parameters = JSON.parse(toolCall.function.arguments);
        
        // Apply parameter mapping from previous tool if available
        if (i > 0 && toolResults.length > 0) {
          const previousToolCall = toolCalls[i - 1];
          const previousToolName = previousToolCall.function.name;
          const previousResult = toolResults[i - 1];
          
          if (previousResult) {
            parameters = ToolChainParameterMapper.autoMapParameters(
              previousToolName,
              previousResult,
              toolName,
              parameters
            );
            
            logger.info("Applied parameter mapping", {
              from: previousToolName,
              to: toolName,
              mappedParams: parameters
            });
          }
        }
        
        // Add to tool chain
        toolChain.push({
          tool: toolName,
          parameters,
        });

        // For iterative calling, we need to execute the tool and provide results
        // This allows the AI to see the results and decide what to do next
        if (enableToolChaining && iterationCount < maxIterations - 1) {
          const tool = toolRegistry.getTool(toolName);
          if (tool) {
            try {
              const context: ToolContext = {
                currentUserId: appContext?.currentUserId,
                appContext,
                requestId: `iter-${iterationCount}-${Date.now()}`,
              };
              
              const result = await tool.execute(parameters, context);
              
              // Store result for parameter mapping
              toolResults.push(result);
              
              // Add tool result to messages with clear formatting
              let toolResultContent;
              if (toolName === "lookup_contacts" && result.success && result.data?.contacts) {
                // Format lookup_contacts results clearly for the AI
                const contacts = result.data.contacts;
                const needsClarification = result.data.needs_clarification;
                const clarificationReason = result.data.clarification_reason;
                const clarificationOptions = result.data.clarification_options;
                
                // Comprehensive logging for debugging
                logger.info("🔍 AI Processor handling lookup_contacts result", {
                  query: parameters.query,
                  contactsFound: contacts.length,
                  needsClarification: needsClarification,
                  clarificationReason: clarificationReason,
                  clarificationOptionsCount: clarificationOptions?.length || 0,
                  contacts: contacts.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    email: c.email,
                    confidence: c.confidence,
                    is_recent: c.is_recent
                  })),
                  clarificationOptions: clarificationOptions?.map((opt: any) => ({
                    id: opt.id,
                    title: opt.title,
                    subtitle: opt.subtitle,
                    confidence: opt.confidence
                  })),
                  fullResultData: {
                    total_found: result.data.total_found,
                    search_criteria: result.data.search_criteria,
                    needs_clarification: result.data.needs_clarification,
                    clarification_reason: result.data.clarification_reason
                  }
                });
                
                if (contacts.length === 0) {
                  toolResultContent = JSON.stringify({
                    success: false,
                    tool: "lookup_contacts",
                    error: `No contacts found matching "${parameters.query}"`,
                    suggestion: "Try a different name or check spelling"
                  });
                } else if (needsClarification) {
                  // Clarification needed - instruct AI to call request_clarification tool
                  toolResultContent = JSON.stringify({
                    success: true,
                    tool: "lookup_contacts",
                    contacts_found: contacts.map((c: any) => ({
                      user_id: c.id,
                      name: c.name,
                      email: c.email,
                      confidence: c.confidence
                    })),
                    needs_clarification: true,
                    clarification_reason: clarificationReason,
                    clarification_options: clarificationOptions,
                    instruction: `CLARIFICATION NEEDED: Call request_clarification tool with clarification_type="contact_selection", question="Which contact did you mean?", options=[${clarificationOptions?.map((opt: any) => `"${opt.title} (${opt.subtitle})"`).join(', ')}], context="${clarificationReason}". Do NOT proceed with send_message until user selects a contact.`
                  });
                } else if (contacts.length === 1) {
                  // Single match - make it very clear what to do next
                  const contact = contacts[0];
                  toolResultContent = JSON.stringify({
                    success: true,
                    tool: "lookup_contacts",
                    contact_found: {
                      user_id: contact.id,
                      name: contact.name,
                      email: contact.email,
                      confidence: contact.confidence
                    },
                    instruction: `IMPORTANT: Use this contact's user_id "${contact.id}" as the recipient_id parameter in send_message. Do NOT call lookup_contacts again.`
                  });
                } else {
                  // Multiple matches - let AI choose best one
                  toolResultContent = JSON.stringify({
                    success: true,
                    tool: "lookup_contacts",
                    contacts_found: contacts.map((c: any) => ({
                      user_id: c.id,
                      name: c.name,
                      email: c.email,
                      confidence: c.confidence
                    })),
                    instruction: `Found ${contacts.length} contacts. Choose the contact with highest confidence and use their user_id as recipient_id in send_message. Do NOT call lookup_contacts again.`
                  });
                }
              } else if (toolName === "summarize_conversation" && result.success && result.data?.summary) {
                // Format summarization results clearly
                toolResultContent = JSON.stringify({
                  success: true,
                  tool: "summarize_conversation",
                  summary: result.data.summary,
                  message_count: result.data.message_count,
                  time_range: result.data.time_range,
                  participants: result.data.participants,
                  key_topics: result.data.key_topics,
                  instruction: "Summary complete. No further action needed."
                });
              } else if (toolName === "request_clarification" && result.success && result.data?.requires_user_input) {
                // Format clarification requests clearly
                toolResultContent = JSON.stringify({
                  success: true,
                  tool: "request_clarification",
                  clarification_type: result.data.clarification_type,
                  question: result.data.question,
                  context: result.data.context,
                  options: result.data.options,
                  best_option: result.data.best_option,
                  allow_cancel: result.data.allow_cancel,
                  instruction: "STOP: User clarification required. Present options and wait for user selection."
                });
              } else {
                toolResultContent = JSON.stringify({
                  success: result.success,
                  tool: toolName,
                  data: result.data,
                  message: result.success ? "Tool executed successfully" : result.error,
                });
              }
              
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResultContent,
              });
              
              logger.info(`Tool ${toolName} executed in iteration ${iterationCount + 1}`, {
                success: result.success,
                hasData: !!result.data,
              });
            } catch (error) {
              logger.error(`Error executing tool ${toolName}:`, error);
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : "Unknown error",
                }),
              });
            }
          }
        }
      }

      iterationCount++;

      // If we're not doing tool chaining, break after first iteration
      if (!enableToolChaining) {
        break;
      }
    }

    // Check if we got any tools
    if (toolChain.length === 0) {
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

    if (runTree) {
      await runTree.end({
        outputs: {
          success: true,
          toolChain: toolChain.map((tc: any) => tc.tool),
          toolCount: toolChain.length,
          iterations: iterationCount,
        },
      });
      await runTree.patchRun();
    }

    logger.info("Tool chain generated", {
      toolCount: toolChain.length,
      tools: toolChain.map((tc) => tc.tool),
      iterations: iterationCount,
    });

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
    logger.info("Executing tool chain", {
      toolChain: toolChain.map((tc) => ({ tool: tc.tool, parameters: tc.parameters })),
      maxChainLength,
      currentUserId,
    });
    
    const results = await toolChainExecutor.executeChain(toolChain, context);
    const executionTime = Date.now() - startTime;
    
    logger.info("Tool chain execution completed", {
      resultsCount: results.length,
      executionTime,
      results: results.map((r) => ({ success: r.success, toolName: r.metadata?.toolName })),
    });

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

  if (toolNames.includes("request_clarification")) {
    const clarificationResult = results.find(r => r.toolName === "request_clarification");
    if (clarificationResult?.success && clarificationResult.data?.question) {
      return `I need clarification: ${clarificationResult.data.question}`;
    }
    return "Clarification requested.";
  } else if (toolNames.includes("summarize_conversation")) {
    const summarizeResult = results.find(r => r.toolName === "summarize_conversation");
    if (summarizeResult?.success && summarizeResult.data?.summary) {
      return `Here's a summary of your conversation:\n\n${summarizeResult.data.summary}`;
    }
    return "Summary generated successfully.";
  } else if (toolNames.includes("send_message")) {
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
  case "summarize_conversation":
    return "show_summary";
  case "request_clarification":
    return "request_clarification";
  default:
    return "no_action";
  }
}
