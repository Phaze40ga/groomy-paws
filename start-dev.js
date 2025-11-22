#!/usr/bin/env node

/**
 * Start both frontend and backend servers
 * Usage: node start-dev.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check .env files
if (!existsSync(join(__dirname, 'server', '.env'))) {
  log('⚠️  Warning: server/.env not found', 'yellow');
  log('Please create server/.env with your MySQL credentials', 'yellow');
}

if (!existsSync(join(__dirname, '.env'))) {
  log('⚠️  Warning: .env not found', 'yellow');
  log('Creating .env...', 'yellow');
  const fs = await import('fs');
  fs.writeFileSync(join(__dirname, '.env'), 'VITE_API_URL=http://localhost:3001/api\n');
  log('✅ Created .env', 'green');
}

log('🚀 Starting Groomy Paws Development Servers...\n', 'blue');

// Start backend
log('📦 Starting backend server on http://localhost:3001', 'blue');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true,
});

// Wait a bit before starting frontend
await new Promise(resolve => setTimeout(resolve, 2000));

// Start frontend
log('🎨 Starting frontend server...', 'blue');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
});

// Handle cleanup
function cleanup() {
  log('\n🛑 Stopping servers...', 'yellow');
  backend.kill();
  frontend.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

log('\n✅ Both servers are running!', 'green');
log('📊 Backend:  http://localhost:3001', 'blue');
log('🎨 Frontend: http://localhost:5173 (check terminal for actual port)', 'blue');
log('\nPress Ctrl+C to stop both servers\n', 'yellow');

// Wait for processes
backend.on('exit', (code) => {
  if (code !== null && code !== 0 && code !== 130) {
    log('Backend server exited with error', 'red');
  }
  cleanup();
});

frontend.on('exit', (code) => {
  if (code !== null && code !== 0 && code !== 130) {
    log('Frontend server exited with error', 'red');
  }
  cleanup();
});

