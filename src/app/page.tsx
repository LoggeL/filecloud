'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Avatar } from '@/components/Avatar';
import { PreviewModal } from '@/components/PreviewModal';
import { AuthScreen } from '@/components/AuthScreen';
import { Sidebar } from '@/components/Sidebar';
import { FileGrid } from '@/components/FileGrid';
import { FileContextMenu, FolderContextMenu } from '@/components/ContextMenu';
import { ShareDialog } from '@/components/ShareDialog';
import { MoveModal } from '@/components/MoveModal';
import { ProfileModal } from '@/components/ProfileModal';
import { FileInfoPanel } from '@/components/FileInfoPanel';
import { TrashView } from '@/components/TrashView';
import { BulkBar } from '@/components/BulkBar';
import {
  CloudIcon, ChevronRightIcon, UploadIcon, FolderPlusIcon, GridIcon, ListIcon,
  CheckIcon, XIcon, MenuIcon, UsersIcon, SearchIcon, FilesIcon, StarIcon,
} from '@/components/icons';
import type { User, FileItem, FolderItem, Breadcrumb, StorageInfo, ShareItem, SidebarTab, SortBy, SortDir, FilterType } from '@/types';
import { canPreview, formatSize, getFileInfo } from '@/lib/helpers';

const FILTER_TYPES: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'images', label: 'Images' },
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'documents', label: 'Docs' },
  { id: 'archives', label: 'Archives' },
  { id: 'code', label: 'Code' },
];

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
  const [folderContextMenu, setFolderContextMenu] = useState<{ folder: FolderItem; x: number; y: number } | null>(null);
  const [shareDialog, setShareDialog] = useState<{ file: FileItem; url?: string } | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');
  const [sharedItems, setSharedItems] = useState<ShareItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ files: FileItem[]; folders: FolderItem[] } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [moveModal, setMoveModal] = useState<{ item: FileItem | FolderItem; type: 'file' | 'folder' } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [infoPanel, setInfoPanel] = useState<FileItem | null>(null);
  const [trash, setTrash] = useState<{ files: FileItem[]; folders: FolderItem[] }>({ files: [], folders: [] });
  const [starredFiles, setStarredFiles] = useState<FileItem[]>([]);
  const [pasteNotif, setPasteNotif] = useState(false);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchTrash = useCallback(async () => {
    const res = await fetch('/api/trash');
    if (res.ok) { const data = await res.json(); setTrash(data); }
  }, []);

  const fetchStarred = useCallback(async () => {
    const res = await fetch('/api/files?starred=1');
    if (res.ok) { const data = await res.json(); setStarredFiles(data.files); }
  }, []);

  useEffect(() => { if (user) fetchFiles(); }, [fetchFiles, user]);
  useEffect(() => { if (user && sidebarTab === 'shared') fetchShared(); }, [sidebarTab, user, fetchShared]);
  useEffect(() => { if (user && sidebarTab === 'trash') fetchTrash(); }, [sidebarTab, user, fetchTrash]);
  useEffect(() => { if (user && sidebarTab === 'starred') fetchStarred(); }, [sidebarTab, user, fetchStarred]);

  // Close menus on click outside
  useEffect(() => {
    const h = () => { setContextMenu(null); setFolderContextMenu(null); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) setSearchResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Clipboard paste upload
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (!user) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const fileItems = Array.from(items).filter(it => it.kind === 'file').map(it => it.getAsFile()).filter(Boolean) as File[];
      if (fileItems.length === 0) return;
      e.preventDefault();
      setPasteNotif(true);
      setTimeout(() => setPasteNotif(false), 3000);
      await uploadFiles(fileItems);
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [user, currentFolder]); // eslint-disable-line

  const uploadFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    setUploading(arr.map(f => ({ name: f.name, progress: 0 })));
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

  const trashFile = async (id: string) => {
    await fetch(`/api/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
    fetchFiles();
  };

  const trashFolder = async (id: string) => {
    if (!confirm('Move folder and all its contents to trash?')) return;
    await fetch(`/api/folders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
    fetchFiles();
  };

  const restoreFile = async (id: string) => {
    await fetch(`/api/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: false }) });
    fetchTrash();
  };

  const permanentDeleteFile = async (id: string) => {
    await fetch(`/api/files/${id}`, { method: 'DELETE' });
    fetchTrash();
  };

  const restoreFolder = async (id: string) => {
    await fetch(`/api/folders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: false }) });
    fetchTrash();
  };

  const permanentDeleteFolder = async (id: string) => {
    await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    fetchTrash();
  };

  const emptyTrash = async () => {
    await fetch('/api/trash', { method: 'DELETE' });
    fetchTrash();
  };

  const renameFile = async (id: string, name: string) => {
    if (!name) return;
    await fetch(`/api/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalName: name }) });
    fetchFiles();
  };

  const renameFolder = async (id: string, name: string) => {
    if (!name) return;
    await fetch(`/api/folders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    fetchFiles();
  };

  const moveFile = async (fileId: string, targetFolderId: string | null) => {
    await fetch(`/api/files/${fileId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderId: targetFolderId }) });
    fetchFiles();
  };

  const moveFolder = async (folderId: string, targetFolderId: string | null) => {
    await fetch(`/api/folders/${folderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parentId: targetFolderId }) });
    fetchFiles();
  };

  const toggleStar = async (file: FileItem) => {
    await fetch(`/api/files/${file.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starred: !file.starred }) });
    fetchFiles();
    if (sidebarTab === 'starred') fetchStarred();
  };

  const createShareLink = async (file: FileItem) => {
    if (file.share_token) {
      setShareDialog({ file, url: `${window.location.origin}/share/${file.share_token}` });
    } else {
      setShareDialog({ file });
    }
  };

  const logout = async () => { await fetch('/api/auth', { method: 'DELETE' }); setUser(null); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); };

  // Bulk operations
  const toggleSelectFile = (id: string, val: boolean) => {
    setSelectedFiles(prev => { const s = new Set(prev); if (val) s.add(id); else s.delete(id); return s; });
  };
  const selectAll = () => {
    const allIds = [...folders.map(f => 'f:' + f.id), ...files.map(f => f.id)];
    const allSelected = allIds.every(id => selectedFiles.has(id));
    if (allSelected) setSelectedFiles(new Set());
    else setSelectedFiles(new Set(allIds));
  };
  const bulkDelete = async () => {
    for (const id of Array.from(selectedFiles)) {
      if (id.startsWith('f:')) await fetch(`/api/folders/${id.slice(2)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
      else await fetch(`/api/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
    }
    setSelectedFiles(new Set()); fetchFiles();
  };
  const bulkStar = async () => {
    const fileIds = Array.from(selectedFiles).filter(id => !id.startsWith('f:'));
    for (const id of fileIds) await fetch(`/api/files/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starred: true }) });
    setSelectedFiles(new Set()); fetchFiles();
  };
  const bulkDownloadZip = async () => {
    const fileIds = Array.from(selectedFiles).filter(id => !id.startsWith('f:'));
    if (fileIds.length === 0) return;
    const res = await fetch('/api/files/zip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: fileIds }) });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'download.zip'; a.click();
    URL.revokeObjectURL(url);
    setSelectedFiles(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0B09] flex items-center justify-center">
        <CloudIcon className="w-8 h-8 text-[#C9913D] animate-pulse-slow" />
      </div>
    );
  }
  if (!user) return <AuthScreen onAuth={setUser} />;

  const activeFiles = sidebarTab === 'starred' ? starredFiles : files;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen flex bg-[#0C0B09]" onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        user={user}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        storage={storage}
        onLogout={logout}
        onProfile={() => setShowProfile(true)}
      />

      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 h-[52px] border-b border-[rgba(248,240,220,0.06)] bg-[#0C0B09]/95 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-[#5A5045] hover:text-[#F4EFE5] transition-colors">
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5A5045]" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search files\u2026"
              className="input-field pl-8 py-1.5 text-xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5A5045] hover:text-[#9A8D7A]">
                <XIcon className="w-3 h-3" />
              </button>
            )}
          </div>

          {sidebarTab === 'files' && !isSearching && (
            <>
              <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                <button onClick={() => setCurrentFolder(null)} className={`transition-colors shrink-0 ${!currentFolder ? 'text-[#F4EFE5] font-medium' : 'text-[#5A5045] hover:text-[#9A8D7A]'}`}>Home</button>
                {breadcrumbs.map(bc => (
                  <Fragment key={bc.id}>
                    <ChevronRightIcon className="w-3 h-3 text-[#3A3330] flex-shrink-0" />
                    <button onClick={() => setCurrentFolder(bc.id)} className="text-[#5A5045] hover:text-[#9A8D7A] transition-colors shrink-0 truncate max-w-[140px]">{bc.name}</button>
                  </Fragment>
                ))}
              </nav>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Sort */}
                <select value={`${sortBy}:${sortDir}`} onChange={e => { const [s, d] = e.target.value.split(':'); setSortBy(s as SortBy); setSortDir(d as SortDir); }}
                  className="input-field w-auto py-1 px-2 text-xs hidden md:block">
                  <option value="name:asc">Name A-Z</option>
                  <option value="name:desc">Name Z-A</option>
                  <option value="date:desc">Newest</option>
                  <option value="date:asc">Oldest</option>
                  <option value="size:desc">Largest</option>
                  <option value="size:asc">Smallest</option>
                  <option value="type:asc">Type</option>
                </select>

                <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                  <UploadIcon className="w-3.5 h-3.5" />
                  Upload
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />

                {showNewFolder ? (
                  <div className="flex items-center gap-1.5">
                    <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); } }}
                      className="input-field w-36 py-1" />
                    <button onClick={createFolder} className="btn-icon text-emerald-400"><CheckIcon className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="btn-icon"><XIcon className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewFolder(true)} className="btn-ghost hidden sm:inline-flex">
                    <FolderPlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">New Folder</span>
                  </button>
                )}

                <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="btn-icon" title="Toggle view">
                  {viewMode === 'grid' ? <ListIcon className="w-4 h-4" /> : <GridIcon className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          {sidebarTab === 'shared' && <h2 className="text-sm font-medium text-[#F4EFE5] flex-1">Shared with Me</h2>}
          {sidebarTab === 'starred' && <h2 className="text-sm font-medium text-[#F4EFE5] flex-1">Starred Files</h2>}
          {sidebarTab === 'trash' && <h2 className="text-sm font-medium text-[#F4EFE5] flex-1">Trash</h2>}
        </header>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 overflow-auto p-5">
            {/* Upload progress */}
            {uploading.length > 0 && (
              <div className="surface rounded-lg p-4 mb-5 space-y-3 animate-fade-up">
                {uploading.map((u, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#9A8D7A] truncate max-w-[70%]">{u.name}</span>
                      <span className="text-[#C9913D] font-mono-data">{u.progress}%</span>
                    </div>
                    <div className="h-px bg-[rgba(248,240,220,0.06)] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9913D] rounded-full transition-all duration-300 ease-out" style={{ width: `${u.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paste notification */}
            {pasteNotif && (
              <div className="surface rounded-lg px-4 py-3 mb-4 text-sm text-[#C9913D] animate-fade-up flex items-center gap-2">
                <UploadIcon className="w-4 h-4" />
                Uploading pasted files&hellip;
              </div>
            )}

            {/* Search results */}
            {isSearching && searchResults && (
              <div className="animate-fade-in">
                <p className="text-xs text-[#5A5045] mb-3 font-mono-data">Search results for &ldquo;{searchQuery}&rdquo;</p>
                {searchResults.folders.length === 0 && searchResults.files.length === 0 ? (
                  <p className="text-[#5A5045] text-sm py-12 text-center">No results found</p>
                ) : (
                  <div className="surface rounded-lg overflow-hidden">
                    {searchResults.folders.map(folder => (
                      <div key={folder.id} onClick={() => { setSearchQuery(''); setCurrentFolder(folder.id); setSidebarTab('files'); }}
                        className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(248,240,220,0.04)] last:border-0 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer transition-colors">
                        <FolderContextMenuIcon className="w-4 h-4 text-[#C9913D]/60 flex-shrink-0" />
                        <div>
                          <div className="text-sm text-[#F4EFE5] font-medium">{folder.name}</div>
                          <div className="text-xs text-[#5A5045]">Folder</div>
                        </div>
                      </div>
                    ))}
                    {searchResults.files.map(file => {
                      const { Icon, colorClass } = getFileInfo(file.mime_type);
                      return (
                        <div key={file.id} onClick={() => { setSearchQuery(''); if (canPreview(file.mime_type, file.original_name)) setPreview(file); else window.open(`/api/files/${file.id}`, '_blank'); }}
                          className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(248,240,220,0.04)] last:border-0 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer transition-colors">
                          <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-[#F4EFE5] font-medium truncate">{file.original_name}</div>
                            <div className="text-xs text-[#5A5045]">{(file as any).folder_name ? `/${(file as any).folder_name}` : '/ (root)'}</div>
                          </div>
                          <span className="text-xs text-[#5A5045] font-mono-data">{formatSize(file.size)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Filter pills (files tab only) */}
            {sidebarTab === 'files' && !isSearching && (
              <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {FILTER_TYPES.map(ft => (
                  <button key={ft.id} onClick={() => setFilterType(ft.id)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${filterType === ft.id ? 'bg-[#C9913D] text-[#0C0B09] font-semibold' : 'bg-[rgba(248,240,220,0.06)] text-[#9A8D7A] hover:bg-[rgba(248,240,220,0.1)]'}`}>
                    {ft.label}
                  </button>
                ))}
              </div>
            )}

            {/* Files tab */}
            {(sidebarTab === 'files' || sidebarTab === 'starred') && !isSearching && (
              <div className="animate-fade-in">
                {folders.length === 0 && activeFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-28">
                    <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] border border-[rgba(248,240,220,0.07)] flex items-center justify-center mb-5">
                      {sidebarTab === 'starred' ? <StarIcon className="w-8 h-8 text-[#3A3330]" /> : <FilesIcon className="w-8 h-8 text-[#3A3330]" />}
                    </div>
                    <p className="text-[#9A8D7A] font-medium">{sidebarTab === 'starred' ? 'No starred files' : 'No files yet'}</p>
                    <p className="text-[#5A5045] text-sm mt-1">{sidebarTab === 'starred' ? 'Star files to find them quickly' : 'Drag & drop or click Upload'}</p>
                  </div>
                ) : (
                  <FileGrid
                    files={sidebarTab === 'starred' ? starredFiles : files}
                    folders={sidebarTab === 'starred' ? [] : folders}
                    viewMode={viewMode}
                    sortBy={sortBy}
                    sortDir={sortDir}
                    filterType={filterType}
                    searchQuery={searchQuery}
                    selectedFiles={selectedFiles}
                    onSelectFile={toggleSelectFile}
                    onSelectAll={selectAll}
                    onOpenFolder={id => setCurrentFolder(id)}
                    onDeleteFolder={trashFolder}
                    onPreview={setPreview}
                    onContextMenu={(file, x, y) => setContextMenu({ file, x, y })}
                    onFolderContextMenu={(folder, x, y) => setFolderContextMenu({ folder, x, y })}
                    onStar={toggleStar}
                    onInfo={setInfoPanel}
                    onRenameFile={renameFile}
                    onRenameFolder={renameFolder}
                  />
                )}
              </div>
            )}

            {/* Shared tab */}
            {sidebarTab === 'shared' && (
              <div className="animate-fade-in">
                {sharedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-28">
                    <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] border border-[rgba(248,240,220,0.07)] flex items-center justify-center mb-5">
                      <UsersIcon className="w-8 h-8 text-[#3A3330]" />
                    </div>
                    <p className="text-[#9A8D7A] font-medium">Nothing shared with you yet</p>
                  </div>
                ) : (
                  <div className="surface rounded-lg overflow-hidden">
                    {sharedItems.map(item => {
                      const { Icon, colorClass } = getFileInfo(item.mime_type);
                      return (
                        <div key={item.id} onClick={() => { if (item.item_type === 'file') { const f = { id: item.item_id, original_name: item.item_name, mime_type: item.mime_type, size: item.size } as any; if (canPreview(item.mime_type, item.item_name)) setPreview(f); else window.open(`/api/files/${item.item_id}`, '_blank'); } }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer transition-colors border-b border-[rgba(248,240,220,0.04)] last:border-0">
                          <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-[#F4EFE5] font-medium truncate">{item.item_name}</div>
                            <div className="text-xs text-[#5A5045] mt-0.5">Shared by <span className="text-[#9A8D7A]">{item.owner_name}</span> &middot; {item.permission}</div>
                          </div>
                          <span className="text-xs text-[#5A5045] font-mono-data flex-shrink-0">{item.size > 0 ? formatSize(item.size) : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Trash tab */}
            {sidebarTab === 'trash' && (
              <TrashView
                files={trash.files}
                folders={trash.folders}
                onRestoreFile={restoreFile}
                onDeleteFile={permanentDeleteFile}
                onRestoreFolder={restoreFolder}
                onDeleteFolder={permanentDeleteFolder}
                onEmpty={emptyTrash}
              />
            )}
          </div>

          {/* Info panel */}
          {infoPanel && (
            <FileInfoPanel file={infoPanel} onClose={() => setInfoPanel(null)} />
          )}
        </div>
      </main>

      {/* Drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[#C9913D]/5 backdrop-blur-sm" />
          <div className="relative surface-modal rounded-xl p-12 text-center animate-fade-up" style={{ borderColor: 'rgba(201, 145, 61, 0.3)' }}>
            <UploadIcon className="w-10 h-10 text-[#C9913D] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#F4EFE5]">Drop files here</p>
          </div>
        </div>
      )}

      {/* File context menu */}
      {contextMenu && (
        <FileContextMenu
          file={contextMenu.file}
          x={contextMenu.x} y={contextMenu.y}
          onPreview={() => { setPreview(contextMenu.file); setContextMenu(null); }}
          onDownload={() => { window.open(`/api/files/${contextMenu.file.id}`, '_blank'); setContextMenu(null); }}
          onShare={() => { createShareLink(contextMenu.file); setContextMenu(null); }}
          onStar={() => { toggleStar(contextMenu.file); setContextMenu(null); }}
          onMove={() => { setMoveModal({ item: contextMenu.file, type: 'file' }); setContextMenu(null); }}
          onRename={() => { setRenamingFileId(contextMenu.file.id); setContextMenu(null); }}
          onInfo={() => { setInfoPanel(contextMenu.file); setContextMenu(null); }}
          onDelete={() => { trashFile(contextMenu.file.id); setContextMenu(null); }}
        />
      )}

      {/* Folder context menu */}
      {folderContextMenu && (
        <FolderContextMenu
          folder={folderContextMenu.folder}
          x={folderContextMenu.x} y={folderContextMenu.y}
          onOpen={() => { setCurrentFolder(folderContextMenu.folder.id); setFolderContextMenu(null); }}
          onMove={() => { setMoveModal({ item: folderContextMenu.folder, type: 'folder' }); setFolderContextMenu(null); }}
          onRename={() => { setRenamingFolderId(folderContextMenu.folder.id); setFolderContextMenu(null); }}
          onDelete={() => { trashFolder(folderContextMenu.folder.id); setFolderContextMenu(null); }}
        />
      )}

      {/* Share dialog */}
      {shareDialog && (
        <ShareDialog shareDialog={shareDialog} onClose={() => setShareDialog(null)} onRefresh={fetchFiles} />
      )}

      {/* Move modal */}
      {moveModal && (
        <MoveModal
          itemName={'original_name' in moveModal.item ? moveModal.item.original_name : moveModal.item.name}
          onMove={targetId => {
            if (moveModal.type === 'file') moveFile(moveModal.item.id, targetId);
            else moveFolder(moveModal.item.id, targetId);
          }}
          onClose={() => setMoveModal(null)}
        />
      )}

      {/* Profile modal */}
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} onUpdated={u => setUser(u)} />}

      {/* Bulk action bar */}
      <BulkBar
        count={selectedFiles.size}
        onClear={() => setSelectedFiles(new Set())}
        onDelete={bulkDelete}
        onDownloadZip={bulkDownloadZip}
        onStar={bulkStar}
        onMove={() => {}}
      />

      {/* Preview */}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

// Inline icon for search results folders
function FolderContextMenuIcon(p: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}
