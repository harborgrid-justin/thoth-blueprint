import * as React from "react";
import { Search } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildCommands, type Command, type CommandActions } from "./commands";

/**
 * The command palette (`FE-CMD-002`): a searchable list of every workspace
 * command, invocable by keyboard. Opened with ⌘K / Ctrl-K.
 */
export function CommandPalette({ actions }: { actions: CommandActions }) {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const [query, setQuery] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const commands = React.useMemo(() => buildCommands(actions), [actions]);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {return commands;}
    return commands.filter((c) =>
      `${c.title} ${c.group} ${c.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset state each time the palette opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    setIndex(0);
  }, [query]);

  // Keep the highlighted row scrolled into view.
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function run(cmd: Command | undefined) {
    if (!cmd) {return;}
    setOpen(false);
    // Defer so the dialog's focus teardown doesn't swallow tool-driven focus.
    requestAnimationFrame(() => cmd.run());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[index]);
    }
  }

  let flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div ref={listRef} className="max-h-[min(60vh,24rem)] overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching commands.</p>
          ) : (
            groupOrder
              .map((group) => ({ group, items: results.filter((c) => c.group === group) }))
              .filter((g) => g.items.length > 0)
              .map(({ group, items }) => (
                <div key={group} className="mb-1">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group}
                  </div>
                  {items.map((cmd) => {
                    flatIndex += 1;
                    const i = flatIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        data-idx={i}
                        onMouseMove={() => setIndex(i)}
                        onClick={() => run(cmd)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          i === index ? "bg-accent text-accent-foreground" : "text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{cmd.title}</span>
                        {cmd.shortcut && (
                          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const groupOrder: Command["group"][] = ["Tools", "Edit", "View", "Project", "Help"];
