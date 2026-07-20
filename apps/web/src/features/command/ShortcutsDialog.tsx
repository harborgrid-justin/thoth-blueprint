import { useUiStore } from "@/store/uiStore";
import { TOOLS } from "@/lib/tools";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shortcut {
  keys: string;
  label: string;
}

const EDITING: Shortcut[] = [
  { keys: "⌘Z", label: "Undo" },
  { keys: "⌘⇧Z", label: "Redo" },
  { keys: "⌘C", label: "Copy" },
  { keys: "⌘X", label: "Cut" },
  { keys: "⌘V", label: "Paste" },
  { keys: "⌘D", label: "Duplicate" },
  { keys: "⌘A", label: "Select all" },
  { keys: "Del / ⌫", label: "Delete selection" },
];

const NAVIGATION: Shortcut[] = [
  { keys: "⌘K", label: "Command palette" },
  { keys: "⌘F", label: "Find & filter" },
  { keys: "⌘S", label: "Save" },
  { keys: "1", label: "Fit plan to view" },
  { keys: "2", label: "Zoom to selection" },
  { keys: "?", label: "This shortcut reference" },
];

const DRAWING: Shortcut[] = [
  { keys: "Click", label: "Add a vertex" },
  { keys: "Enter", label: "Finish shape" },
  { keys: "Esc", label: "Cancel drawing" },
  { keys: "⌫", label: "Remove last point" },
  { keys: "Dbl-click edge", label: "Insert a vertex" },
  { keys: "Alt-click vertex", label: "Delete a vertex" },
];

/** A discoverable reference of keyboard shortcuts (`FE-CMD-004`). */
export function ShortcutsDialog() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  const tools: Shortcut[] = TOOLS.map((t) => ({ keys: t.shortcut, label: `${t.label} tool` }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Every frequent action has a shortcut. Press ⌘K for the full command palette.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Section title="Editing" items={EDITING} />
          <Section title="View &amp; navigation" items={NAVIGATION} />
          <Section title="Drawing" items={DRAWING} />
          <Section title="Tools" items={tools} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, items }: { title: string; items: Shortcut[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <ul className="flex flex-col gap-1">
        {items.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground">{s.label}</span>
            <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {s.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}
