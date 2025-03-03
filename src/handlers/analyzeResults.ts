import fs from 'fs/promises';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { validateAbsolutePath } from '../utils/index.js';

interface AnalyzeResultsParams {
  results_file: string;
}

interface SemgrepResult {
  results: {
    path: string;
    check_id: string;
    start: { line: number; col: number };
    end: { line: number; col: number };
    extra: {
      message: string;
      metadata: any;
      severity: string;
      lines: string;
    };
  }[];
  errors: any[];
  stats: any;
}

/**
 * Analyzes Semgrep scan results and provides insights
 * 
 * @param {AnalyzeResultsParams} params Request parameters
 * @returns {Promise<object>} Analysis of results
 */
export async function handleAnalyzeResults(params: AnalyzeResultsParams): Promise<object> {
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
  
  // Analyze results
  const findings = results.results;
  const errors = results.errors || [];
  
  // Group findings by severity
  const severityGroups: Record<string, number> = {};
  findings.forEach(finding => {
    const severity = finding.extra.severity || 'unknown';
    severityGroups[severity] = (severityGroups[severity] || 0) + 1;
  });
  
  // Group findings by rule
  const ruleGroups: Record<string, number> = {};
  findings.forEach(finding => {
    ruleGroups[finding.check_id] = (ruleGroups[finding.check_id] || 0) + 1;
  });
  
  // Group findings by file
  const fileGroups: Record<string, number> = {};
  findings.forEach(finding => {
    fileGroups[finding.path] = (fileGroups[finding.path] || 0) + 1;
  });
  
  // Get top 5 most triggered rules
  const topRules = Object.entries(ruleGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));
  
  // Get top 5 files with most findings
  const topFiles = Object.entries(fileGroups)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, count]) => ({ file, count }));
  
  // Provide analysis summary
  return {
    total_findings: findings.length,
    errors_count: errors.length,
    severity_distribution: severityGroups,
    top_triggered_rules: topRules,
    top_affected_files: topFiles,
    errors: errors.length > 0 ? errors : undefined,
    stats: results.stats
  };
}
