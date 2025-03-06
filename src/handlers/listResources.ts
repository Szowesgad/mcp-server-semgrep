import { ErrorCode, McpError } from '../sdk.js';

interface ListResourcesParams {
  // No parameters expected as per the logs
}

/**
 * Handles a request to list available resources
 * @param {ListResourcesParams} params Request parameters
 * @returns {Promise<object>} List of available resources
 */
export async function handleListResources(params: ListResourcesParams): Promise<object> {
  try {
    // Return a placeholder response with empty resources array
    // This can be expanded later with actual resources if needed
    return {
      status: 'success',
      resources: [],
      count: 0
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Error listing resources: ${error.message}`
    );
  }
}