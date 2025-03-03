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
 * Installs semgrep using pip
 * @returns {Promise<void>}
 */
export async function installSemgrep(): Promise<void> {
  console.error('Installing semgrep...');
  try {
    // Check if pip is installed
    await execAsync('pip3 --version');
  } catch (error) {
    throw new Error('Python/pip3 is not installed. Please install Python and pip3.');
  }

  try {
    // Install semgrep using pip
    await execAsync('pip3 install semgrep');
    console.error('Semgrep has been successfully installed');
  } catch (error: any) {
    throw new Error(`Error installing semgrep: ${error.message}`);
  }
}

/**
 * Ensures semgrep is available, installing it if necessary
 * @returns {Promise<void>}
 */
export async function ensureSemgrepAvailable(): Promise<void> {
  const isInstalled = await checkSemgrepInstallation();
  if (!isInstalled) {
    await installSemgrep();
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
    .map(arg => arg.includes(' ') ? `"${arg}"` : arg)
    .join(' ');
  
  // Execute with timeout
  const options = { timeout };
  return execAsync(command, options);
}
