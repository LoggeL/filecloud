'use client';
import { CloudIcon, FilesIcon, UsersIcon, GraphIcon, StarIcon, TrashIcon, LogoutIcon, UserIcon } from './icons';
import { Avatar } from './Avatar';
import type { User, StorageInfo, SidebarTab } from '@/types';

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

interface SidebarProps {
  user: User;
  sidebarTab: SidebarTab;
  setSidebarTab: (t: SidebarTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  storage: StorageInfo;
  onLogout: () => void;
  onProfile: () => void;
}

export function Sidebar({ user, sidebarTab, setSidebarTab, sidebarOpen, setSidebarOpen, storage, onLogout, onProfile }: SidebarProps) {
  const storagePercent = Math.min((storage.used / (10 * 1073741824)) * 100, 100);

  const navItems = [
    { id: 'files' as SidebarTab, Icon: FilesIcon, label: 'My Files' },
    { id: 'starred' as SidebarTab, Icon: StarIcon, label: 'Starred' },
    { id: 'shared' as SidebarTab, Icon: UsersIcon, label: 'Shared with Me' },
    { id: 'trash' as SidebarTab, Icon: TrashIcon, label: 'Trash' },
  ];

  return (
    <aside className={[
      sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      'fixed lg:relative z-40 lg:z-auto w-52 h-full flex-shrink-0',
      'bg-[#0D0C0A] border-r border-[rgba(248,240,220,0.06)] flex flex-col transition-transform duration-300'
    ].join(' ')}>
      <div className="px-4 py-5 flex items-center gap-2.5 border-b border-[rgba(248,240,220,0.06)]">
        <CloudIcon className="w-5 h-5 text-[#C9913D] flex-shrink-0" />
        <span className="font-display text-xl font-medium text-[#F4EFE5] tracking-wide leading-none">FileCloud</span>
      </div>

      <nav className="p-2.5 space-y-0.5 flex-1">
        {navItems.map(({ id, Icon, label }) => (
          <button key={id} onClick={() => { setSidebarTab(id); setSidebarOpen(false); }}
            className={`sidebar-nav-item ${sidebarTab === id ? 'active' : ''}`}>
            {id === 'starred'
              ? <StarIcon className="w-4 h-4 flex-shrink-0" filled={sidebarTab === 'starred'} />
              : <Icon className="w-4 h-4 flex-shrink-0" />
            }
            <span>{label}</span>
          </button>
        ))}
        <button onClick={() => { window.location.href = '/graph'; setSidebarOpen(false); }} className="sidebar-nav-item">
          <GraphIcon className="w-4 h-4 flex-shrink-0" />
          <span>Knowledge Graph</span>
        </button>
      </nav>

      <div className="p-4 border-t border-[rgba(248,240,220,0.06)] space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-[#5A5045]">Storage</span>
            <span className="text-xs text-[#5A5045] font-mono-data">{storage.fileCount} files</span>
          </div>
          <div className="h-px bg-[rgba(248,240,220,0.06)] rounded-full overflow-hidden">
            <div className="h-full bg-[#C9913D] rounded-full transition-all duration-700" style={{ width: `${storagePercent}%` }} />
          </div>
          <div className="text-xs text-[#5A5045] mt-1.5 font-mono-data">{formatSize(storage.used)} used</div>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={onProfile} className="flex-shrink-0" title="Profile settings">
            <Avatar name={user.display_name} url={user.avatar_url} size="sm" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#F4EFE5] truncate leading-tight">{user.display_name}</div>
            <div className="text-xs text-[#5A5045] truncate">{user.email}</div>
          </div>
          <button onClick={onLogout} title="Sign out" className="text-[#5A5045] hover:text-red-400 transition-colors p-1 flex-shrink-0">
            <LogoutIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
