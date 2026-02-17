'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Avatar } from '@/components/Avatar';
import { PreviewModal } from '@/components/PreviewModal';

interface User { id: string; email: string; display_name: string; avatar_url: string | null; is_admin: number; }
interface FileItem { id: string; name: string; original_name: string; mime_type: string; size: number; share_token: string | null; created_at: string; folder_id: string | null; }
interface FolderItem { id: string; name: string; created_at: string; }
interface Breadcrumb { id: string; name: string; }
interface StorageInfo { used: number; fileCount: number; }
interface ShareItem { id: string; item_id: string; item_type: string; item_name: string; mime_type: string; size: number; owner_name: string; permission: string; }

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function getFileIcon(mime: string): { icon: string; color: string } {
  if (mime.startsWith('image/')) return { icon: '🖼️', color: 'from-pink-500/20 to-purple-500/20 border-pink-500/20' };
  if (mime.startsWith('video/')) return { icon: '🎬', color: 'from-red-500/20 to-orange-500/20 border-red-500/20' };
  if (mime.startsWith('audio/')) return { icon: '🎵', color: 'from-green-500/20 to-emerald-500/20 border-green-500/20' };
  if (mime === 'application/pdf') return { icon: '📄', color: 'from-red-500/20 to-rose-500/20 border-red-500/20' };
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar') || mime.includes('rar')) return { icon: '📦', color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/20' };
  if (mime.includes('text') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('css')) return { icon: '📝', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/20' };
  if (mime === 'folder') return { icon: '📁', color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/20' };
  return { icon: '📎', color: 'from-gray-500/20 to-slate-500/20 border-gray-500/20' };
}

const canPreview = (mime: string, name: string) =>
  mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') ||
  mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('json') ||
  mime.includes('xml') || mime.includes('javascript') || mime.includes('css') ||
  name.endsWith('.md');

// ===== AUTH SCREENS =====
function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const url = mode === 'login' ? '/api/auth' : '/api/register';
    const body = mode === 'login' ? { email, password } : { email, password, displayName };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) onAuth(data.user);
    else { setError(data.error || 'Error'); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>
      <div className="glass-strong rounded-3xl p-10 max-w-md w-full animate-slide-up space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="text-6xl animate-float">☁️</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">FileCloud</h1>
          <p className="text-gray-500">{mode === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all" />
          )}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all" />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-500/25">
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500">
          {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors">{mode === 'login' ? 'Register' : 'Sign In'}</button>
        </p>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, fileCount: 0 });
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  const [shareDialog, setShareDialog] = useState<{ file: FileItem; url?: string } | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'shared' | 'graph'>('files');
  const [sharedItems, setSharedItems] = useState<ShareItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth
  useEffect(() => {
    fetch('/api/auth').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.user) setUser(data.user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const url = currentFolder ? `/api/files?folderId=${currentFolder}` : '/api/files';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setFiles(data.files); setFolders(data.folders);
    setBreadcrumbs(data.breadcrumbs); setStorage(data.storage);
  }, [currentFolder, user]);

  const fetchShared = useCallback(async () => {
    const res = await fetch('/api/shares');
    if (res.ok) { const data = await res.json(); setSharedItems(data.shares); }
  }, []);

  useEffect(() => { if (user) fetchFiles(); }, [fetchFiles, user]);
  useEffect(() => { if (user && sidebarTab === 'shared') fetchShared(); }, [sidebarTab, user, fetchShared]);
  useEffect(() => { const h = () => setContextMenu(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

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
        if (e.lengthComputable) setUploading(prev => prev.map((u, j) => j === i ? { ...u, progress: Math.round(e.loaded / e.total * 100) } : u));
      };
      await new Promise<void>((resolve) => { xhr.onload = () => resolve(); xhr.onerror = () => resolve(); xhr.open('POST', '/api/files'); xhr.send(fd); });
    }
    setUploading([]); fetchFiles();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolder }) });
    setNewFolderName(''); setShowNewFolder(false); fetchFiles();
  };

  const deleteFile = async (id: string) => {
    await fetch('/api/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchFiles();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete folder and all contents?')) return;
    await fetch('/api/folders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchFiles();
  };

  const createShareLink = async (file: FileItem) => {
    if (file.share_token) {
      setShareDialog({ file, url: `${window.location.origin}/share/${file.share_token}` });
    } else {
      const res = await fetch(`/api/files/${file.id}/share`, { method: 'POST' });
      const data = await res.json();
      setShareDialog({ file, url: `${window.location.origin}/share/${data.shareToken}` });
      fetchFiles();
    }
  };

  const removeShareLink = async (id: string) => {
    await fetch(`/api/files/${id}/share`, { method: 'DELETE' }); setShareDialog(null); fetchFiles();
  };

  const shareWithUser = async (file: FileItem) => {
    if (!shareEmail.trim()) return;
    await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: file.id, itemType: 'file', email: shareEmail, permission: sharePermission }) });
    setShareEmail('');
  };

  const logout = async () => { await fetch('/api/auth', { method: 'DELETE' }); setUser(null); };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500 animate-pulse text-3xl">☁️</div></div>;
  if (!user) return <AuthScreen onAuth={setUser} />;

  const storagePercent = Math.min((storage.used / (10 * 1073741824)) * 100, 100); // 10GB visual cap

  return (
    <div className="min-h-screen flex"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} flex-shrink-0 border-r border-white/[0.06] bg-white/[0.02] transition-all duration-300 flex flex-col`}>
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">☁️</span>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">FileCloud</h1>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'files' as const, icon: '📂', label: 'My Files' },
              { id: 'shared' as const, icon: '👥', label: 'Shared with Me' },
              { id: 'graph' as const, icon: '🕸️', label: 'Knowledge Graph' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setSidebarTab(tab.id); if (tab.id === 'graph') window.location.href = '/graph'; }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${sidebarTab === tab.id ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'}`}>
                <span>{tab.icon}</span><span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Storage */}
        <div className="p-5 mt-auto border-t border-white/[0.06]">
          <div className="text-xs text-gray-500 mb-2">Storage</div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all" style={{ width: `${storagePercent}%` }} />
          </div>
          <div className="text-xs text-gray-400">{formatSize(storage.used)} · {storage.fileCount} files</div>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            <Avatar name={user.display_name} url={user.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.display_name}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors text-xs" title="Sign out">⏻</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-white transition-colors lg:hidden">☰</button>

          {sidebarTab === 'files' && (
            <>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-sm flex-1 min-w-0">
                <button onClick={() => setCurrentFolder(null)} className={`hover:text-white transition-colors ${!currentFolder ? 'text-white font-medium' : 'text-gray-400'}`}>Home</button>
                {breadcrumbs.map(bc => (
                  <span key={bc.id} className="flex items-center gap-2">
                    <span className="text-gray-600">/</span>
                    <button onClick={() => setCurrentFolder(bc.id)} className="text-gray-400 hover:text-white transition-colors">{bc.name}</button>
                  </span>
                ))}
              </nav>
              <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                className="glass-hover rounded-lg px-2.5 py-1.5 text-sm text-gray-400 hover:text-white">{viewMode === 'grid' ? '☰' : '▦'}</button>
            </>
          )}
          {sidebarTab === 'shared' && <h2 className="text-lg font-semibold flex-1">Shared with Me</h2>}
        </header>

        <div className="flex-1 overflow-auto p-6">
          {sidebarTab === 'files' && (
            <div className="animate-fade-in">
              {/* Actions */}
              <div className="flex gap-3 mb-6 flex-wrap">
                <button onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                  <span>↑</span> Upload
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />
                {showNewFolder ? (
                  <div className="flex gap-2">
                    <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name"
                      autoFocus onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 w-48" />
                    <button onClick={createFolder} className="glass-hover rounded-xl px-3 py-2 text-sm text-green-400">✓</button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="glass-hover rounded-xl px-3 py-2 text-sm text-gray-400">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewFolder(true)} className="glass-hover rounded-xl px-5 py-2.5 font-medium flex items-center gap-2 text-gray-300">
                    <span>📁</span> New Folder
                  </button>
                )}
              </div>

              {/* Upload Progress */}
              {uploading.length > 0 && (
                <div className="glass-strong rounded-2xl p-4 mb-6 space-y-3 animate-slide-up">
                  {uploading.map((u, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-300 truncate">{u.name}</span><span className="text-indigo-400">{u.progress}%</span></div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300 ease-out" style={{ width: `${u.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              {folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                  <div className="text-7xl mb-5 animate-float">📂</div>
                  <p className="text-lg font-medium text-gray-400">No files yet</p>
                  <p className="text-sm mt-1">Drop files here or click Upload</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {folders.map((folder, i) => (
                    <div key={folder.id} className="glass-hover rounded-2xl p-4 cursor-pointer group relative animate-fade-in"
                      style={{ animationDelay: `${i * 30}ms` }}
                      onClick={() => setCurrentFolder(folder.id)}>
                      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📁</div>
                      <p className="text-sm font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">Folder</p>
                      <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-xs p-1">✕</button>
                    </div>
                  ))}
                  {files.map((file, i) => {
                    const { icon, color } = getFileIcon(file.mime_type);
                    const isImage = file.mime_type.startsWith('image/');
                    return (
                      <div key={file.id} className="glass-hover rounded-2xl p-3 cursor-pointer group relative animate-fade-in"
                        style={{ animationDelay: `${(folders.length + i) * 30}ms` }}
                        onClick={() => canPreview(file.mime_type, file.original_name) ? setPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}>
                        {isImage ? (
                          <div className="w-full aspect-square rounded-xl overflow-hidden mb-2.5 bg-white/[0.03]">
                            <img src={`/api/files/${file.id}?inline=1`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          </div>
                        ) : (
                          <div className={`w-full aspect-square rounded-xl mb-2.5 flex items-center justify-center bg-gradient-to-br ${color} border`}>
                            <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
                          </div>
                        )}
                        <p className="text-sm font-medium truncate">{file.original_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatSize(file.size)}</p>
                        {file.share_token && <div className="absolute top-2 left-2 text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md">🔗</div>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="glass-strong rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
                  {folders.map(folder => (
                    <div key={folder.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] cursor-pointer group transition-colors"
                      onClick={() => setCurrentFolder(folder.id)}>
                      <span className="text-2xl">📁</span>
                      <span className="flex-1 font-medium truncate">{folder.name}</span>
                      <span className="text-xs text-gray-600">Folder</span>
                      <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-sm">✕</button>
                    </div>
                  ))}
                  {files.map(file => (
                    <div key={file.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] cursor-pointer group transition-colors"
                      onClick={() => canPreview(file.mime_type, file.original_name) ? setPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
                      onContextMenu={e => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}>
                      <span className="text-2xl">{getFileIcon(file.mime_type).icon}</span>
                      <span className="flex-1 font-medium truncate">{file.original_name}</span>
                      {file.share_token && <span className="text-xs text-indigo-400">🔗</span>}
                      <span className="text-xs text-gray-500 w-20 text-right">{formatSize(file.size)}</span>
                      <span className="text-xs text-gray-600 w-24 text-right">{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Shared Tab */}
          {sidebarTab === 'shared' && (
            <div className="animate-fade-in">
              {sharedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                  <div className="text-7xl mb-5">👥</div>
                  <p className="text-lg font-medium text-gray-400">Nothing shared with you yet</p>
                </div>
              ) : (
                <div className="glass-strong rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
                  {sharedItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.04] cursor-pointer transition-colors"
                      onClick={() => {
                        if (item.item_type === 'file') {
                          const f = { id: item.item_id, original_name: item.item_name, mime_type: item.mime_type, size: item.size } as any;
                          if (canPreview(item.mime_type, item.item_name)) setPreview(f);
                          else window.open(`/api/files/${item.item_id}`, '_blank');
                        }
                      }}>
                      <span className="text-2xl">{getFileIcon(item.mime_type).icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.item_name}</div>
                        <div className="text-xs text-gray-500">Shared by {item.owner_name} · {item.permission}</div>
                      </div>
                      <span className="text-xs text-gray-500">{item.size > 0 ? formatSize(item.size) : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Drop Zone Overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-40 bg-indigo-600/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="glass-strong rounded-3xl p-12 text-center animate-glow">
            <div className="text-5xl mb-3">📂</div>
            <p className="text-xl text-white font-medium">Drop files here</p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed z-50 glass-strong rounded-xl py-1.5 min-w-[200px] shadow-2xl animate-fade-in"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 220), top: Math.min(contextMenu.y, window.innerHeight - 200) }}>
          {canPreview(contextMenu.file.mime_type, contextMenu.file.original_name) && (
            <button onClick={() => { setPreview(contextMenu.file); setContextMenu(null); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-3">
              <span className="w-5 text-center">👁</span> Preview</button>
          )}
          <button onClick={() => { window.open(`/api/files/${contextMenu.file.id}`, '_blank'); setContextMenu(null); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-3">
            <span className="w-5 text-center">⬇</span> Download</button>
          <button onClick={() => { createShareLink(contextMenu.file); setContextMenu(null); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-3">
            <span className="w-5 text-center">🔗</span> Share Link</button>
          <div className="border-t border-white/[0.06] my-1" />
          <button onClick={() => { deleteFile(contextMenu.file.id); setContextMenu(null); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors flex items-center gap-3 text-red-400">
            <span className="w-5 text-center">🗑</span> Delete</button>
        </div>
      )}

      {/* Share Dialog */}
      {shareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShareDialog(null)}>
          <div className="glass-strong rounded-2xl p-6 max-w-lg w-full animate-slide-up space-y-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Share "{shareDialog.file.original_name}"</h3>
            {shareDialog.url && (
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Public Link</label>
                <div className="flex gap-2">
                  <input value={shareDialog.url} readOnly className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 font-mono" />
                  <button onClick={() => navigator.clipboard.writeText(shareDialog.url!)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm transition-all">Copy</button>
                </div>
                <button onClick={() => removeShareLink(shareDialog.file.id)} className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors">Remove public link</button>
              </div>
            )}
            <div className="border-t border-white/[0.06] pt-4">
              <label className="text-xs text-gray-500 block mb-1.5">Share with user</label>
              <div className="flex gap-2">
                <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="user@email.com"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50" />
                <select value={sharePermission} onChange={e => setSharePermission(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white">
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <button onClick={() => shareWithUser(shareDialog.file)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm transition-all">Share</button>
              </div>
            </div>
            <button onClick={() => setShareDialog(null)} className="text-gray-500 hover:text-white text-sm transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
