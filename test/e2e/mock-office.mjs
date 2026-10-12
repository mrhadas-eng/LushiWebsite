// Mock of the OfficeCRM leads webhook for local browser tests (never the real CRM).
// GET /mode/<ok|success-false|missing-success|malformed|500> switches behaviour; GET /last shows the last request.
import http from 'node:http';
const KEY = 'local-test-key';
let mode = 'ok', last = null, count = 0;
http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/mode/')) { mode = req.url.slice(6); return res.end(mode); }
  if (req.method === 'GET' && req.url === '/last') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ count, last })); }
  if (req.method === 'POST' && req.url === '/api/leads/webhook') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      count++;
      last = { auth: req.headers.authorization, type: req.headers['content-type'], body };
      res.setHeader('Content-Type', 'application/json');
      if (req.headers.authorization !== `Bearer ${KEY}`) { res.statusCode = 401; return res.end('{"success":false,"error":"unauthorized"}'); }
      const lead = JSON.parse(body);
      if (!['name', 'phone', 'email', 'source'].every((k) => lead[k])) { res.statusCode = 400; return res.end('{"success":false,"error":"missing"}'); }
      if (mode === 'success-false') return res.end('{"success":false,"error":"duplicate"}');
      if (mode === 'missing-success') return res.end('{"leadId":"L-9"}');
      if (mode === 'malformed') return res.end('{"success":tru');
      if (mode === '500') { res.statusCode = 500; return res.end('error'); }
      if (mode === 'hang') return;                       // never answers → Worker times out
      if (mode === 'reset') return req.socket.destroy(); // connection dropped → network failure
      res.end(JSON.stringify({ success: true, leadId: `L-${count}` }));
    });
    return;
  }
  res.statusCode = 404; res.end();
}).listen(8799, '127.0.0.1', () => console.log('mock OfficeCRM on 8799'));
