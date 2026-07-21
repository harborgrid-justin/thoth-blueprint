import { X, Plus, Layers, Settings2 } from "lucide-react";
import type { Subassembly, Assembly } from "@thoth/domain";
import { Button } from "@/components/ui/button";

interface AssemblyBuilderPanelProps {
  open: boolean;
  onClose: () => void;
  assembly: Assembly;
}

export function AssemblyBuilderPanel({
  open,
  onClose,
  assembly,
}: AssemblyBuilderPanelProps) {
  if (!open) return null;

  return (
    <div
      className="absolute top-24 left-8 z-50 flex flex-col w-96 rounded-xl border border-white/10 shadow-2xl overflow-hidden glass-panel"
      style={{
        backgroundColor: "rgba(10, 10, 10, 0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white/90">
            Assembly Builder
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {/* Assembly Name */}
        <div>
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5">
            Assembly Name
          </label>
          <input
            type="text"
            className="w-full bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            defaultValue={assembly.name}
          />
        </div>

        {/* Left Subassemblies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Left Side
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            {assembly.leftSubassemblies.map((sub, idx) => (
              <SubassemblyRow key={sub.id} sub={sub} index={idx + 1} />
            ))}
          </div>
        </div>

        {/* Baseline (Center) */}
        <div className="flex items-center justify-center py-2">
          <div className="h-[1px] w-full bg-white/10"></div>
          <span className="px-3 text-[10px] uppercase font-bold tracking-widest text-blue-400 bg-black/40 rounded-full border border-white/10">
            Baseline
          </span>
          <div className="h-[1px] w-full bg-white/10"></div>
        </div>

        {/* Right Subassemblies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Right Side
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            {assembly.rightSubassemblies.map((sub, idx) => (
              <SubassemblyRow key={sub.id} sub={sub} index={idx + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubassemblyRow({ sub, index }: { sub: Subassembly; index: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-md border border-white/5 group transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-white/30">{index}</span>
        <div>
          <p className="text-sm font-medium text-white/90">{sub.name}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">{sub.type}</p>
        </div>
      </div>
      <button className="text-white/20 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100">
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
  );
}
