import fs from 'fs/promises';
import path from 'path';
import { executeSemgrepCommand } from '../utils/index.js';
import { ErrorCode, McpError } from '../sdk.js';
import { validateAbsolutePath } from '../utils/index.js';
import { ResultFormat } from '../config.js';

interface ExportResultsParams {
  results_file: string;
  output_file: string;
  format?: string;
}

/**
 * Handles a request to export Semgrep scan results in various formats
 * @param {ExportResultsParams} params Request parameters
 * @returns {Promise<object>} Result of export operation
 */
export async function handleExportResults(params: ExportResultsParams): Promise<object> {
  // Validate parameters
  const resultsFile = validateAbsolutePath(params.results_file, 'results_file');
  const outputFile = validateAbsolutePath(params.output_file, 'output_file');
  
  // Determine export format
  let format = (params.format || 'text').toLowerCase() as ResultFormat;
  if (!Object.values(ResultFormat).includes(format)) {
    format = ResultFormat.TEXT;
  }
  
  // Ensure results file exists
  try {
    await fs.access(resultsFile);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Results file does not exist: ${resultsFile}`
    );
  }
  
  // Read and parse results
  let resultsContent: string;
  let results: any;
  
  try {
    resultsContent = await fs.readFile(resultsFile, 'utf8');
    results = JSON.parse(resultsContent);
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading or parsing results file: ${error.message}`
    );
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error creating output directory: ${error.message}`
    );
  }
  
  try {
    // Handle different export formats
    if (format === ResultFormat.JSON) {
      // For JSON, just copy the file or write formatted JSON
      await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
    } else if (format === ResultFormat.SARIF) {
      // For SARIF, run semgrep with --sarif option
      const args = ['--json-to-sarif', resultsFile, '--output', outputFile];
      await executeSemgrepCommand(args);
    } else {
      // For text, create a human-readable report
      const findings = results.results || [];
      const errors = results.errors || [];
      
      let reportContent = 'Semgrep Scan Results\n';
      reportContent += '====================\n\n';
      
      reportContent += `Total findings: ${findings.length}\n`;
      reportContent += `Total errors: ${errors.length}\n\n`;
      
      if (findings.length > 0) {
        reportContent += 'Findings:\n';
        reportContent += '---------\n\n';
        
        findings.forEach((finding: any, index: number) => {
          reportContent += `[${index + 1}] ${finding.check_id}\n`;
          reportContent += `Severity: ${finding.extra.severity || 'unknown'}\n`;
          reportContent += `File: ${finding.path}:${finding.start.line}\n`;
          reportContent += `Message: ${finding.extra.message}\n`;
          reportContent += '\n';
        });
      }
      
      if (errors.length > 0) {
        reportContent += 'Errors:\n';
        reportContent += '-------\n\n';
        
        errors.forEach((error: any, index: number) => {
          reportContent += `[${index + 1}] ${error.message || 'Unknown error'}\n`;
          if (error.path) reportContent += `File: ${error.path}\n`;
          reportContent += '\n';
        });
      }
      
      await fs.writeFile(outputFile, reportContent);
    }
    
    return {
      status: 'success',
      message: `Results exported to ${outputFile} in ${format} format`,
      output_file: outputFile,
      format
    };
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error exporting results: ${error.message}`
    );
  }
}