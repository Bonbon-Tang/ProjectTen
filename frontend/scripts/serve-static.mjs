import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..', 'dist');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const apiTarget = process.env.API_TARGET || 'http://127.0.0.1:5000';
const apiUrl = new URL(apiTarget);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function safePath(urlPath) {
  const clean = decodeURIComponent((urlPath || '/').split('?')[0]);
  const normalized = path.normalize(clean).replace(/^\.+[\\/]+/, '');
  return path.join(root, normalized);
}

const server = http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) {
    const transport = apiUrl.protocol === 'https:' ? https : http;
    const proxyReq = transport.request({
      protocol: apiUrl.protocol,
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: apiUrl.host,
      },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      send(res, 502, JSON.stringify({ code: 502, message: `API proxy error: ${err.message}`, data: null }), {
        'Content-Type': 'application/json; charset=utf-8',
      });
    });
    req.pipe(proxyReq);
    return;
  }

  let filePath = safePath(req.url || '/');
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(root, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 500, 'Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
  });
});

server.listen(port, host, () => {
  console.log(`Static frontend serving ${root} at http://${host}:${port}`);
});
