import * as React from "react";
import { Search, X } from "lucide-react";
import {
  isPointElement,
  type ElementKind,
  type PlanElement,
} from "@thoth/domain";
import { useFindStore } from "@/store/findStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { elementMatches } from "@/lib/search";
import { elementMeta } from "@/lib/elementMeta";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/lib/hooks";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIND_STYLES } from "./styles/findDesignSystem";

const RESULT_CAP = 200;

/** Human label for a search result row. */
function elementLabel(el: PlanElement): string {
  if (isPointElement(el)) {
    if (el.kind === "note") {
      return el.text || "Note";
    }
    if (el.kind === "tree") {
      return el.species || "Tree";
    }
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
  const hoveredElementId = useWorkspaceStore((s) => s.hoveredElementId);
  const select = useWorkspaceStore((s) => s.select);
  const selectMany = useWorkspaceStore((s) => s.selectMany);
  const requestFitSelection = useCanvasStore((s) => s.requestFitSelection);

  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const debouncedQuery = useDebounce(query, 200);

  const matches = React.useMemo(
    () =>
      site
        ? site.elements.filter((el) => elementMatches(el, debouncedQuery, kind))
        : [],
    [site, debouncedQuery, kind],
  );

  // Kinds actually present in the plan, for the type filter.
  const presentKinds = React.useMemo(() => {
    const set = new Set<ElementKind>();
    site?.elements.forEach((e) => set.add(e.kind));
    return [...set];
  }, [site]);

  if (!open || !site) {
    return null;
  }

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
    <div className={FIND_STYLES.panel}>
      <div className={FIND_STYLES.header}>
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && close()}
          placeholder="Find by name, type, use…"
          className={FIND_STYLES.input}
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

      <div className={FIND_STYLES.toolbar}>
        <Select
          value={kind}
          onValueChange={(v) => setKind(v as ElementKind | "all")}
        >
          <SelectTrigger className={FIND_STYLES.selectTrigger}>
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
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {matches.length} found
        </span>
      </div>

      <div className={FIND_STYLES.list}>
        {matches.length === 0 ? (
          <p className={FIND_STYLES.emptyText}>
            No matching elements.
          </p>
        ) : (
          matches.slice(0, RESULT_CAP).map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => pick(el)}
              onMouseEnter={() =>
                useWorkspaceStore.getState().hoverElement(el.id)
              }
              onMouseLeave={() => {
                if (useWorkspaceStore.getState().hoveredElementId === el.id) {
                  useWorkspaceStore.getState().hoverElement(null);
                }
              }}
              className={cn(
                FIND_STYLES.listItem,
                (selectedSet.has(el.id) || hoveredElementId === el.id) &&
                  FIND_STYLES.listItemActive,
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: elementMeta(el.kind).fill }}
              />
              <span className="flex-1 truncate text-foreground">
                {elementLabel(el)}
              </span>
              <span className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
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

      <div className={FIND_STYLES.footer}>
        <div className="flex items-center gap-2">
          <Switch
            id="filter-canvas"
            checked={filterOnCanvas}
            onCheckedChange={setFilterOnCanvas}
          />
          <Label
            htmlFor="filter-canvas"
            className="text-xs text-muted-foreground"
          >
            Filter canvas
          </Label>
        </div>
        <button
          type="button"
          onClick={selectAllMatches}
          disabled={matches.length === 0}
          className={FIND_STYLES.btnSelectAll}
        >
          Select all
        </button>
      </div>
    </div>
  );
}
