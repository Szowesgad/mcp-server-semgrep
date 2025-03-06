import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { DEFAULT_TIMEOUT } from '../config.js';

export const execAsync = promisify(exec);

/**
 * Checks if semgrep is installed, looking in common installation paths
 * @returns {Promise<boolean>} True if semgrep is installed
 */
export async function checkSemgrepInstallation(): Promise<boolean> {
  // List of common paths where semgrep might be installed
  const commonPaths = [
    'semgrep', // Default PATH
    '/usr/local/bin/semgrep',
    '/usr/bin/semgrep',
    '/opt/homebrew/bin/semgrep', // Homebrew on macOS
    '/opt/semgrep/bin/semgrep',
    '/home/linuxbrew/.linuxbrew/bin/semgrep', // Homebrew on Linux
    '/snap/bin/semgrep', // Snap on Linux
  ];

  // Try each path
  for (const semgrepPath of commonPaths) {
    try {
      await execAsync(`${semgrepPath} --version`);
      // If successful, update the semgrep path for future commands
      global.semgrepExecutable = semgrepPath;
      return true;
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  return false;
}

/**
 * Ensures semgrep is available
 * @returns {Promise<void>}
 */
export async function ensureSemgrepAvailable(): Promise<void> {
  const isInstalled = await checkSemgrepInstallation();
  if (!isInstalled) {
    throw new Error(
      'Semgrep is not installed or not in your PATH. ' +
      'Please install Semgrep manually before using this tool. ' +
      'macOS: brew install semgrep, ' +
      'Linux/Windows: refer to Semgrep documentation at https://semgrep.dev/docs/getting-started/'
    );
  }
}

/**
 * Executes a semgrep command with the specified arguments
 * @param {string[]} args Command line arguments for semgrep
 * @param {number} timeout Timeout in milliseconds
 * @returns {Promise<{stdout: string, stderr: string}>} Command output
 */
// Add a global variable to store the semgrep executable path
declare global {
  var semgrepExecutable: string;
}

// Default to 'semgrep' and will be updated when we find actual path
global.semgrepExecutable = 'semgrep';

export async function executeSemgrepCommand(
  args: string[],
  timeout: number = DEFAULT_TIMEOUT
): Promise<{ stdout: string, stderr: string }> {
  // Use the discovered semgrep path
  const semgrepPath = global.semgrepExecutable;
  
  // Join arguments with proper escaping
  const command = [semgrepPath, ...args]
    .map(arg => arg.includes(' ') ? `\"${arg}\"` : arg)
    .join(' ');
  
  // Execute with timeout
  const options = { timeout };
  
  try {
    return await execAsync(command, options);
  } catch (error: any) {
    console.error(`Error executing Semgrep command: ${command}`);
    console.error(`${error.message}`);
    throw error;
  }
}