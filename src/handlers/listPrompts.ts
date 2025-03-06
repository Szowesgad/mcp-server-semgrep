import { ErrorCode, McpError } from '../sdk.js';

interface ListPromptsParams {
  // No parameters expected as per the logs
}

/**
 * Handles a request to list available prompts
 * @param {ListPromptsParams} params Request parameters
 * @returns {Promise<object>} List of available prompts
 */
export async function handleListPrompts(params: ListPromptsParams): Promise<object> {
  try {
    // Return a placeholder response with empty prompts array
    // This can be expanded later with actual prompts if needed
    return {
      status: 'success',
      prompts: [],
      count: 0
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Error listing prompts: ${error.message}`
    );
  }
}