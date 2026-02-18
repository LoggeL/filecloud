'use client';
import { useState, useEffect } from 'react';
import type { FileItem } from '@/types';
import { XIcon, DownloadIcon, LinkIcon } from './icons';

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

interface FileInfoPanelProps {
  file: FileItem;
  onClose: () => void;
  onTagFilter?: (tag: string) => void;
}

export function FileInfoPanel({ file, onClose, onTagFilter }: FileInfoPanelProps) {
  const [info, setInfo] = useState<{ tags: any[]; analysis: any; breadcrumbs: any[] } | null>(null);

  useEffect(() => {
    fetch(`/api/files/${file.id}/info`).then(r => r.json()).then(d => setInfo(d));
  }, [file.id]);

  return (
    <div className="w-72 flex-shrink-0 bg-[#0D0C0A] border-l border-[rgba(248,240,220,0.06)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(248,240,220,0.06)]">
        <span className="text-sm font-medium text-[#F4EFE5]">File Info</span>
        <button onClick={onClose} className="text-[#5A5045] hover:text-[#9A8D7A] p-1 transition-colors">
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-xs text-[#5A5045] uppercase tracking-wide font-mono-data mb-2">File</p>
          <p className="text-sm text-[#F4EFE5] font-medium break-all">{file.original_name}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[#5A5045] mb-0.5">Size</p>
            <p className="text-[#9A8D7A] font-mono-data">{formatSize(file.size)}</p>
          </div>
          <div>
            <p className="text-[#5A5045] mb-0.5">Type</p>
            <p className="text-[#9A8D7A] truncate">{file.mime_type}</p>
          </div>
          <div>
            <p className="text-[#5A5045] mb-0.5">Uploaded</p>
            <p className="text-[#9A8D7A] font-mono-data">{new Date(file.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[#5A5045] mb-0.5">Shared</p>
            <p className={file.share_token ? 'text-[#C9913D]' : 'text-[#5A5045]'}>{file.share_token ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {info?.breadcrumbs && info.breadcrumbs.length > 0 && (
          <div>
            <p className="text-xs text-[#5A5045] uppercase tracking-wide font-mono-data mb-2">Location</p>
            <p className="text-xs text-[#9A8D7A]">
              Home {info.breadcrumbs.map((b: any) => `/ ${b.name}`).join(' ')}
            </p>
          </div>
        )}

        {info?.tags && info.tags.length > 0 && (
          <div>
            <p className="text-xs text-[#5A5045] uppercase tracking-wide font-mono-data mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {info.tags.map((tag: any) => (
                <button key={tag.id} onClick={() => onTagFilter?.(tag.name)}
                  className="px-2 py-0.5 rounded text-xs transition-colors hover:brightness-125"
                  style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}>
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {info?.analysis?.summary && (
          <div>
            <p className="text-xs text-[#5A5045] uppercase tracking-wide font-mono-data mb-2">AI Summary</p>
            <p className="text-xs text-[#9A8D7A] leading-relaxed">{info.analysis.summary}</p>
          </div>
        )}

        <div className="pt-2">
          <a href={`/api/files/${file.id}`} download className="btn-ghost w-full justify-center text-xs">
            <DownloadIcon className="w-3.5 h-3.5" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
