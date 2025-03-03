import fs from 'fs/promises';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/dist/esm/types.js';
import { validateAbsolutePath } from '../utils/index.js';

interface CompareResultsParams {
  old_results: string;
  new_results: string;
  output_file?: string;
}

interface SemgrepFinding {
  path: string;
  check_id: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: {
    message: string;
    severity: string;
    metadata: any;
    [key: string]: any;
  };
  [key: string]: any;
}

interface SemgrepResult {
  results: SemgrepFinding[];
  errors: any[];
  stats: any;
  [key: string]: any;
}

interface FindingKey {
  path: string;
  check_id: string;
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

/**
 * Creates a unique key for a finding to identify duplicates
 * @param {SemgrepFinding} finding The finding to create a key for
 * @returns {string} A unique key for the finding
 */
function createFindingKey(finding: SemgrepFinding): string {
  const key: FindingKey = {
    path: finding.path,
    check_id: finding.check_id,
    start_line: finding.start.line,
    start_col: finding.start.col,
    end_line: finding.end.line,
    end_col: finding.end.col
  };
  
  return JSON.stringify(key);
}

/**
 * Compares two sets of Semgrep scan results and identifies differences
 * 
 * @param {CompareResultsParams} params Request parameters
 * @returns {Promise<object>} Comparison results
 */
export async function handleCompareResults(params: CompareResultsParams): Promise<object> {
  // Validate file paths
  const oldResultsPath = validateAbsolutePath(params.old_results, 'old_results');
  const newResultsPath = validateAbsolutePath(params.new_results, 'new_results');
  
  // Read old results file
  let oldContent: string;
  try {
    oldContent = await fs.readFile(oldResultsPath, 'utf-8');
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading old results file: ${error.message}`
    );
  }
  
  // Read new results file
  let newContent: string;
  try {
    newContent = await fs.readFile(newResultsPath, 'utf-8');
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading new results file: ${error.message}`
    );
  }
  
  // Parse old results
  let oldResults: SemgrepResult;
  try {
    oldResults = JSON.parse(oldContent);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Old results file contains invalid JSON: ${error}`
    );
  }
  
  // Parse new results
  let newResults: SemgrepResult;
  try {
    newResults = JSON.parse(newContent);
  } catch (error) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `New results file contains invalid JSON: ${error}`
    );
  }
  
  // Check if results have the expected structure
  if (!oldResults.results || !Array.isArray(oldResults.results)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Old results file has an invalid format (missing results array)'
    );
  }
  
  if (!newResults.results || !Array.isArray(newResults.results)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'New results file has an invalid format (missing results array)'
    );
  }
  
  // Create sets of finding keys
  const oldFindingKeys = new Set<string>();
  oldResults.results.forEach(finding => {
    oldFindingKeys.add(createFindingKey(finding));
  });
  
  const newFindingKeys = new Set<string>();
  const newFindingsMap = new Map<string, SemgrepFinding>();
  newResults.results.forEach(finding => {
    const key = createFindingKey(finding);
    newFindingKeys.add(key);
    newFindingsMap.set(key, finding);
  });
  
  // Find resolved findings (in old but not in new)
  const resolvedFindings: SemgrepFinding[] = [];
  oldResults.results.forEach(finding => {
    const key = createFindingKey(finding);
    if (!newFindingKeys.has(key)) {
      resolvedFindings.push(finding);
    }
  });
  
  // Find new findings (in new but not in old)
  const newFindings: SemgrepFinding[] = [];
  newResults.results.forEach(finding => {
    const key = createFindingKey(finding);
    if (!oldFindingKeys.has(key)) {
      newFindings.push(finding);
    }
  });
  
  // Calculate summary statistics
  const oldTotal = oldResults.results.length;
  const newTotal = newResults.results.length;
  const resolvedCount = resolvedFindings.length;
  const newCount = newFindings.length;
  const unchangedCount = newTotal - newCount;
  
  // Create comparison result
  const comparisonResult = {
    summary: {
      old_total: oldTotal,
      new_total: newTotal,
      resolved_count: resolvedCount,
      new_count: newCount,
      unchanged_count: unchangedCount,
      net_change: newTotal - oldTotal
    },
    resolved_findings: resolvedFindings,
    new_findings: newFindings,
    old_scan: {
      stats: oldResults.stats,
      errors: oldResults.errors
    },
    new_scan: {
      stats: newResults.stats,
      errors: newResults.errors
    }
  };
  
  // Write to output file if specified
  if (params.output_file) {
    const outputPath = validateAbsolutePath(params.output_file, 'output_file');
    
    try {
      await fs.writeFile(
        outputPath, 
        JSON.stringify(comparisonResult, null, 2), 
        'utf-8'
      );
      
      return {
        status: 'success',
        message: `Comparison results saved to ${outputPath}`,
        output_file: outputPath,
        summary: comparisonResult.summary
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error writing output file: ${error.message}`
      );
    }
  }
  
  return comparisonResult;
}