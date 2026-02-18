'use client';
import { useState, useRef, useEffect } from 'react';
import type { FileItem, FolderItem, SortBy, SortDir, FilterType } from '@/types';
import { getFileInfo, canPreview, formatSize } from '@/lib/helpers';
import {
  FolderIcon, XIcon, LinkIcon, StarIcon, InfoIcon, PencilIcon, CheckIcon,
  DownloadIcon, EyeIcon
} from './icons';

interface FileGridProps {
  files: FileItem[];
  folders: FolderItem[];
  viewMode: 'grid' | 'list';
  sortBy: SortBy;
  sortDir: SortDir;
  filterType: FilterType;
  searchQuery: string;
  selectedFiles: Set<string>;
  onSelectFile: (id: string, val: boolean) => void;
  onSelectAll: () => void;
  onOpenFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onPreview: (file: FileItem) => void;
  onContextMenu: (file: FileItem, x: number, y: number) => void;
  onFolderContextMenu: (folder: FolderItem, x: number, y: number) => void;
  onStar: (file: FileItem) => void;
  onInfo: (file: FileItem) => void;
  onRenameFile: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
}

function sortFiles(files: FileItem[], sortBy: SortBy, sortDir: SortDir): FileItem[] {
  return [...files].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') cmp = a.original_name.localeCompare(b.original_name);
    else if (sortBy === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else if (sortBy === 'size') cmp = a.size - b.size;
    else if (sortBy === 'type') cmp = a.mime_type.localeCompare(b.mime_type);
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function filterFiles(files: FileItem[], filterType: FilterType): FileItem[] {
  if (filterType === 'all') return files;
  return files.filter(f => getFileInfo(f.mime_type).category === filterType);
}

function InlineRename({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      value={v}
      onChange={e => setV(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') onSave(v.trim()); if (e.key === 'Escape') onCancel(); }}
      onBlur={() => onSave(v.trim())}
      onClick={e => e.stopPropagation()}
      className="input-field text-xs py-0.5 px-1 h-6 w-full"
      autoFocus
    />
  );
}

export function FileGrid({
  files, folders, viewMode, sortBy, sortDir, filterType, searchQuery,
  selectedFiles, onSelectFile, onSelectAll, onOpenFolder, onDeleteFolder,
  onPreview, onContextMenu, onFolderContextMenu, onStar, onInfo, onRenameFile, onRenameFolder,
}: FileGridProps) {
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const hasSelected = selectedFiles.size > 0;

  const displayedFiles = filterFiles(sortFiles(files, sortBy, sortDir), filterType);
  const displayedFolders = sortBy === 'name'
    ? [...folders].sort((a, b) => sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
    : folders;

  const allIds = [...folders.map(f => 'f:' + f.id), ...files.map(f => f.id)];
  const allSelected = allIds.length > 0 && allIds.every(id => selectedFiles.has(id));

  if (viewMode === 'grid') {
    return (
      <div>
        {(hasSelected || displayedFolders.length + displayedFiles.length > 0) && (
          <div className="flex items-center gap-2 mb-3">
            <input type="checkbox" checked={allSelected} onChange={onSelectAll}
              className="w-3.5 h-3.5 accent-[#C9913D] cursor-pointer" />
            <span className="text-xs text-[#5A5045]">Select all</span>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {displayedFolders.map((folder, i) => (
            <div
              key={folder.id}
              className={`surface-hover rounded-lg p-3.5 cursor-pointer group relative animate-fade-up ${selectedFiles.has('f:' + folder.id) ? 'ring-1 ring-[#C9913D]/50' : ''}`}
              style={{ animationDelay: `${i * 25}ms` }}
              onClick={() => !renamingFolder && onOpenFolder(folder.id)}
              onContextMenu={e => { e.preventDefault(); onFolderContextMenu(folder, e.clientX, e.clientY); }}
            >
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedFiles.has('f:' + folder.id)}
                  onChange={e => { e.stopPropagation(); onSelectFile('f:' + folder.id, e.target.checked); }}
                  onClick={e => e.stopPropagation()}
                  className={`w-3.5 h-3.5 accent-[#C9913D] cursor-pointer transition-opacity ${hasSelected || selectedFiles.has('f:' + folder.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                />
              </div>
              <div className="flex items-start justify-between mb-3 mt-1">
                <FolderIcon className="w-9 h-9 text-[#C9913D]/60 group-hover:text-[#C9913D] transition-colors duration-200" />
                <button onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); }}
                  className="opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-red-400 transition-all p-0.5 -mr-0.5 -mt-0.5">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
              {renamingFolder === folder.id ? (
                <InlineRename value={folder.name}
                  onSave={v => { onRenameFolder(folder.id, v); setRenamingFolder(null); }}
                  onCancel={() => setRenamingFolder(null)} />
              ) : (
                <>
                  <p className="text-sm font-medium text-[#F4EFE5] truncate leading-tight"
                    onDoubleClick={e => { e.stopPropagation(); setRenamingFolder(folder.id); }}>{folder.name}</p>
                  <p className="text-xs text-[#5A5045] mt-0.5">Folder</p>
                </>
              )}
            </div>
          ))}

          {displayedFiles.map((file, i) => {
            const { Icon, colorClass, bgClass } = getFileInfo(file.mime_type);
            const isImage = file.mime_type.startsWith('image/');
            const isSelected = selectedFiles.has(file.id);
            return (
              <div
                key={file.id}
                className={`surface-hover rounded-lg overflow-hidden cursor-pointer group relative animate-fade-up ${isSelected ? 'ring-1 ring-[#C9913D]/50' : ''}`}
                style={{ animationDelay: `${(displayedFolders.length + i) * 25}ms` }}
                onClick={() => canPreview(file.mime_type, file.original_name) ? onPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
                onContextMenu={e => { e.preventDefault(); onContextMenu(file, e.clientX, e.clientY); }}
              >
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => { e.stopPropagation(); onSelectFile(file.id, e.target.checked); }}
                    onClick={e => e.stopPropagation()}
                    className={`w-3.5 h-3.5 accent-[#C9913D] cursor-pointer transition-opacity ${hasSelected || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  />
                </div>
                {isImage ? (
                  <div className="aspect-[4/3] overflow-hidden bg-[#1B1917]">
                    <img src={`/api/files/${file.id}?inline=1`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                ) : (
                  <div className={`aspect-[4/3] flex items-center justify-center ${bgClass}`}>
                    <Icon className={`w-10 h-10 ${colorClass}`} />
                  </div>
                )}
                <div className="p-2.5">
                  {renamingFile === file.id ? (
                    <InlineRename value={file.original_name}
                      onSave={v => { onRenameFile(file.id, v); setRenamingFile(null); }}
                      onCancel={() => setRenamingFile(null)} />
                  ) : (
                    <p className="text-xs font-medium text-[#F4EFE5] truncate"
                      onDoubleClick={e => { e.stopPropagation(); setRenamingFile(file.id); }}>{file.original_name}</p>
                  )}
                  <p className="text-xs text-[#5A5045] mt-0.5 font-mono-data">{formatSize(file.size)}</p>
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={e => { e.stopPropagation(); onStar(file); }} title={file.starred ? 'Unstar' : 'Star'}
                    className={`w-5 h-5 flex items-center justify-center rounded transition-all ${file.starred ? 'text-[#C9913D] opacity-100' : 'opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-[#C9913D]'}`}>
                    <StarIcon className="w-3 h-3" filled={!!file.starred} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); onInfo(file); }} title="Details"
                    className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-[#9A8D7A] transition-all">
                    <InfoIcon className="w-3 h-3" />
                  </button>
                  {file.share_token && (
                    <div className="w-5 h-5 bg-[rgba(201,145,61,0.2)] backdrop-blur-sm rounded flex items-center justify-center">
                      <LinkIcon className="w-2.5 h-2.5 text-[#C9913D]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="surface rounded-lg overflow-hidden">
      <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-0 text-xs text-[#5A5045] px-4 py-2 border-b border-[rgba(248,240,220,0.06)] font-mono-data uppercase tracking-wide items-center">
        <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="w-3.5 h-3.5 accent-[#C9913D] cursor-pointer mr-3" />
        <span className="w-5 mr-3" />
        <span>Name</span>
        <span className="w-20 text-right mr-4">Size</span>
        <span className="w-24 text-right mr-4 hidden sm:block">Modified</span>
        <span className="w-16" />
      </div>
      {displayedFolders.map(folder => (
        <div key={folder.id}
          className={`grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer group transition-colors border-b border-[rgba(248,240,220,0.04)] last:border-0 ${selectedFiles.has('f:' + folder.id) ? 'bg-[rgba(201,145,61,0.05)]' : ''}`}
          onClick={() => !renamingFolder && onOpenFolder(folder.id)}
          onContextMenu={e => { e.preventDefault(); onFolderContextMenu(folder, e.clientX, e.clientY); }}>
          <input type="checkbox" checked={selectedFiles.has('f:' + folder.id)}
            onChange={e => { e.stopPropagation(); onSelectFile('f:' + folder.id, e.target.checked); }}
            onClick={e => e.stopPropagation()}
            className="w-3.5 h-3.5 accent-[#C9913D] cursor-pointer mr-3" />
          <FolderIcon className="w-4 h-4 text-[#C9913D]/60 mr-3" />
          <span className="text-sm text-[#F4EFE5] font-medium truncate">
            {renamingFolder === folder.id
              ? <InlineRename value={folder.name}
                  onSave={v => { onRenameFolder(folder.id, v); setRenamingFolder(null); }}
                  onCancel={() => setRenamingFolder(null)} />
              : <span onDoubleClick={e => { e.stopPropagation(); setRenamingFolder(folder.id); }}>{folder.name}</span>
            }
          </span>
          <span className="text-xs text-[#5A5045] font-mono-data w-20 text-right mr-4">&mdash;</span>
          <span className="text-xs text-[#5A5045] font-mono-data w-24 text-right mr-4 hidden sm:block">{new Date(folder.created_at).toLocaleDateString()}</span>
          <div className="w-16 flex justify-end">
            <button onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); }}
              className="opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-red-400 transition-all">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
      {displayedFiles.map(file => {
        const { Icon, colorClass } = getFileInfo(file.mime_type);
        const isSelected = selectedFiles.has(file.id);
        return (
          <div key={file.id}
            className={`grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer group transition-colors border-b border-[rgba(248,240,220,0.04)] last:border-0 ${isSelected ? 'bg-[rgba(201,145,61,0.05)]' : ''}`}
            onClick={() => canPreview(file.mime_type, file.original_name) ? onPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
            onContextMenu={e => { e.preventDefault(); onContextMenu(file, e.clientX, e.clientY); }}>
            <input type="checkbox" checked={isSelected}
              onChange={e => { e.stopPropagation(); onSelectFile(file.id, e.target.checked); }}
              onClick={e => e.stopPropagation()}
              className="w-3.5 h-3.5 accent-[#C9913D] cursor-pointer mr-3" />
            <Icon className={`w-4 h-4 mr-3 ${colorClass}`} />
            <span className="text-sm text-[#F4EFE5] truncate flex items-center gap-1.5">
              {renamingFile === file.id
                ? <InlineRename value={file.original_name}
                    onSave={v => { onRenameFile(file.id, v); setRenamingFile(null); }}
                    onCancel={() => setRenamingFile(null)} />
                : <span onDoubleClick={e => { e.stopPropagation(); setRenamingFile(file.id); }}>{file.original_name}</span>
              }
              {file.share_token && <LinkIcon className="w-3 h-3 text-[#C9913D] flex-shrink-0" />}
              {!!file.starred && <StarIcon className="w-3 h-3 text-[#C9913D] flex-shrink-0" filled />}
            </span>
            <span className="text-xs text-[#5A5045] font-mono-data w-20 text-right mr-4">{formatSize(file.size)}</span>
            <span className="text-xs text-[#5A5045] font-mono-data w-24 text-right mr-4 hidden sm:block">{new Date(file.created_at).toLocaleDateString()}</span>
            <div className="w-16 flex justify-end gap-1">
              <button onClick={e => { e.stopPropagation(); onStar(file); }}
                className={`transition-all ${file.starred ? 'text-[#C9913D] opacity-100' : 'opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-[#C9913D]'}`}>
                <StarIcon className="w-3.5 h-3.5" filled={!!file.starred} />
              </button>
              <button onClick={e => { e.stopPropagation(); onInfo(file); }}
                className="opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-[#9A8D7A] transition-all">
                <InfoIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
