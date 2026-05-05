'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamic import — avoids SSR issues with canvas/DOM refs in react-force-graph-2d
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  source: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNotes: number;
    totalLinks: number;
    totalTags: number;
  };
}

interface FgNode {
  id: string;
  title: string;
  tags: string[];
  source: string;
  __bckgDimensions?: [number, number];
  x?: number;
  y?: number;
  val?: number;
}

interface FgLink {
  source: string | FgNode;
  target: string | FgNode;
}

// ─── Source config ────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  auto_claw: '#10b981',   // emerald
  claude_code: '#f59e0b', // amber
  codex: '#3b82f6',       // blue
  manual: '#8b5cf6',      // violet
};

const SOURCE_LABELS: Record<string, string> = {
  auto_claw: 'AutoClaw',
  claude_code: 'Claude Code',
  codex: 'Codex',
  manual: 'Manual',
};

const SOURCE_ICONS: Record<string, string> = {
  auto_claw: '🦞',
  claude_code: '🤖',
  codex: '🧑💻',
  manual: '✋',
};

function sourceColor(source: string): string {
  return SOURCE_COLORS[source] || '#64748b';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GraphPageClientProps {
  graph: GraphData | null;
}

export default function GraphPageClient({ graph }: GraphPageClientProps) {
  const fgRef = useRef<any>(null);
  const router = useRouter();

  const [hoverNode, setHoverNode] = useState<FgNode | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Responsive container — uses parentElement since the div itself is flex-1
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function updateSize() {
      const el = containerRef.current;
      if (!el) return;
      // Use the parent's dimensions since flex-1 doesn't set height on the child
      const parent = el.parentElement;
      const width = el.clientWidth || parent?.clientWidth || 800;
      const height = parent?.clientHeight || el.clientHeight || 600;
      setDimensions({ width, height: Math.max(height, 500) });
    }
    updateSize();
    // Use ResizeObserver for accuracy inside flex containers
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current?.parentElement) {
      ro.observe(containerRef.current.parentElement);
    }
    return () => ro.disconnect();
  }, []);

  // Collect all tags
  const allTags = useMemo(() => {
    if (!graph) return [];
    const tagCount = new Map<string, number>();
    for (const node of graph.nodes) {
      for (const tag of node.tags) {
        tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
      }
    }
    return [...tagCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [graph]);

  // Compute connection counts per node
  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!graph) return counts;
    for (const edge of graph.edges) {
      counts.set(edge.source, (counts.get(edge.source) || 0) + 1);
      counts.set(edge.target, (counts.get(edge.target) || 0) + 1);
    }
    return counts;
  }, [graph]);

  // Filter + highlight logic
  const { fgData, dimmedNodeIds } = useMemo(() => {
    if (!graph) return { fgData: { nodes: [] as FgNode[], links: [] as FgLink[] }, dimmedNodeIds: new Set<string>() };

    // Filter nodes by tag
    let filteredNodes = graph.nodes;
    if (selectedTag) {
      filteredNodes = graph.nodes.filter(n => n.tags.includes(selectedTag));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredNodes = filteredNodes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // Filter links to only those between visible nodes
    const filteredLinks = graph.edges
      .filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target }));

    // Compute highlight sets from search
    const hlNodes = new Set<string>();
    const hlLinks = new Set<string>();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      for (const node of filteredNodes) {
        if (node.title.toLowerCase().includes(q) || node.tags.some(t => t.toLowerCase().includes(q))) {
          hlNodes.add(node.id);
          // Also highlight directly connected nodes
          for (const edge of graph.edges) {
            if (edge.source === node.id) { hlNodes.add(edge.target); hlLinks.add(`${edge.source}-${edge.target}`); }
            if (edge.target === node.id) { hlNodes.add(edge.source); hlLinks.add(`${edge.source}-${edge.target}`); }
          }
        }
      }
    }

    const nodes: FgNode[] = filteredNodes.map(n => ({
      id: n.id,
      title: n.title,
      tags: n.tags,
      source: n.source,
      val: Math.max(1, (connectionCounts.get(n.id) || 0) * 1.5 + 1),
    }));

    const links: FgLink[] = filteredLinks.map(l => ({ source: l.source, target: l.target }));

    const dimmed = new Set<string>();
    if (searchQuery.trim() || selectedTag) {
      for (const node of graph.nodes) {
        if (!filteredNodeIds.has(node.id)) dimmed.add(node.id);
      }
    }

    return { fgData: { nodes, links }, dimmedNodeIds: dimmed };
  }, [graph, selectedTag, searchQuery, connectionCounts]);

  // Handle hover highlight
  const handleNodeHover = useCallback((node: any) => {
    if (!node || !graph) {
      setHoverNode(null);
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }
    const n = node as FgNode;
    setHoverNode(n);
    const connected = new Set<string>([n.id]);
    const connectedLinks = new Set<string>();
    for (const edge of graph.edges) {
      const key = `${edge.source}-${edge.target}`;
      const keyRev = `${edge.target}-${edge.source}`;
      if (edge.source === n.id) { connected.add(edge.target); connectedLinks.add(key); connectedLinks.add(keyRev); }
      if (edge.target === n.id) { connected.add(edge.source); connectedLinks.add(key); connectedLinks.add(keyRev); }
    }
    setHighlightNodes(connected);
    setHighlightLinks(connectedLinks);
  }, [graph]);

  // Navigate to note on click
  const handleNodeClick = useCallback((node: any) => {
    const n = node as FgNode;
    router.push(`/notes/${n.id}`);
  }, [router]);

  // Node rendering
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.title;
    const fontSize = 12 / globalScale;
    ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const bgWidth = textWidth + fontSize * 1.4;
    const bgHeight = fontSize * 1.8;

    node.__bckgDimensions = [bgWidth, bgHeight];

    const x = node.x || 0;
    const y = node.y || 0;

    // Node circle
    const radius = (node.val || 1) * 2.5;
    const color = sourceColor(node.source);

    // Dim non-highlighted nodes when hovering or filtering
    const isDimmed = dimmedNodeIds.has(node.id);
    const isHoverConnected = highlightNodes.size > 0 && highlightNodes.has(node.id);
    const isSearchMatch = highlightNodes.size > 0 && !searchQuery && selectedTag === null ? false : highlightNodes.has(node.id);

    const alpha = isDimmed ? 0.08 : (highlightNodes.size > 0 && !isHoverConnected) ? 0.2 : 1;

    ctx.globalAlpha = alpha;

    // Glow for search matches
    if (searchQuery && highlightNodes.has(node.id) && !isDimmed) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 6, 0, 2 * Math.PI);
      ctx.fillStyle = color + '33';
      ctx.fill();
    }

    // Circle fill
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Circle border
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label background
    const labelY = y + radius + fontSize * 0.8;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(x - bgWidth / 2, labelY - bgHeight / 2, bgWidth, bgHeight, 4);
    ctx.fill();

    // Label text
    ctx.fillStyle = isDimmed ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, labelY);

    ctx.globalAlpha = 1;
  }, [dimmedNodeIds, highlightNodes, searchQuery]);

  // Link rendering
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const src = link.source as any;
    const tgt = link.target as any;
    if (!src.x || !tgt.x) return;

    const linkKey = `${src.id}-${tgt.id}`;
    const linkKeyRev = `${tgt.id}-${src.id}`;
    const isHighlighted = highlightLinks.has(linkKey) || highlightLinks.has(linkKeyRev);
    const hasHighlight = highlightLinks.size > 0;

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = hasHighlight
      ? (isHighlighted ? 'rgba(16, 185, 129, 0.7)' : 'rgba(51, 65, 85, 0.15)')
      : 'rgba(71, 85, 105, 0.35)';
    ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
    ctx.stroke();
  }, [highlightLinks]);

  // ─── No data ──────────────────────────────────────────────────────────────
  if (!graph) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <p className="text-4xl mb-3">🔗</p>
        <p className="text-slate-400">Could not load graph data.</p>
      </div>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <p className="text-4xl mb-3">🕸️</p>
        <p className="text-slate-400 mb-4">No notes yet. Create some notes and link them together!</p>
        <Link
          href="/notes/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          Create your first note
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Knowledge Graph</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {graph.stats.totalNotes} notes · {graph.stats.totalLinks} links · {graph.stats.totalTags} tags
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sourceColor(key) }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Search + Tag filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes in graph..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tag filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                ✕ All tags
              </button>
            )}
            {allTags.slice(0, 8).map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  selectedTag === tag
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {tag} <span className="text-slate-600 ml-0.5">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[500px] relative"
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltipPos({ x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 });
          }
        }}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={fgData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(2, 6, 23, 0.4)"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const r = (node.val || 1) * 2.5 + 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkCanvasObject={linkCanvasObject}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.15}
          d3AlphaDecay={0.015}
          d3VelocityDecay={0.2}
          cooldownTicks={300}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          warmupTicks={80}
        />

        {/* Tooltip */}
        {hoverNode && !dimmedNodeIds.has(hoverNode.id) && (
          <div
            className="absolute z-10 pointer-events-none bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-3 shadow-xl max-w-xs"
            style={{
              left: Math.min(tooltipPos.x, dimensions.width - 280),
              top: tooltipPos.y,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{SOURCE_ICONS[hoverNode.source] || '📝'}</span>
              <span className="text-sm font-semibold text-white truncate">{hoverNode.title}</span>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {SOURCE_LABELS[hoverNode.source] || hoverNode.source}
              {' · '}
              {(connectionCounts.get(hoverNode.id) || 0)} connection{((connectionCounts.get(hoverNode.id) || 0) !== 1 ? 's' : '')}
            </p>
            {hoverNode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hoverNode.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-slate-600 mt-2">Click to open note →</p>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-3 left-3 text-xs text-slate-600 flex gap-3">
          <span>🖱️ Drag nodes</span>
          <span>🔍 Scroll to zoom</span>
          <span>✋ Drag background to pan</span>
        </div>
      </div>
    </div>
  );
}
