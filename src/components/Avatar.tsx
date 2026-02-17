'use client';

const gradients = [
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-yellow-400 to-amber-500',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-rose-600',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-xs';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const grad = gradients[hashStr(name) % gradients.length];

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ring-1 ring-[rgba(248,240,220,0.1)] flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-semibold tracking-wide ring-1 ring-[rgba(0,0,0,0.3)] flex-shrink-0 select-none`}
      style={{ color: 'rgba(255,255,255,0.9)' }}
    >
      {initials}
    </div>
  );
}
