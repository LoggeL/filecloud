import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || '/data/files.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        folder_id TEXT,
        user_id TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        share_token TEXT UNIQUE,
        share_password TEXT,
        share_expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('file','folder')),
        owner_id TEXT NOT NULL,
        shared_with_id TEXT,
        permission TEXT NOT NULL DEFAULT 'view' CHECK(permission IN ('view','edit')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_share ON files(share_token);
      CREATE INDEX IF NOT EXISTS idx_shares_shared ON shares(shared_with_id);
      CREATE INDEX IF NOT EXISTS idx_shares_owner ON shares(owner_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    `);
  }
  return _db;
}

export const db = {
  get raw() { return getDb(); },

  // Users
  createUser(data: { id: string; email: string; passwordHash: string; displayName: string; isAdmin?: boolean }) {
    getDb().prepare(
      'INSERT INTO users (id, email, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?, ?)'
    ).run(data.id, data.email, data.passwordHash, data.displayName, data.isAdmin ? 1 : 0);
  },
  getUserByEmail(email: string) {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  },
  getUser(id: string) {
    return getDb().prepare('SELECT id, email, display_name, avatar_url, is_admin, created_at FROM users WHERE id = ?').get(id) as any;
  },
  getUserCount() {
    return (getDb().prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  },
  updateUser(id: string, data: { displayName?: string; avatarUrl?: string }) {
    if (data.displayName !== undefined) getDb().prepare('UPDATE users SET display_name = ? WHERE id = ?').run(data.displayName, id);
    if (data.avatarUrl !== undefined) getDb().prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(data.avatarUrl, id);
  },
  getAllUsers() {
    return getDb().prepare('SELECT id, email, display_name, avatar_url, is_admin, created_at FROM users').all() as any[];
  },

  // Sessions
  createSession(data: { id: string; userId: string; expiresAt: string }) {
    getDb().prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(data.id, data.userId, data.expiresAt);
  },
  getSession(id: string) {
    return getDb().prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime(\'now\')').get(id) as any;
  },
  deleteSession(id: string) {
    getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
  },
  deleteUserSessions(userId: string) {
    getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  },

  // Files
  createFile(data: { id: string; name: string; originalName: string; mimeType: string; size: number; folderId: string | null; userId: string; storagePath: string }) {
    getDb().prepare(
      'INSERT INTO files (id, name, original_name, mime_type, size, folder_id, user_id, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.id, data.name, data.originalName, data.mimeType, data.size, data.folderId, data.userId, data.storagePath);
  },
  getFile(id: string) {
    return getDb().prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
  },
  getFileByShareToken(token: string) {
    return getDb().prepare('SELECT * FROM files WHERE share_token = ?').get(token) as any;
  },
  getFilesInFolder(userId: string, folderId: string | null) {
    return getDb().prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS ? ORDER BY name').all(userId, folderId) as any[];
  },
  deleteFile(id: string) {
    const file = getDb().prepare('SELECT storage_path FROM files WHERE id = ?').get(id) as any;
    if (file) {
      const fullPath = path.join(UPLOAD_DIR, file.storage_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      getDb().prepare('DELETE FROM shares WHERE item_id = ? AND item_type = ?').run(id, 'file');
      getDb().prepare('DELETE FROM files WHERE id = ?').run(id);
    }
  },
  setShareToken(id: string, token: string | null, password?: string | null, expiresAt?: string | null) {
    getDb().prepare('UPDATE files SET share_token = ?, share_password = ?, share_expires_at = ? WHERE id = ?').run(token, password || null, expiresAt || null, id);
  },

  // Folders
  createFolder(data: { id: string; name: string; parentId: string | null; userId: string }) {
    getDb().prepare('INSERT INTO folders (id, name, parent_id, user_id) VALUES (?, ?, ?, ?)').run(data.id, data.name, data.parentId, data.userId);
  },
  getFolder(id: string) {
    return getDb().prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
  },
  getFoldersInFolder(userId: string, parentId: string | null) {
    return getDb().prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS ? ORDER BY name').all(userId, parentId) as any[];
  },
  deleteFolder(id: string) {
    const files = getDb().prepare('SELECT id FROM files WHERE folder_id = ?').all(id) as any[];
    for (const f of files) this.deleteFile(f.id);
    const subfolders = getDb().prepare('SELECT id FROM folders WHERE parent_id = ?').all(id) as any[];
    for (const sf of subfolders) this.deleteFolder(sf.id);
    getDb().prepare('DELETE FROM shares WHERE item_id = ? AND item_type = ?').run(id, 'folder');
    getDb().prepare('DELETE FROM folders WHERE id = ?').run(id);
  },
  getBreadcrumbs(folderId: string | null): { id: string; name: string }[] {
    if (!folderId) return [];
    const folder = this.getFolder(folderId);
    if (!folder) return [];
    return [...this.getBreadcrumbs(folder.parent_id), { id: folder.id, name: folder.name }];
  },
  getStorageUsage(userId: string): { used: number; fileCount: number } {
    const result = getDb().prepare('SELECT COALESCE(SUM(size), 0) as used, COUNT(*) as fileCount FROM files WHERE user_id = ?').get(userId) as any;
    return { used: result.used, fileCount: result.fileCount };
  },

  // Shares (user-to-user)
  createShare(data: { id: string; itemId: string; itemType: string; ownerId: string; sharedWithId: string; permission: string }) {
    getDb().prepare(
      'INSERT INTO shares (id, item_id, item_type, owner_id, shared_with_id, permission) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(data.id, data.itemId, data.itemType, data.ownerId, data.sharedWithId, data.permission);
  },
  getSharesForUser(userId: string) {
    return getDb().prepare(`
      SELECT s.*, 
        CASE WHEN s.item_type = 'file' THEN f.original_name ELSE fo.name END as item_name,
        CASE WHEN s.item_type = 'file' THEN f.mime_type ELSE 'folder' END as mime_type,
        CASE WHEN s.item_type = 'file' THEN f.size ELSE 0 END as size,
        u.display_name as owner_name, u.email as owner_email
      FROM shares s
      LEFT JOIN files f ON s.item_type = 'file' AND s.item_id = f.id
      LEFT JOIN folders fo ON s.item_type = 'folder' AND s.item_id = fo.id
      JOIN users u ON s.owner_id = u.id
      WHERE s.shared_with_id = ?
      ORDER BY s.created_at DESC
    `).all(userId) as any[];
  },
  getSharesByOwner(ownerId: string) {
    return getDb().prepare('SELECT * FROM shares WHERE owner_id = ?').all(ownerId) as any[];
  },
  deleteShare(id: string) {
    getDb().prepare('DELETE FROM shares WHERE id = ?').run(id);
  },
  hasAccess(userId: string, itemId: string, itemType: string): { access: boolean; permission: string } {
    // Check ownership
    if (itemType === 'file') {
      const file = getDb().prepare('SELECT user_id FROM files WHERE id = ?').get(itemId) as any;
      if (file?.user_id === userId) return { access: true, permission: 'edit' };
    } else {
      const folder = getDb().prepare('SELECT user_id FROM folders WHERE id = ?').get(itemId) as any;
      if (folder?.user_id === userId) return { access: true, permission: 'edit' };
    }
    // Check shares
    const share = getDb().prepare('SELECT permission FROM shares WHERE item_id = ? AND item_type = ? AND shared_with_id = ?').get(itemId, itemType, userId) as any;
    if (share) return { access: true, permission: share.permission };
    return { access: false, permission: 'none' };
  },

  // Graph data
  getGraphData(userId: string) {
    const files = getDb().prepare('SELECT id, original_name, mime_type, folder_id, size FROM files WHERE user_id = ?').all(userId) as any[];
    const folders = getDb().prepare('SELECT id, name, parent_id FROM folders WHERE user_id = ?').all(userId) as any[];
    const shares = getDb().prepare(`
      SELECT s.item_id, s.item_type, u.display_name as shared_with_name 
      FROM shares s JOIN users u ON s.shared_with_id = u.id 
      WHERE s.owner_id = ?
    `).all(userId) as any[];
    return { files, folders, shares };
  },
};
