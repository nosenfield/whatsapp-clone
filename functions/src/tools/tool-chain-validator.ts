/**
 * Tool Chain Validator
 *
 * Validates tool chains before execution to catch invalid sequences early.
 */

export class ToolChainValidator {
  /**
   * Validate a tool chain before execution
   */
  static validateChain(toolChain: Array<{tool: string; parameters: any}>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: No duplicate consecutive tools
    for (let i = 1; i < toolChain.length; i++) {
      if (toolChain[i].tool === toolChain[i - 1].tool) {
        errors.push(
          `Duplicate consecutive tool: ${toolChain[i].tool} appears twice in a row at positions ${i - 1} and ${i}`
        );
      }
    }

    // Rule 2: lookup_contacts should not appear more than once
    const lookupContactsCount = toolChain.filter(tc => tc.tool === "lookup_contacts").length;
    if (lookupContactsCount > 1) {
      errors.push(
        `lookup_contacts appears ${lookupContactsCount} times. It should only be called once per request.`
      );
    }

    // Rule 3: send_message requires either conversation_id or recipient_id
    const sendMessageCalls = toolChain.filter(tc => tc.tool === "send_message");
    for (const sendMessageCall of sendMessageCalls) {
      const params = sendMessageCall.parameters;
      if (!params.conversation_id && !params.recipient_id) {
        // Check if there's a lookup_contacts or resolve_conversation before it
        const sendMessageIndex = toolChain.indexOf(sendMessageCall);
        const hasLookupBefore = toolChain
          .slice(0, sendMessageIndex)
          .some(tc => tc.tool === "lookup_contacts" || tc.tool === "resolve_conversation");
        
        if (!hasLookupBefore) {
          errors.push(
            "send_message requires either conversation_id or recipient_id parameter, " +
            "or must be preceded by lookup_contacts or resolve_conversation"
          );
        }
      }
    }

    // Rule 4: Validate common patterns
    if (toolChain.length >= 2) {
      // Pattern: lookup_contacts → send_message is valid
      for (let i = 0; i < toolChain.length - 1; i++) {
        if (toolChain[i].tool === "lookup_contacts" && toolChain[i + 1].tool === "send_message") {
          // This is the expected pattern - no warning needed
          const recipientId = toolChain[i + 1].parameters.recipient_id;
          if (!recipientId || recipientId === "[recipient_id]" || recipientId.includes("from")) {
            warnings.push(
              "send_message after lookup_contacts should have recipient_id set. " +
              "Parameter mapping will attempt to fix this."
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if a tool chain matches a known pattern
   */
  static getChainPattern(toolChain: Array<{tool: string}>): string {
    const toolNames = toolChain.map(tc => tc.tool).join(" → ");
    
    // Define known patterns
    const patterns: Record<string, string> = {
      "lookup_contacts → send_message": "Send message to contact by name",
      "lookup_contacts → resolve_conversation": "Find conversation with contact",
      "lookup_contacts → resolve_conversation → get_messages": "Get messages from contact",
      "lookup_contacts → resolve_conversation → get_messages → summarize_conversation": "Summarize conversation with contact",
      "resolve_conversation → send_message": "Send message to existing conversation",
      "get_messages → summarize_conversation": "Summarize conversation messages",
      "get_conversations": "List conversations",
      "lookup_contacts": "Search for contacts",
      "analyze_conversation": "Extract information from conversation",
      "summarize_conversation": "Summarize conversation"
    };

    return patterns[toolNames] || "Unknown pattern";
  }

  /**
   * Pre-flight validation before AI generates tool chain
   * Validates context and requirements
   */
  static validatePreFlight(
    command: string,
    appContext: any
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const inConversation = appContext?.currentConversationId && 
                          appContext?.currentScreen === "conversation";
    const currentUserId = appContext?.currentUserId;

    // Rule 1: Information extraction requires being in a conversation
    const informationQueries = [
      /who (is|are|was|were|confirmed|said|mentioned)/i,
      /what (did|does|is|was|were|about)/i,
      /when (is|was|did|does)/i,
      /where (is|was|did|does)/i,
      /how many/i,
      /list (all|the)/i
    ];

    const isInformationQuery = informationQueries.some(pattern => pattern.test(command));

    if (isInformationQuery && !inConversation) {
      warnings.push(
        "Information extraction query detected but user is not in a conversation. " +
        "AI should inform user to open the conversation first."
      );
      suggestions.push("Inform user: 'Please open the conversation you want to ask about first.'");
    }

    // Rule 2: User ID must be present
    if (!currentUserId) {
      errors.push("Missing current_user_id in appContext");
    }

    // Rule 3: Command should not be empty
    if (!command || command.trim().length === 0) {
      errors.push("Command is empty");
    }

    // Rule 4: Detect potential ambiguous commands
    const ambiguousPatterns = [
      { pattern: /tell (him|her|them)/i, warning: "Ambiguous pronoun - may need clarification" },
      { pattern: /send (it|that|this)/i, warning: "Ambiguous reference - may need clarification" },
      { pattern: /message (someone|somebody)/i, warning: "Vague recipient - will need clarification" }
    ];

    for (const {pattern, warning} of ambiguousPatterns) {
      if (pattern.test(command)) {
        warnings.push(warning);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate tool parameters before execution
   * More comprehensive than ToolChainParameterMapper.validateParameters
   */
  static validateToolParameters(
    toolName: string,
    parameters: any,
    appContext?: any
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Common validations
    if (!parameters || typeof parameters !== "object") {
      errors.push(`Parameters must be an object, got ${typeof parameters}`);
      return {valid: false, errors, warnings};
    }

    // Tool-specific validations
    switch (toolName) {
      case "analyze_conversation":
        if (!parameters.conversation_id) {
          errors.push("Missing required parameter: conversation_id");
        }
        if (!parameters.current_user_id) {
          errors.push("Missing required parameter: current_user_id");
        }
        if (!parameters.query || typeof parameters.query !== "string") {
          errors.push("Missing or invalid parameter: query (must be string)");
        }
        if (parameters.max_messages && (typeof parameters.max_messages !== "number" || parameters.max_messages < 1)) {
          errors.push("Invalid parameter: max_messages (must be positive number)");
        }
        break;

      case "send_message":
        if (!parameters.sender_id) {
          errors.push("Missing required parameter: sender_id");
        }
        if (!parameters.content) {
          errors.push("Missing required parameter: content");
        }
        if (!parameters.recipient_id && !parameters.conversation_id) {
          errors.push("Missing required parameter: recipient_id or conversation_id");
        }
        // Check for placeholder values
        if (parameters.recipient_id && /\[|\]/.test(parameters.recipient_id)) {
          errors.push(`recipient_id appears to be a placeholder: ${parameters.recipient_id}`);
        }
        break;

      case "lookup_contacts":
        if (!parameters.query) {
          errors.push("Missing required parameter: query");
        }
        if (!parameters.user_id) {
          errors.push("Missing required parameter: user_id");
        }
        break;

      case "summarize_conversation":
        if (!parameters.conversation_id) {
          errors.push("Missing required parameter: conversation_id");
        }
        if (!parameters.current_user_id) {
          errors.push("Missing required parameter: current_user_id");
        }
        break;

      case "get_conversations":
        if (!parameters.user_id) {
          errors.push("Missing required parameter: user_id");
        }
        break;

      case "get_messages":
        if (!parameters.conversation_id) {
          errors.push("Missing required parameter: conversation_id");
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
