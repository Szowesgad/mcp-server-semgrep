#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a test directory with a simple file for scanning
const testDir = path.join(__dirname, 'test-scan');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
}

// Create a test file with a potential security issue
const testFile = path.join(testDir, 'test.js');
fs.writeFileSync(testFile, `
// Test file with potential security issues
const password = "hardcoded_password";
const sql = "SELECT * FROM users WHERE username = '" + username + "'"; // Potential SQL injection
eval(userInput); // Dangerous eval
`);

// Path to the MCP server executable
const serverPath = path.join(__dirname, 'build', 'index.js');

// Spawn the server process with Semgrep token
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    SEMGREP_APP_TOKEN: '778e6a44531475d91dfa1b38d07f7e233ebad1d876cffc37a5b72b9460a25848'
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Log server output for debugging
server.stderr.on('data', (data) => {
  console.log(`[Server debug]: ${data}`);
});

// Function to send a message to the server
function sendMessage(message) {
  const serialized = JSON.stringify(message) + '\n';
  console.log(`\nSending: ${serialized}`);
  server.stdin.write(serialized);
}

// Process server responses
let responseBuffer = '';
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Process complete messages (messages are newline delimited)
  const messages = responseBuffer.split('\n');
  responseBuffer = messages.pop(); // Keep any partial message for next time
  
  messages.forEach(message => {
    if (message.trim()) {
      console.log('\nReceived response:');
      try {
        const parsed = JSON.parse(message);
        if (parsed.result && parsed.result.content && parsed.result.content[0].text) {
          // For list_rules and scan responses, we'll check if we have Pro-specific content
          const responseText = parsed.result.content[0].text;
          
          // Check for indicators of Pro features
          let hasPro = false;
          if (responseText.includes('--auth-token') || 
              responseText.includes('pro rules') || 
              responseText.includes('team rules') ||
              responseText.includes('r/') || // Pro rule prefix
              responseText.includes('supply-chain') || // Pro rule category
              responseText.includes('SEMGREP_APP_TOKEN')) {
            hasPro = true;
            console.log('\n✅ PRO FEATURES DETECTED: Response contains Pro-specific content');
          }
          
          // Print a shorter version of the response
          console.log('\nResponse text (excerpt):');
          console.log(responseText.substring(0, 500) + '...');
          
          if (!hasPro) {
            console.log('\n❌ NO PRO FEATURES DETECTED: Response does not contain Pro-specific content');
          }
        } else {
          console.log(JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        console.log('Error parsing response:', e);
        console.log('Raw response:', message);
      }
    }
  });
});

// Send test messages in sequence
setTimeout(() => {
  console.log('\nTesting initialize...');
  sendMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '0.1.0',
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      },
      capabilities: {}
    }
  });
}, 1000);

setTimeout(() => {
  console.log('\nTesting list_rules (should include Pro rules)...');
  sendMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'list_rules',
      arguments: {}
    }
  });
}, 3000);

setTimeout(() => {
  console.log('\nTesting scan_directory (should use Pro rules)...');
  sendMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'scan_directory',
      arguments: {
        path: testDir,
        config: 'p/security' // Using a standard ruleset
      }
    }
  });
}, 6000);

// Give the server time to respond and then exit
setTimeout(() => {
  console.log('\nTest completed, cleaning up...');
  server.kill();
  
  // Clean up test files
  try {
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
    console.log('Test files cleaned up');
  } catch (err) {
    console.error('Error cleaning up test files:', err);
  }
  
  process.exit(0);
}, 10000);