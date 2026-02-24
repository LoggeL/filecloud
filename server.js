// Standard Next.js standalone server (no WebDAV monkey-patching needed).
// WebDAV is handled by the separate webdav-handler.js sidecar on port 3001.

const path = require('path');
const dir = path.join(__dirname);
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

const currentPort = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOSTNAME || '0.0.0.0';

let nextConfig;
try {
  const fs = require('fs');
  const configPath = path.join(dir, '.next', 'required-server-files.json');
  if (fs.existsSync(configPath)) {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    nextConfig = data.config;
  }
} catch {}

if (nextConfig) {
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);
}

let keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10);
if (Number.isNaN(keepAliveTimeout) || !Number.isFinite(keepAliveTimeout) || keepAliveTimeout < 0) {
  keepAliveTimeout = undefined;
}

require('next');
const { startServer } = require('next/dist/server/lib/start-server');

startServer({
  dir,
  isDev: false,
  config: nextConfig,
  hostname,
  port: currentPort,
  allowRetry: false,
  keepAliveTimeout,
}).then(() => {
  console.log(`> FileCloud ready on http://${hostname}:${currentPort}`);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
