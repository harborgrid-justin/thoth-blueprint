import * as React from "react";
import { Link } from "react-router-dom";
import {
  Square,
  Spline,
  Move,
  Copy,
  RotateCw,
  Scissors,
  Layers,
  Ruler,
  FileText,
  Compass,
  HardHat,
  Mountain,
  Droplets,
  Cloud,
  ChevronDown,
  Undo2,
  Redo2,
  FolderTree,
  Grid3x3,
  SlidersHorizontal,
  Box,
  LayoutTemplate,
  Printer,
  Settings2,
  Database,
} from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TabId =
  | "home"
  | "insert"
  | "annotate"
  | "parametric"
  | "civil3d"
  | "view"
  | "manage"
  | "output";

export function ArtifactRibbonBar() {
  const [activeTab, setActiveTab] = React.useState<TabId>("home");
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setTool = useWorkspaceStore((s) => s.setTool);
  const undo = useWorkspaceStore((s) => s.undo);
  const redo = useWorkspaceStore((s) => s.redo);
  const canUndo = useWorkspaceStore((s) => s.canUndo);
  const canRedo = useWorkspaceStore((s) => s.canRedo);
  const site = useWorkspaceStore((s) => s.site);

  const {
    toggleWorkspaceLayout,
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
    setPrefsOpen,
    setSheetOpen,
    setSheetSetOpen,
    openPlat,
  } = useUiStore();

  return (
    <div className="flex flex-col border-b border-[#cbd5e1] bg-[#eef2f6] text-[#1e293b] select-none shadow-sm font-sans">
      {/* Upper Application Header / Quick Access Toolbar */}
      <div className="flex h-9 items-center justify-between border-b border-[#cbd5e1] bg-[#ffffff] px-3 text-xs">
        <div className="flex items-center gap-2">
          {/* Artifact Style Application Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 items-center gap-1.5 rounded border border-blue-600/40 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 px-2.5 font-mono text-xs font-bold text-white shadow-sm hover:brightness-110">
                <img src="/thoth.svg" alt="" className="h-4 w-4 filter invert" />
                <span>ARTIFACT C3D</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 border-[#cbd5e1] bg-[#ffffff] text-[#0f172a] shadow-lg">
              <DropdownMenuItem asChild>
                <Link to="/" className="flex items-center gap-2 font-medium">
                  <FolderTree className="h-4 w-4 text-blue-600" /> Open Projects Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSheetOpen(true)} className="font-medium">
                <FileText className="h-4 w-4 text-blue-600" /> New Layout / Drawing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSheetSetOpen(true)} className="font-medium">
                <LayoutTemplate className="h-4 w-4 text-purple-600" /> Sheet Set Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPlat(null)} className="font-medium">
                <Printer className="h-4 w-4 text-emerald-600" /> Plot / Export Plat Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Access Icons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => undo()}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="flex h-7 w-7 items-center justify-center rounded text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] disabled:opacity-30 transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => redo()}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="flex h-7 w-7 items-center justify-center rounded text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] disabled:opacity-30 transition-colors"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => openPlat(null)}
              title="Plot / Print"
              className="flex h-7 w-7 items-center justify-center rounded text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
          </div>

          <Separator orientation="vertical" className="mx-1 h-4 bg-[#cbd5e1]" />

          <span className="truncate font-mono text-[11px] font-bold tracking-wide text-[#1e40af]">
            {site?.name || "Artifact Civil 3D Workspace"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Workspace Preset Selector */}
          <div className="flex items-center gap-1.5 rounded bg-[#f1f5f9] px-2 py-0.5 text-[11px] border border-[#cbd5e1]">
            <span className="text-[#64748b] font-mono">Workspace:</span>
            <span className="font-bold text-[#1e40af]">Artifact C3D Complete</span>
          </div>

          <button
            onClick={toggleWorkspaceLayout}
            className="rounded border border-[#cbd5e1] bg-[#ffffff] px-2.5 py-0.5 text-[11px] font-semibold text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0f172a] shadow-xs transition-colors"
          >
            Switch Layout
          </button>
        </div>
      </div>

      {/* Ribbon Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-[#cbd5e1] bg-[#e2e8f0] px-2 text-xs pt-1">
        {(
          [
            { id: "home", label: "Home" },
            { id: "insert", label: "Insert" },
            { id: "annotate", label: "Annotate" },
            { id: "parametric", label: "Parametric" },
            { id: "civil3d", label: "Civil 3D" },
            { id: "view", label: "View" },
            { id: "manage", label: "Manage" },
            { id: "output", label: "Output" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3.5 py-1.5 font-bold transition-all rounded-t-md ${
              activeTab === t.id
                ? "border-b-2 border-[#2563eb] bg-[#ffffff] text-[#1e40af] shadow-xs"
                : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ribbon Tool Panels Container */}
      <div className="flex h-24 items-center gap-3 overflow-x-auto bg-[#f8fafc] p-2 text-xs no-scrollbar">
        {activeTab === "home" && (
          <>
            {/* Draw Panel */}
            <RibbonPanel title="Draw">
              <div className="grid grid-cols-4 gap-1">
                <ToolBtn
                  icon={Spline}
                  label="Alignment"
                  active={activeTool === "alignment"}
                  onClick={() => setTool("alignment")}
                />
                <ToolBtn
                  icon={Square}
                  label="Parcel"
                  active={activeTool === "parcel"}
                  onClick={() => setTool("parcel")}
                />
                <ToolBtn
                  icon={Square}
                  label="Region"
                  active={activeTool === "region"}
                  onClick={() => setTool("region")}
                />
                <ToolBtn
                  icon={Square}
                  label="Lot"
                  active={activeTool === "lot"}
                  onClick={() => setTool("lot")}
                />
              </div>
            </RibbonPanel>

            {/* Infrastructure Panel */}
            <RibbonPanel title="Infrastructure">
              <div className="grid grid-cols-4 gap-1">
                <ToolBtn
                  icon={Move}
                  label="Road"
                  active={activeTool === "road"}
                  onClick={() => setTool("road")}
                />
                <ToolBtn
                  icon={Copy}
                  label="Utility"
                  active={activeTool === "utility"}
                  onClick={() => setTool("utility")}
                />
                <ToolBtn
                  icon={RotateCw}
                  label="Grading"
                  active={activeTool === "grade"}
                  onClick={() => setTool("grade")}
                />
                <ToolBtn
                  icon={Scissors}
                  label="Spot Elev"
                  active={activeTool === "spot"}
                  onClick={() => setTool("spot")}
                />
              </div>
            </RibbonPanel>

            {/* Layers Panel */}
            <RibbonPanel title="Layers">
              <div className="flex flex-col gap-1 w-28">
                <button
                  onClick={() => setPrefsOpen(true)}
                  className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-semibold hover:bg-slate-700 text-cyan-300"
                >
                  <Layers className="h-3.5 w-3.5" /> Layer Props
                </button>
                <div className="truncate rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300">
                  Layer: 0 (Continuous)
                </div>
              </div>
            </RibbonPanel>

            {/* Annotation Panel */}
            <RibbonPanel title="Annotation">
              <div className="flex flex-col gap-1">
                <ToolBtn
                  icon={Ruler}
                  label="Measure"
                  active={activeTool === "measure"}
                  onClick={() => setTool("measure")}
                />
                <ToolBtn
                  icon={FileText}
                  label="Note"
                  active={activeTool === "note"}
                  onClick={() => setTool("note")}
                />
              </div>
            </RibbonPanel>

            {/* Civil Engineering Quick Panel */}
            <RibbonPanel title="Civil 3D Suite">
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setSubdivisionStudioOpen(true)}
                  className="flex flex-col items-center justify-center rounded p-1 hover:bg-slate-700 text-cyan-400"
                  title="Subdivision Studio"
                >
                  <Grid3x3 className="h-4 w-4" />
                  <span className="text-[10px]">Parcels</span>
                </button>
                <button
                  onClick={() => setRoadStudioOpen(true)}
                  className="flex flex-col items-center justify-center rounded p-1 hover:bg-slate-700 text-blue-400"
                  title="Road Design Studio"
                >
                  <Spline className="h-4 w-4" />
                  <span className="text-[10px]">Roads</span>
                </button>
                <button
                  onClick={() => setGradingStudioOpen(true)}
                  className="flex flex-col items-center justify-center rounded p-1 hover:bg-slate-700 text-emerald-400"
                  title="Grading Studio"
                >
                  <Mountain className="h-4 w-4" />
                  <span className="text-[10px]">Grading</span>
                </button>
              </div>
            </RibbonPanel>
          </>
        )}

        {activeTab === "civil3d" && (
          <>
            <RibbonPanel title="Site & Land">
              <div className="flex gap-2">
                <BigRibbonBtn
                  icon={Grid3x3}
                  label="Subdivision Studio"
                  onClick={() => setSubdivisionStudioOpen(true)}
                />
                <BigRibbonBtn
                  icon={Square}
                  label="Parcel Layout"
                  onClick={() => setParcelLayoutOpen(true)}
                />
              </div>
            </RibbonPanel>

            <RibbonPanel title="Transportation">
              <div className="flex gap-2">
                <BigRibbonBtn
                  icon={Spline}
                  label="Road Studio"
                  onClick={() => setRoadStudioOpen(true)}
                />
                <BigRibbonBtn
                  icon={HardHat}
                  label="Corridor & Assembly"
                  onClick={() => setAssemblyOpen(true)}
                />
              </div>
            </RibbonPanel>

            <RibbonPanel title="Terrain & Surface">
              <div className="flex gap-2">
                <BigRibbonBtn
                  icon={Mountain}
                  label="Grading Solver"
                  onClick={() => setGradingStudioOpen(true)}
                />
                <BigRibbonBtn
                  icon={SlidersHorizontal}
                  label="Panorama Elevation"
                  onClick={() => setPanoramaOpen(true)}
                />
              </div>
            </RibbonPanel>

            <RibbonPanel title="Pipe & GIS">
              <div className="flex gap-2">
                <BigRibbonBtn
                  icon={Droplets}
                  label="Pipe Networks"
                  onClick={() => setPipeStudioOpen(true)}
                />
                <BigRibbonBtn
                  icon={Cloud}
                  label="GIS Model Builder"
                  onClick={() => setModelBuilderStudioOpen(true)}
                />
                <BigRibbonBtn
                  icon={Compass}
                  label="Survey & COGO"
                  onClick={() => setSurveyCogoStudioOpen(true)}
                />
              </div>
            </RibbonPanel>
          </>
        )}

        {activeTab === "view" && (
          <>
            <RibbonPanel title="Viewport Configuration">
              <div className="flex items-center gap-1 text-[11px]">
                <button className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-semibold text-cyan-300">
                  Single Viewport
                </button>
                <button className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700">
                  Two Vertical
                </button>
                <button className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700">
                  Four Equal
                </button>
              </div>
            </RibbonPanel>

            <RibbonPanel title="Palettes & Windows">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setPrefsOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                >
                  <FolderTree className="h-3.5 w-3.5 text-cyan-400" /> Prospector Tree
                </button>
                <button
                  onClick={() => setSectionGridOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                >
                  <Grid3x3 className="h-3.5 w-3.5 text-blue-400" /> Section Plot Grid
                </button>
                <button
                  onClick={() => setLineworkOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                >
                  <Spline className="h-3.5 w-3.5 text-amber-400" /> Geometry Palette
                </button>
                <button
                  onClick={() => setScriptsOpen(true)}
                  className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                >
                  <Box className="h-3.5 w-3.5 text-emerald-400" /> 3D Objects & Scripts
                </button>
              </div>
            </RibbonPanel>
          </>
        )}

        {activeTab === "annotate" && (
          <RibbonPanel title="Dimensions & Tables">
            <div className="flex gap-2">
              <BigRibbonBtn
                icon={Ruler}
                label="Linear Dimension"
                onClick={() => setTool("measure")}
              />
              <BigRibbonBtn
                icon={FileText}
                label="Multi-line Text"
                onClick={() => setTool("note")}
              />
            </div>
          </RibbonPanel>
        )}

        {activeTab === "insert" && (
          <RibbonPanel title="Import & Reference">
            <div className="flex gap-2">
              <BigRibbonBtn
                icon={Database}
                label="Import DWG / GIS"
                onClick={() => setModelBuilderStudioOpen(true)}
              />
            </div>
          </RibbonPanel>
        )}

        {activeTab === "manage" && (
          <RibbonPanel title="Customization & Preferences">
            <div className="flex gap-2">
              <BigRibbonBtn
                icon={Settings2}
                label="CAD Preferences"
                onClick={() => setPrefsOpen(true)}
              />
            </div>
          </RibbonPanel>
        )}

        {activeTab === "output" && (
          <RibbonPanel title="Plot & Publishing">
            <div className="flex gap-2">
              <BigRibbonBtn
                icon={Printer}
                label="Plot Layout Sheet"
                onClick={() => openPlat(null)}
              />
              <BigRibbonBtn
                icon={LayoutTemplate}
                label="Sheet Set Manager"
                onClick={() => setSheetSetOpen(true)}
              />
            </div>
          </RibbonPanel>
        )}
      </div>
    </div>
  );
}

function RibbonPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between border-r border-[#cbd5e1] pr-3 last:border-r-0">
      <div className="flex items-center gap-2">{children}</div>
      <div className="mt-1 text-center font-mono text-[9px] font-bold uppercase tracking-wider text-[#64748b] select-none">
        {title}
      </div>
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${
        active
          ? "bg-blue-600 text-white font-bold shadow-sm dark:bg-cyan-500 dark:text-black"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}

function BigRibbonBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 hover:border-blue-500/60 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-cyan-500/50 dark:hover:bg-slate-700 dark:hover:text-cyan-300 transition-all shadow-xs"
    >
      <Icon className="h-5 w-5 mb-1 text-blue-600 dark:text-cyan-400" />
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}

export { ArtifactRibbonBar as AutoCadRibbonBar };
