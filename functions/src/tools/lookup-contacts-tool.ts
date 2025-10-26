/**
 * Lookup Contacts Tool
 *
 * Searches for contacts/users with flexible matching and confidence scoring.
 * Supports fuzzy matching, recent contacts, and multiple search criteria.
 */

import {BaseAITool, ToolParameter, ToolContext, ToolResult} from "./ai-tool-interface";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

export class LookupContactsTool extends BaseAITool {
  name = "lookup_contacts";
  description = "Search for contacts/users with flexible matching. Supports name, email, phone search with confidence scoring and recent contacts prioritization.";

  parameters: ToolParameter[] = [
    {
      name: "user_id",
      type: "string",
      description: "The current user ID for context",
      required: true,
    },
    {
      name: "query",
      type: "string",
      description: "Search query (name, email, or phone)",
      required: true,
    },
    {
      name: "limit",
      type: "number",
      description: "Maximum number of results to return",
      required: false,
      default: 10,
    },
    {
      name: "include_recent",
      type: "boolean",
      description: "Prioritize recently contacted users",
      required: false,
      default: true,
    },
    {
      name: "search_fields",
      type: "array",
      description: "Fields to search in (displayName, email, phone)",
      required: false,
      default: ["displayName", "email"],
      items: {
        type: "string",
        enum: ["displayName", "email", "phoneNumber"]
      }
    },
    {
      name: "min_confidence",
      type: "number",
      description: "Minimum confidence score (0-1)",
      required: false,
      default: 0.3,
    },
    {
      name: "exclude_self",
      type: "boolean",
      description: "Exclude the current user from results",
      required: false,
      default: true,
    },
  ];

  async execute(params: Record<string, any>, context: ToolContext): Promise<ToolResult> {
    try {
      const {
        user_id,
        query,
        limit = 10,
        include_recent = true,
        search_fields = ["displayName", "email"],
        min_confidence = 0.3,
        exclude_self = true,
      } = params;

      logger.info("Looking up contacts", {
        userId: user_id,
        query: query.substring(0, 50), // Log first 50 chars for privacy
        limit,
        includeRecent: include_recent,
        searchFields: search_fields,
        minConfidence: min_confidence,
      });

      // Get recent contacts if requested
      let recentContacts: string[] = [];
      if (include_recent) {
        recentContacts = await this.getRecentContacts(user_id);
      }

      // Search for contacts
      const searchResults = await this.searchContacts(query, search_fields, exclude_self ? user_id : null);

      // Calculate confidence scores and prioritize recent contacts
      const scoredResults = searchResults.map((contact) => {
        const confidence = this.calculateContactConfidence(contact, query, search_fields, recentContacts);
        return {
          ...contact,
          confidence,
        };
      });

      // Filter by minimum confidence and sort by confidence
      const filteredResults = scoredResults
        .filter((result) => result.confidence >= min_confidence)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);

      // Format results
      const contacts = await Promise.all(filteredResults.map(async (result) => ({
        id: result.id,
        name: result.displayName || result.email || "Unknown",
        email: result.email,
        photo_url: result.photoURL,
        identifiers: this.extractIdentifiers(result),
        confidence: result.confidence,
        is_recent: recentContacts.includes(result.id),
        last_contact: await this.getLastContactTime(user_id, result.id),
      })));

      // Check if clarification is needed
      const needsClarification = this.shouldRequestClarification(contacts, query);

      logger.info("🔍 LookupContactsTool clarification analysis", {
        query: query,
        contactsFound: contacts.length,
        contacts: contacts.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          confidence: c.confidence,
          is_recent: c.is_recent
        })),
        needsClarification: needsClarification.needed,
        clarificationReason: needsClarification.reason,
        clarificationOptionsCount: needsClarification.options?.length || 0,
        clarificationOptions: needsClarification.options?.map((opt: any) => ({
          id: opt.id,
          title: opt.title,
          subtitle: opt.subtitle,
          confidence: opt.confidence
        }))
      });

      // Return standardized format based on scenario
      if (contacts.length === 0) {
        return {
          success: false,
          data: { 
            query, 
            contacts: [],
            total_found: 0 
          },
          next_action: "error",
          error: `No contacts found matching "${query}"`,
          instruction_for_ai: "Inform user no contacts were found.",
          confidence: 0,
          metadata: {
            contactsFound: 0,
            recentContactsIncluded: recentContacts.length,
            searchFieldsUsed: search_fields,
          },
        };
      }

      if (needsClarification.needed) {
        return {
          success: true,
          data: { 
            query, 
            contacts,
            total_found: contacts.length,
            search_criteria: {
              fields_searched: search_fields,
              min_confidence: min_confidence,
              include_recent: include_recent,
            }
          },
          next_action: "clarification_needed",
          clarification: {
            type: "contact_selection",
            question: `I found ${contacts.length} contacts named "${query}". Which one did you mean?`,
            options: needsClarification.options || []
          },
          instruction_for_ai: "STOP: Present these options to user and wait for their selection. Do NOT call any more tools.",
          confidence: Math.max(...filteredResults.map((r) => r.confidence)),
          metadata: {
            contactsFound: contacts.length,
            recentContactsIncluded: recentContacts.length,
            searchFieldsUsed: search_fields,
          },
        };
      }

      // Clear match - continue
      return {
        success: true,
        data: {
          query,
          contacts,
          total_found: contacts.length,
          contact_id: contacts[0].id,  // Selected contact ID
          contact_name: contacts[0].name,
          search_criteria: {
            fields_searched: search_fields,
            min_confidence: min_confidence,
            include_recent: include_recent,
          }
        },
        next_action: "continue",
        instruction_for_ai: `Use contact_id "${contacts[0].id}" for the next tool call.`,
        confidence: Math.max(...filteredResults.map((r) => r.confidence)),
        metadata: {
          contactsFound: contacts.length,
          recentContactsIncluded: recentContacts.length,
          searchFieldsUsed: search_fields,
        },
      };
    } catch (error) {
      logger.error("Error looking up contacts:", error);
      return {
        success: false,
        data: {},
        next_action: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        instruction_for_ai: "Inform user that contact search failed.",
        confidence: 0,
      };
    }
  }

  private async searchContacts(query: string, searchFields: string[], excludeUserId?: string): Promise<any[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const results: any[] = [];

    // Get all users (in a real app, you'd want to implement proper search indexing)
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .get();

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      // Skip excluded user
      if (excludeUserId && doc.id === excludeUserId) {
        continue;
      }

      // Check each search field
      for (const field of searchFields) {
        const fieldValue = userData[field];
        if (fieldValue && this.matchesQuery(fieldValue, normalizedQuery)) {
          results.push({
            id: doc.id,
            ...userData,
          });
          break; // Don't add the same user multiple times
        }
      }
    }

    return results;
  }

  private matchesQuery(fieldValue: string, query: string): boolean {
    const normalizedValue = fieldValue.toLowerCase();

    // Exact match
    if (normalizedValue === query) {
      return true;
    }

    // Starts with query
    if (normalizedValue.startsWith(query)) {
      return true;
    }

    // Contains query
    if (normalizedValue.includes(query)) {
      return true;
    }

    // Fuzzy matching for names (split by spaces)
    if (fieldValue.includes(" ")) {
      const words = normalizedValue.split(" ");
      for (const word of words) {
        if (word.startsWith(query) || word.includes(query)) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateContactConfidence(contact: any, query: string, searchFields: string[], recentContacts: string[]): number {
    let confidence = 0;
    const normalizedQuery = query.toLowerCase().trim();

    // Base confidence from field matching
    for (const field of searchFields) {
      const fieldValue = contact[field];
      if (fieldValue) {
        const normalizedValue = fieldValue.toLowerCase();

        // Exact match gets highest confidence
        if (normalizedValue === normalizedQuery) {
          confidence = Math.max(confidence, 0.95);
        }
        // Starts with gets high confidence
        else if (normalizedValue.startsWith(normalizedQuery)) {
          confidence = Math.max(confidence, 0.8);
        }
        // Contains gets medium confidence
        else if (normalizedValue.includes(normalizedQuery)) {
          confidence = Math.max(confidence, 0.6);
        }
        // Fuzzy match gets lower confidence
        else if (this.hasFuzzyMatch(normalizedValue, normalizedQuery)) {
          confidence = Math.max(confidence, 0.4);
        }
      }
    }

    // Boost confidence for recent contacts
    if (recentContacts.includes(contact.id)) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }

    // Boost confidence for users with complete profiles
    if (contact.displayName && contact.email) {
      confidence = Math.min(confidence + 0.05, 1.0);
    }

    return confidence;
  }

  private hasFuzzyMatch(value: string, query: string): boolean {
    // Simple fuzzy matching - check if most characters match
    if (value.includes(" ")) {
      const words = value.split(" ");
      for (const word of words) {
        if (word.length >= 3 && query.length >= 3) {
          const similarity = this.calculateSimilarity(word, query);
          if (similarity > 0.6) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private async getRecentContacts(userId: string): Promise<string[]> {
    try {
      // Simplified query without orderBy to avoid index requirement
      const conversationsSnapshot = await admin.firestore()
        .collection("conversations")
        .where("participants", "array-contains", userId)
        .limit(20) // Still get recent, but without ordering
        .get();

      // Sort in memory instead
      const conversations = conversationsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a: any, b: any) => {
          const aTime = a.lastMessageAt?.toMillis() || 0;
          const bTime = b.lastMessageAt?.toMillis() || 0;
          return bTime - aTime;
        });

      const recentContacts: string[] = [];
      for (const conversation of conversations) {
        const participants = (conversation as any).participants || [];
        for (const participantId of participants) {
          if (participantId !== userId && !recentContacts.includes(participantId)) {
            recentContacts.push(participantId);
          }
        }
      }

      return recentContacts;
    } catch (error) {
      logger.warn("Error getting recent contacts:", error);
      return [];
    }
  }

  private extractIdentifiers(contact: any): string[] {
    const identifiers: string[] = [];

    if (contact.displayName) identifiers.push(contact.displayName);
    if (contact.email) identifiers.push(contact.email);
    if (contact.phoneNumber) identifiers.push(contact.phoneNumber);

    return identifiers;
  }

  private async getLastContactTime(userId: string, contactId: string): Promise<string | null> {
    try {
      // Find conversation between users
      const conversation = await this.findConversationBetweenUsers(userId, contactId);
      if (!conversation) return null;

      return this.formatTimestamp(conversation.lastMessageAt);
    } catch (error) {
      logger.warn("Error getting last contact time:", error);
      return null;
    }
  }

  /**
   * Determine if clarification is needed based on contact results
   */
  private shouldRequestClarification(contacts: any[], query: string): {
    needed: boolean;
    reason?: string;
    options?: any[];
  } {
    logger.info("🔍 shouldRequestClarification analysis", {
      query: query,
      contactsCount: contacts.length,
      contacts: contacts.map((c: any) => ({
        id: c.id,
        name: c.name,
        confidence: c.confidence
      }))
    });

    // No contacts found
    if (contacts.length === 0) {
      logger.info("🔍 Clarification decision: No contacts found - no clarification needed");
      return {
        needed: false,
        reason: "No contacts found",
      };
    }

    // Single contact with high confidence - no clarification needed
    if (contacts.length === 1 && contacts[0].confidence >= 0.8) {
      logger.info("🔍 Clarification decision: Single high-confidence match - no clarification needed", {
        confidence: contacts[0].confidence,
        threshold: 0.8
      });
      return {
        needed: false,
        reason: "Single high-confidence match",
      };
    }

    // Multiple contacts with similar confidence scores
    if (contacts.length > 1) {
      const topTwo = contacts.slice(0, 2);
      const confidenceDiff = topTwo[0].confidence - topTwo[1].confidence;
      
      logger.info("🔍 Multiple contacts analysis", {
        topTwo: topTwo.map((c: any) => ({
          name: c.name,
          confidence: c.confidence
        })),
        confidenceDiff: confidenceDiff,
        threshold: 0.2
      });
      
      // If top two contacts have similar confidence (within 0.2), ask for clarification
      if (confidenceDiff < 0.2) {
        logger.info("🔍 Clarification decision: Multiple contacts with similar confidence - clarification needed");
        return {
          needed: true,
          reason: "Multiple contacts with similar confidence scores",
          options: contacts.slice(0, 5).map(contact => ({
            id: contact.id,
            title: contact.name,
            subtitle: contact.email,
            confidence: contact.confidence,
            metadata: {
              is_recent: contact.is_recent,
              last_contact: contact.last_contact,
            }
          })),
        };
      } else {
        logger.info("🔍 Clarification decision: Multiple contacts but clear winner - no clarification needed");
      }
    }

    // Single contact with low confidence
    if (contacts.length === 1 && contacts[0].confidence < 0.6) {
      logger.info("🔍 Clarification decision: Single low-confidence match - clarification needed", {
        confidence: contacts[0].confidence,
        threshold: 0.6
      });
      return {
        needed: true,
        reason: "Low confidence match - user should confirm",
        options: contacts.map(contact => ({
          id: contact.id,
          title: contact.name,
          subtitle: contact.email,
          confidence: contact.confidence,
          metadata: {
            is_recent: contact.is_recent,
            last_contact: contact.last_contact,
          }
        })),
      };
    }

    // Default: no clarification needed
    logger.info("🔍 Clarification decision: Default - clear best match found");
    return {
      needed: false,
      reason: "Clear best match found",
    };
  }
}
