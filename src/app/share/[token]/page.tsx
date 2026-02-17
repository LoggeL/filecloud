import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  return '📎';
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const file = db.getFileByShareToken(token);
  if (!file) notFound();

  const isImage = file.mime_type.startsWith('image/');
  const isVideo = file.mime_type.startsWith('video/');
  const isPdf = file.mime_type === 'application/pdf';
  const isAudio = file.mime_type.startsWith('audio/');

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="glass rounded-2xl p-8 max-w-2xl w-full text-center space-y-6">
        <div className="text-5xl">{getFileIcon(file.mime_type)}</div>
        <h1 className="text-2xl font-bold text-white">{file.original_name}</h1>
        <p className="text-gray-400">{formatSize(file.size)} · {file.mime_type}</p>

        {isImage && (
          <img src={`/api/files/${file.id}?share=${token}&inline=1`} alt={file.original_name}
            className="rounded-xl max-h-96 mx-auto" />
        )}
        {isVideo && (
          <video controls className="rounded-xl max-h-96 mx-auto w-full">
            <source src={`/api/files/${file.id}?share=${token}&inline=1`} type={file.mime_type} />
          </video>
        )}
        {isAudio && (
          <audio controls className="mx-auto">
            <source src={`/api/files/${file.id}?share=${token}&inline=1`} type={file.mime_type} />
          </audio>
        )}
        {isPdf && (
          <iframe src={`/api/files/${file.id}?share=${token}&inline=1`}
            className="w-full h-96 rounded-xl" />
        )}

        <a href={`/api/files/${file.id}?share=${token}`}
          className="inline-block bg-accent hover:bg-accent-dark text-white font-semibold px-8 py-3 rounded-xl transition-all hover:scale-105">
          Download
        </a>

        <div className="pt-4 border-t border-white/10">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            FileCloud
          </Link>
        </div>
      </div>
    </div>
  );
}
