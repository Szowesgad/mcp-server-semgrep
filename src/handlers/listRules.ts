import { executeSemgrepCommand } from '../utils/index.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk';

interface ListRulesParams {
  language?: string;
  registry?: string;
  timeout?: number;
}

/**
 * Handles a request to list available Semgrep rules
 * @param {ListRulesParams} params Request parameters
 * @returns {Promise<object>} List of available rules
 */
export async function handleListRules(params: ListRulesParams): Promise<object> {
  // Build command arguments
  const args = ['--list'];
  
  // Add JSON output format
  args.push('--json');

  // Add language filter if specified
  if (params.language) {
    args.push('--lang', params.language);
  }

  // Add registry spec if provided (defaults to r/all)
  const registry = params.registry || 'r/all';
  args.push(registry);

  try {
    // Execute semgrep command
    const { stdout, stderr } = await executeSemgrepCommand(args, params.timeout);
    
    // Parse results as JSON
    let rules: object;
    try {
      rules = JSON.parse(stdout);
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error parsing Semgrep output: ${error}`
      );
    }

    return {
      status: 'success',
      rules
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    // Handle semgrep execution errors
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing Semgrep: ${error.message}`
    );
  }
}