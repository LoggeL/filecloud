'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

  const loadShare = async (pw?: string) => {
    const url = `/api/share/public/${token}${pw ? `?password=${encodeURIComponent(pw)}` : ''}`;
    const res = await fetch(url);
    const d = await res.json();
    if (d.needs_password) { setNeedsPassword(true); return; }
    if (!res.ok) { setError(d.error); return; }
    setData(d);
    setNeedsPassword(false);
  };

  useEffect(() => { loadShare(); }, [token]); // eslint-disable-line

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass p-8 text-center"><div className="text-5xl mb-4">⚠️</div><p className="text-red-400">{error}</p></div>
    </div>
  );

  if (needsPassword) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass glow-border p-8 w-full max-w-sm">
        <div className="text-5xl text-center mb-4">🔒</div>
        <h2 className="text-lg font-bold text-center mb-4">Password Protected</h2>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && loadShare(password)}
          placeholder="Enter password" className="w-full bg-dark-800/50 border border-gray-700 rounded-lg px-4 py-2.5 mb-3 focus:outline-none focus:border-accent" />
        <button onClick={() => loadShare(password)} className="w-full bg-accent text-white rounded-lg py-2.5 font-medium">Unlock</button>
      </div>
    </div>
  );

  if (!data) return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>;

  const isImage = data.mime_type?.startsWith('image/');
  const isVideo = data.mime_type?.startsWith('video/');
  const isAudio = data.mime_type?.startsWith('audio/');
  const previewUrl = `/api/share/public/${token}?download=1${password ? `&password=${encodeURIComponent(password)}` : ''}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass glow-border w-full max-w-2xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold glow-text mb-1">{data.file_name}</h1>
          <p className="text-gray-500 text-sm">Shared by {data.owner_name} · {formatBytes(data.size)}</p>
        </div>
        <div className="flex justify-center mb-6">
          {isImage && <img src={previewUrl} alt={data.file_name} className="max-w-full max-h-96 rounded-lg" />}
          {isVideo && <video src={previewUrl} controls className="max-w-full max-h-96 rounded-lg" />}
          {isAudio && <audio src={previewUrl} controls className="w-full" />}
          {!isImage && !isVideo && !isAudio && <div className="text-6xl">📄</div>}
        </div>
        <div className="text-center">
          <a href={previewUrl} download className="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition inline-block">
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
