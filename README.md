# Semgrep MCP Server

A Model Context Protocol (MCP) Server for integrating Semgrep into Claude and other LLM environments. This server enables AI assistants to perform static code analysis, manage Semgrep rules, and help identify security vulnerabilities in your code.

## Features

- **Code Scanning** - Scan directories for security issues and bugs
- **Rules Management** - List, create, and manage Semgrep rules
- **Results Analysis** - Filter, export, and compare scan results
- **AI Integration** - Tight integration with Claude and other MCP-compatible LLMs

## Installation

### Prerequisites

- Node.js (v18+)
- Python 3 with pip
- Semgrep (`pip install semgrep` or `uv pip install semgrep`)

### Setup

```bash
# Clone the repository
git clone https://github.com/Szowesgad/semgrep-mcp-server.git
cd semgrep-mcp-server

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

## Integration with Claude Desktop

To integrate this server with Claude Desktop, add the following to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "semgrep": {
      "command": "node",
      "args": [
        "/path/to/semgrep-mcp-server/build/index.js"
      ],
      "env": {
        "MCP_LOG_DIR": "/path/to/log/directory"
      }
    }
  }
}
```

Make sure to replace `/path/to/semgrep-mcp-server/` with the actual path where you cloned the repository.

## Available Tools

The server provides the following MCP tools:

### `scan_directory`

Performs a Semgrep scan on a directory:

```
Input: {
  "path": "/path/to/directory",  // Directory to scan (required)
  "config": "auto"  // Semgrep config (optional, defaults to "auto")
}
```

### `list_rules`

Lists available Semgrep rules:

```
Input: {
  "language": "javascript"  // Optional filter by language
}
```

### `analyze_results`

Analyzes scan results to provide insights:

```
Input: {
  "results_file": "/path/to/results.json"  // Path to results file
}
```

### `create_rule`

Creates a new Semgrep rule:

```
Input: {
  "output_path": "/path/to/rule.yaml",  // Path to save the rule
  "pattern": "pattern {...}",           // Search pattern 
  "language": "python",                 // Target language
  "message": "Error message",           // Message to display
  "severity": "WARNING"                 // Severity level (optional)
}
```

### `filter_results`

Filters scan results by various criteria:

```
Input: {
  "results_file": "/path/to/results.json",  // Path to results file
  "severity": "ERROR",                      // Filter by severity (optional)
  "rule_id": "rule-id",                     // Filter by rule ID (optional)
  "path_pattern": ".*\\.js$"                // Filter by file path (optional)
}
```

### `export_results`

Exports scan results in various formats:

```
Input: {
  "results_file": "/path/to/results.json",  // Path to results file
  "output_file": "/path/to/output",         // Path to output file
  "format": "json"                          // Format: json, sarif, text (optional)
}
```

### `compare_results`

Compares two scan results:

```
Input: {
  "old_results": "/path/to/old.json",  // Path to old results file
  "new_results": "/path/to/new.json"   // Path to new results file
}
```

## Examples with Claude

Here are some examples of how to use Semgrep MCP Server with Claude:

### Scanning a Directory

```
Can you scan my project directory at /Users/myuser/projects/myapp for security vulnerabilities using Semgrep?
```

### Creating a Custom Rule

```
I want to find all usages of eval() in my JavaScript code. Can you create a Semgrep rule for this and scan my codebase?
```

### Comparing Before and After Changes

```
I've made some security improvements. Can you compare the scan results before (/tmp/before.json) and after (/tmp/after.json) to see what issues were fixed?
```

## Development

```bash
# Run in development mode (hot reloading)
pnpm run dev

# Build for production
pnpm run build

# Start the server
pnpm start
```

## License

ISC License
