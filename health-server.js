// Lightweight health endpoint on port 7861
// OpenClaw runs on 7860, this runs alongside it
// Returns 200 OK for keep-alive pings and external monitoring
const http = require('http');

const PORT = process.env.HEALTH_PORT || 7861;
const startTime = Date.now();

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      uptime: uptime,
      uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 Health server listening on port ${PORT}`);
});
