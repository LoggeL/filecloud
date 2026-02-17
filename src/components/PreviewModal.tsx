'use client';

import { useEffect, useState } from 'react';

interface FileItem {
  id: string; original_name: string; mime_type: string; size: number;
}

function getFileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📄';
  return '📎';
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

  useEffect(() => {
    if (isText) {
      fetch(url).then(r => r.text()).then(setTextContent);
    }
  }, [file.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Simple markdown renderer
  function renderMarkdown(md: string) {
    return md
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-white">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2 text-white">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-white">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-pink-300 text-sm">$1</code>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-5xl max-h-[90vh] w-full animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white font-medium truncate pr-4 text-sm sm:text-base">{file.original_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none p-2 -mr-2">✕</button>
        </div>
        <div className="glass-strong rounded-2xl overflow-hidden flex items-center justify-center" style={{ maxHeight: '80vh' }}>
          {isImage && <img src={url} alt={file.original_name} className="max-h-[80vh] max-w-full object-contain" />}
          {isVideo && <video controls autoPlay className="max-h-[80vh] w-full"><source src={url} type={file.mime_type} /></video>}
          {isAudio && <div className="p-12 w-full"><div className="text-5xl text-center mb-6">🎵</div><audio controls autoPlay className="w-full"><source src={url} type={file.mime_type} /></audio></div>}
          {isPdf && <iframe src={url} className="w-full" style={{ height: '80vh' }} />}
          {isText && textContent !== null && (
            <div className="w-full max-h-[80vh] overflow-auto p-6">
              {isMarkdown ? (
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent) }} />
              ) : (
                <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words leading-relaxed">{textContent}</pre>
              )}
            </div>
          )}
          {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
            <div className="p-12 text-center text-gray-400">
              <div className="text-6xl mb-4">{getFileIcon(file.mime_type)}</div>
              <p>Preview not available for this file type</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
