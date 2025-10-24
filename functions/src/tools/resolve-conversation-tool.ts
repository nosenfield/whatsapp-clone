/**
 * Resolve Conversation Tool
 *
 * Finds or creates a conversation between the current user and a contact.
 * Supports flexible contact identification and optional conversation creation.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export class ResolveConversationTool extends BaseAITool {
  name = "resolve_conversation";
  description = "Find or create a conversation between the current user and a contact. Supports flexible contact identification by name, email, or phone.";

  parameters: ToolParameter[] = [
    {
      name: "user_id",
      type: "string",
      description: "The current user ID",
      required: true,
    },
    {
      name: "contact_identifier",
      type: "string",
      description: "Contact identifier (name, email, or phone number)",
      required: true,
    },
    {
      name: "create_if_missing",
      type: "boolean",
      description: "Whether to create a new conversation if none exists",
      required: false,
      default: false,
    },
    {
      name: "conversation_type",
      type: "string",
      description: "Type of conversation to create (direct or group)",
      required: false,
      default: "direct",
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {user_id, contact_identifier, create_if_missing = false, conversation_type = "direct"} = params;

      logger.info("Resolving conversation", {
        userId: user_id,
        contactIdentifier: contact_identifier,
        createIfMissing: create_if_missing,
        conversationType: conversation_type,
      });

      // Step 1: Find the contact
      const contact = await this.findContact(contact_identifier);
      if (!contact) {
        return {
          success: false,
          error: `Contact "${contact_identifier}" not found`,
          confidence: 0.1,
        };
      }

      // Step 2: Check if conversation already exists
      let conversation = await this.findConversationBetweenUsers(user_id, contact.id);
      let wasCreated = false;

      if (!conversation && create_if_missing) {
        // Step 3: Create new conversation if requested
        conversation = await this.createConversation([user_id, contact.id]);
        wasCreated = true;
        logger.info("Created new conversation", {conversationId: conversation.id});
      }

      if (!conversation) {
        return {
          success: false,
          error: `No conversation found with ${contact.displayName || contact.email}`,
          confidence: 0.3,
        };
      }

      // Step 4: Get participant details
      const participants = await this.getParticipantDetails(conversation.participants);

      const result = {
        conversation_id: conversation.id,
        participants: participants,
        was_created: wasCreated,
        conversation_type: conversation.type,
        created_at: this.formatTimestamp(conversation.createdAt),
        last_message_at: this.formatTimestamp(conversation.lastMessageAt),
      };

      // Calculate confidence based on match quality
      const confidence = this.calculateConfidence(
        true, // exact match
        false, // no partial match needed
        0.9 // high data quality
      );

      return {
        success: true,
        data: result,
        confidence,
        metadata: {
          contactFound: true,
          conversationExists: !wasCreated,
          participantCount: participants.length,
        },
      };
    } catch (error) {
      logger.error("Error resolving conversation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
      };
    }
  }

  private async findContact(identifier: string): Promise<any> {
    // Try different identification methods in order of preference

    // 1. Try by email (most reliable)
    if (identifier.includes("@")) {
      const contact = await this.findUserByEmail(identifier);
      if (contact) return contact;
    }

    // 2. Try by display name (exact match)
    const contact = await this.findUserByName(identifier);
    if (contact) return contact;

    // 3. Try fuzzy name matching
    const fuzzyContact = await this.findUserByFuzzyName(identifier);
    if (fuzzyContact) return fuzzyContact;

    return null;
  }

  private async findUserByFuzzyName(name: string): Promise<any> {
    // Get all users and do fuzzy matching
    const allUsersSnapshot = await admin.firestore()
      .collection("users")
      .get();

    const normalizedName = name.toLowerCase().trim();

    for (const doc of allUsersSnapshot.docs) {
      const userData = doc.data();
      const displayName = userData.displayName?.toLowerCase() || "";

      // Check for partial matches
      if (displayName.includes(normalizedName) || normalizedName.includes(displayName)) {
        return {
          id: doc.id,
          ...userData,
        };
      }
    }

    return null;
  }

  private async getParticipantDetails(participantIds: string[]): Promise<any[]> {
    const participantsSnapshot = await admin.firestore()
      .collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", participantIds)
      .get();

    return participantsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      displayName: doc.data().displayName,
      email: doc.data().email,
      photoURL: doc.data().photoURL,
    }));
  }
}
