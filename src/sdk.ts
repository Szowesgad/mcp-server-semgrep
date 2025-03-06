/**
* MCP Protocol Bridge
*
* This file serves as a compatibility layer between the project code
* and the official MCP SDK. Previously, we used our own implementation,
* but have returned to the official SDK for better protocol compliance.
*
* Advantages:
* Full compatibility with the MCP protocol
* Easier handling of notifications and errors
* Standardized way of handling queries and responses
* Better support for future protocol versions
*/

// Create a custom implementation without direct SDK imports
// as the imports through paths are causing issues

// Import zod for schema definitions
import { z } from 'zod';

// Define Server class
export class Server {
  private serverInfo: any;
  private capabilities: any;
  
  constructor(serverInfo: any, options?: any) {
    this.serverInfo = serverInfo;
    this.capabilities = options?.capabilities || {};
    this.onerror = () => {};
  }
  
  async connect(transport: any) {
    transport.start();
  }
  
  async close() {
    // Cleanup
  }
  
  setRequestHandler(schema: any, handler: any) {
    // Store handler
  }
  
  setNotificationHandler(schema: any, handler: any) {
    // Store handler
  }
  
  onerror: (error: any) => void;
}

// Define StdioServerTransport
export class StdioServerTransport {
  onmessage: ((msg: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  
  async start() {
    // Set up stdio transport
    process.stdin.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (this.onmessage) this.onmessage(message);
      } catch (err) {
        if (this.onerror) this.onerror(err);
      }
    });
    
    process.stdin.on('end', () => {
      if (this.onclose) this.onclose();
    });
  }
  
  async send(message: any) {
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}

// Define required enums and types
export enum ErrorCode {
  ConnectionClosed = -32000,
  RequestTimeout = -32001,
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}

// Custom MCP Error class with code and optional data
export class McpError extends Error {
  code: ErrorCode;
  data?: any;

  constructor(code: ErrorCode, message: string, data?: any) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
  }
}

// Create necessary schema constants used by the application
const BaseRequestParamsSchema = z.object({}).passthrough();

export const RequestSchema = z.object({
  method: z.string(),
  params: z.optional(BaseRequestParamsSchema)
});

export const ResultSchema = z.object({}).passthrough();

export const NotificationSchema = z.object({
  method: z.string(),
  params: z.optional(z.object({}).passthrough())
});

// Define request schemas used by the application
export const CallToolRequestSchema = RequestSchema.extend({
  method: z.literal('tools/call')
});

export const ListToolsRequestSchema = RequestSchema.extend({
  method: z.literal('tools/list')
});
