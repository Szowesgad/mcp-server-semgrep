import fs from 'fs/promises';
import { ErrorCode, McpError } from '../sdk.js';
import { validateAbsolutePath } from '../utils/index.js';

interface CompareResultsParams {
  old_results: string;
  new_results: string;
}

interface Finding {
  check_id: string;
  path: string;
  start: { line: number; col: number };
  end: { line: number; col: number };
  extra: { [key: string]: any };
  [key: string]: any;
}

/**
 * Handles a request to compare two Semgrep scan results
 * @param {CompareResultsParams} params Request parameters
 * @returns {Promise<object>} Comparison results
 */
export async function handleCompareResults(params: CompareResultsParams): Promise<object> {
  // Validate parameters
  const oldResultsFile = validateAbsolutePath(params.old_results, 'old_results');
  const newResultsFile = validateAbsolutePath(params.new_results, 'new_results');
  
  // Read old results file
  let oldResults: any;
  try {
    const oldContent = await fs.readFile(oldResultsFile, 'utf8');
    oldResults = JSON.parse(oldContent);
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading or parsing old results file: ${error.message}`
    );
  }
  
  // Read new results file
  let newResults: any;
  try {
    const newContent = await fs.readFile(newResultsFile, 'utf8');
    newResults = JSON.parse(newContent);
  } catch (error: any) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Error reading or parsing new results file: ${error.message}`
    );
  }
  
  // Extract findings
  const oldFindings: Finding[] = oldResults.results || [];
  const newFindings: Finding[] = newResults.results || [];
  
  // Create a key for each finding for comparison
  const createFindingKey = (finding: Finding): string => {
    return `${finding.check_id}|${finding.path}|${finding.start.line}:${finding.start.col}-${finding.end.line}:${finding.end.col}`;
  };
  
  // Create maps for easy lookup
  const oldFindingsMap = new Map<string, Finding>();
  oldFindings.forEach(finding => {
    oldFindingsMap.set(createFindingKey(finding), finding);
  });
  
  const newFindingsMap = new Map<string, Finding>();
  newFindings.forEach(finding => {
    newFindingsMap.set(createFindingKey(finding), finding);
  });
  
  // Find fixed issues (in old but not in new)
  const fixedFindings: Finding[] = [];
  oldFindings.forEach(finding => {
    const key = createFindingKey(finding);
    if (!newFindingsMap.has(key)) {
      fixedFindings.push(finding);
    }
  });
  
  // Find new issues (in new but not in old)
  const newlyIntroducedFindings: Finding[] = [];
  newFindings.forEach(finding => {
    const key = createFindingKey(finding);
    if (!oldFindingsMap.has(key)) {
      newlyIntroducedFindings.push(finding);
    }
  });
  
  // Group findings by rule and file
  const groupFindingsByRule = (findings: Finding[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    findings.forEach(finding => {
      counts[finding.check_id] = (counts[finding.check_id] || 0) + 1;
    });
    return counts;
  };
  
  const groupFindingsByFile = (findings: Finding[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    findings.forEach(finding => {
      counts[finding.path] = (counts[finding.path] || 0) + 1;
    });
    return counts;
  };
  
  const getBySeverity = (findings: Finding[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    findings.forEach(finding => {
      const severity = finding.extra.severity || 'unknown';
      counts[severity] = (counts[severity] || 0) + 1;
    });
    return counts;
  };
  
  return {
    comparison_summary: {
      old_scan: {
        file: oldResultsFile,
        total_findings: oldFindings.length
      },
      new_scan: {
        file: newResultsFile,
        total_findings: newFindings.length
      },
      fixed_issues: fixedFindings.length,
      new_issues: newlyIntroducedFindings.length,
      net_change: newFindings.length - oldFindings.length
    },
    fixed_issues: {
      findings: fixedFindings,
      by_rule: groupFindingsByRule(fixedFindings),
      by_file: groupFindingsByFile(fixedFindings),
      by_severity: getBySeverity(fixedFindings)
    },
    new_issues: {
      findings: newlyIntroducedFindings,
      by_rule: groupFindingsByRule(newlyIntroducedFindings),
      by_file: groupFindingsByFile(newlyIntroducedFindings),
      by_severity: getBySeverity(newlyIntroducedFindings)
    }
  };
}