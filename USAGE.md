# Using MCP Server Semgrep

This guide describes how to use the Semgrep MCP Server in your development workflow and highlights the transformative benefits it brings to code quality, security, and team collaboration.

## Installation

First, make sure you have Node.js (v18+) installed. You'll also need Semgrep, which can be installed separately:

```bash
# macOS:
brew install semgrep

# Linux:
python3 -m pip install semgrep

# Others:
# See https://semgrep.dev/docs/getting-started/
```

Then install the MCP Server:

```bash
# Install from npm (once published)
npm install -g mcp-server-semgrep

# Or directly from GitHub
npm install -g git+https://github.com/Szowesgad/mcp-server-semgrep.git
```

The server will automatically detect your Semgrep installation when it starts.

## Running the Server

```bash
semgrep-mcp
```

The server will start and listen on stdio, ready to accept MCP commands.

## Key Benefits for Development Teams

### 1. Unified Code Analysis Experience

By integrating Semgrep with AI assistants through MCP, developers can perform sophisticated code analysis within their conversational interface. This eliminates context switching between tools and provides natural language interaction with powerful static analysis capabilities.

### 2. Enhanced Code Quality

The integration enables teams to:
- Detect code smells and inconsistencies automatically
- Identify architectural problems across multiple files
- Ensure consistent coding standards
- Reduce technical debt systematically
- Avoid "quick fixes" that introduce new problems

### 3. Improved Security Practices

Security becomes more accessible with:
- Automatic detection of common vulnerabilities
- Customizable security rules for specific project needs
- Educational explanations of security issues and best practices
- Consistent security checks throughout development

### 4. Streamlined Code Reviews

Code reviews become more efficient by:
- Automating tedious parts of reviews (style, common errors)
- Letting reviewers focus on higher-level concerns
- Providing objective analysis of potential issues
- Explaining complex problems in plain language

### 5. Better Developer Experience

The integration enhances developer experience through:
- Conversational interface for complex code analysis
- Immediate feedback on potential issues
- Context-aware code improvement suggestions
- Reduced time spent debugging common problems

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

**Practical Application**: Run this scan before code review or deployment to catch security issues early in the development cycle.

### Listing Available Rules and Supported Languages

```json
{
  "name": "list_rules",
  "arguments": {
    "language": "python"
  }
}
```

**Practical Application**: Discover all available rules for a specific language to better understand what types of issues you can detect and fix.

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

**Practical Application**: Create custom rules for your project's specific requirements, coding standards, or to prevent recurring issues.

### Analyzing Scan Results

```json
{
  "name": "analyze_results",
  "arguments": {
    "results_file": "/absolute/path/to/results.json"
  }
}
```

**Practical Application**: Get a comprehensive summary of issues in your codebase to prioritize fixes and understand overall code health.

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

**Practical Application**: Focus on the most critical issues or specific parts of your codebase to make targeted improvements.

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

**Practical Application**: Integrate scan results with CI/CD pipelines or other tools by exporting them in standard formats like SARIF.

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

**Practical Application**: Track progress over time by comparing scan results before and after refactoring or security fixes.

## Real-World Usage Scenarios

### Scenario 1: Style Consistency Enforcement

**Problem**: Team members use inconsistent z-index values across CSS files, causing layer conflicts.

**Solution**:
1. Create a custom rule to detect z-index values:
```json
{
  "name": "create_rule",
  "arguments": {
    "output_path": "/path/to/z-index-rule.yaml",
    "pattern": "z-index: $Z",
    "language": "css",
    "message": "Z-index $Z may not comply with our layer system. Use our defined constants instead.",
    "severity": "WARNING"
  }
}
```

2. Scan the project to identify all z-index usages:
```json
{
  "name": "scan_directory",
  "arguments": {
    "path": "/path/to/project",
    "config": "/path/to/z-index-rule.yaml"
  }
}
```

3. Ask the AI to analyze patterns and suggest a systematic approach to z-index values.

### Scenario 2: Preventing "Magic Numbers"

**Problem**: Developers use hard-coded numbers throughout the code instead of named constants.

**Solution**:
1. Create a rule to detect numeric literals:
```json
{
  "name": "create_rule",
  "arguments": {
    "output_path": "/path/to/magic-numbers.yaml",
    "pattern": "$X = $NUM",
    "language": "javascript",
    "message": "Consider replacing numeric literal with a named constant",
    "severity": "INFO"
  }
}
```

2. Scan the codebase for these patterns:
```json
{
  "name": "scan_directory",
  "arguments": {
    "path": "/path/to/project",
    "config": "/path/to/magic-numbers.yaml"
  }
}
```

3. Have the AI suggest appropriate constant names and refactoring approaches.

## Integration with Development Workflows

### Continuous Integration

Add Semgrep MCP Server scans to your CI pipeline to:
- Block PRs with security issues
- Enforce coding standards automatically
- Track code quality metrics over time

### Code Review Process

Integrate scans into your code review process:
- Run pre-review scans to catch common issues
- Focus human reviewers on more complex aspects
- Provide objective analysis of changes

### Developer Education

Use the explanatory capabilities to:
- Help junior developers understand issues
- Share best practices in context
- Build a security-aware development culture

## Integration with MCP Clients

The Semgrep MCP Server can be integrated with any MCP-compatible client, including:

- Large language models with MCP support (like Claude)
- IDE extensions that implement MCP
- Custom tooling that uses the MCP protocol

### Claude Integration

When using with Claude, you can:
1. Ask for scans with natural language
2. Request explanations of detected issues
3. Get help creating custom rules for your specific needs
4. Receive refactoring suggestions for problematic code

For example:
```
Claude, can you scan my project for security issues, focusing on input validation and sanitization?
```

For more information on the MCP protocol, see the [Model Context Protocol documentation](https://github.com/llm-mcp/model-context-protocol).

## Advanced Usage

### Custom Rule Creation Best Practices

When creating custom rules:
- Start with the most common patterns
- Use pattern variables (`$X`) to make rules flexible
- Include clear, actionable messages
- Test rules on sample code first

### Rule Categories to Consider

Consider creating rules for:
- Project-specific patterns and anti-patterns
- Framework-specific best practices
- Company coding standards
- Security requirements
- Performance optimization patterns

### Fun and Practical Example Rules

Check out our [examples/](examples/) directory for a collection of amusing but practical rules that can detect common code issues:

- **Z-Index Apocalypse Detector**: Find absurdly high z-index values
- **TODO Graveyard Finder**: Discover ancient TODO comments from years past
- **Magic Number Festival**: Locate mysterious magic numbers throughout your code
- **Console.log Infestation**: Detect debug statements that shouldn't be in production
- **Nested Code Labyrinth**: Find code with excessive nesting levels

These rules demonstrate both the power of Semgrep and common issues that plague many codebases. They're written with humor but address real problems that affect code quality and maintainability.

### Embedding in Development Culture

For maximum benefit:
- Make scanning part of your definition of "done"
- Create team-specific rulesets
- Regular reviews and updates of rules
- Share and celebrate improvements over time
- Use humor (like our example rules) to make the process enjoyable
