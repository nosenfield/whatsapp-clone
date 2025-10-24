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
      "resolve_conversation → send_message": "Send message to existing conversation",
      "get_conversations": "List conversations",
      "lookup_contacts": "Search for contacts"
    };

    return patterns[toolNames] || "Unknown pattern";
  }
}
