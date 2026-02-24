#!/usr/bin/env node
// Standalone WebDAV server for FileCloud.
// Runs on port 3001 as a sidecar to the Next.js app (port 3000).
// Uses the same SQLite database and upload directory.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Config ──────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.WEBDAV_PORT, 10) || 3001;
const DB_PATH = process.env.DB_PATH || '/data/files.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

// ─── Lazy-loaded deps (same as Next.js app) ─────────────────────────────────

let _db = null;
let _bcrypt = null;

function getDb() {
  if (!_db) {
    const Database = require('better-sqlite3');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

function getBcrypt() {
  if (!_bcrypt) _bcrypt = require('bcryptjs');
  return _bcrypt;
}

function uuidv4() {
  return crypto.randomUUID();
}

// ─── MIME type lookup (minimal, no extra dep) ────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html', '.htm': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.md': 'text/markdown', '.csv': 'text/csv',
  '.pdf': 'application/pdf', '.zip': 'application/zip',
  '.gz': 'application/gzip', '.tar': 'application/x-tar',
  '.7z': 'application/x-7z-compressed', '.rar': 'application/vnd.rar',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
  '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ts': 'text/typescript', '.tsx': 'text/typescript', '.jsx': 'text/javascript',
  '.py': 'text/x-python', '.rb': 'text/x-ruby', '.go': 'text/x-go',
  '.rs': 'text/x-rust', '.java': 'text/x-java', '.c': 'text/x-c',
  '.cpp': 'text/x-c++', '.h': 'text/x-c', '.sh': 'text/x-sh',
  '.yaml': 'text/yaml', '.yml': 'text/yaml', '.toml': 'text/x-toml',
  '.ini': 'text/plain', '.cfg': 'text/plain', '.log': 'text/plain',
  '.sql': 'text/x-sql', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
};

function lookupMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// ─── Windows junk files ──────────────────────────────────────────────────────

const IGNORED_FILES = new Set([
  'desktop.ini', 'thumbs.db', '.ds_store', 'folder.jpg', 'folder.gif',
  'albumartsmall.jpg', 'albumart_{', '.trashes', '.spotlight-v100',
  '.fseventsd', 'autorun.inf',
]);

function isIgnored(name) {
  return IGNORED_FILES.has(name.toLowerCase());
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function authenticateBasic(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Basic ')) return null;

  const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf-8');
  const colon = decoded.indexOf(':');
  if (colon === -1) return null;

  const email = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1);

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return null;

  if (!getBcrypt().compareSync(password, user.password_hash)) return null;
  return { id: user.id, email: user.email, display_name: user.display_name };
}

// ─── Path resolution (virtual path → DB records) ────────────────────────────

function resolvePath(userId, segments) {
  const parts = segments.filter(s => s.length > 0);
  const db = getDb();

  if (parts.length === 0) {
    return { folderId: null, file: null, folder: null, isRoot: true, segments: parts, name: '' };
  }

  // Walk folder tree
  let currentFolderId = null;
  for (let i = 0; i < parts.length - 1; i++) {
    const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(userId, currentFolderId);
    const match = folders.find(f => f.name === parts[i]);
    if (!match) {
      return { folderId: null, file: null, folder: null, isRoot: false, segments: parts, name: parts[parts.length - 1] };
    }
    currentFolderId = match.id;
  }

  const lastName = parts[parts.length - 1];

  // Check folder
  const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(userId, currentFolderId);
  const folderMatch = folders.find(f => f.name === lastName);
  if (folderMatch) {
    return { folderId: currentFolderId, file: null, folder: folderMatch, isRoot: false, segments: parts, name: lastName };
  }

  // Check file
  const files = db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS ? ORDER BY name').all(userId, currentFolderId);
  const fileMatch = files.find(f => f.original_name === lastName);
  if (fileMatch) {
    return { folderId: currentFolderId, file: fileMatch, folder: null, isRoot: false, segments: parts, name: lastName };
  }

  // Not found - return parent context for creation
  return { folderId: currentFolderId, file: null, folder: null, isRoot: false, segments: parts, name: lastName };
}

function resolveParentPath(userId, segments) {
  const parts = segments.filter(s => s.length > 0);
  if (parts.length <= 1) return null; // parent is root

  const db = getDb();
  let currentFolderId = null;
  for (let i = 0; i < parts.length - 1; i++) {
    const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(userId, currentFolderId);
    const match = folders.find(f => f.name === parts[i]);
    if (!match) return false; // parent doesn't exist
    currentFolderId = match.id;
  }
  return currentFolderId;
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toUTCString();
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  return d.toUTCString();
}

function folderPropXml(href, name, createdAt) {
  return `<D:response>
<D:href>${escapeXml(href)}</D:href>
<D:propstat>
<D:prop>
<D:displayname>${escapeXml(name)}</D:displayname>
<D:resourcetype><D:collection/></D:resourcetype>
<D:getcontenttype>httpd/unix-directory</D:getcontenttype>
<D:getlastmodified>${formatDate(createdAt)}</D:getlastmodified>
<D:creationdate>${formatDate(createdAt)}</D:creationdate>
<D:supportedlock>
<D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry>
</D:supportedlock>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
}

function filePropXml(href, file) {
  return `<D:response>
<D:href>${escapeXml(href)}</D:href>
<D:propstat>
<D:prop>
<D:displayname>${escapeXml(file.original_name)}</D:displayname>
<D:resourcetype/>
<D:getcontenttype>${escapeXml(file.mime_type)}</D:getcontenttype>
<D:getcontentlength>${file.size}</D:getcontentlength>
<D:getlastmodified>${formatDate(file.updated_at)}</D:getlastmodified>
<D:creationdate>${formatDate(file.created_at)}</D:creationdate>
<D:getetag>"${file.id}"</D:getetag>
<D:supportedlock>
<D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry>
</D:supportedlock>
</D:prop>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>`;
}

function multistatusWrap(inner) {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
${inner}
</D:multistatus>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPathSegments(urlPath) {
  // Strip /webdav/ prefix (Traefik rewrites /webdav/* → port 3001)
  // Support both /webdav/... and bare /... paths
  let rel = urlPath;
  if (rel.startsWith('/webdav/')) {
    rel = rel.slice('/webdav'.length); // keep leading /
  } else if (rel === '/webdav') {
    rel = '/';
  }
  return decodeURIComponent(rel).split('/').filter(s => s.length > 0);
}

function buildHref(segments) {
  if (segments.length === 0) return '/webdav/';
  return '/webdav/' + segments.map(s => encodeURIComponent(s)).join('/');
}

function davHeaders(extra = {}) {
  return {
    'DAV': '1, 2',
    'MS-Author-Via': 'DAV',
    ...extra,
  };
}

function sendResponse(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body != null) {
    res.end(body);
  } else {
    res.end();
  }
}

// ─── Read request body as Buffer ─────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ─── Method Handlers ─────────────────────────────────────────────────────────

function handleOptions(res) {
  sendResponse(res, 200, {
    ...davHeaders(),
    'Allow': 'OPTIONS, GET, HEAD, PUT, DELETE, MKCOL, PROPFIND, PROPPATCH, MOVE, COPY, LOCK, UNLOCK',
    'Content-Length': '0',
  }, null);
}

function handlePropfind(res, user, segments, depth) {
  const resolved = resolvePath(user.id, segments);
  const db = getDb();

  if (resolved.isRoot) {
    let xml = folderPropXml('/webdav/', 'FileCloud', new Date().toISOString());
    if (depth !== '0') {
      const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL ORDER BY name').all(user.id);
      for (const f of folders) {
        xml += folderPropXml(buildHref([f.name]) + '/', f.name, f.created_at);
      }
      const files = db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL ORDER BY name').all(user.id);
      for (const f of files) {
        xml += filePropXml(buildHref([f.original_name]), f);
      }
    }
    sendResponse(res, 207, { ...davHeaders(), 'Content-Type': 'application/xml; charset=utf-8' }, multistatusWrap(xml));
    return;
  }

  if (resolved.folder) {
    const folderHref = buildHref(segments) + '/';
    let xml = folderPropXml(folderHref, resolved.folder.name, resolved.folder.created_at);
    if (depth !== '0') {
      const subfolders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(user.id, resolved.folder.id);
      for (const f of subfolders) {
        xml += folderPropXml(buildHref([...segments, f.name]) + '/', f.name, f.created_at);
      }
      const files = db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS ? ORDER BY name').all(user.id, resolved.folder.id);
      for (const f of files) {
        xml += filePropXml(buildHref([...segments, f.original_name]), f);
      }
    }
    sendResponse(res, 207, { ...davHeaders(), 'Content-Type': 'application/xml; charset=utf-8' }, multistatusWrap(xml));
    return;
  }

  if (resolved.file) {
    const xml = filePropXml(buildHref(segments), resolved.file);
    sendResponse(res, 207, { ...davHeaders(), 'Content-Type': 'application/xml; charset=utf-8' }, multistatusWrap(xml));
    return;
  }

  sendResponse(res, 404, davHeaders(), 'Not Found');
}

function handleGet(res, user, segments) {
  const resolved = resolvePath(user.id, segments);

  if (resolved.isRoot || resolved.folder) {
    sendResponse(res, 405, davHeaders(), 'Not a file');
    return;
  }

  if (!resolved.file) {
    sendResponse(res, 404, davHeaders(), 'Not Found');
    return;
  }

  const filePath = path.join(UPLOAD_DIR, resolved.file.storage_path);
  if (!fs.existsSync(filePath)) {
    sendResponse(res, 404, davHeaders(), 'File not found on disk');
    return;
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    ...davHeaders(),
    'Content-Type': resolved.file.mime_type,
    'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(resolved.file.original_name)}"`,
    'ETag': `"${resolved.file.id}"`,
    'Last-Modified': formatDate(resolved.file.updated_at),
  });
  fs.createReadStream(filePath).pipe(res);
}

function handleHead(res, user, segments) {
  const resolved = resolvePath(user.id, segments);

  if (resolved.isRoot || resolved.folder) {
    sendResponse(res, 200, { ...davHeaders(), 'Content-Type': 'httpd/unix-directory' }, null);
    return;
  }

  if (!resolved.file) {
    sendResponse(res, 404, davHeaders(), null);
    return;
  }

  sendResponse(res, 200, {
    ...davHeaders(),
    'Content-Type': resolved.file.mime_type,
    'Content-Length': String(resolved.file.size),
    'ETag': `"${resolved.file.id}"`,
    'Last-Modified': formatDate(resolved.file.updated_at),
  }, null);
}

async function handlePut(req, res, user, segments) {
  if (segments.length === 0) {
    sendResponse(res, 405, davHeaders(), 'Cannot PUT to root');
    return;
  }

  const fileName = segments[segments.length - 1];
  if (isIgnored(fileName)) {
    sendResponse(res, 204, davHeaders(), null);
    return;
  }

  const parentFolderId = resolveParentPath(user.id, segments);
  if (parentFolderId === false) {
    sendResponse(res, 409, davHeaders(), 'Parent folder not found');
    return;
  }

  const buffer = await readBody(req);
  const db = getDb();

  // Check if file already exists (overwrite)
  const existingFiles = db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS ? ORDER BY name').all(user.id, parentFolderId);
  const existing = existingFiles.find(f => f.original_name === fileName);

  if (existing) {
    const filePath = path.join(UPLOAD_DIR, existing.storage_path);
    fs.writeFileSync(filePath, buffer);
    db.prepare("UPDATE files SET size = ?, mime_type = ?, updated_at = datetime('now') WHERE id = ?")
      .run(buffer.length, lookupMime(fileName), existing.id);
    sendResponse(res, 204, { ...davHeaders(), 'ETag': `"${existing.id}"` }, null);
    return;
  }

  // New file
  const fileId = uuidv4();
  const ext = path.extname(fileName);
  const storageName = fileId + ext;
  const mimeType = lookupMime(fileName);

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, storageName), buffer);

  db.prepare(
    'INSERT INTO files (id, name, original_name, mime_type, size, folder_id, user_id, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(fileId, storageName, fileName, mimeType, buffer.length, parentFolderId, user.id, storageName);

  sendResponse(res, 201, { ...davHeaders(), 'ETag': `"${fileId}"` }, null);
}

function handleMkcol(res, user, segments) {
  if (segments.length === 0) {
    sendResponse(res, 405, davHeaders(), 'Cannot create root');
    return;
  }

  const folderName = segments[segments.length - 1];
  const parentFolderId = resolveParentPath(user.id, segments);
  if (parentFolderId === false) {
    sendResponse(res, 409, davHeaders(), 'Parent folder not found');
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(user.id, parentFolderId)
    .find(f => f.name === folderName);
  if (existing) {
    sendResponse(res, 405, davHeaders(), 'Folder already exists');
    return;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO folders (id, name, parent_id, user_id) VALUES (?, ?, ?, ?)').run(id, folderName, parentFolderId, user.id);
  sendResponse(res, 201, davHeaders(), null);
}

function handleDelete(res, user, segments) {
  if (segments.length === 0) {
    sendResponse(res, 403, davHeaders(), 'Cannot delete root');
    return;
  }

  const resolved = resolvePath(user.id, segments);
  const db = getDb();

  if (resolved.file) {
    // Delete file from disk and DB
    const filePath = path.join(UPLOAD_DIR, resolved.file.storage_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("DELETE FROM shares WHERE item_id = ? AND item_type = 'file'").run(resolved.file.id);
    db.prepare('DELETE FROM files WHERE id = ?').run(resolved.file.id);
    sendResponse(res, 204, davHeaders(), null);
    return;
  }

  if (resolved.folder) {
    deleteFolderRecursive(db, resolved.folder.id);
    sendResponse(res, 204, davHeaders(), null);
    return;
  }

  sendResponse(res, 404, davHeaders(), 'Not Found');
}

function deleteFolderRecursive(db, folderId) {
  // Delete files in folder
  const files = db.prepare('SELECT id, storage_path FROM files WHERE folder_id = ?').all(folderId);
  for (const f of files) {
    const filePath = path.join(UPLOAD_DIR, f.storage_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare("DELETE FROM shares WHERE item_id = ? AND item_type = 'file'").run(f.id);
    db.prepare('DELETE FROM files WHERE id = ?').run(f.id);
  }
  // Recurse into subfolders
  const subfolders = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(folderId);
  for (const sf of subfolders) {
    deleteFolderRecursive(db, sf.id);
  }
  db.prepare("DELETE FROM shares WHERE item_id = ? AND item_type = 'folder'").run(folderId);
  db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
}

function handleMove(req, res, user, segments) {
  if (segments.length === 0) {
    sendResponse(res, 403, davHeaders(), 'Cannot move root');
    return;
  }

  const destination = req.headers['destination'];
  if (!destination) {
    sendResponse(res, 400, davHeaders(), 'Destination header required');
    return;
  }

  let destUrl;
  try {
    destUrl = new URL(destination);
  } catch {
    try {
      destUrl = new URL(destination, `http://${req.headers['host'] || 'localhost'}`);
    } catch {
      sendResponse(res, 400, davHeaders(), 'Invalid destination');
      return;
    }
  }

  const destPath = decodeURIComponent(destUrl.pathname);
  let destRel = destPath;
  if (destRel.startsWith('/webdav/')) destRel = destRel.slice('/webdav'.length);
  else if (destRel === '/webdav') destRel = '/';
  const destSegments = destRel.split('/').filter(s => s.length > 0);

  if (destSegments.length === 0) {
    sendResponse(res, 403, davHeaders(), 'Cannot move to root');
    return;
  }

  const resolved = resolvePath(user.id, segments);
  const destName = destSegments[destSegments.length - 1];
  const destParentId = resolveParentPath(user.id, destSegments);
  if (destParentId === false) {
    sendResponse(res, 409, davHeaders(), 'Destination parent not found');
    return;
  }

  const overwrite = req.headers['overwrite'] !== 'F';
  const db = getDb();

  if (resolved.file) {
    const destFiles = db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS ? ORDER BY name').all(user.id, destParentId);
    const destExisting = destFiles.find(f => f.original_name === destName);
    if (destExisting) {
      if (!overwrite) { sendResponse(res, 412, davHeaders(), 'Destination exists'); return; }
      // Delete existing destination file
      const fp = path.join(UPLOAD_DIR, destExisting.storage_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      db.prepare('DELETE FROM files WHERE id = ?').run(destExisting.id);
    }
    db.prepare("UPDATE files SET original_name = ?, folder_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(destName, destParentId, resolved.file.id);
    sendResponse(res, destExisting ? 204 : 201, davHeaders(), null);
    return;
  }

  if (resolved.folder) {
    const destFolders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(user.id, destParentId);
    const destExisting = destFolders.find(f => f.name === destName);
    if (destExisting) {
      if (!overwrite) { sendResponse(res, 412, davHeaders(), 'Destination exists'); return; }
      deleteFolderRecursive(db, destExisting.id);
    }
    db.prepare('UPDATE folders SET name = ?, parent_id = ? WHERE id = ?')
      .run(destName, destParentId, resolved.folder.id);
    sendResponse(res, destExisting ? 204 : 201, davHeaders(), null);
    return;
  }

  sendResponse(res, 404, davHeaders(), 'Not Found');
}

function handleCopy(req, res, user, segments) {
  if (segments.length === 0) {
    sendResponse(res, 403, davHeaders(), 'Cannot copy root');
    return;
  }

  const destination = req.headers['destination'];
  if (!destination) {
    sendResponse(res, 400, davHeaders(), 'Destination header required');
    return;
  }

  let destUrl;
  try {
    destUrl = new URL(destination);
  } catch {
    try {
      destUrl = new URL(destination, `http://${req.headers['host'] || 'localhost'}`);
    } catch {
      sendResponse(res, 400, davHeaders(), 'Invalid destination');
      return;
    }
  }

  const destPath = decodeURIComponent(destUrl.pathname);
  let destRel = destPath;
  if (destRel.startsWith('/webdav/')) destRel = destRel.slice('/webdav'.length);
  else if (destRel === '/webdav') destRel = '/';
  const destSegments = destRel.split('/').filter(s => s.length > 0);

  if (destSegments.length === 0) {
    sendResponse(res, 403, davHeaders(), 'Cannot copy to root');
    return;
  }

  const resolved = resolvePath(user.id, segments);
  const destName = destSegments[destSegments.length - 1];
  const destParentId = resolveParentPath(user.id, destSegments);
  if (destParentId === false) {
    sendResponse(res, 409, davHeaders(), 'Destination parent not found');
    return;
  }

  const overwrite = req.headers['overwrite'] !== 'F';
  const db = getDb();

  if (resolved.file) {
    const destFiles = db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS ? ORDER BY name').all(user.id, destParentId);
    const destExisting = destFiles.find(f => f.original_name === destName);
    if (destExisting) {
      if (!overwrite) { sendResponse(res, 412, davHeaders(), 'Destination exists'); return; }
      const fp = path.join(UPLOAD_DIR, destExisting.storage_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      db.prepare('DELETE FROM files WHERE id = ?').run(destExisting.id);
    }

    const newId = uuidv4();
    const ext = path.extname(destName);
    const storageName = newId + ext;
    const srcPath = path.join(UPLOAD_DIR, resolved.file.storage_path);
    const dstPath = path.join(UPLOAD_DIR, storageName);
    if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, dstPath);

    db.prepare(
      'INSERT INTO files (id, name, original_name, mime_type, size, folder_id, user_id, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(newId, storageName, destName, resolved.file.mime_type, resolved.file.size, destParentId, user.id, storageName);

    sendResponse(res, destExisting ? 204 : 201, davHeaders(), null);
    return;
  }

  if (resolved.folder) {
    const destFolders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(user.id, destParentId);
    const destExisting = destFolders.find(f => f.name === destName);
    if (destExisting) {
      if (!overwrite) { sendResponse(res, 412, davHeaders(), 'Destination exists'); return; }
      deleteFolderRecursive(db, destExisting.id);
    }
    const newId = uuidv4();
    db.prepare('INSERT INTO folders (id, name, parent_id, user_id) VALUES (?, ?, ?, ?)').run(newId, destName, destParentId, user.id);
    sendResponse(res, destExisting ? 204 : 201, davHeaders(), null);
    return;
  }

  sendResponse(res, 404, davHeaders(), 'Not Found');
}

function handleLock(res, segments) {
  const token = `opaquelocktoken:${uuidv4()}`;
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
<D:lockdiscovery>
<D:activelock>
<D:locktype><D:write/></D:locktype>
<D:lockscope><D:exclusive/></D:lockscope>
<D:depth>infinity</D:depth>
<D:owner><D:href>FileCloud</D:href></D:owner>
<D:timeout>Second-3600</D:timeout>
<D:locktoken><D:href>${token}</D:href></D:locktoken>
<D:lockroot><D:href>${escapeXml(buildHref(segments))}</D:href></D:lockroot>
</D:activelock>
</D:lockdiscovery>
</D:prop>`;
  sendResponse(res, 200, {
    ...davHeaders(),
    'Content-Type': 'application/xml; charset=utf-8',
    'Lock-Token': `<${token}>`,
  }, xml);
}

function handleUnlock(res) {
  sendResponse(res, 204, davHeaders(), null);
}

function handleProppatch(res, segments) {
  const href = buildHref(segments);
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
<D:response>
<D:href>${escapeXml(href)}</D:href>
<D:propstat>
<D:prop/>
<D:status>HTTP/1.1 200 OK</D:status>
</D:propstat>
</D:response>
</D:multistatus>`;
  sendResponse(res, 207, { ...davHeaders(), 'Content-Type': 'application/xml; charset=utf-8' }, xml);
}

// ─── Request Router ──────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const method = req.method.toUpperCase();
  const urlPath = req.url.split('?')[0]; // strip query string

  // OPTIONS doesn't need auth
  if (method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  // Authenticate
  const user = authenticateBasic(req);
  if (!user) {
    sendResponse(res, 401, {
      'WWW-Authenticate': 'Basic realm="FileCloud WebDAV"',
    }, 'Unauthorized');
    return;
  }

  const segments = getPathSegments(urlPath);

  // Ignore Windows junk
  if (segments.length > 0 && isIgnored(segments[segments.length - 1])) {
    if (method === 'GET' || method === 'HEAD' || method === 'PROPFIND') {
      sendResponse(res, 404, davHeaders(), 'Not Found');
    } else {
      sendResponse(res, 204, davHeaders(), null);
    }
    return;
  }

  try {
    switch (method) {
      case 'PROPFIND': {
        const depth = req.headers['depth'] || '1';
        handlePropfind(res, user, segments, depth);
        break;
      }
      case 'PROPPATCH':
        handleProppatch(res, segments);
        break;
      case 'GET':
        handleGet(res, user, segments);
        break;
      case 'HEAD':
        handleHead(res, user, segments);
        break;
      case 'PUT':
        await handlePut(req, res, user, segments);
        break;
      case 'MKCOL':
        handleMkcol(res, user, segments);
        break;
      case 'DELETE':
        handleDelete(res, user, segments);
        break;
      case 'MOVE':
        handleMove(req, res, user, segments);
        break;
      case 'COPY':
        handleCopy(req, res, user, segments);
        break;
      case 'LOCK':
        handleLock(res, segments);
        break;
      case 'UNLOCK':
        handleUnlock(res);
        break;
      default:
        sendResponse(res, 405, davHeaders(), 'Method not allowed');
    }
  } catch (err) {
    console.error(`[WebDAV] ${method} ${urlPath} error:`, err);
    if (!res.headersSent) {
      sendResponse(res, 500, davHeaders(), 'Internal Server Error');
    }
  }
}

// ─── Start Server ────────────────────────────────────────────────────────────

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`> WebDAV server ready on http://0.0.0.0:${PORT}`);
  console.log(`> DB: ${DB_PATH}, Uploads: ${UPLOAD_DIR}`);
});
