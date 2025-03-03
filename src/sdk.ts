/**
 * This file serves as a bridge for MCP SDK imports.
 * Due to package export configuration in the SDK,
 * we need to explicitly import from the correct paths.
 * If SDK structure changes, update this file.
 */
export { Server, StdioServerTransport } from '@modelcontextprotocol/sdk/dist/esm/server';
export { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/dist/esm/shared';
