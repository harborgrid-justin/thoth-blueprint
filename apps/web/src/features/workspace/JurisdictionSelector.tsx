import { Landmark, MapPin, Check, ChevronDown } from "lucide-react";
import { geoidRegistry, PRESET_GEOID_PLUGINS } from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";

/**
 * UI Jurisdiction Switcher — allows one-click dynamic state & county GEOID selection.
 * Adapts all 100 Smart Engineering experiences and compliance engines live.
 */
export function JurisdictionSelector() {
  const site = useWorkspaceStore((s) => s.site);
  const setJurisdiction = useWorkspaceStore((s) => s.setJurisdiction);

  const activeGeoid = (site as any)?.geoid || (site as any)?.jurisdictionId || "51153";
  const resolvedCode = geoidRegistry.resolve(activeGeoid);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold shadow-sm backdrop-blur transition-all duration-200 hover:border-cyan-500 hover:bg-slate-800 focus:outline-none"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="max-w-[140px] truncate text-slate-200">
            {resolvedCode.name}
          </span>
          <span className={WORKSPACE_STYLES.badge}>
            {resolvedCode.targetGeoid}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={WORKSPACE_STYLES.dropdownContent + " w-80 p-1.5"}>
        <DropdownMenuLabel className={WORKSPACE_STYLES.dropdownLabel + " flex items-center gap-2"}>
          <Landmark className="h-3.5 w-3.5 text-cyan-400" />
          Select Jurisdiction / GEOID Standards
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={WORKSPACE_STYLES.dropdownSeparator} />
        {PRESET_GEOID_PLUGINS.map((plugin) => {
          const isSelected = activeGeoid === plugin.geoid;
          const climate = plugin.standards.climate;
          const rainfall = climate?.rainfallIntensity100Yr ?? 3.5;
          const wind = climate?.windVelocityMph ?? 120;
          const snow = climate?.snowLoadPsf ?? 35;
          return (
            <DropdownMenuItem
              key={plugin.geoid}
              onClick={() => setJurisdiction(plugin.geoid)}
              className={cn(
                "mb-0.5 flex cursor-pointer flex-col items-start gap-1 rounded-md p-2 transition-colors",
                isSelected ? "border-l-2 border-cyan-400 bg-cyan-500/20 font-medium text-cyan-200" : "text-slate-300 hover:bg-slate-800"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xs font-semibold">
                  {plugin.name}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  GEOID: {plugin.geoid}
                </span>
              </div>
              <div className="flex w-full items-center gap-2.5 font-mono text-[10px] text-slate-400">
                <span>🌧 {rainfall} in/h</span>
                <span>💨 {wind} mph</span>
                <span>❄️ {snow} psf</span>
                {isSelected && <Check className="ml-auto h-3 w-3 shrink-0 text-cyan-400" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
