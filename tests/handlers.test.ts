import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleScanDirectory } from '../src/handlers/scanDirectory.js';
import { handleListRules } from '../src/handlers/listRules.js';
import { validateAbsolutePath, validateConfig, executeSemgrepCommand } from '../src/utils/index.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

// Mock the utils functions
vi.mock('../src/utils/index.js', () => ({
  validateAbsolutePath: vi.fn((path) => path),
  validateConfig: vi.fn((config) => config),
  executeSemgrepCommand: vi.fn().mockResolvedValue({ stdout: 'mock output', stderr: '' }),
  execAsync: vi.fn().mockResolvedValue({ stdout: 'mock output', stderr: '' })
}));

describe('handleScanDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate path and execute semgrep scan', async () => {
    const args = { path: '/mock/path', config: 'auto' };
    const result = await handleScanDirectory(args);
    
    expect(validateAbsolutePath).toHaveBeenCalledWith('/mock/path', 'path');
    expect(validateConfig).toHaveBeenCalledWith('auto');
    expect(executeSemgrepCommand).toHaveBeenCalled();
    expect(result.content[0].text).toEqual('mock output');
  });

  it('should throw error if path is missing', async () => {
    await expect(handleScanDirectory({})).rejects.toThrowError(McpError);
  });
});

describe('handleListRules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list available rules', async () => {
    const result = await handleListRules({});
    expect(executeSemgrepCommand).toHaveBeenCalled();
    expect(result.content[0].text).toContain('mock output');
  });

  it('should filter rules by language if provided', async () => {
    await handleListRules({ language: 'python' });
    
    // First call to list packs
    expect(executeSemgrepCommand).toHaveBeenNthCalledWith(1, [
      'ci',
      '--list-packs'
    ]);

    // Second call to filter by language
    expect(executeSemgrepCommand).toHaveBeenNthCalledWith(2, [
      'ci',
      '--list',
      '--lang=python'
    ]);
  });
});
