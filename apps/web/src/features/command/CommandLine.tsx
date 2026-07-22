import * as React from "react";
import { Command } from "lucide-react";

export function CommandLine() {
  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus on typing
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't steal focus if user is already typing in an input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      
      if (e.key === "Escape") {
        setInput("");
        inputRef.current?.blur();
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;
    setInput("");
  };

  return (
    <div className="pointer-events-auto absolute bottom-0 left-1/2 z-30 flex w-[600px] max-w-[90vw] -translate-x-1/2 flex-col rounded-t-lg border-t border-x border-border/60 bg-background/95 shadow-[0_-8px_30px_rgb(0,0,0,0.3)] backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40">
        <Command className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Command Line
        </span>
      </div>
      <div className="flex items-center px-3 py-2">
        <span className="mr-2 font-cad text-sm font-bold text-primary">Command:</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCommand(input);
            }
          }}
          className="flex-1 bg-transparent font-cad text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          placeholder="e.g. L (Line), PL (Polyline), M (Move)"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
