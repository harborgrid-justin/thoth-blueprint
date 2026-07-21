import * as React from "react";
import { HardHat } from "lucide-react";
import {
  type PayItem,
  evaluatePayItemCost,
  computeRenovationTakeoffs,
  runRenovationAudit,
  calculateStairGeometry,
  calculateCurtainWallGeometry,
  calculateDoorGeometry,
  calculateWindowGeometry,
  calculateRoofGeometry,
  compileUnitSchedule,
  type Stair,
  type CurtainWall,
  type DoorElement,
  type WindowElement,
  type RoofElement,
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

  const [activeTab, setActiveTab] = React.useState<"earthwork" | "payitems" | "renovation" | "stairs" | "curtainwalls" | "assemblies" | "roofs">("earthwork");

  if (!site) {return null;}

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
          <button
            onClick={() => setActiveTab("stairs")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "stairs" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Stairs
          </button>
          <button
            onClick={() => setActiveTab("curtainwalls")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "curtainwalls" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Curtains
          </button>
          <button
            onClick={() => setActiveTab("assemblies")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "assemblies" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Doors/Wins
          </button>
          <button
            onClick={() => setActiveTab("roofs")}
            className={cn("px-1.5 py-0.5 rounded text-[10px]", activeTab === "roofs" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
          >
            Roofs
          </button>
        </div>
      </div>

      {activeTab === "earthwork" && (
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
            </div>
          </div>
        </div>
      )}

      {activeTab === "payitems" && (
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
                <select className="flex-1 rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
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
      )}

      {activeTab === "renovation" && (
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

      {activeTab === "stairs" && (
        <div className="flex flex-col gap-3">
          {/* Stairs Quantities (Takeoffs) (REQ-UNIMP-025) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Stairs Structural Takeoffs</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">REQ-UNIMP-025</Badge>
            </h4>
            {(() => {
              const stairs = site.elements.filter((e) => e.kind === "stair") as Stair[];
              if (stairs.length === 0) {
                return (
                  <div className="text-[10px] text-muted-foreground/80 py-2 text-center">
                    No stairs elements drafted in the current site plan.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3">
                  {stairs.map((stair) => {
                    const geom = calculateStairGeometry(stair);
                    return (
                      <div key={stair.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div className="font-semibold text-foreground mb-1">{stair.name} ({stair.stairType})</div>
                        <table className="w-full text-left text-[10px]">
                          <tbody>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Risers / Treads</td>
                              <td className="py-0.5 text-right font-medium">{geom.riserCount} R / {geom.treadCount} T</td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Actual Riser Height</td>
                              <td className="py-0.5 text-right font-medium">{(geom.actualRiserHeight * 100).toFixed(1)} cm</td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Concrete Volume</td>
                              <td className="py-0.5 text-right font-medium text-emerald-500">{geom.concreteVolumeCuM.toFixed(2)} m³</td>
                            </tr>
                            <tr>
                              <td className="py-0.5 text-muted-foreground">Timber Board Feet</td>
                              <td className="py-0.5 text-right font-medium text-amber-500">{geom.timberBoardFeet.toFixed(0)} BF</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Stairs Safety & Clearance Audit (REQ-UNIMP-017) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Stairs Safety &amp; Clearance Audit</span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">REQ-UNIMP-017</Badge>
            </h4>
            {(() => {
              const stairs = site.elements.filter((e) => e.kind === "stair") as Stair[];
              const warnings: string[] = [];
              stairs.forEach((stair) => {
                const geom = calculateStairGeometry(stair);
                geom.warnings.forEach((w) => warnings.push(`${stair.name}: ${w}`));
              });

              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    Stairs comply with structural limits and overhead clearance standards.
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

      {activeTab === "curtainwalls" && (
        <div className="flex flex-col gap-3">
          {/* Curtain Wall Panel Inventory (REQ-UNIMP-040) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Panel Schedule &amp; Count</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">REQ-UNIMP-040</Badge>
            </h4>
            {(() => {
              const walls = site.elements.filter((e) => e.kind === "curtainwall") as CurtainWall[];
              if (walls.length === 0) {
                return (
                  <div className="text-[10px] text-muted-foreground/80 py-2 text-center">
                    No curtain walls drafted in the current site plan.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3">
                  {walls.map((wall) => {
                    const geom = calculateCurtainWallGeometry(wall);
                    return (
                      <div key={wall.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div className="font-semibold text-foreground mb-1 flex justify-between">
                          <span>{wall.name}</span>
                          <span className="text-muted-foreground text-[9px]">U-Factor: {geom.overallUFactor.toFixed(3)} W/m²K</span>
                        </div>
                        <table className="w-full text-left text-[10px] mb-2">
                          <thead>
                            <tr className="border-b border-border/60 text-muted-foreground text-[9px]">
                              <th className="py-0.5">Material</th>
                              <th className="py-0.5">Dimensions</th>
                              <th className="py-0.5 text-right">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {geom.inventory.map((item, idx) => (
                              <tr key={idx} className="border-b border-border/30 last:border-0">
                                <td className="py-0.5 capitalize text-foreground">{item.material}</td>
                                <td className="py-0.5 text-muted-foreground">{item.width.toFixed(2)}m x {item.height.toFixed(2)}m</td>
                                <td className="py-0.5 text-right font-medium">{item.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-between items-center text-[9px] bg-muted/30 p-1 rounded border border-border/50">
                          <span className="text-muted-foreground">Thermal Resistance:</span>
                          <span className="font-semibold text-emerald-500">R-{geom.overallRValue.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Curtain Wall Wind Load & Structural Audit */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Wind Load &amp; Attachment Audit</span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">REQ-UNIMP-026</Badge>
            </h4>
            {(() => {
              const walls = site.elements.filter((e) => e.kind === "curtainwall") as CurtainWall[];
              const warnings: string[] = [];
              walls.forEach((wall) => {
                const geom = calculateCurtainWallGeometry(wall);
                geom.warnings.forEach((w) => warnings.push(`${wall.name}: ${w}`));
              });

              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    Curtain wall panel dimensions are within structural limits.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
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

      {activeTab === "assemblies" && (
        <div className="flex flex-col gap-3">
          {/* Door & Window Schedules (REQ-UNIMP-050) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Door &amp; Window Unit Schedule</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">REQ-UNIMP-050</Badge>
            </h4>
            {(() => {
              const schedule = compileUnitSchedule(site.elements);
              if (schedule.length === 0) {
                return (
                  <div className="text-[10px] text-muted-foreground/80 py-2 text-center">
                    No door or window elements drafted in the current site plan.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {schedule.map((item) => (
                    <div key={item.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <div className="font-semibold text-foreground mb-1 flex justify-between">
                        <span>{item.name} ({item.kind})</span>
                        <span className="text-muted-foreground text-[9px] capitalize">{item.type}</span>
                      </div>
                      <table className="w-full text-left text-[10px]">
                        <tbody>
                          <tr className="border-b border-border/30">
                            <td className="py-0.5 text-muted-foreground">Dimensions (WxH)</td>
                            <td className="py-0.5 text-right font-medium">{item.width.toFixed(2)}m x {item.height.toFixed(2)}m</td>
                          </tr>
                          <tr className="border-b border-border/30">
                            <td className="py-0.5 text-muted-foreground">Hardware / Frame</td>
                            <td className="py-0.5 text-right font-medium text-amber-500">{item.hardware}</td>
                          </tr>
                          <tr>
                            <td className="py-0.5 text-muted-foreground">Fire / Sound / Glazing</td>
                            <td className="py-0.5 text-right font-medium text-emerald-500">{item.fireRating} / STC {item.stc} / {item.safety}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Natural Lighting & ADA Egress Code Compliance (REQ-UNIMP-049) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Glazing &amp; Egress Code Auditing</span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">REQ-UNIMP-049</Badge>
            </h4>
            {(() => {
              const warnings: string[] = [];
              const doors = site.elements.filter((e) => e.kind === "door") as DoorElement[];
              const windows = site.elements.filter((e) => e.kind === "window") as WindowElement[];

              doors.forEach((door) => {
                const geom = calculateDoorGeometry(door);
                geom.warnings.forEach((w) => warnings.push(`${door.name}: ${w}`));
              });

              windows.forEach((win) => {
                const geom = calculateWindowGeometry(win);
                geom.warnings.forEach((w) => warnings.push(`${win.name}: ${w}`));
              });

              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    All doors and windows comply with ADA clearances and glazing area parameters.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
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

      {activeTab === "roofs" && (
        <div className="flex flex-col gap-3">
          {/* Roof Materials List */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Roof Construction Takeoffs</span>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">Material Volume</Badge>
            </h4>
            {(() => {
              const roofs = site.elements.filter((e) => e.kind === "roof") as RoofElement[];
              if (roofs.length === 0) {
                return (
                  <div className="text-[10px] text-muted-foreground/80 py-2 text-center">
                    No roof elements drafted in the current site plan.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {roofs.map((roof) => {
                    const res = calculateRoofGeometry(roof);
                    return (
                      <div key={roof.id} className="border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <div className="font-semibold text-foreground mb-1 flex justify-between">
                          <span>{roof.name}</span>
                          <span className="text-muted-foreground text-[9px] capitalize">{roof.roofType} Roof</span>
                        </div>
                        <table className="w-full text-left text-[10px]">
                          <tbody>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Pitch Angle / Slope Factor</td>
                              <td className="py-0.5 text-right font-medium">{roof.pitch || 6}:12 ({res.slopeFactor.toFixed(3)})</td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Plan Area / True Slope Area</td>
                              <td className="py-0.5 text-right font-medium">{res.planAreaSqm.toFixed(1)} m² / {res.trueAreaSqm.toFixed(1)} m²</td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Plywood Sheathing Vol</td>
                              <td className="py-0.5 text-right font-medium text-amber-500">{res.sheathingVolCuM.toFixed(2)} m³</td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Fiberglass Insulation Vol</td>
                              <td className="py-0.5 text-right font-medium text-emerald-500">{res.insulationVolCuM.toFixed(2)} m³</td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">Asphalt Shingles Weight</td>
                              <td className="py-0.5 text-right font-medium text-blue-500">{res.shingleWeightKg.toFixed(0)} kg</td>
                            </tr>
                            <tr>
                              <td className="py-0.5 text-muted-foreground">Timber Board Measure</td>
                              <td className="py-0.5 text-right font-medium text-indigo-500">{res.timberBoardFeet.toFixed(0)} FBM</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Roof Ventilation & Drainage Compliance */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Ventilation &amp; Slope Auditing</span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">IRC R806.1</Badge>
            </h4>
            {(() => {
              const warnings: string[] = [];
              const roofs = site.elements.filter((e) => e.kind === "roof") as RoofElement[];

              roofs.forEach((roof) => {
                const res = calculateRoofGeometry(roof);
                res.warnings.forEach((w) => warnings.push(`${roof.name}: ${w}`));
                res.ventilationWarnings.forEach((w) => warnings.push(`${roof.name}: ${w}`));
              });

              if (roofs.length === 0) {
                return (
                  <div className="text-[10px] text-muted-foreground/80 py-2 text-center">
                    No roofs drafted to audit.
                  </div>
                );
              }

              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    All roof slopes comply with pitch requirements and attic ventilation ratios.
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
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
