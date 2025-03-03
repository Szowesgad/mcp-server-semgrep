# Semgrep Server

A Model Context Protocol (MCP) Server for integrating Semgrep into the development environment. This server allows for the execution of static code analyses and the management of Semgrep rules directly via the MCP protocol.

## Installation

```bash
# Clone repository
git clone [repository-url]
cd semgrep-server

# Install dependencies
npm install

# Build server
npm run build
```

## Usage

The server can be started in the following ways:

```bash
# Production mode
npm start

# Development mode
npm run dev
```

## Available Tools

The server provides the following MCP tools:

- `scan_directory`: Performs a Semgrep scan in a directory
- `list_rules`: Lists available Semgrep rules
- `analyze_results`: Analyzes scan results
- `create_rule`: Creates a new Semgrep rule
- `filter_results`: Filters scan results by various criteria
- `export_results`: Exports scan results in different formats
- `compare_results`: Compares two scan results

## Development

The project is written in TypeScript and uses the MCP SDK for server implementation.

### Project Structure

```
semgrep-server/
├── src/                 # Source code
│   ├── handlers/        # Tool handlers
│   ├── utils/           # Utility functions
│   ├── config.ts        # Configuration
│   └── index.ts         # Main server
├── build/               # Compiled JavaScript files
├── tests/               # Test files
└── test-rule.yaml       # Example Semgrep rule
```

### Dependencies

- Node.js (>=18) & npm
- TypeScript
- MCP SDK
- Axios for HTTP requests
- Python & pip3 (for semgrep)

## Testing

Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## License

This project is licensed under the ISC License. More details can be found in the [LICENSE](LICENSE) file.
