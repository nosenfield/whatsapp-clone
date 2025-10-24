/**
 * Enhanced AI Command Service - Contact Operations
 * 
 * Contact-related operations for the enhanced AI command system.
 */

import { EnhancedAppContext } from './types';
import { EnhancedAICommandCore } from './core';

/**
 * Contact operations for enhanced AI commands
 */
export class ContactOperations {
  constructor(private core: EnhancedAICommandCore) {}

  /**
   * Lookup contacts
   */
  async lookupContacts(
    params: {
      user_id: string;
      query: string;
      limit?: number;
      include_recent?: boolean;
      search_fields?: string[];
      min_confidence?: number;
      exclude_self?: boolean;
    },
    appContext: EnhancedAppContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const result = await this.core.processCommand(
        `Find contacts matching "${params.query}"`,
        appContext,
        { enableToolChaining: false }
      );

      if (result.success && result.result) {
        return {
          success: true,
          data: result.result,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to lookup contacts',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}
