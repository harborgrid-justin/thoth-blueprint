import * as React from "react";
import { Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useToolbarState } from "./hooks/useToolbarState";
import { isGroupStart } from "./helpers/toolbarHelpers";
import { useUiStore } from "@/store/uiStore";

import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

/** The vertical drawing toolbar down the left edge of the workspace. */
export function Toolbar() {
  const { tools, activeTool, setTool, undo, redo, canUndo, canRedo } =
    useToolbarState();

  return (
    <div className={WORKSPACE_STYLES.toolbar}>
      {tools.map((tool, i) => {
        const Icon = tool.icon;
        const active = tool.id === activeTool;
        const newGroup = isGroupStart(i, tools);
        return (
          <React.Fragment key={tool.id}>
            {newGroup && <Separator className="my-0.5 w-6" />}
            <DropdownMenu>
              <Tooltip delayDuration={300}>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setTool(tool.id)}
                      onContextMenu={(e) => {
                        // right click triggers dropdown
                        if (!['parcel', 'region', 'road'].includes(tool.id as string)) {
                          e.preventDefault();
                        }
                      }}
                      aria-pressed={active}
                      aria-label={tool.label}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 relative group",
                        active
                          ? "bg-gradient-to-br from-primary to-blue-600 text-white shadow-md shadow-primary/20 scale-105"
                          : "text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground hover:scale-110 active:scale-95",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {['parcel', 'region', 'road'].includes(tool.id as string) && (
                        <div className="absolute bottom-[2px] right-[2px] w-0 h-0 border-l-[3px] border-l-transparent border-b-[3px] border-b-current opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <TooltipContent side="right" className="p-0 border-none bg-transparent">
                  <div className="flex flex-col bg-popover text-popover-foreground border border-border rounded-md shadow-md overflow-hidden max-w-xs">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-border/50 gap-3">
                      <span className="font-semibold">{tool.label}</span>
                      {tool.shortcut && (
                        <kbd className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
                          {tool.shortcut}
                        </kbd>
                      )}
                    </div>
                    {/* Rich Diagram for complex engineering tools */}
                    {['road', 'alignment', 'grade'].includes(tool.id as string) && (
                      <div className="p-2 bg-muted/30 border-b border-border/50 flex justify-center">
                        {tool.id === 'road' && (
                          <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-80">
                            <path d="M10,30 Q60,0 110,30" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" />
                            <path d="M10,30 Q60,0 110,30" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
                          </svg>
                        )}
                        {tool.id === 'alignment' && (
                          <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-80">
                            <path d="M10,50 L50,10 L110,30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
                            <circle cx="50" cy="10" r="4" fill="red" />
                            <circle cx="10" cy="50" r="3" fill="blue" />
                            <circle cx="110" cy="30" r="3" fill="blue" />
                          </svg>
                        )}
                        {tool.id === 'grade' && (
                          <svg width="120" height="60" viewBox="0 0 120 60" className="opacity-80">
                            <line x1="10" y1="40" x2="60" y2="20" stroke="hsl(var(--primary))" strokeWidth="3" />
                            <line x1="60" y1="20" x2="110" y2="40" stroke="hsl(var(--primary))" strokeWidth="3" />
                            <line x1="60" y1="10" x2="60" y2="50" stroke="white" strokeWidth="1" strokeDasharray="2 2" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {tool.id === 'road' && "Create a dynamic corridor with automatic intersections."}
                      {tool.id === 'alignment' && "Define a geometric baseline for stations and profiles."}
                      {tool.id === 'grade' && "Calculate slope transitions and grading limits."}
                      {!['road', 'alignment', 'grade'].includes(tool.id as string) && `Use the ${tool.label} tool to draft geometry.`}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
              {['parcel', 'region', 'road', 'alignment', 'grade', 'spot'].includes(tool.id as string) && (
                <DropdownMenuContent side="right" align="start" className={WORKSPACE_STYLES.dropdownContent + " w-52 ml-2"}>
                  {tool.id === 'parcel' && (
                    <>
                      <DropdownMenuItem onClick={() => setTool('parcel')}>Parcel Boundary</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTool('lot')}>Lot Split</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTool('easement')}>Easement Area</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setParcelLayoutOpen(true)}>
                        Slide-Line Layout (REQ-023)
                      </DropdownMenuItem>
                    </>
                  )}
                  {tool.id === 'region' && (
                    <>
                      <DropdownMenuItem onClick={() => setTool('region')}>Boundary Polygon</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTool('zone')}>Zoning Region</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTool('building')}>Building Footprint</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setModelBuilderOpen(true)}>
                        Model Builder GIS (REQ-161)
                      </DropdownMenuItem>
                    </>
                  )}
                  {tool.id === 'road' && (
                    <>
                      <DropdownMenuItem onClick={() => setTool('road')}>Road Corridor</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTool('utility')}>Utility Line</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTool('alignment')}>Station Alignment</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setRoadStudioOpen(true)}>
                        Road Design Studio (REQ-010)
                      </DropdownMenuItem>
                    </>
                  )}
                  {tool.id === 'alignment' && (
                    <>
                      <DropdownMenuItem onClick={() => setTool('alignment')}>Station Alignment</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setAlignmentOpen(true)}>
                        Alignment Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setLineworkOpen(true)}>
                        Advanced Linework & Curves
                      </DropdownMenuItem>
                    </>
                  )}
                  {tool.id === 'grade' && (
                    <>
                      <DropdownMenuItem onClick={() => setTool('grade')}>Grading Region</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setGradingOpen(true)}>
                        Zero-Volume Solver
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setPanoramaOpen(true)}>
                        Panorama Elevation Editor
                      </DropdownMenuItem>
                    </>
                  )}
                  {tool.id === 'spot' && (
                    <>
                      <DropdownMenuItem onClick={() => setTool('spot')}>Spot Elevation Point</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => useUiStore.getState().setSectionGridOpen(true)}>
                        Section Plotting Grid & QTO
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              )}
            </DropdownMenu>
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:bg-transparent"
          >
            <Redo2 className="h-[18px] w-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Redo ⌘⇧Z</TooltipContent>
      </Tooltip>
    </div>
  );
}
