import * as React from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Cloud,
  Compass,
  Grid3x3,
  History,
  Loader2,
  Magnet,
  Maximize,
  Minus,
  Moon,
  Plus,
  ScrollText,
  Sun,
  Tag,
} from "lucide-react";
import type { Project } from "@/api";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useTheme } from "@/theme/theme-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PresenceBar } from "./PresenceBar";

interface TopBarProps {
  project: Project | null;
  saving: boolean;
  onSave: () => void;
  onOpenCheckpoints: () => void;
}

export function TopBar({ project, saving, onSave, onOpenCheckpoints }: TopBarProps) {
  const projectName = useWorkspaceStore((s) => s.projectName);
  const dirty = useWorkspaceStore((s) => s.dirty);
  const { theme, toggleTheme } = useTheme();

  const {
    viewport,
    zoomBy,
    requestFit,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    showSurveyLabels,
    toggleSurveyLabels,
  } = useCanvasStore();
  const openPlat = useUiStore((s) => s.openPlat);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-semibold hover:bg-accent"
      >
        <img src="/thoth.svg" alt="" className="h-6 w-6" />
        <span className="hidden sm:inline">Thoth Blueprint</span>
      </Link>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">{projectName}</span>
        <SaveStatus dirty={dirty} saving={saving} />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Zoom controls */}
        <div className="mr-1 flex items-center rounded-md border border-border">
          <IconBtn label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
            <Minus className="h-4 w-4" />
          </IconBtn>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <IconBtn label="Zoom in" onClick={() => zoomBy(1.2)}>
            <Plus className="h-4 w-4" />
          </IconBtn>
          <Separator orientation="vertical" className="h-5" />
          <IconBtn label="Fit to plan" onClick={requestFit}>
            <Maximize className="h-4 w-4" />
          </IconBtn>
        </div>

        <Toggle label="Grid" active={showGrid} onClick={toggleGrid}>
          <Grid3x3 className="h-4 w-4" />
        </Toggle>
        <Toggle label="Snap to grid" active={snapToGrid} onClick={toggleSnapToGrid}>
          <Magnet className="h-4 w-4" />
        </Toggle>
        <Toggle label="Bearing & distance labels" active={showSurveyLabels} onClick={toggleSurveyLabels}>
          <Compass className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button variant="ghost" size="sm" onClick={() => openPlat(null)}>
          <ScrollText className="h-4 w-4" /> <span className="hidden md:inline">Plat</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenCheckpoints}>
          <History className="h-4 w-4" /> <span className="hidden md:inline">Checkpoints</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onSave} disabled={saving || !dirty}>
          <Cloud className="h-4 w-4" /> Save
        </Button>

        {project && <PresenceBar members={project.members} />}

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle theme</TooltipContent>
        </Tooltip>

        <Button size="sm" className="hidden lg:flex">
          <Tag className="h-4 w-4" /> Share
        </Button>
      </div>
    </header>
  );
}

function SaveStatus({ dirty, saving }: { dirty: boolean; saving: boolean }) {
  if (saving) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (dirty) {
    return <span className="text-xs text-amber-500">Unsaved changes</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-500">
      <Check className="h-3 w-3" /> Saved
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Toggle({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
            active
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
