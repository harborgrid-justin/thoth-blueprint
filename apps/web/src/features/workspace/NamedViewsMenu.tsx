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

export function NamedViewsMenu() {
  const { namedViews, setViewport, handleSave, handleDelete } =
    useNamedViewsState();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Camera className="h-4 w-4" />
          <span className="hidden md:inline">Views</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Named Viewports</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {namedViews.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            No saved views
          </div>
        ) : (
          namedViews.map((view) => (
            <DropdownMenuItem
              key={view.name}
              className="flex items-center justify-between group"
              onClick={() => setViewport(view.viewport)}
            >
              <span className="truncate">{view.name}</span>
              <button
                type="button"
                onClick={(e) => handleDelete(e, view.name)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive p-1 rounded transition-opacity"
                aria-label={`Delete ${view.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSave} className="gap-1.5 text-primary">
          <Plus className="h-3.5 w-3.5" />
          <span>Save Current View</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
