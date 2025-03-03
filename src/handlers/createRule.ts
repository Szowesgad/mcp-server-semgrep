import fs from 'fs/promises';
import path from 'path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/dist/esm/types.js';
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
  // Validate output path
  const outputPath = validateAbsolutePath(params.output_path, 'output_path');
  
  // Validate required parameters
  if (!params.pattern) {
    throw new McpError(ErrorCode.InvalidParams, 'Pattern is required');
  }
  if (!params.language) {
    throw new McpError(ErrorCode.InvalidParams, 'Language is required');
  }
  if (!params.message) {
    throw new McpError(ErrorCode.InvalidParams, 'Message is required');
  }
  
  // Normalize severity to uppercase
  const severity = (params.severity || 'WARNING').toUpperCase();
  if (!['ERROR', 'WARNING', 'INFO'].includes(severity)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Severity must be one of: ERROR, WARNING, INFO'
    );
  }
  
  // Generate rule ID if not provided
  const ruleId = params.id || `custom-rule-${Date.now()}`;
  
  // Create rule YAML content
  const ruleYaml = `rules:
  - id: ${ruleId}
    pattern: ${params.pattern}
    message: ${params.message}
    languages: [${params.language}]
    severity: ${severity}
${params.metadata ? `    metadata:\n${Object.entries(params.metadata).map(([key, value]) => `      ${key}: ${value}`).join('\n')}` : ''}
`;
  
  // Ensure directory exists
  const outputDir = path.dirname(outputPath);
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error creating output directory: ${error.message}`
    );
  }
  
  // Write the rule file
  try {
    await fs.writeFile(outputPath, ruleYaml, 'utf-8');
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error writing rule file: ${error.message}`
    );
  }
  
  return {
    status: 'success',
    message: `Rule '${ruleId}' created successfully`,
    rule_id: ruleId,
    path: outputPath,
    content: ruleYaml
  };
}