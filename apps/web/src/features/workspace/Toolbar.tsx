import { Redo2, Undo2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

/** The vertical drawing toolbar down the left edge of the workspace. */
export function Toolbar() {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const canUndo = useWorkspaceStore((s) => s.history.past.length > 0);
  const canRedo = useWorkspaceStore((s) => s.history.future.length > 0);

  return (
    <div className="flex w-12 flex-col items-center gap-1 border-r border-border bg-card py-2">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const active = tool.id === activeTool;
        return (
          <Tooltip key={tool.id} delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setTool(tool.id)}
                aria-pressed={active}
                aria-label={tool.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {tool.label} <span className="ml-1 opacity-60">{tool.shortcut}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}

      <Separator className="my-1 w-6" />

      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-[18px] w-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Undo ⌘Z</TooltipContent>
      </Tooltip>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <Redo2 className="h-[18px] w-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Redo ⌘⇧Z</TooltipContent>
      </Tooltip>
    </div>
  );
}
