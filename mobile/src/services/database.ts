/**
 * Database Service (Legacy)
 * 
 * This file now re-exports from the modular database structure
 * for backward compatibility. The actual implementation is split
 * into focused modules in the database/ directory.
 */

// Re-export all functions from the modular database service
export * from './database/index';