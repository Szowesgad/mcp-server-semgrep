import fs from 'fs/promises';
import { ErrorCode, McpError } from '../sdk.js';
import { validateAbsolutePath } from '../utils/index.js';

interface FilterResultsParams {
  results_file: string;
  severity?: string;
  rule_id?: string;
  path_pattern?: string;
  language?: string;
  message_pattern?: string;
}

/**
 * Handles a request to filter Semgrep scan results by various criteria
 * @param {FilterResultsParams} params Request parameters
 * @returns {Promise<object>} Filtered results
 */
export async function handleFilterResults(params: FilterResultsParams): Promise<object> {
  // Validate parameters
  const resultsFile = validateAbsolutePath(params.results_file, 'results_file');
  
  // Read results file
  let resultsContent: string;
  try {
    resultsContent = await fs.readFile(resultsFile, 'utf8');
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading results file: ${error.message}`
    );
  }
  
  // Parse results as JSON
  let results: any;
  try {
    results = JSON.parse(resultsContent);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error parsing results file: ${error}`
    );
  }
  
  // Extract findings
  let findings = results.results || [];
  
  // Filter by severity
  if (params.severity) {
    const severity = params.severity.toLowerCase();
    findings = findings.filter((finding: any) => 
      (finding.extra.severity || '').toLowerCase() === severity);
  }
  
  // Filter by rule ID
  if (params.rule_id) {
    findings = findings.filter((finding: any) => 
      finding.check_id === params.rule_id);
  }
  
  // Filter by file path pattern
  if (params.path_pattern) {
    try {
      const pathRegex = new RegExp(params.path_pattern, 'i');
      findings = findings.filter((finding: any) => 
        pathRegex.test(finding.path));
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid path pattern regex: ${error}`
      );
    }
  }
  
  // Filter by language
  if (params.language) {
    const language = params.language.toLowerCase();
    findings = findings.filter((finding: any) => 
      (finding.extra.metadata.language || '').toLowerCase() === language);
  }
  
  // Filter by message pattern
  if (params.message_pattern) {
    try {
      const messageRegex = new RegExp(params.message_pattern, 'i');
      findings = findings.filter((finding: any) => 
        messageRegex.test(finding.extra.message));
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid message pattern regex: ${error}`
      );
    }
  }
  
  // Return filtered results
  return {
    results: findings,
    metrics: {
      total_findings: findings.length,
      filter_criteria: {
        severity: params.severity,
        rule_id: params.rule_id,
        path_pattern: params.path_pattern,
        language: params.language,
        message_pattern: params.message_pattern
      }
    }
  };
}