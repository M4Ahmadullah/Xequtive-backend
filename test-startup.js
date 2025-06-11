#!/usr/bin/env node

// Test if the app can start without crashing
// This simulates Cloud Run environment with minimal env vars

process.env.NODE_ENV = 'production';
process.env.PORT = '8080';

console.log('Testing app startup with minimal environment variables...');

try {
  // Import the built application
  require('./dist/index.js');
  
  setTimeout(() => {
    console.log('✅ App started successfully!');
    process.exit(0);
  }, 3000);
  
} catch (error) {
  console.error('❌ App failed to start:', error);
  process.exit(1);
} 