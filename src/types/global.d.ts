// Global declarations to solve potential circular dependency issues
declare global {
  enum ErrorCode {
    InvalidParams = 'invalid_params',
    InternalError = 'internal_error',
    MethodNotFound = 'method_not_found'
  }

  class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }

  // Path to the semgrep executable
  var semgrepExecutable: string;
}

export {};
