import React, { useState, useRef, useEffect } from "react";
import { X, Layers, Satellite, ZoomIn, ZoomOut, Info, ChevronLeft, ChevronRight } from "lucide-react";

interface SARInspectorProps {
  onClose: () => void;
}

// Procedurally draw SAR grayscale backscatter canvas
function drawSARBackscatter(canvas: HTMLCanvasElement, width: number, height: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0B0F19";
  ctx.fillRect(0, 0, width, height);

  // Simulate radar speckle noise pattern (grayscale)
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Seeded pseudo-random for reproducible texture
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return ((seed >>> 0) / 0xffffffff);
  };

  for (let i = 0; i < data.length; i += 4) {
    const px = Math.floor((i / 4) % width);
    const py = Math.floor((i / 4) / width);

    // Base speckle intensity (SAR backscatter)
    let intensity = rand() * 180 + 40;

    // Simulate slope/terrain features: brighter in central highland (slope facing radar)
    const nx = (px - width / 2) / (width / 2);
    const ny = (py - height / 2) / (height / 2);
    const dist = Math.sqrt(nx * nx + ny * ny);

    // Bright ridge zones (high backscatter = rough slopes)
    if (Math.abs(Math.sin(px * 0.08 + py * 0.06)) > 0.65) intensity = Math.min(255, intensity + 90);
    // Dark valley/water zones (low backscatter = smooth)
    if (dist < 0.25 && py > height * 0.45) intensity = Math.max(5, intensity * 0.15);
    // Road/linear feature (very bright linear return)
    if (Math.abs(px - py * 0.8 - 20) < 2) intensity = 240;

    data[i] = intensity;     // R
    data[i + 1] = intensity; // G
    data[i + 2] = intensity; // B
    data[i + 3] = 255;       // A
  }
  ctx.putImageData(imageData, 0, 0);

  // Add elevation contour lines (simulated DEM)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 0.8;
  for (let c = 0; c < 14; c++) {
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const y = height * 0.35 + Math.sin(x * 0.028 + c * 0.55) * 22 + c * 12;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Scale bar
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.fillRect(width - 54, height - 22, 40, 3);
  ctx.font = "8px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText("10 km", width - 52, height - 9);

  // North arrow
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fillText("N↑", 8, 18);

  // Acquisition watermark
  ctx.font = "7px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillText("Sentinel-1A C-Band SAR • VV+VH", 6, height - 9);
}

// Draw classified SAR inundation/slope failure overlay
function drawClassifiedOverlay(canvas: HTMLCanvasElement, width: number, height: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Dark terrain base
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, width, height);

  // Subtle terrain grid
  ctx.strokeStyle = "rgba(55, 65, 81, 0.5)";
  ctx.lineWidth = 0.5;
  for (let i = 0; i < width; i += 20) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
  }
  for (let j = 0; j < height; j += 20) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
  }

  // --- Classified zones ---

  // 1. Waterbodies (Blue #2563EB) — river valleys
  ctx.fillStyle = "rgba(37, 99, 235, 0.75)";
  ctx.beginPath();
  ctx.ellipse(width * 0.22, height * 0.72, 28, 14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.65, height * 0.60, 22, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // River channel
  ctx.strokeStyle = "rgba(37, 99, 235, 0.65)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(width * 0.1, height * 0.72);
  ctx.bezierCurveTo(width * 0.35, height * 0.68, width * 0.55, height * 0.58, width * 0.9, height * 0.62);
  ctx.stroke();

  // 2. Soil Saturation / Inundation (Purple #A855F7)
  ctx.fillStyle = "rgba(168, 85, 247, 0.55)";
  ctx.beginPath();
  ctx.ellipse(width * 0.42, height * 0.52, 38, 20, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.72, height * 0.35, 22, 16, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 3. Hazard Failure Perimeters (Red #DC2626) — slope failures
  ctx.strokeStyle = "rgba(220, 38, 38, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  // Zone A — Aizawl slope failure perimeter
  ctx.beginPath();
  ctx.ellipse(width * 0.55, height * 0.28, 32, 22, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  // Zone B — Kohima ridge failure
  ctx.beginPath();
  ctx.ellipse(width * 0.30, height * 0.42, 24, 16, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  // Zone C — Gangtok slope
  ctx.beginPath();
  ctx.ellipse(width * 0.78, height * 0.48, 18, 12, 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Fill hazard zones with semi-transparent red
  ctx.fillStyle = "rgba(220, 38, 38, 0.18)";
  ctx.beginPath();
  ctx.ellipse(width * 0.55, height * 0.28, 32, 22, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.30, height * 0.42, 24, 16, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.78, height * 0.48, 18, 12, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Labels
  ctx.font = "bold 8px sans-serif";
  ctx.fillStyle = "#93C5FD";
  ctx.fillText("Waterbody", width * 0.14, height * 0.68);
  ctx.fillStyle = "#C084FC";
  ctx.fillText("Soil Saturation", width * 0.35, height * 0.49);
  ctx.fillStyle = "#FCA5A5";
  ctx.fillText("Hazard Zone A", width * 0.41, height * 0.24);
  ctx.fillText("Hazard Zone B", width * 0.16, height * 0.40);
  ctx.fillText("Hazard Zone C", width * 0.65, height * 0.44);

  // Legend
  const lx = 8, ly = height - 48;
  ctx.font = "8px sans-serif";

  ctx.fillStyle = "rgba(37, 99, 235, 0.8)"; ctx.fillRect(lx, ly, 10, 8);
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillText("Waterbody", lx + 14, ly + 7);

  ctx.fillStyle = "rgba(168, 85, 247, 0.8)"; ctx.fillRect(lx, ly + 13, 10, 8);
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillText("Soil Saturation", lx + 14, ly + 20);

  ctx.fillStyle = "rgba(220, 38, 38, 0.8)"; ctx.fillRect(lx, ly + 26, 10, 8);
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillText("Hazard Perimeter", lx + 14, ly + 33);

  // Acquisition metadata
  ctx.font = "7px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillText("NESAC / ISRO • Classified SAR Output", 6, height - 9);
}

export const SARInspector: React.FC<SARInspectorProps> = ({ onClose }) => {
  const [view, setView] = useState<"raw" | "classified">("raw");
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const rawCanvasRef = useRef<HTMLCanvasElement>(null);
  const classifiedCanvasRef = useRef<HTMLCanvasElement>(null);

  const W = 320, H = 240;

  useEffect(() => {
    if (rawCanvasRef.current) drawSARBackscatter(rawCanvasRef.current, W, H);
    if (classifiedCanvasRef.current) drawClassifiedOverlay(classifiedCanvasRef.current, W, H);
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-bgCard border border-borderColor rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderColor bg-bgPrimary/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-600">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-textPrimary uppercase tracking-tight">
                Satellite Radar InSAR & Inundation Inspector
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-bold text-textMuted bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded">
                  Sentinel-1A SAR • NESAC / ISRO
                </span>
                <span className="text-[9px] font-mono text-textMuted">
                  Acquisition: 2026-08-24T05:12Z • Orbit 42571
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-borderColor hover:bg-bgPrimary text-textSecondary hover:text-textPrimary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Controls */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-borderColor bg-bgCard">
          <div className="flex items-center bg-bgPrimary border border-borderColor rounded-xl p-1 gap-0.5">
            <button
              onClick={() => { setView("raw"); setCompareMode(false); }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition ${
                view === "raw" && !compareMode ? "bg-blue-600 text-white shadow-sm" : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              📡 Raw SAR Backscatter
            </button>
            <button
              onClick={() => { setView("classified"); setCompareMode(false); }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition ${
                view === "classified" && !compareMode ? "bg-blue-600 text-white shadow-sm" : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              🗺️ Classified Overlay
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition ${
                compareMode ? "bg-purple-600 text-white shadow-sm" : "text-textSecondary hover:text-textPrimary"
              }`}
            >
              ⇔ Side-by-Side
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-bold text-textMuted">
            <div className="w-2 h-2 rounded-full bg-alertGreen animate-pulse" />
            C-Band Synthetic Aperture Radar
          </div>
        </div>

        {/* Canvas Display Area */}
        <div className="p-6 flex-grow">
          {compareMode ? (
            /* Side-by-side compare mode */
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="text-[9px] font-black text-textMuted uppercase tracking-wider flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> Raw SAR Backscatter (Grayscale Intensity)
                </div>
                <div className="rounded-xl overflow-hidden border border-borderColor shadow-lg">
                  <canvas ref={rawCanvasRef} width={W} height={H} className="block" />
                </div>
                <p className="text-[8px] text-textMuted text-center leading-tight max-w-[240px]">
                  Polarimetric radar reflectance. Bright = rough/wet slope. Dark = smooth/water body. Linear returns = infrastructure.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="text-[9px] font-black text-textMuted uppercase tracking-wider flex items-center gap-1">
                  Classified Flood & Slope Failure Perimeter <ChevronRight className="w-3 h-3" />
                </div>
                <div className="rounded-xl overflow-hidden border border-borderColor shadow-lg">
                  <canvas ref={classifiedCanvasRef} width={W} height={H} className="block" />
                </div>
                <p className="text-[8px] text-textMuted text-center leading-tight max-w-[240px]">
                  NESAC automated classification: Blue=Waterbody · Purple=Soil Saturation · Red=Hazard Boundary.
                </p>
              </div>
            </div>
          ) : (
            /* Single pane view */
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl overflow-hidden border-2 border-borderColor shadow-xl">
                {view === "raw" ? (
                  <canvas width={Math.round(W * 1.8)} height={Math.round(H * 1.4)} className="block"
                    ref={(el) => { if (el) drawSARBackscatter(el, Math.round(W * 1.8), Math.round(H * 1.4)); }} />
                ) : (
                  <canvas width={Math.round(W * 1.8)} height={Math.round(H * 1.4)} className="block"
                    ref={(el) => { if (el) drawClassifiedOverlay(el, Math.round(W * 1.8), Math.round(H * 1.4)); }} />
                )}
              </div>
              <p className="text-[9px] text-textMuted text-center font-semibold leading-snug max-w-md">
                {view === "raw"
                  ? "SAR Backscatter Intensity (VV+VH Polarimetry) — Brighter pixels indicate rough terrain, moisture, or steep slope faces facing the satellite sensor. Darker pixels indicate open water or smooth surfaces."
                  : "Classified Inundation & Slope Failure Perimeters generated via NESAC automated SAR change detection algorithm. Blue = Inundated waterbodies. Purple = Soil saturation zones. Red dashed = Landslide/slope failure perimeter boundaries."
                }
              </p>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="px-6 py-4 border-t border-borderColor bg-bgPrimary/40 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-textSecondary font-semibold leading-relaxed">
            <strong className="text-textPrimary">NESAC/ISRO InSAR Processing Chain:</strong> Sentinel-1A C-Band SAR imagery is processed using Differential InSAR (DInSAR) at 30m spatial resolution. Change detection between pre/post-monsoon acquisitions identifies millimeter-level surface deformation and inundation extent across North-East India landslide-prone corridors.
          </p>
        </div>

      </div>
    </div>
  );
};
