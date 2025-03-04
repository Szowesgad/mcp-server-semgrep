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
 * Installs semgrep using the most appropriate method for current platform
 * @returns {Promise<void>}
 */
export async function installSemgrep(): Promise<void> {
  console.error('Installing semgrep...');
  
  // Detect platform
  const platform = process.platform;
  
  if (platform === 'darwin') {
    try {
      // Try Homebrew on macOS first
      console.error('Attempting installation via Homebrew...');
      await execAsync('brew install semgrep');
      console.error('Semgrep has been successfully installed via Homebrew');
      return;
    } catch (error) {
      console.error('Homebrew installation failed, trying alternative methods...');
    }
  }
  
  // Try pip with user flag
  try {
    await execAsync('pip3 --version');
    try {
      await execAsync('pip3 install --user semgrep');
      console.error('Semgrep has been successfully installed via pip (user mode)');
      return;
    } catch (pipError) {
      // Try with break-system-packages
      try {
        await execAsync('pip3 install --break-system-packages semgrep');
        console.error('Semgrep has been successfully installed via pip (break-system-packages)');
        return;
      } catch (breakError) {
        throw new Error(`Failed to install with pip: ${breakError.message}`);
      }
    }
  } catch (error) {
    throw new Error('Python/pip3 is not installed or Semgrep installation failed. Please install Semgrep manually using your package manager (brew install semgrep on macOS, or refer to Semgrep documentation).');
  }
}

/**
 * Ensures semgrep is available, installing it if necessary
 * @returns {Promise<void>}
 */
export async function ensureSemgrepAvailable(): Promise<void> {
  const isInstalled = await checkSemgrepInstallation();
  if (!isInstalled) {
    try {
      await installSemgrep();
    } catch (error) {
      throw new Error(`Semgrep is not available and automatic installation failed: ${error.message}. Please install Semgrep manually and make sure it's in your PATH.`);
    }
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