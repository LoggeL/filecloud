'use client';
import { useState, useEffect } from 'react';
import type { FolderTreeNode } from '@/types';
import { XIcon, FolderIcon, ChevronRightIcon } from './icons';

interface MoveModalProps {
  itemName: string;
  onMove: (targetFolderId: string | null) => void;
  onClose: () => void;
}

function TreeNode({ node, depth, onSelect, selectedId }: { node: FolderTreeNode; depth: number; onSelect: (id: string | null) => void; selectedId: string | null }) {
  const [open, setOpen] = useState(depth === 0);
  return (
    <div>
      <button
        className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded text-sm hover:bg-[rgba(248,240,220,0.05)] transition-colors ${selectedId === node.id ? 'bg-[rgba(201,145,61,0.12)] text-[#C9913D]' : 'text-[#9A8D7A]'}`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {node.children.length > 0 && (
          <span onClick={e => { e.stopPropagation(); setOpen(!open); }} className="text-[#5A5045] hover:text-[#9A8D7A]">
            <ChevronRightIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          </span>
        )}
        {node.children.length === 0 && <span className="w-3" />}
        <FolderIcon className="w-3.5 h-3.5 text-[#C9913D]/60 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
      {open && node.children.map(child => (
        <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

export function MoveModal({ itemName, onMove, onClose }: MoveModalProps) {
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(undefined as any);

  useEffect(() => {
    fetch('/api/folders/tree').then(r => r.json()).then(d => setTree(d.tree || []));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="surface-modal rounded-xl p-6 w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[#F4EFE5]">Move to&hellip;</h3>
            <p className="text-xs text-[#5A5045] mt-0.5 truncate max-w-[220px]">{itemName}</p>
          </div>
          <button onClick={onClose} className="text-[#5A5045] hover:text-[#9A8D7A] p-1"><XIcon className="w-4 h-4" /></button>
        </div>

        <div className="border border-[rgba(248,240,220,0.07)] rounded-lg overflow-hidden mb-4">
          <div className="max-h-64 overflow-y-auto">
            <button
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm transition-colors ${selectedId === null ? 'bg-[rgba(201,145,61,0.12)] text-[#C9913D]' : 'text-[#9A8D7A] hover:bg-[rgba(248,240,220,0.05)]'}`}
              onClick={() => setSelectedId(null)}
            >
              <span className="w-3" />
              <FolderIcon className="w-3.5 h-3.5 text-[#C9913D]/60 flex-shrink-0" />
              <span>Root (Home)</span>
            </button>
            {tree.map(node => (
              <TreeNode key={node.id} node={node} depth={0} onSelect={setSelectedId} selectedId={selectedId} />
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
          <button
            onClick={() => { if (selectedId !== undefined) { onMove(selectedId); onClose(); } }}
            disabled={selectedId === undefined}
            className="btn-primary flex-1 justify-center disabled:opacity-40"
          >
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}
