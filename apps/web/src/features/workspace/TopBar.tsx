import * as React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Check,
  Cloud,
  Command,
  Compass,
  Droplets,
  Grid3x3,
  History,
  LayoutTemplate,
  Files,
  Loader2,
  Magnet,
  Maximize,
  Minus,
  Moon,
  Plus,
  ScrollText,
  Search,
  Settings2,
  Spline,
  Square,
  Sun,
  Tag,
  SlidersHorizontal,
  HardHat,
  Mountain,
  Edit3,
  ChevronDown,
} from "lucide-react";
import type { Project } from "@/api";
import { usePrefsStore } from "@/store/prefsStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { PresenceBar } from "./PresenceBar";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";
import { ImportExportMenu } from "@/features/interop/ImportExportMenu";
import { NamedViewsMenu } from "./NamedViewsMenu";
import { JurisdictionSelector } from "./JurisdictionSelector";
import { useTopBarState } from "./hooks/useTopBarState";
import { zoomPercentage } from "./helpers/topBarHelpers";

interface TopBarProps {
  project: Project | null;
  saving: boolean;
  onSave: () => void;
  onOpenCheckpoints: () => void;
}

export function TopBar({
  project,
  saving,
  onSave,
  onOpenCheckpoints,
}: TopBarProps) {
  const {
    projectName,
    dirty,
    renovationMode,
    toggleRenovationMode,
    activeRenovationCategory,
    setActiveRenovationCategory,
    theme,
    toggleTheme,
    viewport,
    zoomBy,
    requestFit,
    showGrid,
    toggleGrid,
    snapToGrid,
    toggleSnapToGrid,
    showSurveyLabels,
    toggleSurveyLabels,
    viewMode,
    setViewMode,
    openPlat,
    setAlignmentOpen,
    setSheetOpen,
    setSheetSetOpen,
    toggleCommand,
    setPrefsOpen,
    setSuperelevationOpen,
    setCorridorOpen,
    setGradingOpen,
    setProfileOpen,
    setPipeOpen,
    setProductionOpen,
    setCogoOpen,
    handDrawnMode,
    toggleHandDrawnMode,
    openFind,
    setPanoramaOpen,
    setLineworkOpen,
    setParcelLayoutOpen,
    setSectionGridOpen,
    setScriptsOpen,
    setRoadStudioOpen,
    setAssemblyOpen,
    setSubdivisionStudioOpen,
    setGradingStudioOpen,
    setPipeStudioOpen,
    setModelBuilderStudioOpen,
    setSurveyCogoStudioOpen,
    workspaceLayout,
    toggleWorkspaceLayout,
  } = useTopBarState();

  return (
    <header className={`${WORKSPACE_STYLES.topbar} flex h-12 shrink-0 items-center gap-2 border-b-0 px-3`}>
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-semibold hover:bg-accent"
      >
        <img src="/thoth.svg" alt="" className="h-6 w-6" />
        <span className="hidden sm:inline">Thoth Blueprint</span>
      </Link>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-foreground">
          {projectName}
        </span>
        <SaveStatus dirty={dirty} saving={saving} />
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Dynamic Jurisdiction & GEOID Switcher */}
      <JurisdictionSelector />

      <div className="ml-auto flex items-center gap-1">
        {/* Renovation Mode Controls */}
        <div className="mr-2 flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-0.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-200 select-none">
            <input
              type="checkbox"
              checked={renovationMode}
              onChange={toggleRenovationMode}
              className="h-3.5 w-3.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            Renovation
          </label>
          {renovationMode && (
            <select
              value={activeRenovationCategory}
              onChange={(e) =>
                setActiveRenovationCategory(
                  e.target.value as "existing" | "new" | "demolished",
                )
              }
              className={WORKSPACE_STYLES.select + " ml-1 h-6 py-0 px-1.5 text-[11px]"}
            >
              <option value="existing">Existing</option>
              <option value="new">New</option>
              <option value="demolished">Demolition</option>
            </select>
          )}
        </div>

        {/* 2D / 3D view switch */}
        <div className={WORKSPACE_STYLES.pillBar}>
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            aria-pressed={viewMode === "2d"}
            className={cn(
              "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-all duration-200",
              viewMode === "2d"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill,
            )}
          >
            <Square className="h-3.5 w-3.5" /> 2D
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            aria-pressed={viewMode === "3d"}
            className={cn(
              "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-all duration-200",
              viewMode === "3d"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill,
            )}
          >
            <Box className="h-3.5 w-3.5" /> 3D
          </button>
        </div>

        {/* Zoom controls */}
        <div className="mr-1 flex items-center rounded-md border border-border">
          <IconBtn label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
            <Minus className="h-4 w-4" />
          </IconBtn>
          <span className="w-12 text-center text-xs text-muted-foreground tabular-nums">
            {zoomPercentage(viewport.zoom)}%
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
        <Toggle
          label="Snap to grid"
          active={snapToGrid}
          onClick={toggleSnapToGrid}
        >
          <Magnet className="h-4 w-4" />
        </Toggle>
        <Toggle
          label="Bearing & distance labels"
          active={showSurveyLabels}
          onClick={toggleSurveyLabels}
        >
          <Compass className="h-4 w-4" />
        </Toggle>
        <Toggle
          label="Hand-Drawn Surveyor Mode"
          active={handDrawnMode}
          onClick={toggleHandDrawnMode}
        >
          <Edit3 className="h-4 w-4 text-amber-500" />
        </Toggle>
        <Toggle
          label="High Contrast / Theme Toggle"
          active={usePrefsStore((s) => s.highContrast)}
          onClick={() => {
            usePrefsStore.getState().toggleHighContrast();
            if (typeof document !== "undefined") {
              document.documentElement.classList.toggle("contrast");
            }
          }}
        >
          {usePrefsStore((s) => s.highContrast) ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-blue-400" />
          )}
        </Toggle>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Civil Studio Workspace View Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleWorkspaceLayout}
          className="hidden gap-1 border-cyan-500/40 text-xs font-semibold text-cyan-400 hover:bg-cyan-950/40 xl:flex"
        >
          {workspaceLayout === "civil-studio" ? "Standard Layout" : "Civil 3D Ribbon"}
        </Button>

        <ImportExportMenu />
        <NamedViewsMenu />

        {/* Civil 3D Studio Suite Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 font-medium text-cyan-400 transition-colors hover:bg-cyan-950/30 md:flex">
              <HardHat className="h-4 w-4 text-cyan-400" /> Civil Suite <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-cyan-500/20 bg-background/90 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => setSubdivisionStudioOpen(true)}>
              <Grid3x3 className="mr-2 h-4 w-4 text-cyan-400" /> Subdivision Studio & Solvers
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoadStudioOpen(true)}>
              <Spline className="mr-2 h-4 w-4 text-blue-400" /> Road Design Studio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGradingStudioOpen(true)}>
              <Mountain className="mr-2 h-4 w-4 text-emerald-400" /> Grading & Earthwork Studio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPipeStudioOpen(true)}>
              <Droplets className="mr-2 h-4 w-4 text-blue-400" /> Pipe Network & Hydrology Studio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setModelBuilderStudioOpen(true)}>
              <Cloud className="mr-2 h-4 w-4 text-purple-400" /> GIS & Model Builder Studio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSurveyCogoStudioOpen(true)}>
              <Compass className="mr-2 h-4 w-4 text-amber-400" /> Survey & COGO Plat Studio
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLineworkOpen(true)}>
              <Compass className="mr-2 h-4 w-4 text-amber-400" /> Advanced Linework & Curves
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPanoramaOpen(true)}>
              <Mountain className="mr-2 h-4 w-4 text-emerald-400" /> Panorama Elevation Editor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setParcelLayoutOpen(true)}>
              <Square className="mr-2 h-4 w-4 text-cyan-400" /> Parcel Sizing & Layout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSectionGridOpen(true)}>
              <Grid3x3 className="mr-2 h-4 w-4 text-blue-400" /> Section Plotting Grid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setScriptsOpen(true)}>
              <Command className="mr-2 h-4 w-4 text-emerald-400" /> Scripts & 3D Objects
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdowns for condensed layout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 transition-colors hover:bg-white/10 md:flex">
              <HardHat className="h-4 w-4" /> Design <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-white/10 bg-background/80 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => setCogoOpen(true)}>
              <Compass className="mr-2 h-4 w-4" /> COGO Builder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAlignmentOpen(true)}>
              <Spline className="mr-2 h-4 w-4" /> Stationing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSuperelevationOpen(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" /> Superelevation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCorridorOpen(true)}>
              <HardHat className="mr-2 h-4 w-4" /> Corridor Designer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAssemblyOpen(true)}>
              <HardHat className="mr-2 h-4 w-4 text-blue-400" /> Assembly Builder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGradingOpen(true)}>
              <Mountain className="mr-2 h-4 w-4" /> Grading Pad Solver
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setParcelLayoutOpen(true)}>
              <Square className="mr-2 h-4 w-4 text-cyan-400" /> Parcel Slide-Line Sizing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 transition-colors hover:bg-white/10 lg:flex">
              <Search className="h-4 w-4" /> Analysis <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-white/10 bg-background/80 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Profile & Sections
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPipeOpen(true)}>
              <Files className="mr-2 h-4 w-4" /> Pipes Audit & HGL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPanoramaOpen(true)}>
              <Mountain className="mr-2 h-4 w-4 text-emerald-400" /> Panorama Elevation Grid
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSectionGridOpen(true)}>
              <Grid3x3 className="mr-2 h-4 w-4 text-blue-400" /> Section Plotting & QTO
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden gap-1.5 transition-colors hover:bg-white/10 md:flex">
              <ScrollText className="h-4 w-4" /> Docs <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-white/10 bg-background/80 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => openPlat(null)}>
              <ScrollText className="mr-2 h-4 w-4" /> Plat Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setProductionOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Framing Wizard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSheetOpen(true)}>
              <LayoutTemplate className="mr-2 h-4 w-4" /> Sheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSheetSetOpen(true)}>
              <Files className="mr-2 h-4 w-4" /> Drawings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onOpenCheckpoints} className="hidden hover:bg-white/10 xl:flex">
          <History className="h-4 w-4" />{" "}
          <span className="ml-1 hidden md:inline">Checkpoints</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={saving || !dirty}
        >
          <Cloud className="h-4 w-4" /> Save
        </Button>

        {project && <PresenceBar members={project.members} />}

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={openFind}
              aria-label="Find and filter"
            >
              <Search className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Find &amp; filter ⌘F</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleCommand}
              aria-label="Command palette"
            >
              <Command className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Commands ⌘K</TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPrefsOpen(true)}
              aria-label="Display preferences"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Display preferences</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
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
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-white/10 hover:text-foreground active:scale-95"
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
            "flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-110 active:scale-95",
            active
              ? "border-primary/40 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm"
              : "border-border text-muted-foreground hover:bg-white/10 hover:text-foreground",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
