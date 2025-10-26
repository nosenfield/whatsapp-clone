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
    // Clarification response for command continuation
    clarification_response?: {
      clarification_type: string;
      selected_option: {
        id: string;
        title: string;
        subtitle: string;
        confidence: number;
        metadata?: any;
        display_text: string;
      };
      original_clarification_data: any;
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
  action: "navigate_to_conversation" | "show_summary" | "show_error" | "no_action" | "tool_chain" | "request_clarification";
  error?: string;
  runId?: string;
  toolChain?: {
    toolsUsed: string[];
    results: any[];
    totalExecutionTime: number;
  };
  // Clarification fields
  requires_clarification?: boolean;
  clarification_data?: any;
  original_command?: string;
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

      // Execute tool chain (always use ToolChainExecutor for consistent behavior)
      if (parsedCommand.toolChain && parsedCommand.toolChain.length > 0) {
        const toolChainResult = await executeToolChain(parsedCommand.toolChain, currentUserId, appContext, maxChainLength);

        return {
          success: toolChainResult.success,
          result: toolChainResult.result,
          response: toolChainResult.response,
          action: toolChainResult.action,
          runId: parsedCommand.runId,
          toolChain: toolChainResult.toolChain,
          // Include clarification fields if present
          requires_clarification: toolChainResult.requires_clarification,
          clarification_data: toolChainResult.clarification_data,
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

    // Debug logging for clarification response
    logger.info("🔍 Debug clarification response:", {
      hasClarificationResponse: !!appContext?.clarification_response,
      clarificationResponse: appContext?.clarification_response,
      selectedOption: appContext?.clarification_response?.selected_option
    });

    // Build system prompt based on clarification response
    let systemPrompt;
    if (appContext?.clarification_response) {
      // User has already selected a contact - skip lookup and go directly to send_message
      systemPrompt = `You are an AI assistant for a messaging app.

CRITICAL: The user has already selected a contact from a previous clarification.

SELECTED CONTACT:
- Name: "${appContext.clarification_response.selected_option.title}"
- Contact ID: ${appContext.clarification_response.selected_option.id}
- Email: ${appContext.clarification_response.selected_option.subtitle}

ACTION REQUIRED:
For "send message to [name]" commands, you MUST:
1. Call send_message(recipient_id="${appContext.clarification_response.selected_option.id}", content="[extract message from command]", sender_id="${appContext?.currentUserId || "unknown"}")
2. Do NOT call lookup_contacts - the user has already selected the contact

EXAMPLE:
User: "Tell John I'm on my way"
You call: send_message(recipient_id="${appContext.clarification_response.selected_option.id}", content="I'm on my way", sender_id="${appContext?.currentUserId || "unknown"}")
Result: Message sent successfully

CRITICAL RULES:
- NEVER call lookup_contacts when clarification_response is present
- ALWAYS use the selected_option.id for send_message
- Extract the message content from the user's command`;
    } else {
      // No clarification response - normal flow
      systemPrompt = `You are an AI assistant for a messaging app.

TOOL CHAINING RULES:

1. For "send message to [name]" commands:
   - Step 1: Call lookup_contacts(query="[name]", user_id="${appContext?.currentUserId || "unknown"}")
   - Step 2: Check tool result's next_action field:
     * If "clarification_needed": STOP - system will present options automatically
     * If "continue": Use contact_id from result.data for next tool
     * If "error": Inform user of the error
   - Step 3 (only if step 2 was "continue"): Call send_message(recipient_id="[contact_id]", content="[message]", sender_id="${appContext?.currentUserId || "unknown"}")
`;
    }

    // Add common rules to both prompts
    systemPrompt += `

CRITICAL RULES:
- ALWAYS check result.next_action after EACH tool call
- If next_action is "clarification_needed", do NOT call any more tools
- Trust the tool's next_action field completely
- Use contact_id from result.data, never make up IDs

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

      // Validation: Don't allow chaining after tools that might need clarification
      const validatedToolCalls = [];
      for (let i = 0; i < toolCalls.length; i++) {
        const currentTool = toolCalls[i];
        validatedToolCalls.push(currentTool);
        
        // If this tool might need clarification, don't include subsequent tools
        if (["lookup_contacts", "search_conversations"].includes(currentTool.function.name)) {
          logger.info(`Tool ${currentTool.function.name} might need clarification, stopping chain here`, {
            originalChainLength: toolCalls.length,
            validatedChainLength: validatedToolCalls.length
          });
          break; // Only execute up to this tool
        }
      }

      // Use validatedToolCalls instead of toolCalls
      const finalToolCalls = validatedToolCalls;

      // Add assistant message with tool calls to conversation
      messages.push(response.message);

      // Execute tools and add results to conversation
      const toolResults: any[] = [];
      
      for (let i = 0; i < finalToolCalls.length; i++) {
        const toolCall = finalToolCalls[i];
        const toolName = toolCall.function.name;
        let parameters = JSON.parse(toolCall.function.arguments);
        
        // Apply parameter mapping from previous tool if available
        if (i > 0 && toolResults.length > 0) {
          const previousToolCall = finalToolCalls[i - 1];
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
              
              // Use standardized tool result format
              const toolResultContent = JSON.stringify({
                success: result.success,
                data: result.data,
                next_action: result.next_action,
                clarification: result.clarification,
                error: result.error,
                instruction_for_ai: result.instruction_for_ai,
                confidence: result.confidence,
                metadata: result.metadata
              }, null, 2); // Pretty print for readability
              
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

    // Debug logging for clarification
    logger.info("🔍 Tool chain final result:", {
      success: finalResult.success,
      action: finalResult.action,
      requires_clarification: finalResult.requires_clarification,
      clarification_data: finalResult.clarification_data,
      data: finalResult.data,
    });

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
      // Include clarification fields if present
      requires_clarification: finalResult.requires_clarification,
      clarification_data: finalResult.clarification_data,
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
  // Check for errors first
  const errorResult = results.find((r) => r.next_action === "error" || !r.success);
  if (errorResult) {
    return {
      success: false,
      data: null,
      response: errorResult.error || "Command failed",
      action: "show_error",
    };
  }

  // Check if clarification was needed
  const clarificationResult = results.find(r => r.next_action === "clarification_needed");
  if (clarificationResult) {
    return {
      success: true,
      data: clarificationResult.clarification,
      response: clarificationResult.clarification.question,
      action: "request_clarification",
      requires_clarification: true,
      clarification_data: clarificationResult.clarification,
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
