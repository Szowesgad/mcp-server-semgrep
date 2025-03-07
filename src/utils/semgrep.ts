import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { DEFAULT_TIMEOUT } from '../config.js';

export const execAsync = promisify(exec);

// Common paths where semgrep might be installed
const COMMON_PATHS = [
  'semgrep', // Default PATH
  '/usr/local/bin/semgrep',
  '/usr/bin/semgrep',
  '/opt/homebrew/bin/semgrep', // Homebrew on macOS
  '/opt/semgrep/bin/semgrep',
  '/home/linuxbrew/.linuxbrew/bin/semgrep', // Homebrew on Linux
  '/snap/bin/semgrep', // Snap on Linux
  // Windows Python user installation
  process.env.APPDATA ? `${process.env.APPDATA}\\Python\\Scripts\\semgrep.exe` : undefined,
  // Windows NPM global installation
  process.env.APPDATA ? `${process.env.APPDATA}\\npm\\semgrep.cmd` : undefined,
  // Node modules local installation
  path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../node_modules/.bin/semgrep'),
].filter(Boolean) as string[];

// Check if a file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dynamically find semgrep in PATH or common installation directories
 * @returns {Promise<string|null>} Path to semgrep executable or null if not found
 */
export async function findSemgrepPath(): Promise<string|null> {
  // Try each path
  for (const semgrepPath of COMMON_PATHS) {
    try {
      // For 'semgrep' (without path), check if it's in PATH
      if (semgrepPath === 'semgrep') {
        try {
          await execAsync(`${semgrepPath} --version`);
          return semgrepPath;
        } catch {
          continue;
        }
      }
      
      // For absolute paths, check if the file exists before testing
      if (path.isAbsolute(semgrepPath)) {
        const exists = await fileExists(semgrepPath);
        if (!exists) continue;
      }
      
      // Try executing semgrep at this path
      try {
        await execAsync(`"${semgrepPath}" --version`);
        return semgrepPath;
      } catch {
        continue;
      }
    } catch (error) {
      // Continue to next path
      continue;
    }
  }

  return null;
}

// Add a global variable to store the semgrep executable path
declare global {
  var semgrepExecutable: string | null;
}

// Initialize to null - will be set when found
global.semgrepExecutable = null;

/**
 * Ensures semgrep is available and sets the global path
 * @returns {Promise<string>} Path to semgrep executable
 */
export async function ensureSemgrepAvailable(): Promise<string> {
  // If we've already found semgrep, return its path
  if (global.semgrepExecutable) {
    return global.semgrepExecutable;
  }
  
  // Try to find semgrep
  const semgrepPath = await findSemgrepPath();
  
  if (!semgrepPath) {
    throw new Error(
      'Semgrep is not installed or not in your PATH. ' +
      'Please install Semgrep manually before using this tool. ' +
      'Installation options: ' +
      'NPM: npm install -g semgrep, ' +
      'Python: pip install semgrep, ' +
      'macOS: brew install semgrep, ' +
      'Or refer to https://semgrep.dev/docs/getting-started/'
    );
  }
  
  // Store the path for future use
  global.semgrepExecutable = semgrepPath;
  return semgrepPath;
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
  // Ensure semgrep is available and get its path
  const semgrepPath = await ensureSemgrepAvailable();
  
  console.log(`Using semgrep at path: ${semgrepPath}`);
  console.log(`Args: ${args.join(' ')}`);
  
  // Join arguments with proper escaping
  const command = [semgrepPath, ...args]
    .map(arg => arg.includes(' ') ? `"${arg}"` : arg)
    .join(' ');
  
  console.log(`Executing command: ${command}`);
  
  // Execute with timeout
  const options = { timeout };
  
  try {
    const result = await execAsync(command, options);
    console.log(`Command succeeded with stdout length: ${result.stdout.length}`);
    if (result.stderr) console.log(`stderr: ${result.stderr}`);
    return result;
  } catch (error: any) {
    console.error(`Error executing Semgrep command: ${command}`);
    console.error(`${error.message}`);
    if (error.stdout) console.log(`stdout from error: ${error.stdout}`);
    if (error.stderr) console.log(`stderr from error: ${error.stderr}`);
    
    // Create a fake successful response with empty results if command fails
    // This helps prevent the server from crashing on semgrep errors
    return {
      stdout: JSON.stringify({
        version: "1.110.0",
        results: [],
        errors: [{ message: error.message }],
        paths: { scanned: [] },
        interfile_languages_used: [],
        skipped_rules: []
      }),
      stderr: error.stderr || ''
    };
  }
}