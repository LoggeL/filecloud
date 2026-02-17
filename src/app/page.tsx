'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FileItem {
  id: string; name: string; original_name: string; mime_type: string;
  size: number; share_token: string | null; created_at: string;
}
interface FolderItem { id: string; name: string; created_at: string; }
interface Breadcrumb { id: string; name: string; }
interface StorageInfo { used: number; fileCount: number; }

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function getFileIcon(mime: string): { icon: string; color: string } {
  if (mime.startsWith('image/')) return { icon: '🖼️', color: 'from-pink-500/20 to-purple-500/20' };
  if (mime.startsWith('video/')) return { icon: '🎬', color: 'from-red-500/20 to-orange-500/20' };
  if (mime.startsWith('audio/')) return { icon: '🎵', color: 'from-green-500/20 to-emerald-500/20' };
  if (mime === 'application/pdf') return { icon: '📄', color: 'from-red-500/20 to-rose-500/20' };
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar') || mime.includes('rar')) return { icon: '📦', color: 'from-yellow-500/20 to-amber-500/20' };
  if (mime.includes('text') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('css')) return { icon: '📝', color: 'from-blue-500/20 to-cyan-500/20' };
  return { icon: '📎', color: 'from-gray-500/20 to-slate-500/20' };
}

// Login Screen
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (res.ok) { onLogin(); }
    else { setError('Wrong password'); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass rounded-3xl p-10 max-w-md w-full animate-slide-up space-y-8">
        <div className="text-center space-y-3">
          <div className="text-6xl">☁️</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">FileCloud</h1>
          <p className="text-gray-500">Enter password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/25 transition-all" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-accent hover:bg-accent-dark text-white font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
            {loading ? '...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Preview Modal
function PreviewModal({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-5xl max-h-[90vh] w-full animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-medium truncate">{file.original_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        <div className="glass rounded-2xl overflow-hidden flex items-center justify-center" style={{ maxHeight: '80vh' }}>
          {isImage && <img src={`/api/files/${file.id}?inline=1`} alt={file.original_name} className="max-h-[80vh] object-contain" />}
          {isVideo && <video controls autoPlay className="max-h-[80vh] w-full"><source src={`/api/files/${file.id}?inline=1`} type={file.mime_type} /></video>}
          {isAudio && <div className="p-12"><audio controls autoPlay><source src={`/api/files/${file.id}?inline=1`} type={file.mime_type} /></audio></div>}
          {isPdf && <iframe src={`/api/files/${file.id}?inline=1`} className="w-full h-[80vh]" />}
          {!isImage && !isVideo && !isAudio && !isPdf && (
            <div className="p-12 text-center text-gray-400">
              <div className="text-6xl mb-4">{getFileIcon(file.mime_type).icon}</div>
              <p>Preview not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, fileCount: 0 });
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    const url = currentFolder ? `/api/files?folderId=${currentFolder}` : '/api/files';
    const res = await fetch(url);
    if (res.status === 401) { setAuthenticated(false); return; }
    const data = await res.json();
    setFiles(data.files);
    setFolders(data.folders);
    setBreadcrumbs(data.breadcrumbs);
    setStorage(data.storage);
    setAuthenticated(true);
  }, [currentFolder]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    const uploadState = arr.map(f => ({ name: f.name, progress: 0 }));
    setUploading(uploadState);

    for (let i = 0; i < arr.length; i++) {
      const fd = new FormData();
      fd.append('file', arr[i]);
      if (currentFolder) fd.append('folderId', currentFolder);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploading(prev => prev.map((u, j) => j === i ? { ...u, progress: Math.round(e.loaded / e.total * 100) } : u));
        }
      };
      await new Promise<void>((resolve) => {
        xhr.onload = () => resolve();
        xhr.onerror = () => resolve();
        xhr.open('POST', '/api/files');
        xhr.send(fd);
      });
    }
    setUploading([]);
    fetchFiles();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch('/api/folders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolder }),
    });
    setNewFolderName('');
    setShowNewFolder(false);
    fetchFiles();
  };

  const deleteFile = async (id: string) => {
    await fetch('/api/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchFiles();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete folder and all contents?')) return;
    await fetch('/api/folders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchFiles();
  };

  const shareFile = async (file: FileItem) => {
    if (file.share_token) {
      setShareUrl(`${window.location.origin}/share/${file.share_token}`);
    } else {
      const res = await fetch(`/api/files/${file.id}/share`, { method: 'POST' });
      const data = await res.json();
      setShareUrl(`${window.location.origin}/share/${data.shareToken}`);
      fetchFiles();
    }
  };

  const unshareFile = async (id: string) => {
    await fetch(`/api/files/${id}/share`, { method: 'DELETE' });
    setShareUrl(null);
    fetchFiles();
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthenticated(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  if (authenticated === null) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 animate-pulse text-xl">☁️</div>
    </div>
  );

  if (!authenticated) return <LoginScreen onLogin={fetchFiles} />;

  const canPreview = (mime: string) => mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || mime === 'application/pdf';

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}>

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☁️</span>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">FileCloud</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="glass rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-400">{storage.fileCount} files · </span>
            <span className="text-accent-light font-medium">{formatSize(storage.used)}</span>
          </div>
          <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="glass-hover rounded-xl px-3 py-2 text-sm">{viewMode === 'grid' ? '☰' : '▦'}</button>
          <button onClick={logout} className="glass-hover rounded-xl px-3 py-2 text-sm text-gray-400 hover:text-red-400">Sign Out</button>
        </div>
      </header>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-6 text-sm flex-wrap animate-fade-in">
        <button onClick={() => setCurrentFolder(null)} className={`hover:text-white transition-colors ${!currentFolder ? 'text-white' : 'text-gray-400'}`}>
          Home
        </button>
        {breadcrumbs.map(bc => (
          <span key={bc.id} className="flex items-center gap-2">
            <span className="text-gray-600">/</span>
            <button onClick={() => setCurrentFolder(bc.id)} className="text-gray-400 hover:text-white transition-colors">{bc.name}</button>
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex gap-3 mb-6 flex-wrap animate-fade-in">
        <button onClick={() => fileInputRef.current?.click()}
          className="bg-accent hover:bg-accent-dark text-white font-medium px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
          <span>↑</span> Upload
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />

        {showNewFolder ? (
          <div className="flex gap-2">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name"
              autoFocus onKeyDown={e => e.key === 'Enter' && createFolder()}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50" />
            <button onClick={createFolder} className="glass-hover rounded-xl px-3 py-2 text-sm">✓</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="glass-hover rounded-xl px-3 py-2 text-sm">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowNewFolder(true)} className="glass-hover rounded-xl px-5 py-2.5 font-medium flex items-center gap-2">
            <span>📁</span> New Folder
          </button>
        )}
      </div>

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-6 space-y-3 animate-slide-up">
          {uploading.map((u, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300 truncate">{u.name}</span>
                <span className="text-accent-light">{u.progress}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent to-accent-light rounded-full transition-all duration-300"
                  style={{ width: `${u.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop Zone Overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-40 bg-accent/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="glass rounded-3xl p-12 text-center animate-pulse-glow">
            <div className="text-5xl mb-3">📂</div>
            <p className="text-xl text-white font-medium">Drop files here</p>
          </div>
        </div>
      )}

      {/* Content */}
      {folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-fade-in">
          <div className="text-6xl mb-4">📂</div>
          <p className="text-lg">No files yet</p>
          <p className="text-sm">Upload files or create a folder to get started</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-in">
          {/* Folders */}
          {folders.map(folder => (
            <div key={folder.id} className="glass-hover rounded-2xl p-4 cursor-pointer group relative"
              onDoubleClick={() => setCurrentFolder(folder.id)}
              onClick={() => setCurrentFolder(folder.id)}>
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
              <p className="text-sm font-medium truncate">{folder.name}</p>
              <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs">✕</button>
            </div>
          ))}
          {/* Files */}
          {files.map(file => {
            const { icon, color } = getFileIcon(file.mime_type);
            const isImage = file.mime_type.startsWith('image/');
            return (
              <div key={file.id}
                className="glass-hover rounded-2xl p-4 cursor-pointer group relative"
                onClick={() => canPreview(file.mime_type) ? setPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
                onContextMenu={e => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}>
                {isImage ? (
                  <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 bg-white/5">
                    <img src={`/api/files/${file.id}?inline=1`} alt={file.original_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                ) : (
                  <div className={`w-full aspect-square rounded-xl mb-3 flex items-center justify-center bg-gradient-to-br ${color}`}>
                    <span className="text-4xl group-hover:scale-110 transition-transform">{icon}</span>
                  </div>
                )}
                <p className="text-sm font-medium truncate">{file.original_name}</p>
                <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                {file.share_token && <div className="absolute top-2 left-2 text-xs">🔗</div>}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden animate-fade-in">
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 cursor-pointer group transition-colors"
              onClick={() => setCurrentFolder(folder.id)}>
              <span className="text-2xl">📁</span>
              <span className="flex-1 font-medium truncate">{folder.name}</span>
              <span className="text-xs text-gray-500">Folder</span>
              <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-sm">✕</button>
            </div>
          ))}
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-4 px-5 py-3 hover:bg-white/5 cursor-pointer group transition-colors"
              onClick={() => canPreview(file.mime_type) ? setPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}>
              <span className="text-2xl">{getFileIcon(file.mime_type).icon}</span>
              <span className="flex-1 font-medium truncate">{file.original_name}</span>
              {file.share_token && <span className="text-xs">🔗</span>}
              <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
              <span className="text-xs text-gray-600">{new Date(file.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed z-50 glass rounded-xl py-1 min-w-[180px] shadow-2xl animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button onClick={() => { window.open(`/api/files/${contextMenu.file.id}`, '_blank'); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors">⬇ Download</button>
          <button onClick={() => { shareFile(contextMenu.file); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors">🔗 Share Link</button>
          {contextMenu.file.share_token && (
            <button onClick={() => { unshareFile(contextMenu.file.id); setContextMenu(null); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors">🚫 Remove Share</button>
          )}
          <button onClick={() => { deleteFile(contextMenu.file.id); setContextMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors text-red-400">🗑 Delete</button>
        </div>
      )}

      {/* Share URL Dialog */}
      {shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShareUrl(null)}>
          <div className="glass rounded-2xl p-6 max-w-lg w-full animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Share Link</h3>
            <div className="flex gap-2">
              <input value={shareUrl} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300" />
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); }}
                className="bg-accent hover:bg-accent-dark text-white px-4 py-2 rounded-xl text-sm transition-all">Copy</button>
            </div>
            <button onClick={() => setShareUrl(null)} className="text-gray-500 hover:text-white text-sm transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
