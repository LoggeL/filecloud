'use client';

import { useEffect, useRef, useState } from 'react';

interface FileItem {
  id: string; original_name: string; mime_type: string; size: number;
}

const XIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DownloadIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const AudioNoteIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
  </svg>
);

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

// Render markdown text as simple structured JSX lines
function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="max-w-none text-[#9A8D7A] leading-relaxed text-sm space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-4 mb-1.5 text-[#F4EFE5]">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-5 mb-2 text-[#F4EFE5]">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-6 mb-2 text-[#F4EFE5]">{line.slice(2)}</h1>;
        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (line === '') return <br key={i} />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export function PreviewModal({ file, shareToken, onClose }: { file: FileItem; shareToken?: string; onClose: () => void }) {
  const [textContent, setTextContent] = useState<string | null>(null);

  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';
  const isText = file.mime_type.startsWith('text/') || file.mime_type.includes('json') || file.mime_type.includes('xml') || file.mime_type.includes('javascript') || file.mime_type.includes('css') || file.original_name.endsWith('.md');
  const isMarkdown = file.original_name.endsWith('.md') || file.mime_type === 'text/markdown';

  const url = shareToken ? `/api/files/${file.id}?share=${shareToken}&inline=1` : `/api/files/${file.id}?inline=1`;
  const downloadUrl = shareToken ? `/api/files/${file.id}?share=${shareToken}` : `/api/files/${file.id}`;

  useEffect(() => {
    if (isText) {
      fetch(url).then(r => r.text()).then(setTextContent);
    }
  }, [file.id]); // eslint-disable-line

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="w-full max-w-5xl flex items-center justify-between mb-3 px-1"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-sm font-medium text-[#F4EFE5] truncate">{file.original_name}</p>
          <p className="text-xs text-[#5A5045] mt-0.5 font-mono-data">{formatSize(file.size)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={downloadUrl}
            download
            className="btn-ghost text-xs"
            onClick={e => e.stopPropagation()}
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button onClick={onClose} className="btn-icon">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="w-full max-w-5xl surface-modal rounded-xl overflow-hidden flex items-center justify-center animate-fade-up"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={url}
            alt={file.original_name}
            className="max-h-[80vh] max-w-full object-contain"
          />
        )}
        {isVideo && (
          <video controls autoPlay className="max-h-[80vh] w-full">
            <source src={url} type={file.mime_type} />
          </video>
        )}
        {isAudio && (
          <div className="p-12 w-full text-center">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <AudioNoteIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-sm text-[#9A8D7A] mb-5">{file.original_name}</p>
            <audio controls autoPlay className="w-full max-w-md mx-auto">
              <source src={url} type={file.mime_type} />
            </audio>
          </div>
        )}
        {isPdf && (
          <iframe src={url} className="w-full" style={{ height: '80vh' }} />
        )}
        {isText && textContent !== null && (
          <div className="w-full max-h-[80vh] overflow-auto p-6">
            {isMarkdown ? (
              <MarkdownText content={textContent} />
            ) : (
              <pre className="text-sm text-[#9A8D7A] font-mono-data whitespace-pre-wrap break-words leading-relaxed">
                {textContent}
              </pre>
            )}
          </div>
        )}
        {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#5A5045]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-[#5A5045] text-sm">Preview not available</p>
            <a href={downloadUrl} download className="btn-primary mt-4 inline-flex">
              <DownloadIcon className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
