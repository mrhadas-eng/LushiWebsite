// Response-dropping proxy for the lost-response test (test plan T10c), usable against the fake CRM or a LOCAL
// OfficeCRM (never production). It forwards each request to the target unchanged, waits for the target's answer
// (so the lead IS saved), and in "drop-once" mode closes the connection without passing that answer back.
// Usage: node test/e2e/drop-response-proxy.mjs [listenPort=8798] [target=http://127.0.0.1:8799]
//   then point the Worker's CRM_WEBHOOK_URL at http://127.0.0.1:<listenPort>/api/leads/webhook
//   GET /proxy-mode/drop-once | /proxy-mode/pass   switches mode;   GET /proxy-stats → { forwarded, dropped }
import http from 'node:http';

const port = Number(process.argv[2] || 8798);
const target = new URL(process.argv[3] || 'http://127.0.0.1:8799');
let mode = 'pass', forwarded = 0, dropped = 0;

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/proxy-mode/')) { mode = req.url.slice(12); return res.end(mode); }
  if (req.method === 'GET' && req.url === '/proxy-stats') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ mode, forwarded, dropped })); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const headers = { ...req.headers, host: target.host };
    const up = http.request({ hostname: target.hostname, port: target.port, path: req.url, method: req.method, headers }, (ur) => {
      const body = [];
      ur.on('data', (c) => body.push(c));
      ur.on('end', () => {
        forwarded++;
        if (mode === 'drop-once') { mode = 'pass'; dropped++; return req.socket.destroy(); }   // the answer is lost
        res.writeHead(ur.statusCode, ur.headers);
        res.end(Buffer.concat(body));
      });
    });
    up.on('error', () => req.socket.destroy());
    up.end(Buffer.concat(chunks));
  });
}).listen(port, '127.0.0.1', () => console.log(`drop-response proxy on ${port} → ${target.origin}`));
