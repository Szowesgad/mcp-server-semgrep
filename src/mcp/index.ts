/**
 * Lightweight MCP Protocol Implementation
 * 
 * This is a custom implementation of the Model Context Protocol (MCP)
 * that replaces the external SDK dependency with a simpler, more focused approach.
 * 
 * Benefits:
 * - Reduced external dependencies
 * - Better maintainability 
 * - Focused implementation for Semgrep use case
 * - Simplified architecture
 */

import { Readable, Writable } from 'stream';

// ==================== Type Definitions ====================

export enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
  ValidationError = -32001,
}

export interface ServerOptions {
  capabilities?: {
    tools?: Record<string, unknown>;
  };
}

export interface ServerConfig {
  name: string;
  version: string;
  url?: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface ListToolsRequest {
  jsonrpc: "2.0";
  method: "list_tools";
  params: {};
  id: string | number;
}

export interface CallToolRequest {
  jsonrpc: "2.0";
  method: "call_tool";
  params: {
    name: string;
    arguments: Record<string, any>;
  };
  id: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ServerTransport {
  read(): Promise<string>;
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

// Type for JSON Schema
export interface JsonSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  [key: string]: any;
}

// ==================== Schema Validation ====================

// Simple JSON schema validator for basic validation
const validateSchema = (data: any, schema: JsonSchema): boolean => {
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null) return false;
    
    // Check required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in data)) return false;
      }
    }
    
    // Validate properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries<any>(schema.properties)) {
        if (key in data) {
          const valid = validateSchema(data[key], propSchema);
          if (!valid) return false;
        }
      }
    }
    
    return true;
  }
  
  if (schema.type === 'string') return typeof data === 'string';
  if (schema.type === 'number') return typeof data === 'number';
  if (schema.type === 'boolean') return typeof data === 'boolean';
  if (schema.type === 'array') {
    if (!Array.isArray(data)) return false;
    if (schema.items) {
      for (const item of data) {
        if (!validateSchema(item, schema.items)) return false;
      }
    }
    return true;
  }
  
  return true; // Default for types we don't validate
};

// ==================== Request Schemas ====================

export const ListToolsRequestSchema: JsonSchema = {
  type: 'object',
  properties: {
    jsonrpc: { type: 'string' },
    method: { type: 'string' },
    params: { type: 'object' },
    id: { type: 'string' }
  },
  required: ['jsonrpc', 'method', 'params', 'id']
};

export const CallToolRequestSchema: JsonSchema = {
  type: 'object',
  properties: {
    jsonrpc: { type: 'string' },
    method: { type: 'string' },
    params: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        arguments: { type: 'object' }
      },
      required: ['name', 'arguments']
    },
    id: { type: 'string' }
  },
  required: ['jsonrpc', 'method', 'params', 'id']
};

// ==================== Error Class ====================

export class McpError extends Error {
  code: number;
  data?: any;

  constructor(code: ErrorCode, message: string, data?: any) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
  }
}

// ==================== STDIO Transport ====================

export class StdioServerTransport implements ServerTransport {
  private stdin: Readable;
  private stdout: Writable;
  private buffer: string = '';
  private resolveRead: ((value: string) => void) | null = null;

  constructor() {
    this.stdin = process.stdin;
    this.stdout = process.stdout;
    
    this.stdin.on('data', (data) => {
      const chunk = data.toString();
      this.buffer += chunk;
      
      if (this.resolveRead && this.buffer.includes('\n')) {
        const lines = this.buffer.split('\n');
        const line = lines[0];
        this.buffer = lines.slice(1).join('\n');
        this.resolveRead(line);
        this.resolveRead = null;
      }
    });
  }

  async read(): Promise<string> {
    if (this.buffer.includes('\n')) {
      const lines = this.buffer.split('\n');
      const line = lines[0];
      this.buffer = lines.slice(1).join('\n');
      return line;
    }
    
    return new Promise<string>((resolve) => {
      this.resolveRead = resolve;
    });
  }

  async write(data: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.stdout.write(data + '\n', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close(): Promise<void> {
    // No need to explicitly close stdio
    return Promise.resolve();
  }
}

// ==================== MCP Server ====================

export class Server {
  private config: ServerConfig;
  private options: ServerOptions;
  private requestHandlers: Map<JsonSchema, Function> = new Map();
  private transport: ServerTransport | null = null;
  private running: boolean = false;

  public onerror: ((error: any) => void) | null = null;

  constructor(config: ServerConfig, options: ServerOptions = {}) {
    this.config = config;
    this.options = options;
  }

  setRequestHandler(schema: JsonSchema, handler: Function): void {
    this.requestHandlers.set(schema, handler);
  }

  async connect(transport: ServerTransport): Promise<void> {
    this.transport = transport;
    this.running = true;
    this.processRequests().catch((err) => {
      if (this.onerror) this.onerror(err);
      else console.error('Unhandled MCP error:', err);
    });
  }

  async close(): Promise<void> {
    this.running = false;
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  private async processRequests(): Promise<void> {
    if (!this.transport) throw new Error('Transport not connected');

    while (this.running) {
      try {
        const line = await this.transport.read();
        if (!line.trim()) continue;
        
        console.error(`[MCP DEBUG] Received request: ${line}`);

        let request;
        try {
          request = JSON.parse(line);
          console.error(`[MCP DEBUG] Parsed request: ${JSON.stringify(request)}`);
        } catch (e) {
          console.error(`[MCP DEBUG] JSON parse error: ${e}`);
          await this.sendError(null, ErrorCode.ParseError, 'Invalid JSON');
          continue;
        }

        // Process the request
        await this.handleRequest(request);
      } catch (error) {
        console.error('[MCP DEBUG] Error processing request:', error);
        if (this.onerror) this.onerror(error);
      }
    }
  }

  private async handleRequest(request: any): Promise<void> {
    const id = request.hasOwnProperty('id') ? request.id : null;

    if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
      await this.sendError(id, ErrorCode.InvalidRequest, 'Invalid JSON-RPC request');
      return;
    }

    try {
      let handler: Function | undefined;
      let handlerSchema: JsonSchema | undefined;

      switch (request.method) {
        case 'initialize':
          await this.sendResult(id, {
            protocolVersion: request.params.protocolVersion,
            serverInfo: {
              name: this.config.name,
              version: this.config.version
            },
            capabilities: this.options.capabilities || {}
          });
          return;

        case 'notifications/cancelled':
          console.error(`[MCP DEBUG] Cancelled notification received: ${JSON.stringify(request)}`);
          await this.sendResult(id, { cancelled: true });
          return;

        case 'list_tools':
          handler = this.requestHandlers.get(ListToolsRequestSchema);
          handlerSchema = ListToolsRequestSchema;
          break;

        case 'call_tool':
          handler = this.requestHandlers.get(CallToolRequestSchema);
          handlerSchema = CallToolRequestSchema;
          break;

        default:
          await this.sendError(id, ErrorCode.MethodNotFound, `Method ${request.method} not found`);
          return;
      }

      if (!handler || !handlerSchema) {
        await this.sendError(id, ErrorCode.MethodNotFound, `Handler not found for method ${request.method}`);
        return;
      }

      if (!validateSchema(request, handlerSchema)) {
        await this.sendError(id, ErrorCode.InvalidParams, 'Invalid parameters');
        return;
      }

      const result = await handler(request);
      await this.sendResult(id, result);
    } catch (error) {
      console.error(`[MCP DEBUG] Exception handling request: ${error}`);
      if (error instanceof McpError) {
        await this.sendError(id, error.code, error.message, error.data);
      } else {
        await this.sendError(id, ErrorCode.InternalError, 'Internal error', error);
      }
    }
  }

  public async sendProgressNotification(progressMessage: string): Promise<void> {
    if (!this.transport) throw new Error('Transport not connected');

    const notification = {
      jsonrpc: '2.0',
      method: 'progressNotification',
      params: { message: progressMessage },
    };

    console.error(`[MCP DEBUG] Sending progress notification: ${JSON.stringify(notification)}`);
    await this.transport.write(JSON.stringify(notification));
  }

  private async sendResult(id: string | number | null, result: any): Promise<void> {
    if (!this.transport) throw new Error('Transport not connected');

    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result
    };

    console.error(`[MCP DEBUG] Sending response: ${JSON.stringify(response)}`);
    await this.transport.write(JSON.stringify(response));
  }

  private async sendError(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): Promise<void> {
    if (!this.transport) throw new Error('Transport not connected');

    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };

    console.error(`[MCP DEBUG] Sending error: ${JSON.stringify(response)}`);
    await this.transport.write(JSON.stringify(response));
  }
}