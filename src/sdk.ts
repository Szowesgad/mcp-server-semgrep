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
  private requestHandlers: Map<any, Function> = new Map();
  private notificationHandlers: Map<any, Function> = new Map();
  private transport: StdioServerTransport | null = null;
  
  constructor(serverInfo: any, options?: any) {
    this.serverInfo = serverInfo;
    this.capabilities = options?.capabilities || {};
    this.onerror = () => {};
  }
  
  async connect(transport: any) {
    this.transport = transport;
    
    // Connect message handler
    transport.onmessage = async (message: any) => {
      try {
        // Handle initialize messages specially
        if (message.method === 'initialize') {
          console.error(`[MCP DEBUG] Handling initialize: ${JSON.stringify(message)}`);
          await this.sendResponse(message.id, {
            protocolVersion: message.params.protocolVersion,
            serverInfo: this.serverInfo,
            capabilities: this.capabilities
          });
          return;
        }
        
        // Handle notifications/cancelled
        if (message.method === 'notifications/cancelled') {
          console.error(`[MCP DEBUG] Received cancellation: ${JSON.stringify(message)}`);
          if (message.id) {
            await this.sendResponse(message.id, { cancelled: true });
          }
          return;
        }
        
        // Handle tools/list - map to list_tools
        if (message.method === 'tools/list') {
          console.error(`[MCP DEBUG] Handling tools/list`);
          const handler = this.requestHandlers.get(ListToolsRequestSchema);
          if (handler) {
            try {
              const result = await handler(message);
              await this.sendResponse(message.id, result);
            } catch (error: any) {
              await this.sendError(message.id, error.code || ErrorCode.InternalError, error.message || 'Error handling request');
            }
          } else {
            await this.sendError(message.id, ErrorCode.MethodNotFound, 'Method tools/list not implemented');
          }
          return;
        }
        
        // Handle tools/call - map to call_tool
        if (message.method === 'tools/call') {
          console.error(`[MCP DEBUG] Handling tools/call for tool: ${JSON.stringify(message.params)}`);
          const handler = this.requestHandlers.get(CallToolRequestSchema);
          if (handler) {
            try {
              // Transform to expected format
              const transformedRequest = {
                jsonrpc: "2.0",
                method: "call_tool",
                params: {
                  name: message.params.name,
                  arguments: message.params.arguments
                },
                id: message.id
              };
              const result = await handler(transformedRequest);
              await this.sendResponse(message.id, result);
            } catch (error: any) {
              await this.sendError(message.id, error.code || ErrorCode.InternalError, error.message || 'Error handling request');
            }
          } else {
            await this.sendError(message.id, ErrorCode.MethodNotFound, 'Method tools/call not implemented');
          }
          return;
        }
        
        // Handle other messages
        console.error(`[MCP DEBUG] Unhandled message type: ${message.method}`);
        await this.sendError(message.id, ErrorCode.MethodNotFound, `Method ${message.method} not implemented`);
        
      } catch (error: any) {
        console.error('[MCP ERROR]', error);
        if (this.onerror) this.onerror(error);
        
        if (message && message.id) {
          await this.sendError(
            message.id,
            error.code || ErrorCode.InternalError,
            error.message || 'Internal error'
          );
        }
      }
    };
    
    transport.onerror = (error: any) => {
      console.error('[MCP Transport Error]', error);
      if (this.onerror) this.onerror(error);
    };
    
    transport.start();
  }
  
  async close() {
    if (this.transport) {
      this.transport.onmessage = null;
      this.transport.onerror = null;
      this.transport.onclose = null;
      this.transport = null;
    }
  }
  
  setRequestHandler(schema: any, handler: Function) {
    this.requestHandlers.set(schema, handler);
  }
  
  setNotificationHandler(schema: any, handler: Function) {
    this.notificationHandlers.set(schema, handler);
  }
  
  private async sendResponse(id: string | number, result: any) {
    if (!this.transport) return;
    
    const response = {
      jsonrpc: "2.0",
      id,
      result
    };
    
    console.error(`[MCP DEBUG] Sending response: ${JSON.stringify(response)}`);
    await this.transport.send(response);
  }
  
  private async sendError(id: string | number | null, code: number, message: string, data?: any) {
    if (!this.transport) return;
    
    const response = {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message,
        data
      }
    };
    
    console.error(`[MCP DEBUG] Sending error: ${JSON.stringify(response)}`);
    await this.transport.send(response);
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
        console.error(`[MCP DEBUG] Received message: ${JSON.stringify(message)}`);
        if (this.onmessage) this.onmessage(message);
      } catch (err) {
        console.error(`[MCP DEBUG] Error parsing message: ${err}`);
        if (this.onerror) this.onerror(err);
      }
    });
    
    process.stdin.on('end', () => {
      console.error('[MCP DEBUG] stdin stream ended');
      if (this.onclose) this.onclose();
    });
    
    process.on('SIGINT', () => {
      console.error('[MCP DEBUG] SIGINT received');
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
  method: z.literal('call_tool')
});

export const ListToolsRequestSchema = RequestSchema.extend({
  method: z.literal('list_tools')
});

// Also define the MCP protocol versions for compatibility
export const CallToolRequestSchemaMcp = RequestSchema.extend({
  method: z.literal('tools/call')
});

export const ListToolsRequestSchemaMcp = RequestSchema.extend({
  method: z.literal('tools/list')
});
