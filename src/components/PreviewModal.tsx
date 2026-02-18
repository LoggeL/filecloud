'use client';

import { useEffect, useState } from 'react';
import { XIcon, DownloadIcon } from './icons';

interface FileItem {
  id: string; original_name: string; mime_type: string; size: number;
}

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  return (
    <div className="text-[#9A8D7A] leading-relaxed text-sm space-y-1">
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

// Lightweight regex-based syntax highlighter
function SyntaxHighlight({ code, ext }: { code: string; ext: string }) {
  const tokenize = (line: string): React.ReactNode[] => {
    // Keywords
    const KW = /\b(const|let|var|function|return|if|else|for|while|do|class|import|export|from|default|async|await|new|typeof|instanceof|null|undefined|true|false|void|this|super|extends|try|catch|finally|throw|switch|case|break|continue|def|lambda|pass|yield|in|is|not|and|or|elif|del)\b/g;
    // Strings
    const STR = /(["'`])(?:\\.|(?!\1)[^\\])*\1/g;
    // Comments
    const CMT = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/;
    // Numbers
    const NUM = /\b\d+(\.\d+)?\b/g;

    const result: { text: string; cls: string }[] = [];
    let remaining = line;
    let i = 0;

    const cmt = CMT.exec(remaining);
    if (cmt) {
      if (cmt.index > 0) result.push({ text: remaining.slice(0, cmt.index), cls: '' });
      result.push({ text: remaining.slice(cmt.index), cls: 'text-[#5A5045] italic' });
      return result.map((t, idx) => t.cls ? <span key={idx} className={t.cls}>{t.text}</span> : <span key={idx}>{t.text}</span>);
    }

    // Simple pass: just colorize keywords, strings, numbers
    const parts: { text: string; cls: string }[] = [{ text: remaining, cls: '' }];
    return parts.map((t, idx) => {
      const el = t.text
        .replace(KW, (m) => `\x00KW\x01${m}\x02`)
        .replace(STR, (m) => `\x00STR\x01${m}\x02`)
        .replace(NUM, (m) => `\x00NUM\x01${m}\x02`);
      const segs = el.split(/\x00(KW|STR|NUM)\x01(.*?)\x02/g);
      return segs.map((seg, si) => {
        if (si % 3 === 1) return null; // type marker
        if (si % 3 === 2) {
          const type = segs[si - 1];
          const cls = type === 'KW' ? 'text-sky-400' : type === 'STR' ? 'text-amber-400' : 'text-rose-400';
          return <span key={si} className={cls}>{seg}</span>;
        }
        return <span key={si}>{seg}</span>;
      });
    });
  };

  const lines = code.split('\n').slice(0, 500);
  return (
    <div className="w-full max-h-[80vh] overflow-auto p-6 font-mono text-xs leading-relaxed">
      <table className="border-collapse w-full">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="hover:bg-[rgba(248,240,220,0.02)]">
              <td className="text-[#3A3330] text-right pr-4 select-none w-10 align-top">{i + 1}</td>
              <td className="text-[#9A8D7A] whitespace-pre">{tokenize(line)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CsvPreview({ content }: { content: string }) {
  const sep = content.includes('\t') ? '\t' : ',';
  const rows = content.split('\n').slice(0, 200).filter(Boolean).map(r => {
    // Simple CSV split (no quoted fields with delimiters)
    if (sep === ',') {
      const result: string[] = [];
      let cur = ''; let inQ = false;
      for (const c of r) {
        if (c === '"') { inQ = !inQ; continue; }
        if (c === ',' && !inQ) { result.push(cur); cur = ''; continue; }
        cur += c;
      }
      result.push(cur);
      return result;
    }
    return r.split('\t');
  });
  const header = rows[0] || [];
  const data = rows.slice(1);
  return (
    <div className="w-full max-h-[80vh] overflow-auto p-4">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-[#C9913D] font-semibold border border-[rgba(248,240,220,0.08)] bg-[rgba(201,145,61,0.08)] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className="hover:bg-[rgba(248,240,220,0.02)]">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-[#9A8D7A] border border-[rgba(248,240,220,0.06)] whitespace-nowrap max-w-[200px] truncate">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ZipListing({ fileId }: { fileId: string }) {
  const [entries, setEntries] = useState<{ name: string; size: number }[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`/api/files/${fileId}/listing`).then(r => r.json()).then(d => setEntries(d.entries || [])).catch(() => setErr(true));
  }, [fileId]);
  if (err) return <div className="p-8 text-center text-[#5A5045] text-sm">Could not read archive</div>;
  if (!entries) return <div className="p-8 text-center text-[#5A5045] text-sm">Loading&hellip;</div>;
  return (
    <div className="w-full max-h-[80vh] overflow-auto p-4">
      <p className="text-xs text-[#5A5045] mb-3 font-mono-data">{entries.length} file(s) in archive</p>
      <div className="space-y-0.5">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded text-xs hover:bg-[rgba(248,240,220,0.03)]">
            <span className="text-[#9A8D7A] flex-1 font-mono truncate">{e.name}</span>
            <span className="text-[#5A5045] font-mono-data flex-shrink-0">{formatSize(e.size)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CODE_EXTS = new Set(['.js', '.ts', '.tsx', '.jsx', '.py', '.sh', '.bash', '.css', '.html', '.xml', '.json', '.yaml', '.yml', '.toml', '.rs', '.go', '.java', '.cpp', '.c', '.h', '.php', '.rb', '.swift', '.kt', '.sql', '.env', '.gitignore', '.dockerfile']);

export function PreviewModal({ file, shareToken, onClose }: { file: FileItem; shareToken?: string; onClose: () => void }) {
  const [textContent, setTextContent] = useState<string | null>(null);

  const ext = '.' + file.original_name.split('.').pop()!.toLowerCase();
  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isAudio = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';
  const isCsv = file.mime_type === 'text/csv' || file.mime_type === 'text/tab-separated-values' || ext === '.csv' || ext === '.tsv';
  const isZip = file.mime_type.includes('zip') || ext === '.zip';
  const isCode = !isCsv && (CODE_EXTS.has(ext) || file.mime_type.includes('javascript') || file.mime_type.includes('css') || file.mime_type === 'application/json');
  const isMarkdown = file.original_name.endsWith('.md') || file.mime_type === 'text/markdown';
  const isText = !isCsv && !isCode && (file.mime_type.startsWith('text/') || file.mime_type.includes('json') || file.mime_type.includes('xml') || file.original_name.endsWith('.md'));
  const isSvg = file.mime_type === 'image/svg+xml';
  const noPreview = !isImage && !isVideo && !isAudio && !isPdf && !isCsv && !isCode && !isMarkdown && !isText && !isZip;

  const url = shareToken ? `/api/files/${file.id}?share=${shareToken}&inline=1` : `/api/files/${file.id}?inline=1`;
  const downloadUrl = shareToken ? `/api/files/${file.id}?share=${shareToken}` : `/api/files/${file.id}`;

  useEffect(() => {
    if (isCsv || isCode || isMarkdown || isText) {
      fetch(url).then(r => r.text()).then(setTextContent);
    }
  }, [file.id]); // eslint-disable-line

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-5xl flex items-center justify-between mb-3 px-1" onClick={e => e.stopPropagation()}>
        <div className="flex-1 min-w-0 mr-4">
          <p className="text-sm font-medium text-[#F4EFE5] truncate">{file.original_name}</p>
          <p className="text-xs text-[#5A5045] mt-0.5 font-mono-data">{formatSize(file.size)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={downloadUrl} download className="btn-ghost text-xs" onClick={e => e.stopPropagation()}>
            <DownloadIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button onClick={onClose} className="btn-icon"><XIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="w-full max-w-5xl surface-modal rounded-xl overflow-hidden flex items-center justify-center animate-fade-up" style={{ maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
        {isImage && !isSvg && (
          <img src={url} alt={file.original_name} className="max-h-[80vh] max-w-full object-contain" />
        )}
        {isSvg && (
          <object data={url} type="image/svg+xml" className="max-h-[80vh] max-w-full">
            <img src={url} alt={file.original_name} className="max-h-[80vh] max-w-full object-contain" />
          </object>
        )}
        {isVideo && (
          <video controls autoPlay className="max-h-[80vh] w-full">
            <source src={url} type={file.mime_type} />
          </video>
        )}
        {isAudio && (
          <div className="p-12 w-full text-center">
            <p className="text-sm text-[#9A8D7A] mb-5">{file.original_name}</p>
            <audio controls autoPlay className="w-full max-w-md mx-auto">
              <source src={url} type={file.mime_type} />
            </audio>
          </div>
        )}
        {isPdf && <iframe src={url} className="w-full" style={{ height: '80vh' }} />}
        {isZip && <ZipListing fileId={file.id} />}
        {isCsv && textContent !== null && <CsvPreview content={textContent} />}
        {isCode && textContent !== null && <SyntaxHighlight code={textContent} ext={ext} />}
        {isMarkdown && textContent !== null && (
          <div className="w-full max-h-[80vh] overflow-auto p-6"><MarkdownText content={textContent} /></div>
        )}
        {isText && !isCsv && !isCode && !isMarkdown && textContent !== null && (
          <div className="w-full max-h-[80vh] overflow-auto p-6">
            <pre className="text-sm text-[#9A8D7A] font-mono-data whitespace-pre-wrap break-words leading-relaxed">{textContent}</pre>
          </div>
        )}
        {noPreview && (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#5A5045]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-[#5A5045] text-sm">Preview not available</p>
            <a href={downloadUrl} download className="btn-primary mt-4 inline-flex">
              <DownloadIcon className="w-3.5 h-3.5" /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
