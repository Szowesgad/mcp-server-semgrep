import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { DEFAULT_TIMEOUT } from '../config.js';

export const execAsync = promisify(exec);

/**
 * Checks if semgrep is installed
 * @returns {Promise<boolean>} True if semgrep is installed
 */
export async function checkSemgrepInstallation(): Promise<boolean> {
  try {
    await execAsync('semgrep --version');
    return true;
  } catch (error) {
    return false;
  }
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
export async function executeSemgrepCommand(
  args: string[],
  timeout: number = DEFAULT_TIMEOUT
): Promise<{ stdout: string, stderr: string }> {
  // Join arguments with proper escaping
  const command = ['semgrep', ...args]
    .map(arg => arg.includes(' ') ? `\"${arg}\"` : arg)
    .join(' ');
  
  // Execute with timeout
  const options = { timeout };
  return execAsync(command, options);
}