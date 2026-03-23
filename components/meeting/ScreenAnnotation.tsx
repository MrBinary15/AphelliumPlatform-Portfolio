"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Pencil, Eraser, Trash2, Circle, X } from "lucide-react";

interface Point { x: number; y: number }

interface DrawCommand {
  tool: "pen" | "eraser";
  points: Point[];
  color: string;
  width: number;
}

interface Props {
  meetingId: string;
  userId: string;
  enabled: boolean;
  onClose: () => void;
}

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#ffffff"];
const PEN_WIDTHS = [2, 4, 8];

export default function ScreenAnnotation({ meetingId, userId, enabled, onClose }: Props) {
  const supabase = createClient();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(PEN_WIDTHS[1]);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Resize canvas to fill parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Subscribe to broadcast for remote annotations
  useEffect(() => {
    const channel = supabase
      .channel(`annotations-${meetingId}`)
      .on("broadcast", { event: "draw" }, (payload) => {
        const cmd = payload.payload as DrawCommand & { senderId: string };
        if (cmd.senderId === userId) return;
        drawOnCanvas(cmd);
      })
      .on("broadcast", { event: "clear" }, (payload) => {
        const data = payload.payload as { senderId: string };
        if (data.senderId === userId) return;
        clearCanvas();
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, userId]);

  const drawOnCanvas = useCallback((cmd: DrawCommand) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (cmd.tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = cmd.width * 4;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = cmd.color;
      ctx.lineWidth = cmd.width;
    }

    // Convert normalized coords to canvas coords
    const pts = cmd.points.map((p) => ({
      x: p.x * canvas.width,
      y: p.y * canvas.height,
    }));

    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const broadcastDraw = useCallback((cmd: DrawCommand) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "draw",
      payload: { ...cmd, senderId: userId },
    });
  }, [userId]);

  const broadcastClear = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "clear",
      payload: { senderId: userId },
    });
  }, [userId]);

  // Normalize coords
  const normalize = useCallback((clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / canvas.width,
      y: (clientY - rect.top) / canvas.height,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    drawingRef.current = true;
    pointsRef.current = [normalize(e.clientX, e.clientY)];
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [normalize]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const pt = normalize(e.clientX, e.clientY);
    pointsRef.current.push(pt);

    // Draw locally in real-time
    const cmd: DrawCommand = { tool, points: pointsRef.current.slice(-2), color, width };
    drawOnCanvas(cmd);
  }, [normalize, tool, color, width, drawOnCanvas]);

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    const cmd: DrawCommand = { tool, points: pointsRef.current, color, width };
    broadcastDraw(cmd);
    pointsRef.current = [];
  }, [tool, color, width, broadcastDraw]);

  return (
    <div className={`absolute inset-0 ${enabled ? "z-40" : "z-30 pointer-events-none"}`}>
      {/* Transparent drawing canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={enabled ? handlePointerDown : undefined}
        onPointerMove={enabled ? handlePointerMove : undefined}
        onPointerUp={enabled ? handlePointerUp : undefined}
        onPointerLeave={enabled ? handlePointerUp : undefined}
        className={`absolute inset-0 w-full h-full ${enabled ? "cursor-crosshair" : ""}`}
        style={{ touchAction: "none", pointerEvents: enabled ? "auto" : "none" }}
      />

      {/* Toolbar — only when local drawing is enabled */}
      {enabled && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#0a0f1a]/90 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 shadow-xl">
        {/* Tools */}
        <button
          onClick={() => setTool("pen")}
          className={`p-1.5 rounded-full transition-colors ${tool === "pen" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
          title="Lápiz"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`p-1.5 rounded-full transition-colors ${tool === "eraser" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
          title="Borrador"
        >
          <Eraser size={14} />
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Colors */}
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"}`}
            style={{ backgroundColor: c }}
          />
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Width */}
        {PEN_WIDTHS.map((w) => (
          <button
            key={w}
            onClick={() => setWidth(w)}
            className={`p-1 rounded-full transition-colors ${width === w ? "bg-white/20" : "hover:bg-white/10"}`}
            title={`Grosor ${w}`}
          >
            <Circle size={w + 6} className={`${width === w ? "text-white" : "text-gray-500"}`} fill="currentColor" />
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Clear / Close */}
        <button
          onClick={() => { clearCanvas(); broadcastClear(); }}
          className="p-1.5 rounded-full text-gray-400 hover:text-red-400 transition-colors"
          title="Limpiar todo"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-gray-400 hover:text-white transition-colors"
          title="Cerrar anotaciones"
        >
          <X size={14} />
        </button>
      </div>
      )}
    </div>
  );
}
