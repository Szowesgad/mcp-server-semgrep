# Using Semgrep MCP Server

This guide describes how to use the Semgrep MCP Server in your development workflow.

## Installation

First, make sure you have Node.js (v18+) installed, as well as Python and pip3 (required for Semgrep).

```bash
# Install from npm (once published)
npm install -g mcp-server-semgrep

# Or directly from GitHub
npm install -g git+https://github.com/Szowesgad/mcp-server-semgrep.git
```

## Running the Server

```bash
semgrep-mcp
```

The server will start and listen on stdio, ready to accept MCP commands.

## Tool Examples

### Scanning a Directory

```json
{
  "name": "scan_directory",
  "arguments": {
    "path": "/absolute/path/to/code",
    "config": "p/security"
  }
}
```

This will scan the specified directory using Semgrep's security ruleset.

### Listing Available Rules

```json
{
  "name": "list_rules",
  "arguments": {
    "language": "python"
  }
}
```

This will list all available rules for Python.

### Creating a Custom Rule

```json
{
  "name": "create_rule",
  "arguments": {
    "output_path": "/absolute/path/to/my-rule.yaml",
    "pattern": "eval(...)",
    "language": "javascript",
    "message": "Avoid using eval() as it can lead to code injection vulnerabilities",
    "severity": "ERROR"
  }
}
```

This creates a custom rule that flags usage of `eval()` in JavaScript.

### Analyzing Scan Results

```json
{
  "name": "analyze_results",
  "arguments": {
    "results_file": "/absolute/path/to/results.json"
  }
}
```

This will analyze the scan results and provide a summary.

### Filtering Results

```json
{
  "name": "filter_results",
  "arguments": {
    "results_file": "/absolute/path/to/results.json",
    "severity": "ERROR",
    "path_pattern": "\\.js$"
  }
}
```

This will filter the results to show only ERROR severity issues in JavaScript files.

### Exporting Results

```json
{
  "name": "export_results",
  "arguments": {
    "results_file": "/absolute/path/to/results.json",
    "output_file": "/absolute/path/to/report.sarif",
    "format": "sarif"
  }
}
```

This exports the results in SARIF format, which can be used in various CI/CD systems.

### Comparing Results

```json
{
  "name": "compare_results",
  "arguments": {
    "old_results": "/absolute/path/to/old-results.json",
    "new_results": "/absolute/path/to/new-results.json"
  }
}
```

This compares two result sets to show what issues were fixed, added, or unchanged.

## Integration with MCP Clients

The Semgrep MCP Server can be integrated with any MCP-compatible client, including:

- Large language models with MCP support
- IDE extensions that implement MCP
- Custom tooling that uses the MCP protocol

For more information on the MCP protocol, see the [Model Context Protocol documentation](https://github.com/llm-mcp/model-context-protocol).
