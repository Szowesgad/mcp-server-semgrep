#!/usr/bin/env node
import { 
  Server, 
  StdioServerTransport, 
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk';

import { ensureSemgrepAvailable } from './utils/index.js';
import {
  handleScanDirectory,
  handleListRules,
  handleAnalyzeResults,
  handleCreateRule,
  handleFilterResults,
  handleExportResults,
  handleCompareResults
} from './handlers/index.js';
import { SERVER_CONFIG } from './config.js';

class SemgrepServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      SERVER_CONFIG,
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error: any) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'scan_directory',
          description: 'Performs a Semgrep scan on a directory',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: `Absolute path to the directory to scan (must be within MCP directory)`
              },
              config: {
                type: 'string',
                description: 'Semgrep configuration (e.g. "auto" or absolute path to rule file)',
                default: 'auto'
              }
            },
            required: ['path']
          }
        },
        {
          name: 'list_rules',
          description: 'Lists available Semgrep rules',
          inputSchema: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                description: 'Programming language for rules (optional)'
              }
            }
          }
        },
        {
          name: 'analyze_results',
          description: 'Analyzes scan results',
          inputSchema: {
            type: 'object',
            properties: {
              results_file: {
                type: 'string',
                description: `Absolute path to JSON results file (must be within MCP directory)`
              }
            },
            required: ['results_file']
          }
        },
        {
          name: 'create_rule',
          description: 'Creates a new Semgrep rule',
          inputSchema: {
            type: 'object',
            properties: {
              output_path: {
                type: 'string',
                description: 'Absolute path for output rule file'
              },
              pattern: {
                type: 'string',
                description: 'Search pattern for the rule'
              },
              language: {
                type: 'string',
                description: 'Target language for the rule'
              },
              message: {
                type: 'string',
                description: 'Message to display when rule matches'
              },
              severity: {
                type: 'string',
                description: 'Rule severity (ERROR, WARNING, INFO)',
                default: 'WARNING'
              },
              id: {
                type: 'string',
                description: 'Rule identifier',
                default: 'custom_rule'
              }
            },
            required: ['output_path', 'pattern', 'language', 'message']
          }
        },
        {
          name: 'filter_results',
          description: 'Filters scan results by various criteria',
          inputSchema: {
            type: 'object',
            properties: {
              results_file: {
                type: 'string',
                description: 'Absolute path to JSON results file'
              },
              severity: {
                type: 'string',
                description: 'Filter by severity (ERROR, WARNING, INFO)'
              },
              rule_id: {
                type: 'string',
                description: 'Filter by rule ID'
              },
              path_pattern: {
                type: 'string',
                description: 'Filter by file path pattern (regex)'
              },
              language: {
                type: 'string',
                description: 'Filter by programming language'
              },
              message_pattern: {
                type: 'string',
                description: 'Filter by message content (regex)'
              }
            },
            required: ['results_file']
          }
        },
        {
          name: 'export_results',
          description: 'Exports scan results in various formats',
          inputSchema: {
            type: 'object',
            properties: {
              results_file: {
                type: 'string',
                description: 'Absolute path to JSON results file'
              },
              output_file: {
                type: 'string',
                description: 'Absolute path to output file'
              },
              format: {
                type: 'string',
                description: 'Output format (json, sarif, text)',
                default: 'text'
              }
            },
            required: ['results_file', 'output_file']
          }
        },
        {
          name: 'compare_results',
          description: 'Compares two scan results',
          inputSchema: {
            type: 'object',
            properties: {
              old_results: {
                type: 'string',
                description: 'Absolute path to older JSON results file'
              },
              new_results: {
                type: 'string',
                description: 'Absolute path to newer JSON results file'
              }
            },
            required: ['old_results', 'new_results']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      // Ensure Semgrep is available before executing any tool
      await ensureSemgrepAvailable();

      switch (request.params.name) {
        case 'scan_directory':
          return await handleScanDirectory(request.params.arguments);
        case 'list_rules':
          return await handleListRules(request.params.arguments);
        case 'analyze_results':
          return await handleAnalyzeResults(request.params.arguments);
        case 'create_rule':
          return await handleCreateRule(request.params.arguments);
        case 'filter_results':
          return await handleFilterResults(request.params.arguments);
        case 'export_results':
          return await handleExportResults(request.params.arguments);
        case 'compare_results':
          return await handleCompareResults(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    // Check and install Semgrep if necessary on server start
    try {
      await ensureSemgrepAvailable();
    } catch (error: any) {
      console.error(`Error setting up Semgrep: ${error.message}`);
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Semgrep MCP Server running on stdio');
  }
}

const server = new SemgrepServer();
server.run().catch(console.error);