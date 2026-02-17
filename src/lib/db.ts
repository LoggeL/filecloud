import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || '/data/files.db';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

// Ensure directories exist
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        folder_id TEXT,
        storage_path TEXT NOT NULL,
        share_token TEXT UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_files_share ON files(share_token);
    `);
  }
  return _db;
}

export const db = {
  get db() { return getDb(); },

  // Files
  createFile(data: { id: string; name: string; originalName: string; mimeType: string; size: number; folderId: string | null; storagePath: string }) {
    getDb().prepare(
      'INSERT INTO files (id, name, original_name, mime_type, size, folder_id, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(data.id, data.name, data.originalName, data.mimeType, data.size, data.folderId, data.storagePath);
  },

  getFile(id: string) {
    return getDb().prepare('SELECT * FROM files WHERE id = ?').get(id) as any;
  },

  getFileByShareToken(token: string) {
    return getDb().prepare('SELECT * FROM files WHERE share_token = ?').get(token) as any;
  },

  getFilesInFolder(folderId: string | null) {
    return getDb().prepare('SELECT * FROM files WHERE folder_id IS ? ORDER BY name').all(folderId) as any[];
  },

  deleteFile(id: string) {
    const file = getDb().prepare('SELECT storage_path FROM files WHERE id = ?').get(id) as any;
    if (file) {
      const fullPath = path.join(UPLOAD_DIR, file.storage_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      getDb().prepare('DELETE FROM files WHERE id = ?').run(id);
    }
  },

  setShareToken(id: string, token: string | null) {
    getDb().prepare('UPDATE files SET share_token = ? WHERE id = ?').run(token, id);
  },

  // Folders
  createFolder(data: { id: string; name: string; parentId: string | null }) {
    getDb().prepare('INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)').run(data.id, data.name, data.parentId);
  },

  getFolder(id: string) {
    return getDb().prepare('SELECT * FROM folders WHERE id = ?').get(id) as any;
  },

  getFoldersInFolder(parentId: string | null) {
    return getDb().prepare('SELECT * FROM folders WHERE parent_id IS ? ORDER BY name').all(parentId) as any[];
  },

  deleteFolder(id: string) {
    // Recursively delete files in this folder
    const files = getDb().prepare('SELECT id FROM files WHERE folder_id = ?').all(id) as any[];
    for (const f of files) this.deleteFile(f.id);
    const subfolders = getDb().prepare('SELECT id FROM folders WHERE parent_id = ?').all(id) as any[];
    for (const sf of subfolders) this.deleteFolder(sf.id);
    getDb().prepare('DELETE FROM folders WHERE id = ?').run(id);
  },

  getBreadcrumbs(folderId: string | null): { id: string; name: string }[] {
    if (!folderId) return [];
    const folder = this.getFolder(folderId);
    if (!folder) return [];
    return [...this.getBreadcrumbs(folder.parent_id), { id: folder.id, name: folder.name }];
  },

  getStorageUsage(): { used: number; fileCount: number } {
    const result = getDb().prepare('SELECT COALESCE(SUM(size), 0) as used, COUNT(*) as fileCount FROM files').get() as any;
    return { used: result.used, fileCount: result.fileCount };
  },
};
