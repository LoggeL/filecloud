import type { FileItem } from '@/types';

export function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

import { ImageIcon, VideoIcon, AudioIcon, PdfIcon, ArchiveIcon, CodeIcon, FileIcon } from '@/components/icons';
import type { IconProps } from '@/components/icons';

export function getFileInfo(mime: string): { Icon: (p: IconProps) => JSX.Element; colorClass: string; bgClass: string; category: string } {
  if (mime.startsWith('image/')) return { Icon: ImageIcon, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10', category: 'images' };
  if (mime.startsWith('video/')) return { Icon: VideoIcon, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/10', category: 'video' };
  if (mime.startsWith('audio/')) return { Icon: AudioIcon, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', category: 'audio' };
  if (mime === 'application/pdf') return { Icon: PdfIcon, colorClass: 'text-red-400', bgClass: 'bg-red-500/10', category: 'documents' };
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar') || mime.includes('rar') || mime.includes('7z'))
    return { Icon: ArchiveIcon, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10', category: 'archives' };
  if (mime.includes('text') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('css') || mime.includes('script'))
    return { Icon: CodeIcon, colorClass: 'text-sky-400', bgClass: 'bg-sky-500/10', category: 'code' };
  if (mime.includes('word') || mime.includes('sheet') || mime.includes('presentation') || mime.includes('document'))
    return { Icon: FileIcon, colorClass: 'text-blue-400', bgClass: 'bg-blue-500/10', category: 'documents' };
  return { Icon: FileIcon, colorClass: 'text-[#9A8D7A]', bgClass: 'bg-[rgba(248,240,220,0.04)]', category: 'other' };
}

export const canPreview = (mime: string, name: string): boolean =>
  mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') ||
  mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('json') ||
  mime.includes('xml') || mime.includes('javascript') || mime.includes('css') ||
  name.endsWith('.md') || name.endsWith('.csv') || name.endsWith('.tsv') ||
  mime.includes('zip');
