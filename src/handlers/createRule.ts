import fs from 'fs/promises';
import path from 'path';
import { ErrorCode, McpError } from '../sdk.js';
import { validateAbsolutePath } from '../utils/index.js';

interface CreateRuleParams {
  output_path: string;
  pattern: string;
  language: string;
  message: string;
  severity?: string;
  id?: string;
  metadata?: Record<string, any>;
}

/**
 * Handles a request to create a new Semgrep rule
 * @param {CreateRuleParams} params Request parameters
 * @returns {Promise<object>} Result of rule creation
 */
export async function handleCreateRule(params: CreateRuleParams): Promise<object> {
  // Validate parameters
  const outputPath = validateAbsolutePath(params.output_path, 'output_path');
  
  if (!params.pattern) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Pattern is required'
    );
  }
  
  if (!params.language) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Language is required'
    );
  }
  
  if (!params.message) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Message is required'
    );
  }
  
  const validSeverities = ['ERROR', 'WARNING', 'INFO'];
  const severity = (params.severity || 'WARNING').toUpperCase();
  
  if (!validSeverities.includes(severity)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid severity: ${params.severity}. Must be one of: ${validSeverities.join(', ')}`
    );
  }
  
  // Create rule object
  const ruleId = params.id || 'custom_rule';
  const rule = {
    rules: [
      {
        id: ruleId,
        message: params.message,
        severity: severity.toLowerCase(),
        languages: [params.language],
        pattern: params.pattern,
        metadata: params.metadata || {}
      }
    ]
  };
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error creating output directory: ${error.message}`
    );
  }
  
  // Write rule to file
  try {
    await fs.writeFile(outputPath, JSON.stringify(rule, null, 2));
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error writing rule file: ${error.message}`
    );
  }
  
  return {
    status: 'success',
    message: `Rule created successfully at ${outputPath}`,
    rule_id: ruleId,
    rule_path: outputPath
  };
}