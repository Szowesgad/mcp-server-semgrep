import path from 'path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { BASE_ALLOWED_PATH } from '../config.js';

/**
 * Validates an absolute path to ensure it's safe to use
 * @param {string} pathToValidate Path to validate
 * @param {string} paramName Parameter name for error messages
 * @returns {string} Normalized path if valid
 * @throws {McpError} If path is invalid or outside allowed directory
 */
export function validateAbsolutePath(pathToValidate: string, paramName: string): string {
  if (!path.isAbsolute(pathToValidate)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${paramName} must be an absolute path. Received: ${pathToValidate}`
    );
  }

  // Normalize path and ensure no path traversal is possible
  const normalizedPath = path.normalize(pathToValidate);
  
  // Check if normalized path is still absolute
  if (!path.isAbsolute(normalizedPath)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${paramName} contains invalid path traversal sequences`
    );
  }

  // Check if path is within allowed base directory
  if (!normalizedPath.startsWith(BASE_ALLOWED_PATH)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${paramName} must be within the MCP directory (${BASE_ALLOWED_PATH})`
    );
  }

  return normalizedPath;
}

/**
 * Validates semgrep configuration parameter
 * @param {string} config Configuration parameter
 * @returns {string} Validated configuration
 */
export function validateConfig(config: string): string {
  // Allow registry references (p/ci, p/security, etc.)
  if (config.startsWith('p/') || config === 'auto') {
    return config;
  }
  
  // Otherwise, treat as path and validate
  return validateAbsolutePath(config, 'config');
}
