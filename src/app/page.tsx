'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { Avatar } from '@/components/Avatar';
import { PreviewModal } from '@/components/PreviewModal';

// ─── Types ─────────────────────────────────────────────────────────────────
interface User { id: string; email: string; display_name: string; avatar_url: string | null; is_admin: number; }
interface FileItem { id: string; name: string; original_name: string; mime_type: string; size: number; share_token: string | null; created_at: string; folder_id: string | null; }
interface FolderItem { id: string; name: string; created_at: string; }
interface Breadcrumb { id: string; name: string; }
interface StorageInfo { used: number; fileCount: number; }
interface ShareItem { id: string; item_id: string; item_type: string; item_name: string; mime_type: string; size: number; owner_name: string; permission: string; }

// ─── Icons ─────────────────────────────────────────────────────────────────
type IconProps = React.SVGProps<SVGSVGElement>;

const CloudIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
  </svg>
);

const FolderIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);

const ImageIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const VideoIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const AudioIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
  </svg>
);

const PdfIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ArchiveIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const CodeIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
);

const FileIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const UploadIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const FolderPlusIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.061-.44z" />
  </svg>
);

const GridIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const ListIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

const ShareIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
  </svg>
);

const DownloadIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const TrashIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const EyeIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const XIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronRightIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const MenuIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const UsersIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const GraphIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
  </svg>
);

const FilesIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
);

const LogoutIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

const LinkIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
);

const CheckIcon = (p: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

function getFileInfo(mime: string): { Icon: (p: IconProps) => JSX.Element; colorClass: string; bgClass: string } {
  if (mime.startsWith('image/')) return { Icon: ImageIcon, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10' };
  if (mime.startsWith('video/')) return { Icon: VideoIcon, colorClass: 'text-orange-400', bgClass: 'bg-orange-500/10' };
  if (mime.startsWith('audio/')) return { Icon: AudioIcon, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10' };
  if (mime === 'application/pdf') return { Icon: PdfIcon, colorClass: 'text-red-400', bgClass: 'bg-red-500/10' };
  if (mime.includes('zip') || mime.includes('archive') || mime.includes('tar') || mime.includes('rar')) return { Icon: ArchiveIcon, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10' };
  if (mime.includes('text') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('css')) return { Icon: CodeIcon, colorClass: 'text-sky-400', bgClass: 'bg-sky-500/10' };
  return { Icon: FileIcon, colorClass: 'text-[#9A8D7A]', bgClass: 'bg-[rgba(248,240,220,0.04)]' };
}

const canPreview = (mime: string, name: string) =>
  mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') ||
  mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('json') ||
  mime.includes('xml') || mime.includes('javascript') || mime.includes('css') ||
  name.endsWith('.md');

// ─── Auth Screen ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const url = mode === 'login' ? '/api/auth' : '/api/register';
    const body = mode === 'login' ? { email, password } : { email, password, displayName };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) onAuth(data.user);
    else { setError(data.error || 'Something went wrong'); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0C0B09] flex">
      {/* Decorative left panel */}
      <div className="hidden lg:flex w-5/12 relative overflow-hidden bg-[#0F0E0C] border-r border-[rgba(248,240,220,0.06)] flex-col justify-between p-12">
        <div>
          <CloudIcon className="w-7 h-7 text-[#C9913D]" />
        </div>
        <div>
          <p className="font-display text-[80px] leading-none font-medium text-[rgba(248,240,220,0.06)] select-none tracking-tight">
            File-<br />Cloud
          </p>
          <p className="text-[#5A5045] text-sm mt-6 max-w-xs leading-relaxed">
            Secure, fast, and elegantly simple personal cloud storage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[rgba(248,240,220,0.06)]" />
          <p className="text-[#3A3330] text-xs font-mono-data">VAULT</p>
          <div className="h-px flex-1 bg-[rgba(248,240,220,0.06)]" />
        </div>
      </div>

      {/* Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <CloudIcon className="w-6 h-6 text-[#C9913D]" />
            <span className="font-display text-2xl font-medium">FileCloud</span>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#F4EFE5] tracking-tight">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-[#5A5045] text-sm mt-1">
              {mode === 'login' ? 'Access your files' : 'Get started for free'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                required
                className="input-field"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              autoFocus
              className="input-field"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="input-field"
            />

            {error && (
              <p className="text-red-400 text-sm px-0.5">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1 rounded-md text-sm">
              {loading ? (
                <span className="opacity-60">
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#5A5045] mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-[#C9913D] hover:text-[#D4A853] transition-colors"
            >
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, fileCount: 0 });
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ file: FileItem; x: number; y: number } | null>(null);
  const [shareDialog, setShareDialog] = useState<{ file: FileItem; url?: string } | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'shared'>('files');
  const [sharedItems, setSharedItems] = useState<ShareItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth').then(r => r.ok ? r.json() : null).then(data => {
      if (data?.user) setUser(data.user);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!user) return;
    const url = currentFolder ? `/api/files?folderId=${currentFolder}` : '/api/files';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    setFiles(data.files); setFolders(data.folders);
    setBreadcrumbs(data.breadcrumbs); setStorage(data.storage);
  }, [currentFolder, user]);

  const fetchShared = useCallback(async () => {
    const res = await fetch('/api/shares');
    if (res.ok) { const data = await res.json(); setSharedItems(data.shares); }
  }, []);

  useEffect(() => { if (user) fetchFiles(); }, [fetchFiles, user]);
  useEffect(() => { if (user && sidebarTab === 'shared') fetchShared(); }, [sidebarTab, user, fetchShared]);
  useEffect(() => {
    const h = () => setContextMenu(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const uploadFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList);
    setUploading(arr.map(f => ({ name: f.name, progress: 0 })));
    for (let i = 0; i < arr.length; i++) {
      const fd = new FormData();
      fd.append('file', arr[i]);
      if (currentFolder) fd.append('folderId', currentFolder);
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploading(prev => prev.map((u, j) => j === i ? { ...u, progress: Math.round(e.loaded / e.total * 100) } : u));
      };
      await new Promise<void>((resolve) => { xhr.onload = () => resolve(); xhr.onerror = () => resolve(); xhr.open('POST', '/api/files'); xhr.send(fd); });
    }
    setUploading([]); fetchFiles();
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFolderName.trim(), parentId: currentFolder }) });
    setNewFolderName(''); setShowNewFolder(false); fetchFiles();
  };

  const deleteFile = async (id: string) => {
    await fetch('/api/files', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchFiles();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm('Delete folder and all its contents?')) return;
    await fetch('/api/folders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); fetchFiles();
  };

  const createShareLink = async (file: FileItem) => {
    if (file.share_token) {
      setShareDialog({ file, url: `${window.location.origin}/share/${file.share_token}` });
    } else {
      const res = await fetch(`/api/files/${file.id}/share`, { method: 'POST' });
      const data = await res.json();
      setShareDialog({ file, url: `${window.location.origin}/share/${data.shareToken}` });
      fetchFiles();
    }
  };

  const removeShareLink = async (id: string) => {
    await fetch(`/api/files/${id}/share`, { method: 'DELETE' }); setShareDialog(null); fetchFiles();
  };

  const shareWithUser = async (file: FileItem) => {
    if (!shareEmail.trim()) return;
    await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: file.id, itemType: 'file', email: shareEmail, permission: sharePermission }) });
    setShareEmail('');
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const logout = async () => { await fetch('/api/auth', { method: 'DELETE' }); setUser(null); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0C0B09] flex items-center justify-center">
        <CloudIcon className="w-8 h-8 text-[#C9913D] animate-pulse-slow" />
      </div>
    );
  }
  if (!user) return <AuthScreen onAuth={setUser} />;

  const storagePercent = Math.min((storage.used / (10 * 1073741824)) * 100, 100);

  const navItems = [
    { id: 'files' as const, Icon: FilesIcon, label: 'My Files' },
    { id: 'shared' as const, Icon: UsersIcon, label: 'Shared with Me' },
  ];

  return (
    <div
      className="min-h-screen flex bg-[#0C0B09]"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative z-40 lg:z-auto
        w-52 h-screen flex-shrink-0 sticky top-0
        bg-[#0D0C0A] border-r border-[rgba(248,240,220,0.06)]
        flex flex-col
        transition-transform duration-300
      `}>
        {/* Brand */}
        <div className="px-4 py-5 flex items-center gap-2.5 border-b border-[rgba(248,240,220,0.06)]">
          <CloudIcon className="w-5 h-5 text-[#C9913D] flex-shrink-0" />
          <span className="font-display text-xl font-medium text-[#F4EFE5] tracking-wide leading-none">FileCloud</span>
        </div>

        {/* Navigation */}
        <nav className="p-2.5 space-y-0.5 flex-1">
          {navItems.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => { setSidebarTab(id); setSidebarOpen(false); }}
              className={`sidebar-nav-item ${sidebarTab === id ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
            </button>
          ))}
          <button
            onClick={() => { window.location.href = '/graph'; }}
            className="sidebar-nav-item"
          >
            <GraphIcon className="w-4 h-4 flex-shrink-0" />
            <span>Knowledge Graph</span>
          </button>
        </nav>

        {/* Storage + User */}
        <div className="p-4 border-t border-[rgba(248,240,220,0.06)] space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-[#5A5045]">Storage</span>
              <span className="text-xs text-[#5A5045] font-mono-data">{storage.fileCount} files</span>
            </div>
            <div className="h-px bg-[rgba(248,240,220,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9913D] rounded-full transition-all duration-700"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="text-xs text-[#5A5045] mt-1.5 font-mono-data">{formatSize(storage.used)} used</div>
          </div>

          <div className="flex items-center gap-2.5">
            <Avatar name={user.display_name} url={user.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#F4EFE5] truncate leading-tight">{user.display_name}</div>
              <div className="text-xs text-[#5A5045] truncate">{user.email}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="text-[#5A5045] hover:text-red-400 transition-colors p-1 flex-shrink-0"
            >
              <LogoutIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="flex items-center gap-3 px-5 h-[52px] border-b border-[rgba(248,240,220,0.06)] bg-[#0C0B09]/95 backdrop-blur-sm sticky top-0 z-20 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-[#5A5045] hover:text-[#F4EFE5] transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          {sidebarTab === 'files' && (
            <>
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-sm flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setCurrentFolder(null)}
                  className={`transition-colors shrink-0 ${!currentFolder ? 'text-[#F4EFE5] font-medium' : 'text-[#5A5045] hover:text-[#9A8D7A]'}`}
                >
                  Home
                </button>
                {breadcrumbs.map(bc => (
                  <Fragment key={bc.id}>
                    <ChevronRightIcon className="w-3 h-3 text-[#3A3330] flex-shrink-0" />
                    <button
                      onClick={() => setCurrentFolder(bc.id)}
                      className="text-[#5A5045] hover:text-[#9A8D7A] transition-colors shrink-0 truncate max-w-[140px]"
                    >
                      {bc.name}
                    </button>
                  </Fragment>
                ))}
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                  <UploadIcon className="w-3.5 h-3.5" />
                  Upload
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => e.target.files && uploadFiles(e.target.files)} />

                {showNewFolder ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      placeholder="Folder name"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') createFolder();
                        if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
                      }}
                      className="input-field w-36 py-1"
                    />
                    <button onClick={createFolder} className="btn-icon text-emerald-400 hover:text-emerald-300">
                      <CheckIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="btn-icon">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowNewFolder(true)} className="btn-ghost hidden sm:inline-flex">
                    <FolderPlusIcon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">New Folder</span>
                  </button>
                )}

                <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="btn-icon" title="Toggle view">
                  {viewMode === 'grid' ? <ListIcon className="w-4 h-4" /> : <GridIcon className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          {sidebarTab === 'shared' && (
            <h2 className="text-sm font-medium text-[#F4EFE5] flex-1">Shared with Me</h2>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">

          {/* Upload Progress */}
          {uploading.length > 0 && (
            <div className="surface rounded-lg p-4 mb-5 space-y-3 animate-fade-up">
              {uploading.map((u, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#9A8D7A] truncate max-w-[70%]">{u.name}</span>
                    <span className="text-[#C9913D] font-mono-data">{u.progress}%</span>
                  </div>
                  <div className="h-px bg-[rgba(248,240,220,0.06)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9913D] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Files Tab ── */}
          {sidebarTab === 'files' && (
            <div className="animate-fade-in">
              {folders.length === 0 && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28">
                  <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] border border-[rgba(248,240,220,0.07)] flex items-center justify-center mb-5">
                    <FolderIcon className="w-8 h-8 text-[#3A3330]" />
                  </div>
                  <p className="text-[#9A8D7A] font-medium">No files yet</p>
                  <p className="text-[#5A5045] text-sm mt-1">Drag & drop or click Upload to add files</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                  {/* Folder cards */}
                  {folders.map((folder, i) => (
                    <div
                      key={folder.id}
                      className="surface-hover rounded-lg p-3.5 cursor-pointer group relative animate-fade-up"
                      style={{ animationDelay: `${i * 25}ms` }}
                      onClick={() => setCurrentFolder(folder.id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <FolderIcon className="w-9 h-9 text-[#C9913D]/60 group-hover:text-[#C9913D] transition-colors duration-200" />
                        <button
                          onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                          className="opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-red-400 transition-all p-0.5 -mr-0.5 -mt-0.5"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-sm font-medium text-[#F4EFE5] truncate leading-tight">{folder.name}</p>
                      <p className="text-xs text-[#5A5045] mt-0.5">Folder</p>
                    </div>
                  ))}

                  {/* File cards */}
                  {files.map((file, i) => {
                    const { Icon, colorClass, bgClass } = getFileInfo(file.mime_type);
                    const isImage = file.mime_type.startsWith('image/');
                    return (
                      <div
                        key={file.id}
                        className="surface-hover rounded-lg overflow-hidden cursor-pointer group relative animate-fade-up"
                        style={{ animationDelay: `${(folders.length + i) * 25}ms` }}
                        onClick={() => canPreview(file.mime_type, file.original_name) ? setPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                      >
                        {/* Thumbnail / icon area */}
                        {isImage ? (
                          <div className="aspect-[4/3] overflow-hidden bg-[#1B1917]">
                            <img
                              src={`/api/files/${file.id}?inline=1`}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className={`aspect-[4/3] flex items-center justify-center ${bgClass}`}>
                            <Icon className={`w-10 h-10 ${colorClass}`} />
                          </div>
                        )}

                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-[#F4EFE5] truncate">{file.original_name}</p>
                          <p className="text-xs text-[#5A5045] mt-0.5 font-mono-data">{formatSize(file.size)}</p>
                        </div>

                        {/* Share badge */}
                        {file.share_token && (
                          <div className="absolute top-2 left-2 w-5 h-5 bg-[rgba(201,145,61,0.2)] backdrop-blur-sm rounded flex items-center justify-center">
                            <LinkIcon className="w-2.5 h-2.5 text-[#C9913D]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List view */
                <div className="surface rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs text-[#5A5045] px-4 py-2 border-b border-[rgba(248,240,220,0.06)] font-mono-data uppercase tracking-wide">
                    <span className="w-6 mr-3" />
                    <span>Name</span>
                    <span className="w-20 text-right mr-4">Size</span>
                    <span className="w-24 text-right mr-4 hidden sm:block">Modified</span>
                    <span className="w-8" />
                  </div>
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer group transition-colors border-b border-[rgba(248,240,220,0.04)] last:border-0"
                      onClick={() => setCurrentFolder(folder.id)}
                    >
                      <FolderIcon className="w-4 h-4 text-[#C9913D]/60 mr-3" />
                      <span className="text-sm text-[#F4EFE5] font-medium truncate">{folder.name}</span>
                      <span className="text-xs text-[#5A5045] font-mono-data w-20 text-right mr-4">—</span>
                      <span className="text-xs text-[#5A5045] font-mono-data w-24 text-right mr-4 hidden sm:block">
                        {new Date(folder.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="w-8 opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-red-400 transition-all flex justify-end"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {files.map(file => {
                    const { Icon, colorClass } = getFileInfo(file.mime_type);
                    return (
                      <div
                        key={file.id}
                        className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer group transition-colors border-b border-[rgba(248,240,220,0.04)] last:border-0"
                        onClick={() => canPreview(file.mime_type, file.original_name) ? setPreview(file) : window.open(`/api/files/${file.id}`, '_blank')}
                        onContextMenu={e => { e.preventDefault(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                      >
                        <Icon className={`w-4 h-4 mr-3 ${colorClass}`} />
                        <span className="text-sm text-[#F4EFE5] truncate">
                          {file.original_name}
                          {file.share_token && <LinkIcon className="w-3 h-3 text-[#C9913D] inline ml-2 relative -top-px" />}
                        </span>
                        <span className="text-xs text-[#5A5045] font-mono-data w-20 text-right mr-4">{formatSize(file.size)}</span>
                        <span className="text-xs text-[#5A5045] font-mono-data w-24 text-right mr-4 hidden sm:block">
                          {new Date(file.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); setContextMenu({ file, x: e.clientX, y: e.clientY }); }}
                          className="w-8 opacity-0 group-hover:opacity-100 text-[#5A5045] hover:text-[#9A8D7A] transition-all flex justify-end"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Shared Tab ── */}
          {sidebarTab === 'shared' && (
            <div className="animate-fade-in">
              {sharedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-28">
                  <div className="w-16 h-16 rounded-xl bg-[rgba(248,240,220,0.04)] border border-[rgba(248,240,220,0.07)] flex items-center justify-center mb-5">
                    <UsersIcon className="w-8 h-8 text-[#3A3330]" />
                  </div>
                  <p className="text-[#9A8D7A] font-medium">Nothing shared with you yet</p>
                  <p className="text-[#5A5045] text-sm mt-1">Files shared by others will appear here</p>
                </div>
              ) : (
                <div className="surface rounded-lg overflow-hidden">
                  {sharedItems.map(item => {
                    const { Icon, colorClass } = getFileInfo(item.mime_type);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(248,240,220,0.03)] cursor-pointer transition-colors border-b border-[rgba(248,240,220,0.04)] last:border-0"
                        onClick={() => {
                          if (item.item_type === 'file') {
                            const f = { id: item.item_id, original_name: item.item_name, mime_type: item.mime_type, size: item.size } as any;
                            if (canPreview(item.mime_type, item.item_name)) setPreview(f);
                            else window.open(`/api/files/${item.item_id}`, '_blank');
                          }
                        }}
                      >
                        <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#F4EFE5] font-medium truncate">{item.item_name}</div>
                          <div className="text-xs text-[#5A5045] mt-0.5">
                            Shared by <span className="text-[#9A8D7A]">{item.owner_name}</span> · {item.permission}
                          </div>
                        </div>
                        <span className="text-xs text-[#5A5045] font-mono-data flex-shrink-0">
                          {item.size > 0 ? formatSize(item.size) : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Drag Over Overlay ─────────────────────────────────────────── */}
      {dragOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-[#C9913D]/5 backdrop-blur-sm" />
          <div
            className="relative surface-modal rounded-xl p-12 text-center animate-fade-up"
            style={{ borderColor: 'rgba(201, 145, 61, 0.3)' }}
          >
            <UploadIcon className="w-10 h-10 text-[#C9913D] mx-auto mb-3" />
            <p className="text-lg font-semibold text-[#F4EFE5]">Drop files here</p>
          </div>
        </div>
      )}

      {/* ── Context Menu ─────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 dropdown-menu animate-fade-in min-w-[180px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 180),
          }}
        >
          {canPreview(contextMenu.file.mime_type, contextMenu.file.original_name) && (
            <button onClick={() => { setPreview(contextMenu.file); setContextMenu(null); }} className="dropdown-item">
              <EyeIcon className="w-3.5 h-3.5 flex-shrink-0" /> Preview
            </button>
          )}
          <button onClick={() => { window.open(`/api/files/${contextMenu.file.id}`, '_blank'); setContextMenu(null); }} className="dropdown-item">
            <DownloadIcon className="w-3.5 h-3.5 flex-shrink-0" /> Download
          </button>
          <button onClick={() => { createShareLink(contextMenu.file); setContextMenu(null); }} className="dropdown-item">
            <ShareIcon className="w-3.5 h-3.5 flex-shrink-0" /> Share
          </button>
          <div className="dropdown-divider" />
          <button onClick={() => { deleteFile(contextMenu.file.id); setContextMenu(null); }} className="dropdown-item danger">
            <TrashIcon className="w-3.5 h-3.5 flex-shrink-0" /> Delete
          </button>
        </div>
      )}

      {/* ── Share Dialog ─────────────────────────────────────────────── */}
      {shareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShareDialog(null)}>
          <div className="surface-modal rounded-xl p-6 max-w-md w-full animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-semibold text-[#F4EFE5] leading-tight">Share file</h3>
                <p className="text-xs text-[#5A5045] mt-0.5 truncate max-w-[240px]">{shareDialog.file.original_name}</p>
              </div>
              <button onClick={() => setShareDialog(null)} className="text-[#5A5045] hover:text-[#9A8D7A] transition-colors -mt-1 -mr-1 p-1">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {shareDialog.url && (
              <div className="mb-5">
                <label className="text-xs text-[#9A8D7A] block mb-2">Public link</label>
                <div className="flex gap-2">
                  <input
                    value={shareDialog.url}
                    readOnly
                    className="input-field text-xs font-mono-data text-[#9A8D7A] flex-1"
                  />
                  <button
                    onClick={() => copyLink(shareDialog.url!)}
                    className={`btn-primary px-3 flex-shrink-0 transition-all ${copiedLink ? 'bg-emerald-500' : ''}`}
                  >
                    {copiedLink ? <CheckIcon className="w-3.5 h-3.5" /> : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => removeShareLink(shareDialog.file.id)}
                  className="text-xs text-red-400/70 hover:text-red-400 mt-2 transition-colors"
                >
                  Remove public link
                </button>
              </div>
            )}

            <div className="border-t border-[rgba(248,240,220,0.07)] pt-4">
              <label className="text-xs text-[#9A8D7A] block mb-2">Share with user</label>
              <div className="flex gap-2 flex-wrap">
                <input
                  value={shareEmail}
                  onChange={e => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="input-field flex-1 min-w-[160px]"
                />
                <select
                  value={sharePermission}
                  onChange={e => setSharePermission(e.target.value as any)}
                  className="input-field w-auto px-2"
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
                <button onClick={() => shareWithUser(shareDialog.file)} className="btn-primary flex-shrink-0">
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
