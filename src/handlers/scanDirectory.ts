import fs from 'fs/promises';
import path from 'path';
import { ErrorCode, McpError } from '../sdk.js';
import { validateAbsolutePath, validateConfig, executeSemgrepCommand } from '../utils/index.js';
import { DEFAULT_SEMGREP_CONFIG, ResultFormat } from '../config.js';

interface ScanDirectoryParams {
  path: string;
  config?: string;
  output_file?: string;
  output_format?: string;
  timeout?: number;
}

/**
 * Handles a request to scan a directory with Semgrep
 * @param {ScanDirectoryParams} params Request parameters
 * @returns {Promise<object>} Scan results
 */
export async function handleScanDirectory(params: ScanDirectoryParams): Promise<object> {
  // Validate parameters
  const targetPath = validateAbsolutePath(params.path, 'path');
  const config = params.config ? validateConfig(params.config) : DEFAULT_SEMGREP_CONFIG;
  
  // Check if directory exists
  try {
    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `The specified path is not a directory: ${targetPath}`
      );
    }
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error accessing directory: ${error.message}`
    );
  }

  // Prepare output file if specified
  let outputFile = '';
  if (params.output_file) {
    outputFile = validateAbsolutePath(params.output_file, 'output_file');
    
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
  }

  // Determine output format
  const outputFormat = params.output_format?.toLowerCase() as ResultFormat || ResultFormat.JSON;
  
  // Build command arguments
  const args: string[] = ['--json', targetPath, '--no-git-ignore', '--skip-unknown-extensions'];
  
  // Add configuration
  args.push('--config', config);
  
  // Add output file if specified
  if (outputFile) {
    args.push('--output', outputFile);
    
    // Add specific format if needed
    if (outputFormat === ResultFormat.SARIF) {
      args.push('--sarif');
    }
  }

  try {
    // Execute semgrep command
    const { stdout, stderr } = await executeSemgrepCommand(args, params.timeout);
    
    // Parse results as JSON
    let results: object;
    try {
      // Attempt to parse JSON output
      results = JSON.parse(stdout);
      console.log(`Successfully parsed JSON output with ${JSON.stringify(results).length} characters`);
    } catch (error) {
      console.error(`Error parsing Semgrep output: ${error}`);
      console.error(`Raw stdout: ${stdout.substring(0, 200)}...`);
      
      // Return empty results rather than throwing an error
      results = {
        version: "1.110.0",
        results: [],
        errors: [{ message: `Error parsing semgrep output: ${error}` }],
        paths: { scanned: [] },
        interfile_languages_used: [],
        skipped_rules: []
      };
    }

    // Return results or info about output file
    if (outputFile) {
      return {
        status: 'success',
        message: `Scan completed and results saved to ${outputFile}`,
        output_format: outputFormat,
        output_file: outputFile
      };
    } else {
      return results;
    }
  } catch (error: any) {
    console.error(`Error in scanDirectory handler: ${error.message}`);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    // Return empty results instead of throwing an error
    return {
      version: "1.110.0",
      results: [],
      errors: [{ message: `Error executing Semgrep: ${error.message}` }],
      paths: { scanned: [] },
      interfile_languages_used: [],
      skipped_rules: []
    };
  }
}