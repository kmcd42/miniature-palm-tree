#!/usr/bin/env node

/**
 * Simple proxy server for Decap CMS local development
 * This allows you to use the CMS without deploying to production
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Decap CMS local backend proxy...\n');

// Run npx decap-server which provides the local Git backend
const proxy = spawn('npx', ['decap-server'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

proxy.on('error', (err) => {
  console.error('❌ Failed to start proxy:', err);
  process.exit(1);
});

proxy.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Proxy exited with code ${code}`);
  }
  process.exit(code);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping proxy...');
  proxy.kill('SIGINT');
});

process.on('SIGTERM', () => {
  proxy.kill('SIGTERM');
});
