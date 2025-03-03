import path from 'path';
import { fileURLToPath } from 'url';

// Dynamically determine the MCP directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_ALLOWED_PATH = path.resolve(__dirname, '../..');

export const DEFAULT_SEMGREP_CONFIG = 'auto';

export const SERVER_CONFIG = {
  name: 'semgrep-server',
  version: '0.1.0',
};

export enum ResultFormat {
  JSON = 'json',
  SARIF = 'sarif',
  TEXT = 'text'
}

export const DEFAULT_RESULT_FORMAT = ResultFormat.TEXT;

export const DEFAULT_TIMEOUT = 300000; // 5 minutes
