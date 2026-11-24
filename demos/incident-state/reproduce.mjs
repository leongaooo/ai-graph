import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { get } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const logPath = join(here, 'sources/incident.log');
const port = 3199;
const lines = [];

function stamp() {
  return new Date().toISOString();
}

function log(message) {
  const line = `${stamp()} ${message}`;
  lines.push(line);
  console.log(line);
}

function probe() {
  return new Promise(resolve => {
    const request = get({ host: '127.0.0.1', port, path: '/health', timeout: 1500 }, response => {
      response.resume();
      response.on('end', () => resolve(String(response.statusCode)));
    });
    request.on('timeout', () => {
      request.destroy();
      resolve('TIMEOUT');
    });
    request.on('error', error => resolve(error.code ?? error.message));
  });
}

function startServer() {
  const child = spawn(process.execPath, ['-e', `
    const http = require('node:http');
    const server = http.createServer((req, res) => {
      if (req.url === '/health') { res.writeHead(200, {'content-type': 'application/json'}); res.end('{"ok":true}'); return; }
      res.writeHead(404); res.end('not found');
    });
    server.listen(${port}, '127.0.0.1', () => console.log('READY ' + process.pid));
    process.on('SIGTERM', () => { console.log('SIGTERM'); server.close(() => process.exit(0)); });
  `], { stdio: ['ignore', 'pipe', 'pipe'] });
  return child;
}

function waitForReady(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 5000);
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      const match = /READY (\d+)/.exec(text);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
  });
}

function waitForExit(child) {
  return new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
}

const first = startServer();
const firstPid = await waitForReady(first);
log(`service_start pid=${firstPid} port=${port}`);
log(`health_probe status=${await probe()}`);
await new Promise(resolve => setTimeout(resolve, 1200));
log('action=sigterm reason=simulate_process_exit');
first.kill('SIGTERM');
const firstExit = await waitForExit(first);
log(`service_exit code=${firstExit.code} signal=${firstExit.signal}`);
log(`health_probe status=${await probe()}`);
log('action=restart reason=restore_service');
const second = startServer();
const secondPid = await waitForReady(second);
log(`service_start pid=${secondPid} port=${port}`);
log(`health_probe status=${await probe()}`);
log('state=recovered note=one_probe_only');
await new Promise(resolve => setTimeout(resolve, 300));
log('action=teardown reason=capture_complete');
second.kill('SIGTERM');
const secondExit = await waitForExit(second);
log(`service_exit code=${secondExit.code} signal=${secondExit.signal}`);

writeFileSync(logPath, `${lines.join('\n')}\n`);
console.log(`\nwrote ${logPath} (${lines.length} lines)`);
