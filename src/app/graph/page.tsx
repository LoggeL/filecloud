'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GraphNode {
  id: string; label: string; type: 'file' | 'folder' | 'tag' | 'user';
  category?: string; mimeType?: string; size?: number; itemId?: string;
  x?: number; y?: number; vx?: number; vy?: number;
  fx?: number | null; fy?: number | null;
}
interface GraphEdge { source: string; target: string; type: string; }

const NODE_COLORS: Record<string, { bg: string; glow: string; border: string }> = {
  file: { bg: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', border: '#818cf8' },
  folder: { bg: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', border: '#22d3ee' },
  tag: { bg: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', border: '#c084fc' },
  user: { bg: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', border: '#fb7185' },
};

const EDGE_COLORS: Record<string, string> = {
  contains: 'rgba(99, 102, 241, 0.25)',
  related: 'rgba(168, 85, 247, 0.2)',
  shared: 'rgba(244, 63, 94, 0.3)',
  tagged: 'rgba(6, 182, 212, 0.25)',
};

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [dragging, setDragging] = useState<GraphNode | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  useEffect(() => {
    fetch('/api/graph').then(r => r.ok ? r.json() : { nodes: [], edges: [] }).then(data => {
      // Initialize positions randomly
      const w = window.innerWidth;
      const h = window.innerHeight;
      const initializedNodes = data.nodes.map((n: GraphNode) => ({
        ...n,
        x: w / 2 + (Math.random() - 0.5) * 400,
        y: h / 2 + (Math.random() - 0.5) * 400,
        vx: 0, vy: 0,
      }));
      setNodes(initializedNodes);
      setEdges(data.edges);
      nodesRef.current = initializedNodes;
      edgesRef.current = data.edges;
    });
  }, []);

  // Force simulation
  useEffect(() => {
    const simulate = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      if (ns.length === 0) { animRef.current = requestAnimationFrame(simulate); return; }

      // Center gravity
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      for (const n of ns) {
        if (n.fx != null) { n.x = n.fx; n.y = n.fy!; continue; }
        n.vx = (n.vx || 0) * 0.9;
        n.vy = (n.vy || 0) * 0.9;
        // Center gravity
        n.vx! += (cx - (n.x || 0)) * 0.0005;
        n.vy! += (cy - (n.y || 0)) * 0.0005;
      }

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = (ns[i].x || 0) - (ns[j].x || 0);
          const dy = (ns[i].y || 0) - (ns[j].y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          if (ns[i].fx == null) { ns[i].vx! += dx / dist * force; ns[i].vy! += dy / dist * force; }
          if (ns[j].fx == null) { ns[j].vx! -= dx / dist * force; ns[j].vy! -= dy / dist * force; }
        }
      }

      // Attraction (edges)
      for (const e of es) {
        const a = ns.find(n => n.id === e.source);
        const b = ns.find(n => n.id === e.target);
        if (!a || !b) continue;
        const dx = (b.x || 0) - (a.x || 0);
        const dy = (b.y || 0) - (a.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.003;
        if (a.fx == null) { a.vx! += dx / dist * force; a.vy! += dy / dist * force; }
        if (b.fx == null) { b.vx! -= dx / dist * force; b.vy! -= dy / dist * force; }
      }

      // Apply velocity
      for (const n of ns) {
        if (n.fx != null) continue;
        n.x = (n.x || 0) + (n.vx || 0);
        n.y = (n.y || 0) + (n.vy || 0);
      }

      setNodes([...ns]);
      animRef.current = requestAnimationFrame(simulate);
    };
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const filteredNodes = nodes.filter(n =>
      (filterType === 'all' || n.type === filterType) &&
      (!search || n.label.toLowerCase().includes(search.toLowerCase()))
    );
    const filteredIds = new Set(filteredNodes.map(n => n.id));

    // Draw edges
    for (const e of edges) {
      if (!filteredIds.has(e.source) || !filteredIds.has(e.target)) continue;
      const a = nodes.find(n => n.id === e.source);
      const b = nodes.find(n => n.id === e.target);
      if (!a || !b) continue;

      ctx.beginPath();
      ctx.moveTo(a.x || 0, a.y || 0);
      ctx.lineTo(b.x || 0, b.y || 0);

      const grad = ctx.createLinearGradient(a.x || 0, a.y || 0, b.x || 0, b.y || 0);
      const colA = NODE_COLORS[a.type]?.glow || 'rgba(99,102,241,0.2)';
      const colB = NODE_COLORS[b.type]?.glow || 'rgba(99,102,241,0.2)';
      grad.addColorStop(0, colA);
      grad.addColorStop(1, colB);
      ctx.strokeStyle = grad;
      ctx.lineWidth = hoveredNode && (hoveredNode.id === e.source || hoveredNode.id === e.target) ? 2 : 1;
      ctx.stroke();
    }

    // Draw nodes
    for (const n of filteredNodes) {
      const colors = NODE_COLORS[n.type] || NODE_COLORS.file;
      const r = n.type === 'folder' ? 18 : n.type === 'tag' ? 14 : n.type === 'user' ? 16 : 12;
      const isHovered = hoveredNode?.id === n.id;
      const isSelected = selectedNode?.id === n.id;

      // Glow
      if (isHovered || isSelected) {
        ctx.beginPath();
        ctx.arc(n.x || 0, n.y || 0, r + 12, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(n.x || 0, n.y || 0, r, n.x || 0, n.y || 0, r + 12);
        glowGrad.addColorStop(0, colors.glow);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(n.x || 0, n.y || 0, r, 0, Math.PI * 2);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = isHovered || isSelected ? 2 : 1;
      ctx.stroke();

      // Label
      ctx.font = `${isHovered ? 'bold ' : ''}11px system-ui, sans-serif`;
      ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      const label = n.label.length > 20 ? n.label.slice(0, 18) + '…' : n.label;
      ctx.fillText(label, n.x || 0, (n.y || 0) + r + 16);
    }

    ctx.restore();
  }, [nodes, edges, hoveredNode, selectedNode, search, filterType, pan, zoom]);

  const screenToWorld = useCallback((sx: number, sy: number) => ({
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  }), [pan, zoom]);

  const findNodeAt = useCallback((sx: number, sy: number) => {
    const { x, y } = screenToWorld(sx, sy);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const r = n.type === 'folder' ? 18 : n.type === 'tag' ? 14 : 12;
      const dx = (n.x || 0) - x, dy = (n.y || 0) - y;
      if (dx * dx + dy * dy < (r + 5) * (r + 5)) return n;
    }
    return null;
  }, [nodes, screenToWorld]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const node = findNodeAt(e.clientX, e.clientY);
    if (node) {
      setDragging(node);
      node.fx = node.x; node.fy = node.y;
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setOffset({ x: (node.x || 0) - x, y: (node.y || 0) - y });
    } else {
      setPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      dragging.fx = x + offset.x;
      dragging.fy = y + offset.y;
      nodesRef.current = [...nodes];
    } else if (panning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else {
      setHoveredNode(findNodeAt(e.clientX, e.clientY));
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      if (!selectedNode || selectedNode.id !== dragging.id) {
        dragging.fx = null; dragging.fy = null;
      }
      setDragging(null);
    }
    setPanning(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    const node = findNodeAt(e.clientX, e.clientY);
    if (node) {
      setSelectedNode(node === selectedNode ? null : node);
    } else {
      setSelectedNode(null);
    }
  };

  // Touch handlers
  const lastTouchRef = useRef<{ x: number; y: number; dist?: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const node = findNodeAt(t.clientX, t.clientY);
      if (node) {
        setDragging(node);
        node.fx = node.x; node.fy = node.y;
        const { x, y } = screenToWorld(t.clientX, t.clientY);
        setOffset({ x: (node.x || 0) - x, y: (node.y || 0) - y });
      } else {
        setPanning(true);
        setPanStart({ x: t.clientX - pan.x, y: t.clientY - pan.y });
      }
      lastTouchRef.current = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchRef.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2, dist: Math.sqrt(dx * dx + dy * dy) };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (dragging) {
        const { x, y } = screenToWorld(t.clientX, t.clientY);
        dragging.fx = x + offset.x;
        dragging.fy = y + offset.y;
        nodesRef.current = [...nodes];
      } else if (panning) {
        setPan({ x: t.clientX - panStart.x, y: t.clientY - panStart.y });
      }
    } else if (e.touches.length === 2 && lastTouchRef.current?.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const factor = dist / lastTouchRef.current.dist;
      const newZoom = Math.max(0.2, Math.min(3, zoom * factor));
      const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setPan(p => ({ x: mx - (mx - p.x) * (newZoom / zoom), y: my - (my - p.y) * (newZoom / zoom) }));
      setZoom(newZoom);
      lastTouchRef.current = { ...lastTouchRef.current, dist };
    }
  };

  const handleTouchEnd = () => {
    if (dragging) { dragging.fx = null; dragging.fy = null; setDragging(null); }
    setPanning(false);
    lastTouchRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(3, zoom * factor));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setPan(p => ({ x: mx - (mx - p.x) * (newZoom / zoom), y: my - (my - p.y) * (newZoom / zoom) }));
    setZoom(newZoom);
  };

  const isEmpty = nodes.length === 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-indigo-600/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-cyan-600/[0.04] rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-600/[0.03] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair touch-none"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onClick={handleClick} onWheel={handleWheel}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{ cursor: dragging ? 'grabbing' : hoveredNode ? 'pointer' : panning ? 'grabbing' : 'default' }} />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-4 z-10">
        <a href="/" className="glass-strong rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 hover:bg-white/[0.08] transition-all text-sm">
          <span>←</span> <span className="hidden sm:inline">Back to Files</span>
        </a>
        <div className="flex-1 min-w-0 hidden sm:block" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
          className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 w-full sm:w-48 md:w-64 transition-all order-last sm:order-none" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-white transition-all flex-shrink-0">
          <option value="all">All Types</option>
          <option value="file">Files</option>
          <option value="folder">Folders</option>
          <option value="tag">Tags</option>
          <option value="user">Users</option>
        </select>
        <button onClick={async () => {
          setAnalyzing(true); setAnalysisStatus('Re-analyzing...');
          try {
            const res = await fetch('/api/analyze/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reanalyze: true }) });
            const data = await res.json();
            setAnalysisStatus(`Done: ${data.succeeded || 0}/${data.processed || 0} files`);
            // Reload graph
            const graphRes = await fetch('/api/graph');
            if (graphRes.ok) {
              const gd = await graphRes.json();
              const w = window.innerWidth, h = window.innerHeight;
              const newNodes = gd.nodes.map((n: GraphNode) => ({ ...n, x: w/2 + (Math.random()-0.5)*400, y: h/2 + (Math.random()-0.5)*400, vx: 0, vy: 0 }));
              setNodes(newNodes); setEdges(gd.edges);
              nodesRef.current = newNodes; edgesRef.current = gd.edges;
            }
            setTimeout(() => setAnalysisStatus(''), 3000);
          } catch { setAnalysisStatus('Error'); }
          setAnalyzing(false);
        }} disabled={analyzing}
          className="glass-strong rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm hover:bg-white/[0.08] transition-all flex-shrink-0 disabled:opacity-50">
          {analyzing ? '⏳' : '🔄'} <span className="hidden sm:inline ml-1">{analyzing ? 'Analyzing...' : 'Re-analyze'}</span>
        </button>
        {analysisStatus && <span className="text-xs text-gray-400 flex-shrink-0">{analysisStatus}</span>}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass-strong rounded-xl p-3 sm:p-4 z-10 space-y-1.5 sm:space-y-2 max-w-[calc(100vw-2rem)] sm:max-w-none">
        <div className="text-xs text-gray-500 font-medium mb-1.5 sm:mb-2">Legend</div>
        <div className="flex sm:flex-col gap-3 sm:gap-2 flex-wrap">
          {Object.entries(NODE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5 sm:gap-2 text-xs">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colors.bg }} />
              <span className="text-gray-400 capitalize">{type}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/[0.06] pt-2 mt-2 text-xs text-gray-500 hidden sm:block">
          Scroll to zoom · Drag to pan · Click nodes to select
        </div>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 glass-strong rounded-2xl p-4 sm:p-5 z-20 sm:w-72 animate-slide-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: NODE_COLORS[selectedNode.type]?.bg }}>
              {selectedNode.type === 'file' ? '📄' : selectedNode.type === 'folder' ? '📁' : selectedNode.type === 'tag' ? '🏷️' : '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{selectedNode.label}</div>
              <div className="text-xs text-gray-500 capitalize">{selectedNode.type}{selectedNode.category ? ` · ${selectedNode.category}` : ''}</div>
            </div>
          </div>
          {selectedNode.size && <div className="text-xs text-gray-400 mb-2">Size: {formatSize(selectedNode.size)}</div>}
          {selectedNode.type === 'file' && selectedNode.itemId && (
            <a href={`/api/files/${selectedNode.itemId}?inline=1`} target="_blank"
              className="block text-center bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-xl transition-all mt-3">
              Open File
            </a>
          )}
          <div className="text-xs text-gray-600 mt-2">
            {edges.filter(e => e.source === selectedNode!.id || e.target === selectedNode!.id).length} connections
          </div>
        </div>
      )}

      {/* Empty State */}
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="text-center">
            <div className="text-7xl mb-4 animate-float">🕸️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Knowledge Graph</h2>
            <p className="text-gray-500">Upload files to see the graph come alive</p>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}
