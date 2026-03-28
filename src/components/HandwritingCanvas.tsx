"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface Stroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
}

interface Props {
  /** Called when the user chooses "Insert as Text" */
  onInsertText: (text: string) => void;
  /** Called when the user taps "Keep Handwriting" – receives a data-URL PNG */
  onKeepDrawing: (dataUrl: string) => void;
  /** Close / switch back to keyboard */
  onClose: () => void;
  /** Theme for canvas background */
  theme: "light" | "dark";
}

/* ------------------------------------------------------------------ */
/*  Smoothing helpers (Catmull-Rom → cubic Bézier)                     */
/* ------------------------------------------------------------------ */
function catmullRomToBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  alpha = 0.5
) {
  const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) ** alpha;
  const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) ** alpha;
  const d3 = Math.hypot(p3.x - p2.x, p3.y - p2.y) ** alpha;

  const b1x = (d1 * d1 * p2.x - d2 * d2 * p0.x + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.x) / (3 * d1 * (d1 + d2));
  const b1y = (d1 * d1 * p2.y - d2 * d2 * p0.y + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1.y) / (3 * d1 * (d1 + d2));

  const b2x = (d3 * d3 * p1.x - d2 * d2 * p3.x + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.x) / (3 * d3 * (d3 + d2));
  const b2y = (d3 * d3 * p1.y - d2 * d2 * p3.y + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2.y) / (3 * d3 * (d3 + d2));

  return { b1: { x: b1x, y: b1y }, b2: { x: b2x, y: b2y } };
}

function drawSmoothedStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number
) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x * scale, pts[0].y * scale, (stroke.width * Math.max(pts[0].pressure, 0.3)) / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    return;
  }

  if (pts.length === 2) {
    ctx.beginPath();
    ctx.lineWidth = stroke.width * Math.max((pts[0].pressure + pts[1].pressure) / 2, 0.3);
    ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
    ctx.lineTo(pts[1].x * scale, pts[1].y * scale);
    ctx.stroke();
    return;
  }

  // Draw using Catmull-Rom interpolation for smoothness
  ctx.beginPath();
  ctx.moveTo(pts[0].x * scale, pts[0].y * scale);

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    // Variable width based on pressure
    const pressure = Math.max((p1.pressure + p2.pressure) / 2, 0.3);
    ctx.lineWidth = stroke.width * pressure;

    if (i === 0) {
      // First segment: simple quadratic
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x * scale, p1.y * scale, mx * scale, my * scale);
    } else {
      const { b1, b2 } = catmullRomToBezier(p0, p1, p2, p3);
      ctx.bezierCurveTo(
        b1.x * scale, b1.y * scale,
        b2.x * scale, b2.y * scale,
        p2.x * scale, p2.y * scale
      );
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p2.x * scale, p2.y * scale);
  }
}

function redrawAll(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  bg: string,
  scale: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ruled lines
  const lineGap = 36 * scale;
  ctx.strokeStyle = bg === "#1a1a1a" ? "rgba(200,168,124,0.08)" : "rgba(184,134,11,0.10)";
  ctx.lineWidth = 1;
  for (let y = lineGap; y < canvas.height; y += lineGap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (const s of strokes) {
    drawSmoothedStroke(ctx, s, scale);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HandwritingCanvas({ onInsertText, onKeepDrawing, onClose, theme }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);

  const [penSize, setPenSize] = useState(2.5);
  const [penColor, setPenColor] = useState(theme === "dark" ? "#e8e0d4" : "#1a1a1a");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textDraft, setTextDraft] = useState("");

  const bgColor = theme === "dark" ? "#1a1a1a" : "#fdfbf7";
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    redrawAll(canvas, strokes, bgColor, dpr);
  }, [strokes, bgColor, dpr]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Re-render when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) redrawAll(canvas, strokes, bgColor, dpr);
  }, [strokes, bgColor, dpr]);

  // Update pen color when theme changes
  useEffect(() => {
    setPenColor(theme === "dark" ? "#e8e0d4" : "#1a1a1a");
  }, [theme]);

  /* ---------- Pointer handlers ---------- */
  function getCanvasPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
      pressure: e.pressure || 0.5,
    };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;

    const pos = getCanvasPos(e);
    currentStroke.current = {
      points: [pos],
      color: penColor,
      width: penSize,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !currentStroke.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    currentStroke.current.points.push(pos);

    // Live draw the current stroke
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawAll(canvas, strokes, bgColor, dpr);
    drawSmoothedStroke(canvas.getContext("2d")!, currentStroke.current, dpr);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !currentStroke.current) return;
    e.preventDefault();
    isDrawing.current = false;
    setStrokes((prev) => [...prev, currentStroke.current!]);
    currentStroke.current = null;
  }

  /* ---------- Actions ---------- */
  function handleUndo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setStrokes([]);
  }

  function handleKeepDrawing() {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;

    // Export with white/dark background
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    redrawAll(exportCanvas, strokes, bgColor, dpr);

    const dataUrl = exportCanvas.toDataURL("image/png");
    onKeepDrawing(dataUrl);
    setStrokes([]);
  }

  function handleConvertToText() {
    setShowTextInput(true);
  }

  function handleInsertText() {
    if (textDraft.trim()) {
      onInsertText(textDraft.trim());
      setTextDraft("");
      setShowTextInput(false);
      setStrokes([]);
    }
  }

  const penSizes = [
    { label: "Fine", value: 1.5 },
    { label: "Medium", value: 2.5 },
    { label: "Thick", value: 4.5 },
  ];

  const penColors = theme === "dark"
    ? [
        { label: "White", value: "#e8e0d4" },
        { label: "Blue", value: "#6ea8fe" },
        { label: "Green", value: "#7ec699" },
        { label: "Red", value: "#e07070" },
      ]
    : [
        { label: "Black", value: "#1a1a1a" },
        { label: "Blue", value: "#2563eb" },
        { label: "Green", value: "#16a34a" },
        { label: "Red", value: "#dc2626" },
      ];

  return (
    <div className="handwriting-panel flex flex-col h-full">
      {/* Toolbar */}
      <div className="handwriting-toolbar flex items-center gap-2 px-3 py-2 border-b border-border/50 flex-wrap">
        {/* Pen sizes */}
        <div className="flex items-center gap-1 mr-2">
          {penSizes.map((s) => (
            <button
              key={s.value}
              onClick={() => setPenSize(s.value)}
              className={`handwriting-tool-btn ${penSize === s.value ? "active" : ""}`}
              title={s.label}
            >
              <span
                className="inline-block rounded-full bg-current"
                style={{ width: s.value * 3, height: s.value * 3 }}
              />
            </button>
          ))}
        </div>

        {/* Pen colors */}
        <div className="flex items-center gap-1 mr-2">
          {penColors.map((c) => (
            <button
              key={c.value}
              onClick={() => setPenColor(c.value)}
              className={`handwriting-color-btn ${penColor === c.value ? "active" : ""}`}
              title={c.label}
            >
              <span
                className="inline-block rounded-full border border-border"
                style={{ width: 16, height: 16, backgroundColor: c.value }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={handleUndo}
          disabled={strokes.length === 0}
          className="handwriting-tool-btn text-xs font-mono disabled:opacity-30"
          title="Undo last stroke"
        >
          Undo
        </button>
        <button
          onClick={handleClear}
          disabled={strokes.length === 0}
          className="handwriting-tool-btn text-xs font-mono disabled:opacity-30"
          title="Clear canvas"
        >
          Clear
        </button>

        <div className="h-4 w-px bg-border/50 mx-1" />

        <button
          onClick={handleConvertToText}
          disabled={strokes.length === 0}
          className="handwriting-action-btn font-mono text-xs disabled:opacity-30"
          title="Type what you wrote to insert as text"
        >
          Convert to Text
        </button>
        <button
          onClick={handleKeepDrawing}
          disabled={strokes.length === 0}
          className="handwriting-action-btn keep font-mono text-xs disabled:opacity-30"
          title="Keep as handwritten image"
        >
          Keep Handwriting
        </button>

        <div className="h-4 w-px bg-border/50 mx-1" />

        <button
          onClick={onClose}
          className="handwriting-tool-btn font-mono text-xs"
          title="Switch back to keyboard"
        >
          Keyboard
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none" }}
        />

        {strokes.length === 0 && !isDrawing.current && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-text-dim font-mono text-sm italic opacity-60">
              Write here with your stylus, finger, or mouse...
            </p>
          </div>
        )}
      </div>

      {/* Text input overlay */}
      {showTextInput && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-bg-card border border-border rounded-xl p-6 card-elevated fade-in">
            <h3 className="font-mono text-sm text-text-muted mb-1 uppercase tracking-wider">
              Convert to Text
            </h3>
            <p className="text-text-dim text-xs mb-4">
              Type the text from your handwriting. It will be inserted into your document.
            </p>
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              className="w-full bg-bg-input border border-border rounded px-4 py-3 text-text font-serif text-base focus:border-accent focus:outline-none transition-colors resize-none"
              rows={4}
              placeholder="Type your handwritten text here..."
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowTextInput(false)}
                className="flex-1 border border-border py-2.5 rounded font-mono text-sm text-text-dim hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsertText}
                disabled={!textDraft.trim()}
                className="flex-1 bg-accent text-bg py-2.5 rounded font-mono text-sm hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Insert Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
