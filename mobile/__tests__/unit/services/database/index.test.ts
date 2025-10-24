/**
 * Database Service Test Suite
 * 
 * Comprehensive test suite for database operations split into focused modules:
 * - Message Operations: CRUD operations for messages
 * - Conversation Operations: CRUD operations for conversations  
 * - User Operations: CRUD operations for users
 * - Data Integrity: Constraints, concurrent operations, and utilities
 */

// Import all test modules to ensure they run as part of the test suite
import './message-operations.test';
import './conversation-operations.test';
import './user-operations.test';
import './data-integrity.test';
