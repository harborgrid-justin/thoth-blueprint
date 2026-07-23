import * as React from "react";
import { Plus, LayoutTemplate, Box } from "lucide-react";
import { useUiStore } from "@/store/uiStore";

export function ModelLayoutTabs() {
  const [activeSpace, setActiveSpace] = React.useState<"model" | string>("model");
  const [layouts, setLayouts] = React.useState<string[]>(["Layout1", "Layout2"]);
  const setSheetOpen = useUiStore((s) => s.setSheetOpen);
  const setSheetSetOpen = useUiStore((s) => s.setSheetSetOpen);

  const addLayout = () => {
    const nextNum = layouts.length + 1;
    const name = `Layout${nextNum}`;
    setLayouts((prev) => [...prev, name]);
    setActiveSpace(name);
  };

  return (
    <div className="pointer-events-auto flex items-center bg-[#f8fafc] dark:bg-[#18191e] border-t border-r border-slate-300 dark:border-slate-700/80 rounded-tr px-1 text-xs select-none shadow-sm">
      {/* Model Space Tab */}
      <button
        onClick={() => setActiveSpace("model")}
        className={`flex h-7 items-center gap-1.5 px-3 font-mono text-[11px] font-bold transition-colors ${
          activeSpace === "model"
            ? "border-t-2 border-blue-600 dark:border-cyan-400 bg-white dark:bg-[#252732] text-blue-700 dark:text-white shadow-xs"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
      >
        <Box className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
        <span>Model</span>
      </button>

      {/* Paper Space Layout Tabs */}
      {layouts.map((ly) => (
        <button
          key={ly}
          onClick={() => {
            setActiveSpace(ly);
            setSheetOpen(true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setSheetSetOpen(true);
          }}
          className={`flex h-7 items-center gap-1.5 px-3 font-mono text-[11px] font-semibold transition-colors ${
            activeSpace === ly
              ? "border-t-2 border-blue-600 dark:border-cyan-400 bg-white dark:bg-[#252732] text-blue-700 dark:text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
          title="Right-click for Page Setup Manager"
        >
          <LayoutTemplate className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span>{ly}</span>
        </button>
      ))}

      {/* Add New Layout Tab */}
      <button
        onClick={addLayout}
        className="flex h-7 w-7 items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
        title="Create New Layout Tab"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
