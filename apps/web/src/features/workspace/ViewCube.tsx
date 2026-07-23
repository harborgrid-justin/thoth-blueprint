import * as React from "react";
import { Home, RotateCw } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";

export function ViewCube() {
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);
  const requestFit = useCanvasStore((s) => s.requestFit);
  const [rotation, setRotation] = React.useState(0);

  const rotateCube = (angleDelta: number) => {
    setRotation((prev) => (prev + angleDelta) % 360);
  };

  return (
    <div className="pointer-events-auto absolute top-4 right-4 z-20 flex flex-col items-center select-none">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700/60 bg-white/90 dark:bg-[#16171d]/85 p-2 shadow-xl backdrop-blur-md">
        {/* Compass Cardinal Directions Ring */}
        <div
          className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400 transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <span className="absolute top-1 font-bold text-blue-600 dark:text-cyan-400">N</span>
          <span className="absolute right-1.5 font-bold text-slate-700 dark:text-slate-300">E</span>
          <span className="absolute bottom-1 font-bold text-slate-700 dark:text-slate-300">S</span>
          <span className="absolute left-1.5 font-bold text-slate-700 dark:text-slate-300">W</span>
        </div>

        {/* Center Isometric View Cube */}
        <div
          className="relative flex h-14 w-14 flex-col items-center justify-center rounded-xl border border-blue-500/40 dark:border-cyan-500/40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 shadow-sm transition-all hover:border-blue-600 dark:hover:border-cyan-400 hover:scale-105"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <button
            onClick={() => {
              setViewMode("2d");
              requestFit();
            }}
            className="flex h-full w-full flex-col items-center justify-center font-mono text-[10px] font-bold text-blue-700 dark:text-cyan-300 hover:text-blue-900 dark:hover:text-white"
            title="Top View (2D Wireframe)"
          >
            <span className="text-[11px] font-extrabold tracking-wider">TOP</span>
            <span className="text-[8px] text-slate-500 dark:text-slate-400 font-sans">
              {viewMode.toUpperCase()}
            </span>
          </button>
        </div>

        {/* Orbit Rotation Quick Controls */}
        <button
          onClick={() => rotateCube(90)}
          className="absolute -right-2 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 dark:hover:bg-cyan-600 hover:text-white shadow-xs"
          title="Rotate View 90° Clockwise"
        >
          <RotateCw className="h-2.5 w-2.5" />
        </button>

        <button
          onClick={() => {
            setRotation(0);
            requestFit();
          }}
          className="absolute -left-2 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 dark:hover:bg-cyan-600 hover:text-white shadow-xs"
          title="Home View"
        >
          <Home className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
