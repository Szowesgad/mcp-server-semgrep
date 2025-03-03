declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(config: any, options: any);
    setRequestHandler(schema: any, handler: any): void;
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    onerror: (error: any) => void;
  }

  export class StdioServerTransport {
    constructor();
  }

  export enum ErrorCode {
    InvalidParams = 'invalid_params',
    InternalError = 'internal_error',
    MethodNotFound = 'method_not_found'
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }

  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
}
