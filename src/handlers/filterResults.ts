import fs from 'fs/promises';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { validateAbsolutePath } from '../utils/index.js';

interface FilterResultsParams {
  results_file: string;
  severity?: string;
  rule_id?: string;
  path_pattern?: string;
  language?: string;
  message_pattern?: string;
  output_file?: string;
}

interface SemgrepResult {
  results: any[];
  errors: any[];
  stats: any;
}

/**
 * Filters Semgrep scan results by various criteria
 * 
 * @param {FilterResultsParams} params Request parameters
 * @returns {Promise<object>} Filtered results
 */
export async function handleFilterResults(params: FilterResultsParams): Promise<object> {
  // Validate the results file path
  const resultsFilePath = validateAbsolutePath(params.results_file, 'results_file');
  
  // Read results file
  let fileContent: string;
  try {
    fileContent = await fs.readFile(resultsFilePath, 'utf-8');
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading results file: ${error.message}`
    );
  }
  
  // Parse JSON results
  let results: SemgrepResult;
  try {
    results = JSON.parse(fileContent);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Results file contains invalid JSON'
    );
  }
  
  // Check if results have the expected structure
  if (!results.results || !Array.isArray(results.results)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Results file has an invalid format (missing results array)'
    );
  }
  
  let filteredResults = [...results.results];
  
  // Filter by severity if specified
  if (params.severity) {
    const severity = params.severity.toUpperCase();
    filteredResults = filteredResults.filter(result => 
      result.extra.severity && result.extra.severity.toUpperCase() === severity
    );
  }
  
  // Filter by rule ID if specified
  if (params.rule_id) {
    filteredResults = filteredResults.filter(result => 
      result.check_id === params.rule_id
    );
  }
  
  // Filter by file path pattern if specified
  if (params.path_pattern) {
    try {
      const pathRegex = new RegExp(params.path_pattern);
      filteredResults = filteredResults.filter(result => 
        pathRegex.test(result.path)
      );
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid path pattern regex: ${error}`
      );
    }
  }
  
  // Filter by language if specified
  if (params.language) {
    filteredResults = filteredResults.filter(result => {
      // Extract language info from check_id or metadata
      const language = result.extra.metadata?.language || 
                      result.check_id.split('.')[0];
      
      return language && language.toLowerCase() === params.language?.toLowerCase();
    });
  }
  
  // Filter by message pattern if specified
  if (params.message_pattern) {
    try {
      const messageRegex = new RegExp(params.message_pattern);
      filteredResults = filteredResults.filter(result => 
        result.extra.message && messageRegex.test(result.extra.message)
      );
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid message pattern regex: ${error}`
      );
    }
  }
  
  // Create filtered results object
  const filteredResultsObj = {
    results: filteredResults,
    errors: results.errors,
    stats: {
      ...results.stats,
      filtered_findings_count: filteredResults.length
    }
  };
  
  // Write to output file if specified
  if (params.output_file) {
    const outputPath = validateAbsolutePath(params.output_file, 'output_file');
    
    try {
      await fs.writeFile(outputPath, JSON.stringify(filteredResultsObj, null, 2), 'utf-8');
      
      return {
        status: 'success',
        message: `Filtered results saved to ${outputPath}`,
        filtered_count: filteredResults.length,
        original_count: results.results.length,
        output_file: outputPath
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error writing output file: ${error.message}`
      );
    }
  }
  
  return filteredResultsObj;
}
