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
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 text-xs font-semibold shadow-sm backdrop-blur transition-all duration-200 hover:border-primary hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-primary",
          )}
        >
          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="max-w-[140px] truncate text-foreground">
            {resolvedCode.name}
          </span>
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-mono text-primary shrink-0">
            {resolvedCode.targetGeoid}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 p-1.5 shadow-xl">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Landmark className="h-3.5 w-3.5 text-primary" />
          Select Jurisdiction / GEOID Standards
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
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
                "flex flex-col items-start gap-1 p-2 rounded-md cursor-pointer transition-colors mb-0.5",
                isSelected ? "bg-primary/10 border-l-2 border-primary font-medium" : "hover:bg-accent/60"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold text-xs text-foreground">
                  {plugin.name}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  GEOID: {plugin.geoid}
                </span>
              </div>
              <div className="flex w-full items-center gap-2.5 text-[10px] text-muted-foreground font-mono">
                <span>🌧 {rainfall} in/h</span>
                <span>💨 {wind} mph</span>
                <span>❄️ {snow} psf</span>
                {isSelected && <Check className="ml-auto h-3 w-3 text-primary shrink-0" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
