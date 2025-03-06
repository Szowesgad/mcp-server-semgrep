import { executeSemgrepCommand } from '../utils/index.js';
import { ErrorCode, McpError } from '../sdk.js';

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
  // Build command arguments for listing supported languages
  const args = ['show', 'supported-languages'];
  
  try {
    // Execute semgrep command
    const { stdout, stderr } = await executeSemgrepCommand(args, params.timeout);
    
    // Parse supported languages list
    const languagesOutput = stdout.trim();
    const languagesMatch = languagesOutput.match(/supported languages are: (.*)/);
    
    if (!languagesMatch || !languagesMatch[1]) {
      throw new McpError(
        ErrorCode.InternalError,
        `Unable to parse supported languages from output: ${stdout}`
      );
    }
    
    // Extract languages
    const languages = languagesMatch[1].split(', ').sort();
    
    // Filter by language if specified
    let filteredLanguages = languages;
    if (params.language) {
      filteredLanguages = languages.filter(lang => 
        lang.toLowerCase().includes(params.language!.toLowerCase())
      );
    }
    
    return {
      status: 'success',
      languages: filteredLanguages,
      count: filteredLanguages.length
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