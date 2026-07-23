import { Camera, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNamedViewsState } from "./hooks/useNamedViewsState";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

export function NamedViewsMenu() {
  const { namedViews, setViewport, handleSave, handleDelete } =
    useNamedViewsState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-slate-300 hover:text-white">
          <Camera className="h-4 w-4 text-cyan-400" />
          <span className="hidden md:inline">Views</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={WORKSPACE_STYLES.dropdownContent + " w-56"}>
        <DropdownMenuLabel className={WORKSPACE_STYLES.dropdownLabel}>Named Viewports</DropdownMenuLabel>
        <DropdownMenuSeparator className={WORKSPACE_STYLES.dropdownSeparator} />

        {namedViews.length === 0 ? (
          <div className={WORKSPACE_STYLES.textMuted + " px-2 py-1.5 text-xs"}>
            No saved views
          </div>
        ) : (
          namedViews.map((view) => (
            <DropdownMenuItem
              key={view.name}
              className={WORKSPACE_STYLES.dropdownItem + " justify-between group"}
              onClick={() => setViewport(view.viewport)}
            >
              <span className="truncate">{view.name}</span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, view.name)}
                className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-400"
                aria-label={`Delete ${view.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator className={WORKSPACE_STYLES.dropdownSeparator} />
        <DropdownMenuItem onClick={handleSave} className={WORKSPACE_STYLES.dropdownItem + " text-cyan-400 font-medium"}>
          <Plus className="h-3.5 w-3.5" />
          <span>Save Current View</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
