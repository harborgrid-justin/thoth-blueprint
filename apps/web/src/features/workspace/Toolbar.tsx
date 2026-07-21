import * as React from "react";
import { Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToolbarState } from "./hooks/useToolbarState";
import { isGroupStart } from "./helpers/toolbarHelpers";

/** The vertical drawing toolbar down the left edge of the workspace. */
export function Toolbar() {
  const { tools, activeTool, setTool, undo, redo, canUndo, canRedo } =
    useToolbarState();

  return (
    <div className="flex w-12 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-card py-2 no-scrollbar">
      {tools.map((tool, i) => {
        const Icon = tool.icon;
        const active = tool.id === activeTool;
        const newGroup = isGroupStart(i, tools);
        return (
          <React.Fragment key={tool.id}>
            {newGroup && <Separator className="my-0.5 w-6" />}
            <Tooltip delayDuration={300}>
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
                {tool.label}{" "}
                <span className="ml-1 opacity-60">{tool.shortcut}</span>
              </TooltipContent>
            </Tooltip>
          </React.Fragment>
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
