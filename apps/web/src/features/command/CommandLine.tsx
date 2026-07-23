import * as React from "react";
import { ChevronUp, ChevronDown, Terminal } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import type { ToolId } from "@/lib/tools";

const AUTOCAD_COMMAND_MAP: Record<string, { label: string; action: () => void }> = {
  l: { label: "LINE - Create straight line segments", action: () => {} },
  line: { label: "LINE - Create straight line segments", action: () => {} },
  pl: { label: "PLINE - Create 2D polyline", action: () => {} },
  pline: { label: "PLINE - Create 2D polyline", action: () => {} },
  c: { label: "CIRCLE - Create a circle", action: () => {} },
  circle: { label: "CIRCLE - Create a circle", action: () => {} },
  rec: { label: "RECTANG - Create rectangular polyline", action: () => {} },
  rectang: { label: "RECTANG - Create rectangular polyline", action: () => {} },
  m: { label: "MOVE - Move selected objects", action: () => {} },
  move: { label: "MOVE - Move selected objects", action: () => {} },
  co: { label: "COPY - Copy selected objects", action: () => {} },
  copy: { label: "COPY - Copy selected objects", action: () => {} },
  ro: { label: "ROTATE - Rotate objects around base point", action: () => {} },
  rotate: { label: "ROTATE - Rotate objects around base point", action: () => {} },
  tr: { label: "TRIM - Trim objects to meet edges", action: () => {} },
  trim: { label: "TRIM - Trim objects to meet edges", action: () => {} },
  dim: { label: "DIMENSION - Create linear/aligned dimension", action: () => {} },
  dimension: { label: "DIMENSION - Create linear/aligned dimension", action: () => {} },
  la: { label: "LAYER - Open layer properties manager", action: () => {} },
  layer: { label: "LAYER - Open layer properties manager", action: () => {} },
};

export function CommandLine() {
  const [input, setInput] = React.useState("");
  const [history, setHistory] = React.useState<string[]>([
    "AutoCAD Civil 3D 2026 High-Performance CAD Engine Active.",
    "Type a command or alias and press ENTER. Press F2 for expanded history window.",
  ]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const historyEndRef = React.useRef<HTMLDivElement>(null);

  const setTool = useWorkspaceStore((s) => s.setTool);
  const { setPrefsOpen, setSubdivisionStudioOpen, setRoadStudioOpen } = useUiStore();

  // Scroll history log on update
  React.useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // Global key listener for auto-focusing command line on keypress
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      
      if (e.key === "Escape") {
        setInput("");
        inputRef.current?.blur();
        setHistory((prev) => [...prev, "Command: *Cancel*"]);
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim().toLowerCase();
    if (!trimmed) {
      setHistory((prev) => [...prev, "Command:"]);
      return;
    }

    setHistory((prev) => [...prev, `Command: ${cmdStr.toUpperCase()}`]);

    // Map common AutoCAD aliases
    if (trimmed === "l" || trimmed === "line") {
      setTool("line" as ToolId);
      setHistory((prev) => [...prev, "LINE Specify first point:"]);
    } else if (trimmed === "pl" || trimmed === "polyline") {
      setTool("polyline" as ToolId);
      setHistory((prev) => [...prev, "PLINE Specify start point:"]);
    } else if (trimmed === "c" || trimmed === "circle") {
      setTool("circle" as ToolId);
      setHistory((prev) => [...prev, "CIRCLE Specify center point:"]);
    } else if (trimmed === "rec" || trimmed === "rectangle") {
      setTool("rectangle" as ToolId);
      setHistory((prev) => [...prev, "RECTANG Specify first corner point:"]);
    } else if (trimmed === "m" || trimmed === "move") {
      setTool("move" as ToolId);
      setHistory((prev) => [...prev, "MOVE Select objects:"]);
    } else if (trimmed === "co" || trimmed === "copy") {
      setTool("copy" as ToolId);
      setHistory((prev) => [...prev, "COPY Select objects:"]);
    } else if (trimmed === "tr" || trimmed === "trim") {
      setTool("trim" as ToolId);
      setHistory((prev) => [...prev, "TRIM Select cutting edges:"]);
    } else if (trimmed === "dim" || trimmed === "dimension") {
      setTool("dimension" as ToolId);
      setHistory((prev) => [...prev, "DIMENSION Specify extension line origin:"]);
    } else if (trimmed === "la" || trimmed === "layer") {
      setPrefsOpen(true);
      setHistory((prev) => [...prev, "LAYER Manager Palette opened."]);
    } else if (trimmed === "parcel" || trimmed === "subdivision") {
      setSubdivisionStudioOpen(true);
      setHistory((prev) => [...prev, "SUBDIVISION Studio launched."]);
    } else if (trimmed === "road" || trimmed === "corridor") {
      setRoadStudioOpen(true);
      setHistory((prev) => [...prev, "ROAD Design Studio launched."]);
    } else {
      setHistory((prev) => [...prev, `Unknown command "${cmdStr.toUpperCase()}". Press F1 or type HELP.`]);
    }

    setInput("");
  };

  // Filter command suggestions
  const suggestions = React.useMemo(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {return [];}
    return Object.entries(AUTOCAD_COMMAND_MAP).filter(([key]) =>
      key.startsWith(trimmed),
    );
  }, [input]);

  return (
    <div className="pointer-events-auto absolute bottom-8 left-4 right-4 z-20 mx-auto flex max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700/80 bg-white/95 dark:bg-[#16171d]/95 text-slate-800 dark:text-slate-200 shadow-2xl backdrop-blur-md">
      {/* Expanded Command History Log */}
      <div
        className={`flex flex-col gap-1 overflow-y-auto border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#101115] px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 transition-all duration-200 ${
          isExpanded ? "h-40 py-2" : "h-14 py-1"
        }`}
      >
        {history.map((line, idx) => (
          <div key={idx} className="leading-tight text-slate-800 dark:text-slate-300">
            {line.startsWith("Command:") ? (
              <span className="font-bold text-blue-700 dark:text-cyan-400">{line}</span>
            ) : (
              <span className="text-slate-600 dark:text-slate-400">{line}</span>
            )}
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Command Suggestions Popup */}
      {suggestions.length > 0 && (
        <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e1e24] px-3 py-1 font-mono text-xs text-blue-700 dark:text-cyan-300">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Command Suggestions:</div>
          {suggestions.slice(0, 3).map(([key, item]) => (
            <button
              key={key}
              onClick={() => handleCommand(key)}
              className="text-left py-0.5 hover:text-blue-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 px-1 rounded transition-colors"
            >
              <span className="font-bold text-blue-700 dark:text-cyan-400 mr-2">{key.toUpperCase()}</span>
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Docked Command Prompt Bar */}
      <div className="flex h-8 items-center gap-2 bg-white dark:bg-[#1b1c22] px-3 font-mono text-xs">
        <Terminal className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400 shrink-0" />
        <span className="font-bold text-blue-700 dark:text-cyan-400 select-none">Command:</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCommand(input);
            }
          }}
          className="flex-1 bg-transparent font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          placeholder="Type command or alias (e.g. L, PL, C, M, CO, ROTATE, TRIM)..."
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
          title="Toggle Expanded Command History (F2)"
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
