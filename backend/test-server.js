#!/usr/bin/env node
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

console.log('[TEST] Starting test server...');

const app = express();
const PORT = 3000;

console.log('[TEST] Setting up middleware...');
app.use(cors());
app.use(bodyParser.json());

console.log('[TEST] Registering /health endpoint...');
app.get('/health', (req, res) => {
  console.log('[TEST] /health endpoint called!');
  res.json({ status: 'OK', timestamp: Date.now() });
});

console.log('[TEST] Starting server...');
const server = app.listen(PORT, () => {
  console.log(`[TEST] Server listening on port ${PORT}`);
});

// Keep server running
process.on('SIGINT', () => {
  console.log('[TEST] Server shutting down...');
  server.close();
  process.exit(0);
});

console.log('[TEST] Setup complete, waiting for requests...');
