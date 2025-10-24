/**
 * Request Clarification Tool
 *
 * Handles low-confidence matches by presenting options to the user
 * and waiting for their selection before proceeding.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as logger from "firebase-functions/logger";

export class RequestClarificationTool extends BaseAITool {
  name = "request_clarification";
  description = "Request clarification from user when multiple matches or low confidence results are found. Presents options and waits for user selection.";

  parameters: ToolParameter[] = [
    {
      name: "clarification_type",
      type: "string",
      description: "Type of clarification needed (contact_selection, conversation_selection, message_selection)",
      required: true,
    },
    {
      name: "options",
      type: "array",
      description: "Array of options for user to choose from",
      required: true,
    },
    {
      name: "question",
      type: "string",
      description: "Question to ask the user",
      required: true,
    },
    {
      name: "context",
      type: "string",
      description: "Additional context about why clarification is needed",
      required: false,
    },
    {
      name: "allow_cancel",
      type: "boolean",
      description: "Whether to allow user to cancel the operation",
      required: false,
      default: true,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        clarification_type,
        options,
        question,
        context: clarificationContext,
        allow_cancel = true,
      } = params;

      logger.info("Requesting clarification", {
        type: clarification_type,
        optionsCount: options.length,
        question: question.substring(0, 100),
        context: clarificationContext,
      });

      // Validate options
      if (!options || options.length === 0) {
        return {
          success: false,
          error: "No options provided for clarification",
          confidence: 0,
        };
      }

      // Format options for display
      const formattedOptions = options.map((option: any, index: number) => ({
        id: option.id || `option_${index}`,
        title: option.title || "Unknown",
        subtitle: option.subtitle || "",
        confidence: option.confidence || 0,
        metadata: option.metadata || {},
        display_text: `${option.title}${option.subtitle ? ` - ${option.subtitle}` : ''}${option.confidence ? ` (${Math.round(option.confidence * 100)}% match)` : ''}`,
      }));

      // Determine the best default option (highest confidence)
      const bestOption = formattedOptions.reduce((best: any, current: any) => 
        (current.confidence > best.confidence) ? current : best
      );

      const result = {
        clarification_type,
        question,
        context: clarificationContext,
        options: formattedOptions,
        best_option: bestOption,
        allow_cancel,
        requires_user_input: true,
        action: "request_clarification",
      };

      return {
        success: true,
        data: result,
        confidence: 0.8, // High confidence that we need clarification
        metadata: {
          clarificationType: clarification_type,
          optionsCount: formattedOptions.length,
          bestOptionConfidence: bestOption.confidence,
        },
      };
    } catch (error) {
      logger.error("Error requesting clarification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
      };
    }
  }
}
