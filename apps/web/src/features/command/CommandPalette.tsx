import * as React from "react";
import { Search } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildCommands, type Command, type CommandActions } from "./commands";
import { COMMAND_STYLES } from "./styles/commandDesignSystem";

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
    if (!q) {
      return commands;
    }
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
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${index}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [index]);

  function run(cmd: Command | undefined) {
    if (!cmd) {
      return;
    }
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
      setIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[index]);
    }
  }

  let flatIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={COMMAND_STYLES.paletteDialog}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className={COMMAND_STYLES.paletteInputWrapper}>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search commands…"
            className={COMMAND_STYLES.paletteInput}
          />
        </div>
        <div
          ref={listRef}
          className={COMMAND_STYLES.paletteList}
        >
          {results.length === 0 ? (
            <p className={COMMAND_STYLES.paletteEmpty}>
              No matching commands.
            </p>
          ) : (
            groupOrder
              .map((group) => ({
                group,
                items: results.filter((c) => c.group === group),
              }))
              .filter((g) => g.items.length > 0)
              .map(({ group, items }) => (
                <div key={group} className="mb-1">
                  <div className={COMMAND_STYLES.paletteGroupTitle}>
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
                          COMMAND_STYLES.paletteItem,
                          i === index
                            ? COMMAND_STYLES.paletteItemActive
                            : COMMAND_STYLES.paletteItemInactive,
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">{cmd.title}</span>
                        {cmd.shortcut && (
                          <kbd className={COMMAND_STYLES.paletteShortcut}>
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

const groupOrder: Command["group"][] = [
  "Tools",
  "Edit",
  "View",
  "Project",
  "Help",
];
