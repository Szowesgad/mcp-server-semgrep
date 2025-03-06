# MCP Server Semgrep Example Rules

Welcome to the "Hall of Infamy" - a collection of Semgrep rules designed to catch common, frustrating, and often hilarious code anti-patterns that plague codebases everywhere.

## 🎭 The Gallery of Horrors

This collection includes rules to detect:

- **Z-Index Apocalypse**: Ridiculously high z-index values that try to place elements into orbit
- **TODO Graveyard**: Ancient TODO comments that have been collecting dust for years
- **Magic Number Festival**: Mysterious numeric values that confuse future developers
- **Console.log Infestation**: Debug statements that somehow made it to production
- **Nested Code Labyrinth**: Code so deeply nested that even the Minotaur would get lost

## 🚀 Using These Rules

### Option 1: With MCP Server Semgrep

1. Use the `create_rule` tool to add these to your ruleset:

```
Ask Claude to create a rule based on the examples, for instance:
"Create a rule for detecting excessive z-index values in our CSS files"
```

2. Scan your codebase:

```
Scan my project for z-index issues using the z-index-apocalypse rule
```

### Option 2: Manual Semgrep Usage

Run semgrep with a specific rule:

```bash
semgrep --config examples/rules/z-index-apocalypse.yaml /path/to/your/project
```

Or run all example rules at once:

```bash
semgrep --config examples/rules /path/to/your/project
```

## 🛠️ Creating Your Own Rules

Each rule in this collection follows a common pattern:

```yaml
rules:
  - id: funny-descriptive-name
    pattern: ... # The pattern to detect
    message: "😱 AMUSING ALERT MESSAGE! Explanation of why this is bad."
    languages: [list, of, supported, languages]
    severity: WARNING
    metadata:
      category: type-of-issue
      impact: "Description of the negative impact"
      fix: "How to fix it"
      examples:
        - before: |
            # Bad code example
        - after: |
            # Good code example
```

Feel free to customize these rules or create your own to catch the specific anti-patterns that plague your codebase!

## 🤣 Share Your Findings

Found something hilariously bad in your codebase? Share the anonymized examples with us! The best (worst?) examples might be featured in future versions.

*Remember: We've all written terrible code at some point. These rules are meant to help us laugh at ourselves while improving our codebases.*