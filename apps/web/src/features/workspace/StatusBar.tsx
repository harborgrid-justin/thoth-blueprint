import * as React from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { usePrefsStore } from "@/store/prefsStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp } from "lucide-react";

export function StatusBar() {
  const cursor = useCanvasStore((s) => s.cursor);
  const [spaceMode, setSpaceMode] = React.useState<"MODEL" | "PAPER">("MODEL");
  const [annotationScale, setAnnotationScale] = React.useState('1"=40\'');

  const { ortho, polar, osnap, toggleOrtho, togglePolar, toggleOsnap } = usePrefsStore();
  const [grid, setGrid] = React.useState(true);
  const [snap, setSnap] = React.useState(false);
  const [dyn, setDyn] = React.useState(true);

  return (
    <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-30 flex h-7 items-center justify-between border-t border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#14151a] px-3 font-mono text-[11px] text-slate-800 dark:text-slate-300 shadow-md select-none">
      {/* Left Cursor Coordinates & Model/Paper Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSpaceMode((prev) => (prev === "MODEL" ? "PAPER" : "MODEL"))}
          className="flex items-center gap-1 rounded border border-blue-500/40 bg-blue-50 dark:bg-cyan-950/60 px-2 py-0.5 font-bold text-blue-700 dark:text-cyan-300 hover:bg-blue-100 dark:hover:bg-cyan-900/60 shadow-xs"
          title="Toggle Model Space / Paper Space Layout"
        >
          {spaceMode}
        </button>

        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-bold">
          <span>X: {cursor ? cursor.x.toFixed(3) : "0.000"}</span>
          <span>Y: {cursor ? cursor.y.toFixed(3) : "0.000"}</span>
          <span>Z: 0.000</span>
        </div>
      </div>

      {/* Center AutoCAD Engineering Snap & Drafting Mode Toggles */}
      <div className="flex items-center gap-1.5 text-[10px] font-bold">
        <button
          onClick={() => setGrid((p) => !p)}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            grid ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Display Drawing Grid (F7)"
        >
          GRID
        </button>

        <button
          onClick={() => setSnap((p) => !p)}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            snap ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Snap Mode (F9)"
        >
          SNAP
        </button>

        <button
          onClick={toggleOrtho}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            ortho ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Ortho Mode (F8)"
        >
          ORTHO
        </button>

        <button
          onClick={togglePolar}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            polar ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Polar Tracking (F10)"
        >
          POLAR
        </button>

        <button
          onClick={toggleOsnap}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            osnap ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
          }`}
          title="2D Object Snap (F3)"
        >
          OSNAP
        </button>

        <button
          onClick={() => setDyn((p) => !p)}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            dyn ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-500 hover:text-slate-300"
          }`}
          title="Dynamic Input (F12)"
        >
          DYN
        </button>

        <span className="text-slate-700">|</span>

        <span className="text-slate-400">LWT</span>
        <span className="text-slate-400">TRANSPARENCY</span>
      </div>

      {/* Right Annotation Scale & Units */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-cyan-300 hover:bg-slate-700">
              <span>Scale: {annotationScale}</span>
              <ChevronUp className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 border-slate-700 bg-[#1e1e24] text-slate-100 font-mono text-xs">
            {['1"=10\'', '1"=20\'', '1"=30\'', '1"=40\'', '1"=50\'', '1"=100\'', '1:1', '1:10', '1:100'].map((sc) => (
              <DropdownMenuItem key={sc} onClick={() => setAnnotationScale(sc)}>
                {sc}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[10px] text-slate-500 font-bold">CAD ENG v2026</span>
      </div>
    </div>
  );
}
