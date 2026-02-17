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

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-400">{error}</p>
        <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm mt-4 inline-block">Go to FileCloud</a>
      </div>
    </div>
  );

  if (needsPassword) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl p-8 w-full max-w-sm animate-slide-up">
        <div className="text-5xl text-center mb-4">🔒</div>
        <h2 className="text-lg font-bold text-center mb-4">Password Protected</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadShare(password)}
          placeholder="Enter password"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50" />
        <button onClick={() => loadShare(password)}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl py-2.5 font-medium hover:from-indigo-500 hover:to-indigo-400 transition-all">
          Unlock
        </button>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 animate-pulse text-3xl">☁️</div>
    </div>
  );

  const isImage = data.mime_type?.startsWith('image/');
  const isVideo = data.mime_type?.startsWith('video/');
  const isAudio = data.mime_type?.startsWith('audio/');
  const downloadUrl = `/api/files/${data.id}?share=${token}`;
  const inlineUrl = `/api/files/${data.id}?share=${token}&inline=1`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>
      <div className="glass-strong rounded-2xl w-full max-w-2xl p-8 relative z-10 animate-slide-up">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">☁️</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-1">{data.original_name}</h1>
          <p className="text-gray-500 text-sm">{formatBytes(data.size)}</p>
        </div>
        <div className="flex justify-center mb-6">
          {isImage && <img src={inlineUrl} alt={data.original_name} className="max-w-full max-h-96 rounded-xl" />}
          {isVideo && <video src={inlineUrl} controls className="max-w-full max-h-96 rounded-xl" />}
          {isAudio && <div className="w-full p-4"><audio src={inlineUrl} controls className="w-full" /></div>}
          {!isImage && !isVideo && !isAudio && <div className="text-7xl py-8">📄</div>}
        </div>
        <div className="text-center space-x-3">
          <a href={downloadUrl} download
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20">
            Download
          </a>
          {(isImage || isVideo || isAudio) && (
            <button onClick={() => setShowPreview(true)}
              className="inline-block px-6 py-2.5 glass-hover rounded-xl font-medium text-gray-300">
              Preview
            </button>
          )}
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
