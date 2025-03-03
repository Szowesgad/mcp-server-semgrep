import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateAbsolutePath, validateConfig } from '../src/utils/validation.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { BASE_ALLOWED_PATH } from '../src/config.js';
import path from 'path';

// Mock the BASE_ALLOWED_PATH
vi.mock('../src/config.js', () => ({
  BASE_ALLOWED_PATH: '/mock/base/path'
}));

describe('validateAbsolutePath', () => {
  it('should accept valid absolute paths within allowed directory', () => {
    const testPath = '/mock/base/path/some/file.txt';
    expect(validateAbsolutePath(testPath, 'testPath')).toBe(testPath);
  });

  it('should reject relative paths', () => {
    expect(() => validateAbsolutePath('some/relative/path', 'testPath'))
      .toThrowError(McpError);
  });

  it('should reject paths outside allowed directory', () => {
    expect(() => validateAbsolutePath('/some/other/directory', 'testPath'))
      .toThrowError(McpError);
  });

  it('should handle path traversal attempts', () => {
    expect(() => validateAbsolutePath('/mock/base/path/../../../etc/passwd', 'testPath'))
      .toThrowError(McpError);
  });
});

describe('validateConfig', () => {
  it('should accept "auto" config', () => {
    expect(validateConfig('auto')).toBe('auto');
  });

  it('should accept registry references', () => {
    expect(validateConfig('p/ci')).toBe('p/ci');
    expect(validateConfig('p/security')).toBe('p/security');
  });

  it('should validate path configs', () => {
    const mockValidatePath = vi.spyOn(globalThis, 'validateAbsolutePath');
    mockValidatePath.mockImplementation((path) => path);
    
    validateConfig('/some/path/to/rules.yaml');
    expect(mockValidatePath).toHaveBeenCalled();
  });
});
