'use client';
import type { FileItem, FolderItem } from '@/types';
import { EyeIcon, DownloadIcon, ShareIcon, TrashIcon, StarIcon, MoveIcon, PencilIcon, InfoIcon, FolderIcon } from './icons';
import { canPreview } from '@/lib/helpers';

interface FileContextMenuProps {
  file: FileItem;
  x: number; y: number;
  onPreview: () => void;
  onDownload: () => void;
  onShare: () => void;
  onStar: () => void;
  onMove: () => void;
  onRename: () => void;
  onInfo: () => void;
  onDelete: () => void;
}

interface FolderContextMenuProps {
  folder: FolderItem;
  x: number; y: number;
  onOpen: () => void;
  onMove: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function FileContextMenu({ file, x, y, onPreview, onDownload, onShare, onStar, onMove, onRename, onInfo, onDelete }: FileContextMenuProps) {
  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - 280);
  return (
    <div className="fixed z-50 dropdown-menu animate-fade-in min-w-[200px]" style={{ left: menuX, top: menuY }}>
      {canPreview(file.mime_type, file.original_name) && (
        <button onClick={onPreview} className="dropdown-item"><EyeIcon className="w-3.5 h-3.5 flex-shrink-0" /> Preview</button>
      )}
      <button onClick={onDownload} className="dropdown-item"><DownloadIcon className="w-3.5 h-3.5 flex-shrink-0" /> Download</button>
      <button onClick={onShare} className="dropdown-item"><ShareIcon className="w-3.5 h-3.5 flex-shrink-0" /> Share</button>
      <div className="dropdown-divider" />
      <button onClick={onStar} className="dropdown-item">
        <StarIcon className="w-3.5 h-3.5 flex-shrink-0" filled={!!file.starred} />
        {file.starred ? 'Unstar' : 'Star'}
      </button>
      <button onClick={onMove} className="dropdown-item"><MoveIcon className="w-3.5 h-3.5 flex-shrink-0" /> Move to&hellip;</button>
      <button onClick={onRename} className="dropdown-item"><PencilIcon className="w-3.5 h-3.5 flex-shrink-0" /> Rename</button>
      <button onClick={onInfo} className="dropdown-item"><InfoIcon className="w-3.5 h-3.5 flex-shrink-0" /> Details</button>
      <div className="dropdown-divider" />
      <button onClick={onDelete} className="dropdown-item danger"><TrashIcon className="w-3.5 h-3.5 flex-shrink-0" /> Move to Trash</button>
    </div>
  );
}

export function FolderContextMenu({ folder, x, y, onOpen, onMove, onRename, onDelete }: FolderContextMenuProps) {
  const menuX = Math.min(x, window.innerWidth - 200);
  const menuY = Math.min(y, window.innerHeight - 200);
  return (
    <div className="fixed z-50 dropdown-menu animate-fade-in min-w-[180px]" style={{ left: menuX, top: menuY }}>
      <button onClick={onOpen} className="dropdown-item"><FolderIcon className="w-3.5 h-3.5 flex-shrink-0" /> Open</button>
      <div className="dropdown-divider" />
      <button onClick={onMove} className="dropdown-item"><MoveIcon className="w-3.5 h-3.5 flex-shrink-0" /> Move to&hellip;</button>
      <button onClick={onRename} className="dropdown-item"><PencilIcon className="w-3.5 h-3.5 flex-shrink-0" /> Rename</button>
      <div className="dropdown-divider" />
      <button onClick={onDelete} className="dropdown-item danger"><TrashIcon className="w-3.5 h-3.5 flex-shrink-0" /> Move to Trash</button>
    </div>
  );
}
