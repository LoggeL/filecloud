'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PreviewModal } from '@/components/PreviewModal';

function formatBytes(b: number) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k, i)).toFixed(1) + ' ' + s[i];
}

const CloudIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
  </svg>
);

const DownloadIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const EyeIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LockIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

export default function PublicSharePage() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const loadShare = async (pw?: string) => {
    try {
      if (pw) {
        const res = await fetch(`/api/share/${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw }),
        });
        const d = await res.json();
        if (!res.ok) { setError(d.error || 'Wrong password'); return; }
        setData(d.file);
        setNeedsPassword(false);
      } else {
        const res = await fetch(`/api/share/${token}`);
        const d = await res.json();
        if (d.needsPassword) { setNeedsPassword(true); return; }
        if (!res.ok) { setError(d.error || 'Not found'); return; }
        setData(d.file);
      }
    } catch {
      setError('Failed to load share');
    }
  };

  useEffect(() => { loadShare(); }, [token]); // eslint-disable-line

  const bgPanel = (
    <div className="fixed inset-0 bg-[#0C0B09]">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(201,145,61,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(201,145,61,0.05) 0%, transparent 50%)',
      }} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {bgPanel}
      <div className="relative surface-modal rounded-xl p-8 text-center max-w-sm w-full animate-fade-up">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-[#9A8D7A] text-sm">{error}</p>
        <a href="/" className="text-[#C9913D] hover:text-[#D4A853] text-sm mt-4 inline-block transition-colors">
          Go to FileCloud →
        </a>
      </div>
    </div>
  );

  if (needsPassword) return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {bgPanel}
      <div className="relative surface-modal rounded-xl p-8 w-full max-w-sm animate-slide-up">
        <div className="w-12 h-12 rounded-xl bg-[rgba(201,145,61,0.1)] flex items-center justify-center mx-auto mb-5">
          <LockIcon className="w-6 h-6 text-[#C9913D]" />
        </div>
        <h2 className="text-base font-semibold text-center text-[#F4EFE5] mb-1">Password protected</h2>
        <p className="text-xs text-[#5A5045] text-center mb-5">Enter the password to access this file</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadShare(password)}
          placeholder="Enter password"
          className="input-field mb-3"
          autoFocus
        />
        <button
          onClick={() => loadShare(password)}
          className="btn-primary w-full justify-center py-2.5"
        >
          Unlock
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0B09]">
      <CloudIcon className="w-8 h-8 text-[#C9913D] animate-pulse-slow" />
    </div>
  );

  const isImage = data.mime_type?.startsWith('image/');
  const isVideo = data.mime_type?.startsWith('video/');
  const isAudio = data.mime_type?.startsWith('audio/');
  const canPreviewFile = isImage || isVideo || isAudio;
  const downloadUrl = `/api/files/${data.id}?share=${token}`;
  const inlineUrl = `/api/files/${data.id}?share=${token}&inline=1`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {bgPanel}
      <div className="relative w-full max-w-2xl animate-slide-up">
        {/* Brand header */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <CloudIcon className="w-5 h-5 text-[#C9913D]" />
          <a href="/" className="font-display text-lg font-medium text-[#F4EFE5] hover:text-[#C9913D] transition-colors">
            FileCloud
          </a>
        </div>

        <div className="surface-modal rounded-xl overflow-hidden">
          {/* File preview */}
          {isImage && (
            <div className="bg-[#0F0E0C] flex items-center justify-center p-4" style={{ minHeight: 200 }}>
              <img src={inlineUrl} alt={data.original_name} className="max-w-full max-h-96 rounded-lg object-contain" />
            </div>
          )}
          {isVideo && (
            <video src={inlineUrl} controls className="w-full max-h-96" />
          )}
          {isAudio && (
            <div className="bg-[#0F0E0C] p-8 flex justify-center">
              <audio src={inlineUrl} controls className="w-full max-w-md" />
            </div>
          )}
          {!isImage && !isVideo && !isAudio && (
            <div className="bg-[#0F0E0C] flex items-center justify-center py-12">
              <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] flex items-center justify-center">
                <svg className="w-8 h-8 text-[#3A3330]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            </div>
          )}

          {/* File info + actions */}
          <div className="p-6">
            <div className="mb-5">
              <h1 className="font-semibold text-[#F4EFE5] truncate">{data.original_name}</h1>
              <p className="text-sm text-[#5A5045] mt-0.5 font-mono-data">{formatBytes(data.size)}</p>
            </div>
            <div className="flex items-center gap-2.5">
              <a
                href={downloadUrl}
                download
                className="btn-primary"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Download
              </a>
              {canPreviewFile && (
                <button onClick={() => setShowPreview(true)} className="btn-ghost">
                  <EyeIcon className="w-3.5 h-3.5" />
                  Preview
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <PreviewModal
          file={{ id: data.id, original_name: data.original_name, mime_type: data.mime_type, size: data.size }}
          shareToken={token as string}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
