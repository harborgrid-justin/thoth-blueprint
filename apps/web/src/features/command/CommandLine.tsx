import * as React from "react";
import { Command } from "lucide-react";
import { COMMAND_STYLES } from "./styles/commandDesignSystem";

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
    if (!trimmed) {return;}
    setInput("");
  };

  return (
    <div className={COMMAND_STYLES.cliContainer}>
      <div className={COMMAND_STYLES.cliHeader}>
        <Command className="h-4 w-4 text-muted-foreground" />
        <span className={COMMAND_STYLES.cliTitle}>
          Command Line
        </span>
      </div>
      <div className={COMMAND_STYLES.cliInputWrapper}>
        <span className={COMMAND_STYLES.cliPrompt}>Command:</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCommand(input);
            }
          }}
          className={COMMAND_STYLES.cliInput}
          placeholder="e.g. L (Line), PL (Polyline), M (Move)"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
