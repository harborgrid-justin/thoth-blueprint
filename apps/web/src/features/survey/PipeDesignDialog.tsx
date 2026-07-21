import * as React from "react";
import _ from "lodash";
import { Activity, ShieldAlert, CheckCircle } from "lucide-react";
import {
  validatePipeNetwork,
  type PipeDesignRules,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buildTerrainModel } from "@/features/terrain/terrainModel";

export function PipeDesignDialog() {
  const open = useUiStore((s) => s.pipeOpen);
  const setOpen = useUiStore((s) => s.setPipeOpen);
  const site = useWorkspaceStore((s) => s.site);

  const networks = site?.networks ?? [];
  const [selectedNetId, setSelectedNetId] = React.useState<string | null>(null);

  const terrain = React.useMemo(() => (site ? buildTerrainModel(site) : null), [site]);
  const terrainSurface = terrain?.existing ?? null;

  // Default design rules
  const [rules, setRules] = React.useState<PipeDesignRules>({
    minCover: 4.0,
    minSlope: 0.005,
    maxSlope: 0.08,
    minPipeDiameter: 1.0,
    defaultSumpDepth: 1.5,
  });

  // Local state for structure invert elevations
  const [inverts, setInverts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (open && networks.length > 0) {
      setSelectedNetId(networks[0].id);
      
      // Initialize default inverts relative to ground
      const initInverts: Record<string, number> = {};
      if (site && terrainSurface) {
        for (const net of networks) {
          for (const node of net.nodes) {
            initInverts[node.id] = 4.0; // 6 units below hypothetical terrain level
          }
        }
      }
      setInverts(initInverts);
    }
  }, [open, networks, site, terrainSurface]);

  const activeNet = _.find(networks, (n) => n.id === selectedNetId) ?? networks[0] ?? null;

  // Run validation
  const validation = React.useMemo(() => {
    if (!activeNet || !terrainSurface) {return null;}
    return validatePipeNetwork(activeNet, terrainSurface, rules, inverts);
  }, [activeNet, terrainSurface, rules, inverts]);

  if (!site) {return null;}

  function handleInvertChange(nodeId: string, val: number) {
    setInverts({ ...inverts, [nodeId]: val });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Pipe Network Design Checks
          </DialogTitle>
          <DialogDescription>
            Audit pipeline cover depths, sumps, and gradient slopes against gravity flow engineering constraints.
          </DialogDescription>
        </DialogHeader>

        {networks.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No utility pipe networks found in this site. Add some water/sewer/storm paths using the network tools.
          </div>
        ) : (
          <div className="grid grid-cols-[220px_1fr] gap-6">
            {/* Sidebar list */}
            <div className="flex flex-col gap-4 border-r border-border pr-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Utility Line
                </label>
                <div className="mt-1.5 flex flex-col gap-1">
                  {_.map(networks, (n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => setSelectedNetId(n.id)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        n.id === selectedNetId ? "bg-primary/15 text-primary font-medium" : "hover:bg-accent text-muted-foreground"
                      )}
                    >
                      {n.name} ({n.kind.toUpperCase()})
                    </button>
                  ))}
                </div>
              </div>

              {/* Design rules editor */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Design Rules Constraints
                </label>
                <div className="mt-2 flex flex-col gap-2 rounded-md bg-card p-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Min Cover Depth:</span>
                    <input
                      type="number"
                      step="0.5"
                      className="w-12 bg-transparent text-right outline-none text-foreground"
                      value={rules.minCover}
                      onChange={(e) => setRules({ ...rules, minCover: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Min Slope:</span>
                    <input
                      type="number"
                      step="0.001"
                      className="w-12 bg-transparent text-right outline-none text-foreground"
                      value={rules.minSlope}
                      onChange={(e) => setRules({ ...rules, minSlope: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Max Slope:</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-12 bg-transparent text-right outline-none text-foreground"
                      value={rules.maxSlope}
                      onChange={(e) => setRules({ ...rules, maxSlope: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Invert editors and violations table */}
            <div className="flex flex-col gap-4 min-w-0">
              <ScrollArea className="max-h-[35vh]">
                <h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Junction Structures Rim &amp; Inverts Inventory
                </h4>
                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-2">Structure ID</th>
                        <th className="p-2">Rim Elevation</th>
                        <th className="p-2">Sump Elev</th>
                        <th className="p-2">Invert Out (Fix)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {_.map(validation?.nodeElevations, (row) => (
                        <tr key={row.nodeId} className="border-b border-border/60">
                          <td className="p-2 font-mono font-medium">{row.name}</td>
                          <td className="p-2">{row.rimElevation.toFixed(2)}</td>
                          <td className="p-2">{row.sumpElevation.toFixed(2)}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              className="h-7 w-20 text-right text-xs"
                              value={inverts[row.nodeId] ?? row.lowestInvertOut}
                              onChange={(e) => handleInvertChange(row.nodeId, parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>

              {/* Warnings and violations logs */}
              <div className="rounded-md border border-border bg-slate-950/20 p-3 flex-1 min-h-[160px]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Design Rules Violations Audit Report
                  </h4>
                  {validation && validation.violations.length === 0 ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 gap-1"><CheckCircle className="h-3 w-3" /> Fully Compliant</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> {validation?.violations.length} warnings</Badge>
                  )}
                </div>

                <ScrollArea className="h-[120px] text-xs">
                  {validation && validation.violations.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-center py-6">
                      No design checking warnings. Utility pipe depth and slope ranges are within limits.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {_.map(validation?.violations, (v, i) => (
                        <div key={i} className="flex gap-2 rounded border border-yellow-500/20 bg-yellow-500/5 p-2 text-yellow-600 dark:text-yellow-400">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          <div>
                            <span className="font-semibold uppercase text-[10px] tracking-wide block">
                              {v.type.replace("_", " ")} ({v.severity})
                            </span>
                            <span>{v.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
