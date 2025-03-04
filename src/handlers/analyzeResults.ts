import fs from 'fs/promises';
import { ErrorCode, McpError } from '../sdk.js';
import { validateAbsolutePath } from '../utils/index.js';

interface AnalyzeResultsParams {
  results_file: string;
}

/**
 * Handles a request to analyze Semgrep scan results
 * @param {AnalyzeResultsParams} params Request parameters
 * @returns {Promise<object>} Analysis of scan results
 */
export async function handleAnalyzeResults(params: AnalyzeResultsParams): Promise<object> {
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
  
  // Extract relevant data from results
  const findings = results.results || [];
  const errors = results.errors || [];
  
  // Count findings by severity
  const severityCounts: Record<string, number> = {};
  findings.forEach((finding: any) => {
    const severity = finding.extra.severity || 'unknown';
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
  });
  
  // Count findings by rule id
  const ruleCounts: Record<string, number> = {};
  findings.forEach((finding: any) => {
    const ruleId = finding.check_id || 'unknown';
    ruleCounts[ruleId] = (ruleCounts[ruleId] || 0) + 1;
  });
  
  // Count findings by language
  const languageCounts: Record<string, number> = {};
  findings.forEach((finding: any) => {
    const language = finding.extra.metadata.language || 'unknown';
    languageCounts[language] = (languageCounts[language] || 0) + 1;
  });
  
  // Count findings by file
  const fileCounts: Record<string, number> = {};
  findings.forEach((finding: any) => {
    const file = finding.path || 'unknown';
    fileCounts[file] = (fileCounts[file] || 0) + 1;
  });
  
  // Generate analysis summary
  return {
    total_findings: findings.length,
    total_errors: errors.length,
    severity_distribution: severityCounts,
    rule_distribution: ruleCounts,
    language_distribution: languageCounts,
    file_distribution: fileCounts,
    most_vulnerable_files: Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count })),
    most_triggered_rules: Object.entries(ruleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rule, count]) => ({ rule, count }))
  };
}