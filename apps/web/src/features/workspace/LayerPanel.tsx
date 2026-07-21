import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLayerPanelState } from "./hooks/useLayerPanelState";

/** The layer manager: visibility, lock, order, naming, and the active layer. */
export function LayerPanel() {
  const {
    site,
    layers,
    counts,
    evaluatedGroups,
    activeLayerId,
    setActiveLayer,
    updateLayer,
    removeLayer,
    reorderLayer,
    handleAddLayer,
    editingId,
    setEditingId,
  } = useLayerPanelState();

  if (!site) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Layers
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleAddLayer}
          aria-label="Add layer"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-0.5 px-2">
        {layers.map((layer, i) => {
          const active = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={cn(
                "group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                active ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: layer.color ?? "#64748b" }}
              />
              {editingId === layer.id ? (
                <Input
                  autoFocus
                  defaultValue={layer.name}
                  className="h-6 flex-1 px-1 py-0 text-sm"
                  onBlur={(e) => {
                    updateLayer(layer.id, {
                      name: e.target.value || layer.name,
                    });
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="flex-1 truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(layer.id);
                  }}
                >
                  {layer.name}
                </span>
              )}
              <span className="text-xs tabular-nums text-muted-foreground">
                {counts.get(layer.id) ?? 0}
              </span>
              <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                <IconButton
                  label="Move up"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderLayer(layer.id, "up");
                  }}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={i === layers.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    reorderLayer(layer.id, "down");
                  }}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  label="Delete layer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              <IconButton
                label={layer.locked ? "Unlock" : "Lock"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { locked: !layer.locked });
                }}
              >
                {layer.locked ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Unlock className="h-3.5 w-3.5 opacity-40" />
                )}
              </IconButton>
              <IconButton
                label={layer.visible ? "Hide" : "Show"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layer.id, { visible: !layer.visible });
                }}
              >
                {layer.visible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 opacity-40" />
                )}
              </IconButton>
            </div>
          );
        })}
      </div>

      <div className="my-2 border-t border-border" />

      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          COGO Point Groups
        </h3>
      </div>
      <div className="flex flex-col gap-1 px-2 pb-4">
        {evaluatedGroups.map((group) => (
          <div
            key={group.id}
            className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-accent/40"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-mono">
                [{group.query}]
              </span>
              <span className="font-medium text-foreground text-xs">
                {group.name}
              </span>
            </div>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-mono">
              {group.matchedIds.length}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-25"
    >
      {children}
    </button>
  );
}
