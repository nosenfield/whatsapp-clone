/**
 * Tool Chain Parameter Mapper
 *
 * Maps parameters between tools in a chain to remove the burden from the AI
 * to extract and map parameters manually.
 */

import {ToolResult} from "./ai-tool-interface";
import * as logger from "firebase-functions/logger";

/**
 * Maps parameters between tools in a chain
 * This removes the burden from the AI to extract and map parameters
 */
export class ToolChainParameterMapper {
  /**
   * Map output from lookup_contacts to input for send_message
   */
  static mapLookupContactsToSendMessage(
    lookupResult: ToolResult,
    sendMessageParams: Record<string, any>
  ): Record<string, any> {
    if (!lookupResult.success || !lookupResult.data?.contacts) {
      logger.warn("Cannot map parameters: lookup_contacts failed or returned no contacts");
      return sendMessageParams;
    }

    const contacts = lookupResult.data.contacts;
    
    // If recipient_id is missing or invalid, try to map it
    if (!sendMessageParams.recipient_id || sendMessageParams.recipient_id === "[recipient_id]") {
      if (contacts.length === 1) {
        // Single contact - use it
        sendMessageParams.recipient_id = contacts[0].id;
        logger.info("Mapped single contact to recipient_id", {
          contactId: contacts[0].id,
          contactName: contacts[0].name
        });
      } else if (contacts.length > 1) {
        // Multiple contacts - use highest confidence
        const bestContact = contacts.reduce((best: any, current: any) => 
          (current.confidence > best.confidence) ? current : best
        );
        sendMessageParams.recipient_id = bestContact.id;
        logger.info("Mapped best contact to recipient_id", {
          contactId: bestContact.id,
          contactName: bestContact.name,
          confidence: bestContact.confidence
        });
      }
    }

    return sendMessageParams;
  }

  /**
   * Map output from resolve_conversation to input for send_message
   */
  static mapResolveConversationToSendMessage(
    resolveResult: ToolResult,
    sendMessageParams: Record<string, any>
  ): Record<string, any> {
    if (!resolveResult.success || !resolveResult.data?.conversation_id) {
      logger.warn("Cannot map parameters: resolve_conversation failed");
      return sendMessageParams;
    }

    if (!sendMessageParams.conversation_id) {
      sendMessageParams.conversation_id = resolveResult.data.conversation_id;
      logger.info("Mapped conversation_id", {
        conversationId: resolveResult.data.conversation_id
      });
    }

    return sendMessageParams;
  }

  /**
   * Map output from get_messages to input for summarize_conversation
   */
  static mapGetMessagesToSummarizeConversation(
    getMessagesResult: ToolResult,
    summarizeParams: Record<string, any>
  ): Record<string, any> {
    if (!getMessagesResult.success || !getMessagesResult.data?.conversation_id) {
      logger.warn("Cannot map parameters: get_messages failed or missing conversation_id");
      return summarizeParams;
    }

    if (!summarizeParams.conversation_id) {
      summarizeParams.conversation_id = getMessagesResult.data.conversation_id;
      logger.info("Mapped conversation_id from get_messages", {
        conversationId: getMessagesResult.data.conversation_id
      });
    }

    return summarizeParams;
  }

  /**
   * Automatically map parameters based on tool sequence
   */
  static autoMapParameters(
    fromToolName: string,
    fromToolResult: ToolResult,
    toToolName: string,
    toToolParams: Record<string, any>
  ): Record<string, any> {
    const mappingKey = `${fromToolName}_to_${toToolName}`;
    
    logger.info("Auto-mapping parameters", {
      from: fromToolName,
      to: toToolName,
      mappingKey
    });

    switch (mappingKey) {
      case "lookup_contacts_to_send_message":
        return this.mapLookupContactsToSendMessage(fromToolResult, toToolParams);
      
      case "resolve_conversation_to_send_message":
        return this.mapResolveConversationToSendMessage(fromToolResult, toToolParams);
      
      case "get_messages_to_summarize_conversation":
        return this.mapGetMessagesToSummarizeConversation(fromToolResult, toToolParams);
      
      case "lookup_contacts_to_resolve_conversation":
        // Map contact ID to contact_identifier
        if (fromToolResult.success && fromToolResult.data?.contacts?.length > 0) {
          const bestContact = fromToolResult.data.contacts[0];
          if (!toToolParams.contact_identifier) {
            toToolParams.contact_identifier = bestContact.email || bestContact.id;
          }
        }
        return toToolParams;
      
      default:
        logger.info("No automatic mapping available for this tool sequence");
        return toToolParams;
    }
  }
}
