"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type GraphNote = {
  id: string;
  title: string;
  type: string;
  cluster: string | null;
  pinned: boolean;
};

type GraphConnection = {
  fromId: string;
  toId: string;
  reason: string;
  strength: number;
};

type GraphData = {
  notes: GraphNote[];
  connections: GraphConnection[];
};

const TYPE_COLOR: Record<string, string> = {
  idee: "#f59e0b",
  frustratie: "#f43f5e",
  notitie: "#38bdf8",
};

// Assign a stable color per cluster name
function clusterColor(name: string): string {
  const palette = [
    "#a78bfa", "#34d399", "#fb923c", "#60a5fa",
    "#f472b6", "#4ade80", "#facc15", "#c084fc",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}

export function GraphView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<GraphNote | null>(null);
  const [hoveredReason, setHoveredReason] = useState<string>("");
  const animRef = useRef<number>(0);

  useEffect(() => {
    fetch("/api/graph").then((r) => r.json()).then(setData);
  }, []);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    // Build node/link structures
    const nodes = data.notes.map((n) => ({
      ...n,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0,
      vy: 0,
    }));

    const idxById: Record<string, number> = {};
    nodes.forEach((n, i) => (idxById[n.id] = i));

    const links = data.connections
      .map((c) => ({
        source: idxById[c.fromId],
        target: idxById[c.toId],
        strength: c.strength,
        reason: c.reason,
      }))
      .filter((l) => l.source !== undefined && l.target !== undefined);

    let hoveredNode: (typeof nodes)[0] | null = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Force simulation (simple manual implementation)
    function tick() {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      // Reset forces
      nodes.forEach((n) => { n.vx = 0; n.vy = 0; });

      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 3000 / (dist * dist);
          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      // Attraction along links
      links.forEach((l) => {
        const a = nodes[l.source];
        const b = nodes[l.target];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 120 + (1 - l.strength) * 80;
        const force = (dist - target) * 0.04 * l.strength;
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      });

      // Gravity toward center
      nodes.forEach((n) => {
        n.vx += (cx - n.x) * 0.01;
        n.vy += (cy - n.y) * 0.01;
      });

      // Apply velocity with damping
      const damping = 0.85;
      nodes.forEach((n) => {
        n.x += n.vx * damping;
        n.y += n.vy * damping;
        n.x = Math.max(30, Math.min(W - 30, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
      });
    }

    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Draw links
      links.forEach((l) => {
        const a = nodes[l.source];
        const b = nodes[l.target];
        const isHovered =
          hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = isHovered
          ? `rgba(255,255,255,${l.strength * 0.9})`
          : `rgba(255,255,255,${l.strength * 0.15})`;
        ctx.lineWidth = isHovered ? l.strength * 2 : 1;
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((n) => {
        const r = n.pinned ? 12 : 9;
        const color = n.cluster
          ? clusterColor(n.cluster)
          : TYPE_COLOR[n.type] ?? "#94a3b8";
        const isSelected = selected?.id === n.id;
        const isHov = hoveredNode?.id === n.id;

        // Glow for hovered/selected
        if (isHov || isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = color + "44";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Label
        if (isHov || isSelected || nodes.length < 20) {
          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.fillText(
            n.title.length > 22 ? n.title.slice(0, 22) + "…" : n.title,
            n.x,
            n.y - r - 6
          );
        }

        // Cluster badge
        if (n.cluster && (isHov || isSelected)) {
          ctx.font = "10px sans-serif";
          ctx.fillStyle = color + "cc";
          ctx.fillText(n.cluster, n.x, n.y + r + 14);
        }
      });
    }

    let frame = 0;
    function loop() {
      if (frame < 200) tick(); // settle after 200 frames
      frame++;
      draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    // Mouse interaction
    function getNodeAt(mx: number, my: number) {
      return nodes.find((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) < 16;
      }) ?? null;
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = getNodeAt(mx, my);
      hoveredNode = node;
      canvas.style.cursor = node ? "pointer" : "default";

      if (node) {
        const link = links.find(
          (l) => nodes[l.source].id === node.id || nodes[l.target].id === node.id
        );
        setHoveredReason(link?.reason ?? "");
      } else {
        setHoveredReason("");
      }
    }

    function onClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = getNodeAt(mx, my);
      setSelected(node ? (data?.notes.find((n) => n.id === node.id) ?? null) : null);
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [data, selected]);

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center text-neutral-400">
        Graph laden…
      </div>
    );
  }

  if (data.notes.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 text-neutral-400">
        <p>Nog geen aantekeningen om te visualiseren.</p>
        <Link href="/" className="text-sm text-white underline">
          ← Terug
        </Link>
      </div>
    );
  }

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Header */}
      <div className="absolute left-4 top-4 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
        >
          ← Terug
        </Link>
        <span className="text-sm text-neutral-400">
          {data?.notes.length ?? 0} notities · {data?.connections.length ?? 0} verbindingen
        </span>
      </div>

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 text-xs text-neutral-400">
        {(["idee", "frustratie", "notitie"] as const).map((t) => (
          <span key={t} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: TYPE_COLOR[t] }}
            />
            {t}
          </span>
        ))}
        <span className="text-neutral-600">· Kleuren = clusters (AI)</span>
      </div>

      {/* Geselecteerde notitie */}
      {selected && (
        <div className="absolute right-4 top-4 w-64 rounded-xl border border-white/10 bg-neutral-900/90 p-4 backdrop-blur">
          <div className="text-xs text-neutral-400">{selected.type}</div>
          <div className="mt-1 font-medium text-white">{selected.title}</div>
          {selected.cluster && (
            <div
              className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs"
              style={{
                background: clusterColor(selected.cluster) + "33",
                color: clusterColor(selected.cluster),
              }}
            >
              {selected.cluster}
            </div>
          )}
          <Link
            href={`/?note=${selected.id}`}
            className="mt-3 block text-center text-xs text-neutral-400 underline hover:text-white"
          >
            Open notitie →
          </Link>
          <button
            onClick={() => setSelected(null)}
            className="absolute right-3 top-3 text-neutral-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hovered verbinding-reden */}
      {hoveredReason && !selected && (
        <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-neutral-300">
          {hoveredReason}
        </div>
      )}
    </>
  );
}
