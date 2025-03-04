/**
 * MCP Protocol Bridge
 * 
 * This file serves as a compatibility layer between the previous SDK-based implementation
 * and our new custom MCP implementation. This allows for a smooth transition
 * without changing the rest of the codebase.
 * 
 * Benefits:
 * - No external SDK dependency
 * - Better control over protocol implementation
 * - Simplified imports
 * - Improved maintainability
 */

// Export all components from our custom MCP implementation
export {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from './mcp/index.js';
