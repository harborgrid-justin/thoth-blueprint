import * as React from "react";
import { useCanvasStore } from "@/store/canvasStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ViewportControls() {
  const viewMode = useCanvasStore((s) => s.viewMode);
  const setViewMode = useCanvasStore((s) => s.setViewMode);
  const requestFit = useCanvasStore((s) => s.requestFit);
  const [activeView, setActiveView] = React.useState("Top");
  const [visualStyle, setVisualStyle] = React.useState("2D Wireframe");
  const [viewportConfig, setViewportConfig] = React.useState("Single Viewport");

  return (
    <div className="pointer-events-auto absolute top-4 left-16 z-20 flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700/60 bg-white/95 dark:bg-[#16171d]/90 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-slate-800 dark:text-slate-300 shadow-lg backdrop-blur-md select-none">
      {/* Viewport Config Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-blue-700 dark:text-cyan-400 hover:text-blue-900 dark:hover:text-cyan-300 transition-colors">
            [{viewportConfig === "Single Viewport" ? "-" : "+"} {viewportConfig}]
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-slate-100 font-mono text-xs shadow-xl">
          <DropdownMenuItem onClick={() => setViewportConfig("Single Viewport")}>
            Single Viewport
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewportConfig("2 Viewports Vertical")}>
            Two Vertical Viewports
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewportConfig("2 Viewports Horizontal")}>
            Two Horizontal Viewports
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setViewportConfig("4 Equal Viewports")}>
            Four Equal Viewports
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-slate-400 dark:text-slate-600">|</span>

      {/* Standard View Orientation Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-blue-700 dark:text-cyan-400 hover:text-blue-900 dark:hover:text-cyan-300 transition-colors">
            [{activeView}]
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-slate-100 font-mono text-xs shadow-xl">
          {["Top", "Bottom", "Left", "Right", "Front", "Back", "SW Isometric", "SE Isometric", "NE Isometric", "NW Isometric"].map((v) => (
            <DropdownMenuItem
              key={v}
              onClick={() => {
                setActiveView(v);
                if (v.includes("Isometric")) {
                  setViewMode("3d");
                } else {
                  setViewMode("2d");
                }
                requestFit();
              }}
            >
              {v}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <span className="text-slate-400 dark:text-slate-600">|</span>

      {/* Visual Style Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-blue-700 dark:text-cyan-400 hover:text-blue-900 dark:hover:text-cyan-300 transition-colors">
            [{visualStyle}]
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e1e24] text-slate-900 dark:text-slate-100 font-mono text-xs shadow-xl">
          {["2D Wireframe", "Conceptual", "Hidden", "Realistic", "Shaded", "Shaded with Edges", "Wireframe", "X-Ray"].map((vs) => (
            <DropdownMenuItem
              key={vs}
              onClick={() => {
                setVisualStyle(vs);
                if (vs !== "2D Wireframe" && viewMode === "2d") {
                  setViewMode("3d");
                }
              }}
            >
              {vs}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
