#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// Dynamisch das MCP-Verzeichnis bestimmen
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_ALLOWED_PATH = path.resolve(__dirname, '../..');

class SemgrepServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'semgrep-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async checkSemgrepInstallation(): Promise<boolean> {
    try {
      await execAsync('semgrep --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async installSemgrep(): Promise<void> {
    console.error('Semgrep wird installiert...');
    try {
      // Prüfen ob pip installiert ist
      await execAsync('pip3 --version');
    } catch (error) {
      throw new Error('Python/pip3 ist nicht installiert. Bitte installieren Sie Python und pip3.');
    }

    try {
      // Semgrep über pip installieren
      await execAsync('pip3 install semgrep');
      console.error('Semgrep wurde erfolgreich installiert');
    } catch (error: any) {
      throw new Error(`Fehler bei der Installation von Semgrep: ${error.message}`);
    }
  }

  private async ensureSemgrepAvailable(): Promise<void> {
    const isInstalled = await this.checkSemgrepInstallation();
    if (!isInstalled) {
      await this.installSemgrep();
    }
  }

  private validateAbsolutePath(pathToValidate: string, paramName: string): string {
    if (!path.isAbsolute(pathToValidate)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} muss ein absoluter Pfad sein. Erhalten: ${pathToValidate}`
      );
    }

    // Normalisiere den Pfad und stelle sicher, dass keine Path Traversal möglich ist
    const normalizedPath = path.normalize(pathToValidate);
    
    // Überprüfe, ob der normalisierte Pfad immer noch absolut ist
    if (!path.isAbsolute(normalizedPath)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} enthält ungültige Path Traversal Sequenzen`
      );
    }

    // Überprüfe, ob der Pfad innerhalb des erlaubten Basis-Verzeichnisses liegt
    if (!normalizedPath.startsWith(BASE_ALLOWED_PATH)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `${paramName} muss innerhalb des MCP-Verzeichnisses (${BASE_ALLOWED_PATH}) liegen`
      );
    }

    return normalizedPath;
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'scan_directory',
          description: 'Führt einen Semgrep-Scan in einem Verzeichnis aus',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: `Absoluter Pfad zum zu scannenden Verzeichnis (muss innerhalb des MCP-Verzeichnisses liegen)`
              },
              config: {
                type: 'string',
                description: 'Semgrep-Konfiguration (z.B. "auto" oder absoluter Pfad zur Regel-Datei)',
                default: 'auto'
              }
            },
            required: ['path']
          }
        },
        {
          name: 'list_rules',
          description: 'Listet verfügbare Semgrep-Regeln auf',
          inputSchema: {
            type: 'object',
            properties: {
              language: {
                type: 'string',
                description: 'Programmiersprache für die Regeln (optional)'
              }
            }
          }
        },
        {
          name: 'analyze_results',
          description: 'Analysiert die Scan-Ergebnisse',
          inputSchema: {
            type: 'object',
            properties: {
              results_file: {
                type: 'string',
                description: `Absoluter Pfad zur JSON-Ergebnisdatei (muss innerhalb des MCP-Verzeichnisses liegen)`
              }
            },
            required: ['results_file']
          }
        },
        {
          name: 'create_rule',
          description: 'Erstellt eine neue Semgrep-Regel',
          inputSchema: {
            type: 'object',
            properties: {
              output_path: {
                type: 'string',
                description: 'Absoluter Pfad zur Ausgabedatei für die neue Regel'
              },
              pattern: {
                type: 'string',
                description: 'Das Suchmuster für die Regel'
              },
              language: {
                type: 'string',
                description: 'Die Zielsprache der Regel'
              },
              message: {
                type: 'string',
                description: 'Die Nachricht, die angezeigt wird, wenn die Regel zutrifft'
              },
              severity: {
                type: 'string',
                description: 'Schweregrad der Regel (ERROR, WARNING, INFO)',
                default: 'WARNING'
              }
            },
            required: ['output_path', 'pattern', 'language', 'message']
          }
        },
        {
          name: 'filter_results',
          description: 'Filtert Scan-Ergebnisse nach verschiedenen Kriterien',
          inputSchema: {
            type: 'object',
            properties: {
              results_file: {
                type: 'string',
                description: 'Absoluter Pfad zur JSON-Ergebnisdatei'
              },
              severity: {
                type: 'string',
                description: 'Nach Schweregrad filtern (ERROR, WARNING, INFO)'
              },
              rule_id: {
                type: 'string',
                description: 'Nach Regel-ID filtern'
              },
              path_pattern: {
                type: 'string',
                description: 'Nach Dateipfad-Muster filtern (regex)'
              }
            },
            required: ['results_file']
          }
        },
        {
          name: 'export_results',
          description: 'Exportiert Scan-Ergebnisse in verschiedene Formate',
          inputSchema: {
            type: 'object',
            properties: {
              results_file: {
                type: 'string',
                description: 'Absoluter Pfad zur JSON-Ergebnisdatei'
              },
              output_file: {
                type: 'string',
                description: 'Absoluter Pfad zur Ausgabedatei'
              },
              format: {
                type: 'string',
                description: 'Ausgabeformat (json, sarif, text)',
                default: 'text'
              }
            },
            required: ['results_file', 'output_file']
          }
        },
        {
          name: 'compare_results',
          description: 'Vergleicht zwei Scan-Ergebnisse',
          inputSchema: {
            type: 'object',
            properties: {
              old_results: {
                type: 'string',
                description: 'Absoluter Pfad zur älteren JSON-Ergebnisdatei'
              },
              new_results: {
                type: 'string',
                description: 'Absoluter Pfad zur neueren JSON-Ergebnisdatei'
              }
            },
            required: ['old_results', 'new_results']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Vor jeder Tool-Ausführung sicherstellen, dass Semgrep verfügbar ist
      await this.ensureSemgrepAvailable();

      switch (request.params.name) {
        case 'scan_directory':
          return await this.handleScanDirectory(request.params.arguments);
        case 'list_rules':
          return await this.handleListRules(request.params.arguments);
        case 'analyze_results':
          return await this.handleAnalyzeResults(request.params.arguments);
        case 'create_rule':
          return await this.handleCreateRule(request.params.arguments);
        case 'filter_results':
          return await this.handleFilterResults(request.params.arguments);
        case 'export_results':
          return await this.handleExportResults(request.params.arguments);
        case 'compare_results':
          return await this.handleCompareResults(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unbekanntes Tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleScanDirectory(args: any) {
    if (!args.path) {
      throw new McpError(ErrorCode.InvalidParams, 'Pfad ist erforderlich');
    }

    const scanPath = this.validateAbsolutePath(args.path, 'path');
    const config = args.config || 'auto';
    
    // Wenn config ein Pfad ist (nicht 'auto'), validieren dass es ein absoluter Pfad ist
    const configParam = config !== 'auto' 
      ? this.validateAbsolutePath(config, 'config')
      : config;

    try {
      const { stdout, stderr } = await execAsync(
        `semgrep scan --json --config ${configParam} ${scanPath}`
      );

      return {
        content: [
          {
            type: 'text',
            text: stdout
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler beim Scannen: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleListRules(args: any) {
    const languageFilter = args.language ? `--lang ${args.language}` : '';
    try {
      // Hole die Registry-Regeln
      const { stdout } = await execAsync('semgrep login --help');
      
      // Formatiere die Ausgabe
      const formattedOutput = `Verfügbare Semgrep Registry-Regeln:

Standardmäßig verfügbare Regelsammlungen:
- p/ci: Grundlegende CI-Regeln
- p/security: Sicherheitsregeln
- p/performance: Performance-Regeln
- p/best-practices: Best-Practice-Regeln

Verwenden Sie diese Regelsammlungen mit --config, z.B.:
semgrep scan --config=p/ci`;

      return {
        content: [
          {
            type: 'text',
            text: formattedOutput
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler beim Abrufen der Regeln: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleAnalyzeResults(args: any) {
    if (!args.results_file) {
      throw new McpError(ErrorCode.InvalidParams, 'Ergebnisdatei ist erforderlich');
    }

    const resultsFile = this.validateAbsolutePath(args.results_file, 'results_file');

    try {
      const { stdout } = await execAsync(`cat ${resultsFile}`);
      const results = JSON.parse(stdout);
      
      // Einfache Analyse der Ergebnisse
      const summary = {
        total_findings: results.results?.length || 0,
        by_severity: {} as Record<string, number>,
        by_rule: {} as Record<string, number>
      };

      for (const finding of results.results || []) {
        const severity = finding.extra.severity || 'unknown';
        const rule = finding.check_id || 'unknown';

        summary.by_severity[severity] = (summary.by_severity[severity] || 0) + 1;
        summary.by_rule[rule] = (summary.by_rule[rule] || 0) + 1;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(summary, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler bei der Analyse: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleCreateRule(args: any) {
    if (!args.output_path || !args.pattern || !args.language || !args.message) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'output_path, pattern, language und message sind erforderlich'
      );
    }

    const outputPath = this.validateAbsolutePath(args.output_path, 'output_path');
    const severity = args.severity || 'WARNING';

    // YAML-Regel erstellen
    const ruleYaml = `
rules:
  - id: custom_rule
    pattern: ${args.pattern}
    message: ${args.message}
    languages: [${args.language}]
    severity: ${severity}
`;

    try {
      await execAsync(`echo '${ruleYaml}' > ${outputPath}`);
      return {
        content: [
          {
            type: 'text',
            text: `Regel wurde erfolgreich in ${outputPath} erstellt`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler beim Erstellen der Regel: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleFilterResults(args: any) {
    if (!args.results_file) {
      throw new McpError(ErrorCode.InvalidParams, 'results_file ist erforderlich');
    }

    const resultsFile = this.validateAbsolutePath(args.results_file, 'results_file');

    try {
      const { stdout } = await execAsync(`cat ${resultsFile}`);
      const results = JSON.parse(stdout);
      
      let filteredResults = results.results || [];

      // Nach Schweregrad filtern
      if (args.severity) {
        filteredResults = filteredResults.filter(
          (finding: any) => finding.extra.severity === args.severity
        );
      }

      // Nach Regel-ID filtern
      if (args.rule_id) {
        filteredResults = filteredResults.filter(
          (finding: any) => finding.check_id === args.rule_id
        );
      }

      // Nach Dateipfad-Muster filtern
      if (args.path_pattern) {
        const pathRegex = new RegExp(args.path_pattern);
        filteredResults = filteredResults.filter(
          (finding: any) => pathRegex.test(finding.path)
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ results: filteredResults }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler beim Filtern der Ergebnisse: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleExportResults(args: any) {
    if (!args.results_file || !args.output_file) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'results_file und output_file sind erforderlich'
      );
    }

    const resultsFile = this.validateAbsolutePath(args.results_file, 'results_file');
    const outputFile = this.validateAbsolutePath(args.output_file, 'output_file');
    const format = args.format || 'text';

    try {
      const { stdout } = await execAsync(`cat ${resultsFile}`);
      const results = JSON.parse(stdout);

      let output = '';
      switch (format) {
        case 'json':
          output = JSON.stringify(results, null, 2);
          break;
        case 'sarif':
          // SARIF-Format erstellen
          const sarifOutput = {
            $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
            version: "2.1.0",
            runs: [{
              tool: {
                driver: {
                  name: "semgrep",
                  rules: results.results.map((r: any) => ({
                    id: r.check_id,
                    name: r.check_id,
                    shortDescription: {
                      text: r.extra.message
                    },
                    defaultConfiguration: {
                      level: r.extra.severity === 'ERROR' ? 'error' : 'warning'
                    }
                  }))
                }
              },
              results: results.results.map((r: any) => ({
                ruleId: r.check_id,
                message: {
                  text: r.extra.message
                },
                locations: [{
                  physicalLocation: {
                    artifactLocation: {
                      uri: r.path
                    },
                    region: {
                      startLine: r.start.line,
                      startColumn: r.start.col,
                      endLine: r.end.line,
                      endColumn: r.end.col
                    }
                  }
                }]
              }))
            }]
          };
          output = JSON.stringify(sarifOutput, null, 2);
          break;
        case 'text':
        default:
          // Menschenlesbares Format
          output = results.results.map((r: any) =>
            `[${r.extra.severity}] ${r.check_id}\n` +
            `File: ${r.path}\n` +
            `Lines: ${r.start.line}-${r.end.line}\n` +
            `Message: ${r.extra.message}\n` +
            '-------------------'
          ).join('\n');
          break;
      }

      await execAsync(`echo '${output}' > ${outputFile}`);
      return {
        content: [
          {
            type: 'text',
            text: `Ergebnisse wurden erfolgreich nach ${outputFile} exportiert`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler beim Exportieren der Ergebnisse: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleCompareResults(args: any) {
    if (!args.old_results || !args.new_results) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'old_results und new_results sind erforderlich'
      );
    }

    const oldResultsFile = this.validateAbsolutePath(args.old_results, 'old_results');
    const newResultsFile = this.validateAbsolutePath(args.new_results, 'new_results');

    try {
      const { stdout: oldContent } = await execAsync(`cat ${oldResultsFile}`);
      const { stdout: newContent } = await execAsync(`cat ${newResultsFile}`);
      
      const oldResults = JSON.parse(oldContent).results || [];
      const newResults = JSON.parse(newContent).results || [];

      // Findings vergleichen
      const oldFindings = new Set(oldResults.map((r: any) =>
        `${r.check_id}:${r.path}:${r.start.line}:${r.start.col}`
      ));

      const comparison = {
        total_old: oldResults.length,
        total_new: newResults.length,
        added: [] as any[],
        removed: [] as any[],
        unchanged: [] as any[]
      };

      // Neue und unveränderte Findings identifizieren
      newResults.forEach((finding: any) => {
        const key = `${finding.check_id}:${finding.path}:${finding.start.line}:${finding.start.col}`;
        if (oldFindings.has(key)) {
          comparison.unchanged.push(finding);
        } else {
          comparison.added.push(finding);
        }
      });

      // Entfernte Findings identifizieren
      oldResults.forEach((finding: any) => {
        const key = `${finding.check_id}:${finding.path}:${finding.start.line}:${finding.start.col}`;
        const exists = newResults.some((newFinding: any) =>
          `${newFinding.check_id}:${newFinding.path}:${newFinding.start.line}:${newFinding.start.col}` === key
        );
        if (!exists) {
          comparison.removed.push(finding);
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: {
                old_findings: comparison.total_old,
                new_findings: comparison.total_new,
                added: comparison.added.length,
                removed: comparison.removed.length,
                unchanged: comparison.unchanged.length
              },
              details: comparison
            }, null, 2)
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Fehler beim Vergleichen der Ergebnisse: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async run() {
    // Beim Start des Servers prüfen und ggf. installieren
    try {
      await this.ensureSemgrepAvailable();
    } catch (error: any) {
      console.error(`Fehler beim Setup von Semgrep: ${error.message}`);
      process.exit(1);
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Semgrep MCP Server läuft auf stdio');
  }
}

const server = new SemgrepServer();
server.run().catch(console.error);