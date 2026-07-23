import { X, Plus, Layers, Settings2 } from "lucide-react";
import type { Subassembly, Assembly } from "@thoth/domain";
import { Button } from "@/components/ui/button";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

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
    <div className="absolute top-24 left-8 z-50 flex flex-col w-96 rounded-xl border border-border shadow-2xl overflow-hidden bg-card/90 backdrop-blur-md text-foreground">
      {/* Header */}
      <div className={SURVEY_STYLES.dialogHeader + " px-4 py-3 bg-background/60"}>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <h2 className={SURVEY_STYLES.dialogTitle}>
            Assembly Builder
          </h2>
        </div>
        <button
          onClick={onClose}
          className={SURVEY_STYLES.btnIcon}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {/* Assembly Name */}
        <div>
          <label className={SURVEY_STYLES.label}>
            Assembly Name
          </label>
          <input
            type="text"
            className={SURVEY_STYLES.input}
            defaultValue={assembly.name}
          />
        </div>

        {/* Left Subassemblies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={SURVEY_STYLES.label}>
              Left Side
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-muted">
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
          <div className="h-[1px] w-full bg-muted"></div>
          <span className={`${SURVEY_STYLES.badge} mx-2`}>
            Baseline
          </span>
          <div className="h-[1px] w-full bg-muted"></div>
        </div>

        {/* Right Subassemblies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={SURVEY_STYLES.label}>
              Right Side
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white hover:bg-muted">
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
    <div className={SURVEY_STYLES.cardSubtle + " flex items-center justify-between group cursor-pointer"}>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-muted-foreground">{index}</span>
        <div>
          <p className="text-xs font-medium text-foreground">{sub.name}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{sub.type}</p>
        </div>
      </div>
      <button className="text-slate-500 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100">
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
  );
}

