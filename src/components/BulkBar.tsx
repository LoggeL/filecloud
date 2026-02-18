'use client';
import { TrashIcon, DownloadIcon, StarIcon, MoveIcon, XIcon } from './icons';

interface BulkBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onDownloadZip: () => void;
  onStar: () => void;
  onMove: () => void;
}

export function BulkBar({ count, onClear, onDelete, onDownloadZip, onStar, onMove }: BulkBarProps) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 animate-fade-up">
      <div className="surface-modal rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl">
        <span className="text-sm font-medium text-[#F4EFE5] mr-1">{count} selected</span>
        <div className="h-4 w-px bg-[rgba(248,240,220,0.12)]" />
        <button onClick={onStar} title="Star selected" className="btn-icon w-8 h-8 hover:text-[#C9913D]">
          <StarIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={onMove} title="Move selected" className="btn-icon w-8 h-8">
          <MoveIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDownloadZip} title="Download as zip" className="btn-icon w-8 h-8">
          <DownloadIcon className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} title="Move to trash" className="btn-icon w-8 h-8 hover:text-red-400">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
        <div className="h-4 w-px bg-[rgba(248,240,220,0.12)]" />
        <button onClick={onClear} className="btn-icon w-8 h-8">
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
