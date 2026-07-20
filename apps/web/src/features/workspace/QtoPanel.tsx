import * as React from "react";
import { HardHat } from "lucide-react";
import {
  type PayItem,
  evaluatePayItemCost,
  computeRenovationTakeoffs,
  runRenovationAudit,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QtoPanel() {
  const site = useWorkspaceStore((s) => s.site);
  const selection = useWorkspaceStore((s) => s.selection);

  // Predefined default pay item catalog items
  const payItems: PayItem[] = [
    { id: "201-100", name: "Clearing & Grubbing", unit: "acres", unitCost: 3500.0, category: "Earthworks" },
    { id: "203-010", name: "Road Excavation (Cut)", unit: "sqm", unitCost: 15.0, category: "Earthworks" },
    { id: "301-050", name: "Aggregate Base Course", unit: "sy", unitCost: 22.0, category: "Pavement" },
    { id: "401-200", name: "Concrete Curb & Gutter Type A", unit: "LF", unitCost: 35.0, category: "Pavement" },
    { id: "601-500", name: "18-inch RCP Storm Pipe", unit: "feet", unitCost: 65.0, category: "Drainage" },
    { id: "601-510", name: "Precast Cylindrical Manhole", unit: "count", unitCost: 2500.0, category: "Drainage" },
  ];

  // Local state assignment variables
  const assignments = [
    { elementId: "road-edge", payItemId: "401-200", formula: "length * unitCost" },
    { elementId: "building-lot", payItemId: "201-100", formula: "area * unitCost" },
  ];

  const [activeTab, setActiveTab] = React.useState<"earthwork" | "payitems" | "renovation">("earthwork");

  if (!site) return null;

  // Compute mock takeoffs based on active site components
  const assignedReports = assignments.map((as) => {
    const item = payItems.find((p) => p.id === as.payItemId)!;
    
    // Find matching element dimensions
    const el = site.elements.find((e) => e.id === as.elementId);
    const lengthVal = el && el.kind === "parcel" ? 250 : 150; // default simulation variables
    const areaVal = el && el.kind === "parcel" ? 1.2 : 0.8;

    const evalRes = evaluatePayItemCost(
      item,
      { length: lengthVal, area: areaVal, count: 1 },
      as.formula
    );

    const elementName = el ? ('name' in el ? (el as any).name : el.id) : `Site Object (${as.elementId})`;

    return {
      elementName,
      itemName: item.name,
      unit: item.unit,
      qty: evalRes.quantity,
      cost: evalRes.cost,
    };
  });

  const totalCost = assignedReports.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="flex flex-col gap-4 p-3 text-xs">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <HardHat className="h-4 w-4 text-primary" /> QTO &amp; Earthwork Takeoffs
        </h3>
        <div className="flex rounded border border-border p-0.5 bg-background">
          <button
            onClick={() => setActiveTab("earthwork")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "earthwork" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Earthwork
          </button>
          <button
            onClick={() => setActiveTab("payitems")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "payitems" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Cost Sheets
          </button>
          <button
            onClick={() => setActiveTab("renovation")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "renovation" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Renovation
          </button>
        </div>
      </div>

      {activeTab === "earthwork" ? (
        <div className="flex flex-col gap-3">
          {/* Average End Area Volumes List */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Average End Area Volumes</span>
              <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 text-[9px] h-4">TIN Ground</Badge>
            </h4>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-[10px]">
                  <th className="py-1">Station Interval</th>
                  <th className="py-1 text-right">Cut (CY)</th>
                  <th className="py-1 text-right">Fill (CY)</th>
                  <th className="py-1 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-1">0+00 to 2+00</td>
                  <td className="py-1 text-right">150.0</td>
                  <td className="py-1 text-right">320.0</td>
                  <td className="py-1 text-right text-rose-500">-170.0 (F)</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-1">2+00 to 5+00</td>
                  <td className="py-1 text-right">450.0</td>
                  <td className="py-1 text-right">180.0</td>
                  <td className="py-1 text-right text-emerald-500">+270.0 (C)</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-1">5+00 to 8+00</td>
                  <td className="py-1 text-right">610.0</td>
                  <td className="py-1 text-right">120.0</td>
                  <td className="py-1 text-right text-emerald-500">+490.0 (C)</td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-1.5">Cumulative Total</td>
                  <td className="py-1.5 text-right">1,210.0</td>
                  <td className="py-1.5 text-right">620.0</td>
                  <td className="py-1.5 text-right text-emerald-500">+590.0 (C)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mass Haul Diagram */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">
              Mass Haul Diagram Chart (Net Volume)
            </h4>
            <div className="h-[90px] w-full bg-slate-950/60 rounded-md overflow-hidden relative">
              <svg className="h-full w-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                <line x1="0" y1="40" x2="300" y2="40" stroke="#475569" strokeWidth="0.5" strokeDasharray="2" />
                {/* Mass Haul cumulative net curve */}
                <path
                  d="M0,40 Q75,60 150,20 T300,10"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                />
              </svg>
              <div className="absolute top-1 left-1 text-[8px] text-white/50">Crest (Surplus) / Sag (Deficit)</div>
            </div>
          </div>
        </div>
      ) : activeTab === "payitems" ? (
        <div className="flex flex-col gap-3">
          {/* Assigned cost items list */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5">
              Pay Item Cost Estimates
            </h4>
            <div className="flex flex-col gap-2">
              {assignedReports.map((r, idx) => (
                <div key={idx} className="flex flex-col gap-1 border-b border-border/40 pb-1.5 last:border-b-0">
                  <div className="flex justify-between items-center font-medium text-foreground">
                    <span>{r.elementName}</span>
                    <span>${r.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[10px]">
                    <span>{r.itemName}</span>
                    <span>{r.qty.toFixed(1)} {r.unit}</span>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between items-center font-bold text-sm text-foreground border-t border-border pt-2 mt-1">
                <span>Total Construction Est.</span>
                <span>${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Quick assign selector */}
          <div className="rounded-md border border-border bg-slate-950/10 p-2 flex flex-col gap-2">
            <span className="font-semibold text-[10px] uppercase text-muted-foreground">Assign Item to Selection</span>
            {selection.length > 0 ? (
              <div className="flex gap-1.5 items-center">
                <select className="flex-1 bg-background border border-border rounded p-1 outline-none text-xs">
                  {payItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} - {item.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" className="h-7 text-[10px] px-2">Bind</Button>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground/80 text-center py-2">
                Select an element on canvas to bind pay items.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Renovation Quantities (Takeoffs) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Renovation Quantity Takeoffs</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">REQ-UNIMP-006</Badge>
            </h4>
            {(() => {
              const takeoffs = computeRenovationTakeoffs(site);
              return (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-[10px]">
                      <th className="py-1">Status</th>
                      <th className="py-1 text-center">Count</th>
                      <th className="py-1 text-right">Plan Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/40">
                      <td className="py-1 font-medium text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span> Existing
                      </td>
                      <td className="py-1 text-center font-semibold">{takeoffs.existing.count}</td>
                      <td className="py-1 text-right font-semibold">{takeoffs.existing.totalArea.toFixed(1)} sqm</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="py-1 font-medium text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span> New Construction
                      </td>
                      <td className="py-1 text-center font-semibold text-emerald-500">{takeoffs.new.count}</td>
                      <td className="py-1 text-right font-semibold text-emerald-500">{takeoffs.new.totalArea.toFixed(1)} sqm</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="py-1 font-medium text-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500"></span> Demolition
                      </td>
                      <td className="py-1 text-center font-semibold text-rose-500">{takeoffs.demolished.count}</td>
                      <td className="py-1 text-right font-semibold text-rose-500">{takeoffs.demolished.totalArea.toFixed(1)} sqm</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>

          {/* Renovation Design Audit warnings (REQ-UNIMP-010) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Renovation Design Audit</span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">REQ-UNIMP-010</Badge>
            </h4>
            {(() => {
              const warnings = runRenovationAudit(site);
              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    No renovation design violations or structural standard overlaps detected.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {warnings.map((w, idx) => (
                    <div key={idx} className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500 font-medium">
                      {w}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", className)}>
      {children}
    </span>
  );
}
