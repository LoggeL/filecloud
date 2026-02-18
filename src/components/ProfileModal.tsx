'use client';
import { useState } from 'react';
import type { User } from '@/types';
import { XIcon, CheckIcon } from './icons';
import { Avatar } from './Avatar';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdated: (user: User) => void;
}

export function ProfileModal({ user, onClose, onUpdated }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true); setError(''); setSuccess('');
    const body: any = { displayName };
    if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      onUpdated(data.user);
      setSuccess('Saved!');
      setCurrentPassword(''); setNewPassword('');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      setError(data.error || 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="surface-modal rounded-xl p-6 max-w-sm w-full animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-semibold text-[#F4EFE5]">Profile Settings</h3>
          <button onClick={onClose} className="text-[#5A5045] hover:text-[#9A8D7A] p-1"><XIcon className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[rgba(248,240,220,0.07)]">
          <Avatar name={user.display_name} url={user.avatar_url} size="lg" />
          <div>
            <div className="text-sm font-medium text-[#F4EFE5]">{user.display_name}</div>
            <div className="text-xs text-[#5A5045]">{user.email}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#9A8D7A] block mb-1">Display name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input-field" />
          </div>

          <div className="pt-3 border-t border-[rgba(248,240,220,0.07)]">
            <label className="text-xs text-[#9A8D7A] block mb-2">Change password</label>
            <div className="space-y-2">
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Current password" className="input-field" />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="New password" className="input-field" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {success && <p className="text-emerald-400 text-xs">{success}</p>}

          <button onClick={save} disabled={saving} className="btn-primary w-full justify-center mt-1">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
