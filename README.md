# Semgrep MCP Server

This project was initially inspired by [stefanskiasan/semgrep-mcp-server](https://github.com/stefanskiasan/semgrep-mcp-server), but has evolved with significant architectural improvements and robust MCP protocol implementation.

## Overview

Semgrep MCP Server provides integration between Semgrep static code analysis tool and Claude AI through Model Context Protocol (MCP). This allows Claude to use Semgrep's capabilities for code scanning, rule management, and result analysis.

## Key Features

- **Static Code Analysis**: Scan directories for security vulnerabilities, bugs, and code quality issues
- **Rule Management**: List, create, and manage Semgrep rules
- **Result Processing**: Filter, analyze, and export scan results
- **Result Comparison**: Compare scan results to track changes over time

## Technical Details

The project implements a Model Context Protocol (MCP) server that:
- Uses the official MCP SDK for protocol compliance
- Provides a robust bridge between Semgrep and Claude
- Handles all MCP protocol specifics (JSON-RPC, notifications, error handling)
- Manages Semgrep installation and execution

## Installation

```bash
# Clone the repository
git clone https://github.com/Szowesgad/mcp-server-semgrep.git
cd mcp-server-semgrep

# Install dependencies
npm install
# or
pnpm install

# Build the project
npm run build
# or
pnpm run build
```

## Usage

To use this server with Claude, configure it in your Claude Desktop configuration:

```json
"semgrep": {
  "command": "node",
  "args": [
    "/path/to/mcp-server-semgrep/build/index.js"
  ]
}
```

## Requirements

- Node.js 18+
- Semgrep (installed via brew, pip, or other package managers)
