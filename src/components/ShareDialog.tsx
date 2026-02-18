'use client';
import { useState, useEffect, useRef } from 'react';
import type { FileItem } from '@/types';
import { XIcon, CheckIcon, ShareIcon, DownloadIcon, TrashIcon, EyeIcon, StarIcon, MoveIcon, PencilIcon, InfoIcon } from './icons';

interface ShareDialogState { file: FileItem; url?: string; }

interface ShareDialogProps {
  shareDialog: ShareDialogState;
  onClose: () => void;
  onRefresh: () => void;
}

export function ShareDialog({ shareDialog, onClose, onRefresh }: ShareDialogProps) {
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiry, setShareExpiry] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [url, setUrl] = useState(shareDialog.url || '');

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const generateLink = async () => {
    const res = await fetch(`/api/files/${shareDialog.file.id}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: sharePassword || null, expiresAt: shareExpiry || null }),
    });
    const data = await res.json();
    setUrl(`${window.location.origin}/share/${data.shareToken}`);
    onRefresh();
  };

  const removeLink = async () => {
    await fetch(`/api/files/${shareDialog.file.id}/share`, { method: 'DELETE' });
    setUrl('');
    onRefresh();
  };

  const shareWithUser = async () => {
    if (!shareEmail.trim()) return;
    await fetch('/api/shares', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: shareDialog.file.id, itemType: 'file', email: shareEmail, permission: sharePermission }) });
    setShareEmail('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="surface-modal rounded-xl p-6 max-w-md w-full animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-semibold text-[#F4EFE5] leading-tight">Share file</h3>
            <p className="text-xs text-[#5A5045] mt-0.5 truncate max-w-[240px]">{shareDialog.file.original_name}</p>
          </div>
          <button onClick={onClose} className="text-[#5A5045] hover:text-[#9A8D7A] transition-colors -mt-1 -mr-1 p-1">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Public link section */}
        <div className="mb-4">
          <label className="text-xs text-[#9A8D7A] block mb-2">Public link</label>
          {url ? (
            <>
              <div className="flex gap-2 mb-2">
                <input value={url} readOnly className="input-field text-xs font-mono-data text-[#9A8D7A] flex-1" />
                <button onClick={copyLink} className={`btn-primary px-3 flex-shrink-0 ${copiedLink ? 'bg-emerald-500' : ''}`}>
                  {copiedLink ? <CheckIcon className="w-3.5 h-3.5" /> : 'Copy'}
                </button>
              </div>
              {shareDialog.file.share_expires_at && (
                <p className="text-xs text-[#5A5045]">Expires: {new Date(shareDialog.file.share_expires_at).toLocaleDateString()}</p>
              )}
              <button onClick={removeLink} className="text-xs text-red-400/70 hover:text-red-400 mt-1 transition-colors">Remove public link</button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="password" value={sharePassword} onChange={e => setSharePassword(e.target.value)}
                  placeholder="Password (optional)" className="input-field text-xs" />
                <input type="date" value={shareExpiry} onChange={e => setShareExpiry(e.target.value)}
                  className="input-field text-xs" />
              </div>
              <button onClick={generateLink} className="btn-primary w-full justify-center">Generate link</button>
            </div>
          )}
        </div>

        <div className="border-t border-[rgba(248,240,220,0.07)] pt-4">
          <label className="text-xs text-[#9A8D7A] block mb-2">Share with user</label>
          <div className="flex gap-2 flex-wrap">
            <input value={shareEmail} onChange={e => setShareEmail(e.target.value)}
              placeholder="user@example.com" className="input-field flex-1 min-w-[160px]" />
            <select value={sharePermission} onChange={e => setSharePermission(e.target.value as any)} className="input-field w-auto px-2">
              <option value="view">View</option>
              <option value="edit">Edit</option>
            </select>
            <button onClick={shareWithUser} className="btn-primary flex-shrink-0">Share</button>
          </div>
        </div>
      </div>
    </div>
  );
}
