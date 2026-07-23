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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLayerPanelState } from "./hooks/useLayerPanelState";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

const ACI_COLORS = [
  "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffffff", "#808080", "#c0c0c0",
  "#ff7f7f", "#ffff7f", "#7fff7f", "#7fffff", "#7f7fff", "#ff7fff", "#ff0000", "#ff3f00", "#ff7f00",
  "#ffbf00", "#ffff00", "#bfff00", "#7fff00", "#3fff00", "#00ff00", "#00ff3f", "#00ff7f", "#00ffbf",
  "#00ffff", "#00bfff", "#007fff", "#003fff", "#0000ff", "#3f00ff", "#7f00ff", "#bf00ff", "#ff00ff"
];

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
      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <h3 className={WORKSPACE_STYLES.textSectionTitle}>
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
                "group flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs transition-colors",
                active ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-accent/60",
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-3 w-3 shrink-0 cursor-pointer rounded-sm border border-black/20"
                    style={{ backgroundColor: layer.color ?? "#64748b" }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="grid w-[148px] grid-cols-6 gap-0.5 border-neutral-800 bg-neutral-900 p-1">
                  {ACI_COLORS.map(c => (
                    <DropdownMenuItem 
                      key={c}
                      className="h-5 w-5 cursor-pointer rounded-none p-0"
                      style={{ backgroundColor: c }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateLayer(layer.id, { color: c });
                      }}
                    />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {editingId === layer.id ? (
                <Input
                  autoFocus
                  defaultValue={layer.name}
                  className="h-6 flex-1 px-1 py-0 font-cad text-xs"
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
              <span className="text-xs text-muted-foreground tabular-nums">
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

      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <h3 className={WORKSPACE_STYLES.textSectionTitle}>
          COGO Point Groups
        </h3>
      </div>
      <div className="flex flex-col gap-1 px-2 pb-4">
        {evaluatedGroups.map((group) => (
          <div
            key={group.id}
            className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-muted-foreground">
                [{group.query}]
              </span>
              <span className="text-xs font-medium text-foreground">
                {group.name}
              </span>
            </div>
            <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-xs font-semibold text-accent-foreground">
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
