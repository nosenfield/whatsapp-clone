/**
 * Environment Configuration Service
 *
 * Handles environment variables for both local development (.env) and production (secrets)
 * This service provides a unified interface for accessing environment variables
 * across different deployment environments.
 */

import * as logger from "firebase-functions/logger";

// Environment variable cache
const envCache: Record<string, string | undefined> = {};

/**
 * Get environment variable with fallback support
 * 
 * In production (Firebase Functions), this will use secrets
 * In local development, this will use .env files
 * 
 * @param key - Environment variable key
 * @param fallback - Fallback value if not found
 * @returns Environment variable value or fallback
 */
export function getEnvVar(key: string, fallback?: string): string {
  // Check cache first
  if (envCache[key] !== undefined) {
    return envCache[key] || fallback || "";
  }

  // Try to get from process.env (works in both local and production)
  const value = process.env[key];
  
  if (value) {
    envCache[key] = value;
    logger.debug(`Environment variable loaded: ${key}`);
    return value;
  }

  // Log warning if no fallback provided
  if (!fallback) {
    logger.warn(`Environment variable not found: ${key}`);
  }

  envCache[key] = fallback;
  return fallback || "";
}

/**
 * Get required environment variable (throws error if not found)
 * 
 * @param key - Environment variable key
 * @returns Environment variable value
 * @throws Error if variable not found
 */
export function getRequiredEnvVar(key: string): string {
  const value = getEnvVar(key);
  
  if (!value) {
    const error = `Required environment variable not found: ${key}`;
    logger.error(error);
    throw new Error(error);
  }
  
  return value;
}

/**
 * Check if environment variable exists
 * 
 * @param key - Environment variable key
 * @returns True if variable exists and has a value
 */
export function hasEnvVar(key: string): boolean {
  return !!getEnvVar(key);
}

/**
 * Environment variable keys used by the application
 */
export const ENV_KEYS = {
  OPENAI_API_KEY: "OPENAI_API_KEY",
  LANGSMITH_API_KEY: "LANGSMITH_API_KEY",
  LANGSMITH_ENDPOINT: "LANGSMITH_ENDPOINT",
  PINECONE_API_KEY: "PINECONE_API_KEY",
  NODE_ENV: "NODE_ENV",
} as const;

/**
 * Get OpenAI API key
 */
export function getOpenAIApiKey(): string {
  return getRequiredEnvVar(ENV_KEYS.OPENAI_API_KEY);
}

/**
 * Get LangSmith API key (optional)
 */
export function getLangSmithApiKey(): string | null {
  const key = getEnvVar(ENV_KEYS.LANGSMITH_API_KEY);
  return key || null;
}

/**
 * Get LangSmith endpoint (with default)
 */
export function getLangSmithEndpoint(): string {
  return getEnvVar(ENV_KEYS.LANGSMITH_ENDPOINT, "https://api.smith.langchain.com");
}

/**
 * Get Pinecone API key (optional)
 */
export function getPineconeApiKey(): string | null {
  const key = getEnvVar(ENV_KEYS.PINECONE_API_KEY);
  return key || null;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvVar(ENV_KEYS.NODE_ENV, "development") === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return !isProduction();
}

/**
 * Validate all required environment variables
 * 
 * @returns Object with validation results
 */
export function validateEnvironment(): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const required = [ENV_KEYS.OPENAI_API_KEY];
  
  for (const key of required) {
    if (!hasEnvVar(key)) {
      missing.push(key);
    }
  }

  // Optional variables with warnings
  const optional = [
    { key: ENV_KEYS.LANGSMITH_API_KEY, warning: "LangSmith logging disabled" },
    { key: ENV_KEYS.PINECONE_API_KEY, warning: "Pinecone vector search disabled" },
  ];

  for (const { key, warning } of optional) {
    if (!hasEnvVar(key)) {
      warnings.push(warning);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Log environment configuration status
 */
export function logEnvironmentStatus(): void {
  const validation = validateEnvironment();
  
  if (validation.valid) {
    logger.info("✅ Environment configuration valid");
  } else {
    logger.error("❌ Environment configuration invalid", {
      missing: validation.missing,
    });
  }

  if (validation.warnings.length > 0) {
    logger.warn("⚠️ Environment warnings", {
      warnings: validation.warnings,
    });
  }

  logger.info("Environment status", {
    nodeEnv: getEnvVar(ENV_KEYS.NODE_ENV, "development"),
    hasOpenAI: hasEnvVar(ENV_KEYS.OPENAI_API_KEY),
    hasLangSmith: hasEnvVar(ENV_KEYS.LANGSMITH_API_KEY),
    hasPinecone: hasEnvVar(ENV_KEYS.PINECONE_API_KEY),
  });
}
