import * as React from "react";
import _ from "lodash";
import { HardHat, Compass, Link2, X, PenTool, LayoutTemplate, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCorridorDesignerState } from "./hooks/useCorridorDesignerState";
import { AssemblyBuilderPanel } from "./AssemblyBuilderPanel";

export function CorridorDesignerDialog() {
  const {
    open,
    setOpen,
    site,
    alignments,
    selectedAlignId,
    setSelectedAlignId,
    profiles,
    selectedProfileId,
    setSelectedProfileId,
    assembly,
    handleExtrude,
  } = useCorridorDesignerState();

  const [builderOpen, setBuilderOpen] = React.useState(false);
  
  if (!site || !open) {
    return null;
  }

  return (
    <>
      <AssemblyBuilderPanel
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        assembly={assembly}
      />
      <div
        className="absolute top-20 right-8 z-40 flex flex-col w-[450px] rounded-xl border border-white/10 shadow-2xl overflow-hidden glass-panel"
        style={{
          backgroundColor: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide text-white/90">
              Corridor Engine
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Base Geometry */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-1">
              <Compass className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Geometry References
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
                Horizontal Alignment
              </label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                value={selectedAlignId ?? ""}
                onChange={(e) => setSelectedAlignId(e.target.value)}
              >
                {_.map(alignments, (a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
                Vertical Profile
              </label>
              <select
                className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {_.map(profiles, (p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/50 font-medium uppercase tracking-wider">
                Target Surface (Daylight)
              </label>
              <select className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none">
                <option value="eg">Existing Ground (EG_Topo)</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Intersections & Islands */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-1">
              <Network className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Intersections & Islands
              </span>
            </div>
            <div className="text-[11px] text-white/60 bg-white/5 border border-white/5 rounded-md p-3">
              Draw overlapping alignments or closed polylines in the viewport to automatically drape and extrude Medians or Splitter islands.
            </div>
          </div>

          {/* Assembly */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-1">
              <Link2 className="w-3.5 h-3.5 text-white/50" />
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Assembly Template
              </span>
            </div>

            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-md p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <LayoutTemplate className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white/90">{assembly.name}</div>
                  <div className="text-[10px] text-white/40">{assembly.leftSubassemblies.length + assembly.rightSubassemblies.length} subassemblies</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                onClick={() => setBuilderOpen(true)}
              >
                <PenTool className="w-3.5 h-3.5 mr-2" /> Edit
              </Button>
            </div>
          </div>
          
          {/* Generation */}
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <Button
              onClick={handleExtrude}
              className="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <HardHat className="w-4 h-4 mr-2" /> Model Corridor
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
