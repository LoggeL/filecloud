'use client';

const gradients = [
  'from-pink-500 to-purple-600',
  'from-cyan-400 to-blue-600',
  'from-green-400 to-emerald-600',
  'from-orange-400 to-red-600',
  'from-violet-400 to-indigo-600',
  'from-yellow-400 to-orange-500',
  'from-teal-400 to-cyan-600',
  'from-rose-400 to-pink-600',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const grad = gradients[hashStr(name) % gradients.length];

  if (url) return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover ring-2 ring-white/10`} />;
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center font-bold ring-2 ring-white/10 flex-shrink-0`}>
      {initials}
    </div>
  );
}
