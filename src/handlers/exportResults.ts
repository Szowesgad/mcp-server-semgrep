import fs from 'fs/promises';
import path from 'path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/dist/esm/types.js';
import { validateAbsolutePath, executeSemgrepCommand } from '../utils/index.js';
import { ResultFormat, DEFAULT_RESULT_FORMAT } from '../config.js';

interface ExportResultsParams {
  results_file: string;
  output_file: string;
  format?: string;
  timeout?: number;
}

interface SemgrepResult {
  results: any[];
  errors: any[];
  stats: any;
}

/**
 * Generates a human-readable text summary from Semgrep results
 * @param {SemgrepResult} results The parsed Semgrep results
 * @returns {string} Formatted text summary
 */
function generateTextSummary(results: SemgrepResult): string {
  const findings = results.results || [];
  const errors = results.errors || [];
  const stats = results.stats || {};
  
  // Group findings by severity
  const severityGroups: Record<string, any[]> = {};
  findings.forEach(finding => {
    const severity = finding.extra.severity || 'UNKNOWN';
    severityGroups[severity] = severityGroups[severity] || [];
    severityGroups[severity].push(finding);
  });
  
  // Build text summary
  let summary = `# Semgrep Scan Results\n\n`;
  
  // Add summary section
  summary += `## Summary\n\n`;
  summary += `- Total findings: ${findings.length}\n`;
  summary += `- Errors: ${errors.length}\n`;
  
  // Add severity breakdown
  summary += `\n## Findings by Severity\n\n`;
  Object.entries(severityGroups).forEach(([severity, items]) => {
    summary += `- ${severity}: ${items.length}\n`;
  });
  
  // Add detailed findings
  summary += `\n## Detailed Findings\n\n`;
  Object.entries(severityGroups).forEach(([severity, items]) => {
    summary += `\n### ${severity} (${items.length})\n\n`;
    
    items.forEach((finding, index) => {
      summary += `${index + 1}. **${finding.check_id}**\n`;
      summary += `   - File: ${finding.path}\n`;
      summary += `   - Location: Line ${finding.start.line}, Column ${finding.start.col}\n`;
      summary += `   - Message: ${finding.extra.message}\n`;
      if (finding.extra.lines) {
        summary += `   - Code:\n\`\`\`\n${finding.extra.lines}\n\`\`\`\n`;
      }
      summary += `\n`;
    });
  });
  
  // Add errors section if there are any
  if (errors.length > 0) {
    summary += `\n## Errors\n\n`;
    errors.forEach((error, index) => {
      summary += `${index + 1}. ${error.message || JSON.stringify(error)}\n`;
    });
  }
  
  // Add stats section
  if (Object.keys(stats).length > 0) {
    summary += `\n## Scan Statistics\n\n`;
    Object.entries(stats).forEach(([key, value]) => {
      summary += `- ${key}: ${value}\n`;
    });
  }
  
  return summary;
}

/**
 * Exports scan results to different formats (JSON, SARIF, text)
 * 
 * @param {ExportResultsParams} params Request parameters
 * @returns {Promise<object>} Result of export operation
 */
export async function handleExportResults(params: ExportResultsParams): Promise<object> {
  // Validate file paths
  const resultsFilePath = validateAbsolutePath(params.results_file, 'results_file');
  const outputFilePath = validateAbsolutePath(params.output_file, 'output_file');
  
  // Determine export format
  let format: ResultFormat;
  if (params.format) {
    const requestedFormat = params.format.toLowerCase();
    if (Object.values(ResultFormat).includes(requestedFormat as ResultFormat)) {
      format = requestedFormat as ResultFormat;
    } else {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid format: ${params.format}. Supported formats: ${Object.values(ResultFormat).join(', ')}`
      );
    }
  } else {
    format = DEFAULT_RESULT_FORMAT;
  }
  
  // Check if results file exists
  try {
    await fs.access(resultsFilePath);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Results file does not exist: ${resultsFilePath}`
    );
  }
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(outputFilePath);
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error creating output directory: ${error.message}`
    );
  }
  
  // For JSON format, we can just copy or parse and rewrite the file
  if (format === ResultFormat.JSON) {
    try {
      const content = await fs.readFile(resultsFilePath, 'utf8');
      let results;
      
      try {
        results = JSON.parse(content);
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Results file contains invalid JSON: ${error}`
        );
      }
      
      await fs.writeFile(outputFilePath, JSON.stringify(results, null, 2), 'utf8');
      
      return {
        status: 'success',
        message: `Results exported to ${outputFilePath} in JSON format`,
        output_file: outputFilePath,
        format: format
      };
    } catch (error: any) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Error exporting results: ${error.message}`
      );
    }
  }
  
  // For SARIF and text formats, use semgrep to convert
  const args = ['--json', resultsFilePath];
  
  if (format === ResultFormat.SARIF) {
    args.push('--sarif');
  }
  
  try {
    const { stdout } = await executeSemgrepCommand(args, params.timeout);
    
    let outputContent: string;
    
    if (format === ResultFormat.SARIF) {
      outputContent = stdout;
    } else {
      // For text format, generate a readable summary
      let results;
      try {
        results = JSON.parse(stdout);
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error parsing Semgrep output: ${error}`
        );
      }
      
      outputContent = generateTextSummary(results);
    }
    
    await fs.writeFile(outputFilePath, outputContent, 'utf8');
    
    return {
      status: 'success',
      message: `Results exported to ${outputFilePath} in ${format} format`,
      output_file: outputFilePath,
      format: format
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error exporting results: ${error.message}`
    );
  }
}