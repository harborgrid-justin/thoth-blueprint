import * as React from "react";
import { Search, X } from "lucide-react";
import { isPointElement, type ElementKind, type PlanElement } from "@thoth/domain";
import { useFindStore } from "@/store/findStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { elementMatches } from "@/lib/search";
import { elementMeta } from "@/lib/elementMeta";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RESULT_CAP = 200;

/** Human label for a search result row. */
function elementLabel(el: PlanElement): string {
  if (isPointElement(el)) {
    if (el.kind === "note") {return el.text || "Note";}
    if (el.kind === "tree") {return el.species || "Tree";}
    return el.label || "Spot elevation";
  }
  return el.name;
}

/**
 * The Find & Filter panel (`FE-FIND-001…003`): search elements by name, type,
 * land use, or attribute; select matches; and optionally isolate them on the
 * canvas. A floating overlay so the plan stays visible while filtering.
 */
export function FindPanel() {
  const open = useFindStore((s) => s.open);
  const query = useFindStore((s) => s.query);
  const kind = useFindStore((s) => s.kind);
  const filterOnCanvas = useFindStore((s) => s.filterOnCanvas);
  const setQuery = useFindStore((s) => s.setQuery);
  const setKind = useFindStore((s) => s.setKind);
  const setFilterOnCanvas = useFindStore((s) => s.setFilterOnCanvas);
  const close = useFindStore((s) => s.close);

  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);
  const select = useWorkspaceStore((s) => s.select);
  const selectMany = useWorkspaceStore((s) => s.selectMany);
  const requestFitSelection = useCanvasStore((s) => s.requestFitSelection);

  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (open) {inputRef.current?.focus();}
  }, [open]);

  const matches = React.useMemo(
    () => (site ? site.elements.filter((el) => elementMatches(el, query, kind)) : []),
    [site, query, kind],
  );

  // Kinds actually present in the plan, for the type filter.
  const presentKinds = React.useMemo(() => {
    const set = new Set<ElementKind>();
    site?.elements.forEach((e) => set.add(e.kind));
    return [...set];
  }, [site]);

  if (!open || !site) {return null;}

  const selectedSet = new Set(selection);

  function selectAllMatches() {
    selectMany(matches.map((m) => m.id));
    requestFitSelection();
  }

  function pick(el: PlanElement) {
    select(el.id);
    requestFitSelection();
  }

  return (
    <div className="absolute right-4 top-3 z-30 flex w-72 flex-col rounded-lg border border-border bg-card/95 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          placeholder="Find by name, type, use…"
          className="h-7 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
        />
        <button
          type="button"
          aria-label="Close find"
          onClick={close}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-2.5 py-2">
        <Select value={kind} onValueChange={(v) => setKind(v as ElementKind | "all")}>
          <SelectTrigger className="h-7 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {presentKinds.map((k) => (
              <SelectItem key={k} value={k}>
                {elementMeta(k).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {matches.length} found
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto px-1.5 pb-1.5">
        {matches.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No matching elements.</p>
        ) : (
          matches.slice(0, RESULT_CAP).map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => pick(el)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                selectedSet.has(el.id) && "bg-accent",
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: elementMeta(el.kind).fill }}
              />
              <span className="flex-1 truncate text-foreground">{elementLabel(el)}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                {el.kind}
              </span>
            </button>
          ))
        )}
        {matches.length > RESULT_CAP && (
          <p className="px-2 py-1 text-center text-[11px] text-muted-foreground">
            Showing first {RESULT_CAP} of {matches.length}.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-2">
        <div className="flex items-center gap-2">
          <Switch id="filter-canvas" checked={filterOnCanvas} onCheckedChange={setFilterOnCanvas} />
          <Label htmlFor="filter-canvas" className="text-xs text-muted-foreground">
            Filter canvas
          </Label>
        </div>
        <button
          type="button"
          onClick={selectAllMatches}
          disabled={matches.length === 0}
          className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          Select all
        </button>
      </div>
    </div>
  );
}
