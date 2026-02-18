'use client';
import { useState } from 'react';
import { CloudIcon } from './icons';
import type { User } from '@/types';

export function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
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
      <div className="hidden lg:flex w-5/12 relative overflow-hidden bg-[#0F0E0C] border-r border-[rgba(248,240,220,0.06)] flex-col justify-between p-12">
        <div><CloudIcon className="w-7 h-7 text-[#C9913D]" /></div>
        <div>
          <p className="font-display text-[80px] leading-none font-medium text-[rgba(248,240,220,0.06)] select-none tracking-tight">File-<br/>Cloud</p>
          <p className="text-[#5A5045] text-sm mt-6 max-w-xs leading-relaxed">Secure, fast, and elegantly simple personal cloud storage.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[rgba(248,240,220,0.06)]" />
          <p className="text-[#3A3330] text-xs font-mono-data">VAULT</p>
          <div className="h-px flex-1 bg-[rgba(248,240,220,0.06)]" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <CloudIcon className="w-6 h-6 text-[#C9913D]" />
            <span className="font-display text-2xl font-medium">FileCloud</span>
          </div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-[#F4EFE5] tracking-tight">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
            <p className="text-[#5A5045] text-sm mt-1">{mode === 'login' ? 'Access your files' : 'Get started for free'}</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" required className="input-field" />
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required autoFocus className="input-field" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="input-field" />
            {error && <p className="text-red-400 text-sm px-0.5">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1 rounded-md text-sm">
              {loading ? <span className="opacity-60">{mode === 'login' ? 'Signing in…' : 'Creating account…'}</span>
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-[#5A5045] mt-6">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-[#C9913D] hover:text-[#D4A853] transition-colors">
              {mode === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
