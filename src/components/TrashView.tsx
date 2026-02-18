'use client';
import type { FileItem, FolderItem } from '@/types';
import { TrashIcon, RestoreIcon, XIcon, FolderIcon } from './icons';

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

interface TrashViewProps {
  files: FileItem[];
  folders: FolderItem[];
  onRestoreFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onRestoreFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onEmpty: () => void;
}

export function TrashView({ files, folders, onRestoreFile, onDeleteFile, onRestoreFolder, onDeleteFolder, onEmpty }: TrashViewProps) {
  const isEmpty = files.length === 0 && folders.length === 0;

  return (
    <div className="animate-fade-in">
      {!isEmpty && (
        <div className="flex justify-end mb-4">
          <button onClick={() => { if (confirm('Permanently delete everything in trash?')) onEmpty(); }}
            className="btn-ghost text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40">
            <TrashIcon className="w-3.5 h-3.5" />
            Empty Trash
          </button>
        </div>
      )}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-28">
          <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] border border-[rgba(248,240,220,0.07)] flex items-center justify-center mb-5">
            <TrashIcon className="w-8 h-8 text-[#3A3330]" />
          </div>
          <p className="text-[#9A8D7A] font-medium">Trash is empty</p>
          <p className="text-[#5A5045] text-sm mt-1">Deleted files appear here</p>
        </div>
      ) : (
        <div className="surface rounded-lg overflow-hidden">
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(248,240,220,0.04)] last:border-0 hover:bg-[rgba(248,240,220,0.02)] group">
              <FolderIcon className="w-4 h-4 text-[#C9913D]/40 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#9A8D7A] truncate">{folder.name}</div>
                <div className="text-xs text-[#5A5045]">Folder &middot; Deleted {new Date(folder.deleted_at!).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onRestoreFolder(folder.id)} title="Restore" className="btn-icon w-7 h-7 text-emerald-400 hover:text-emerald-300">
                  <RestoreIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (confirm('Permanently delete this folder?')) onDeleteFolder(folder.id); }}
                  title="Delete permanently" className="btn-icon w-7 h-7 text-red-400 hover:text-red-300">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {files.map(file => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(248,240,220,0.04)] last:border-0 hover:bg-[rgba(248,240,220,0.02)] group">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#9A8D7A] truncate">{file.original_name}</div>
                <div className="text-xs text-[#5A5045]">{formatSize(file.size)} &middot; Deleted {new Date(file.deleted_at!).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onRestoreFile(file.id)} title="Restore" className="btn-icon w-7 h-7 text-emerald-400 hover:text-emerald-300">
                  <RestoreIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (confirm('Permanently delete this file?')) onDeleteFile(file.id); }}
                  title="Delete permanently" className="btn-icon w-7 h-7 text-red-400 hover:text-red-300">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
