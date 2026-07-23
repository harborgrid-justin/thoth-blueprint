import * as React from "react";
import { HardHat } from "lucide-react";
import {
  computeRenovationTakeoffs,
  runRenovationAudit,
  calculateStairGeometry,
  calculateCurtainWallGeometry,
  calculateRoofGeometry,
  compileUnitSchedule,
  type Stair,
  type CurtainWall,
  type RoofElement,
} from "@thoth/domain";

import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/ui/data-grid";
import { cn } from "@/lib/utils";
import { useQtoState } from "./hooks/useQtoState";
import {
  getStairsSafetyWarnings,
  getCurtainWallWarnings,
  getDoorWindowCodeWarnings,
  getRoofWarnings,
} from "./helpers/qtoHelpers";
import { WORKSPACE_STYLES } from "./styles/workspaceDesignSystem";


export function QtoPanel() {
  const {
    site,
    selection,
    hoveredElementId,
    hoverElement,
    select,
    activeTab,
    setActiveTab,
    payItems,
    assignedReports,
    totalCost,
  } = useQtoState();

  if (!site) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-3 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className={WORKSPACE_STYLES.title}>
          <HardHat className="h-4 w-4 text-cyan-400" /> QTO &amp; Earthwork
          Takeoffs
        </h3>
        <div className={WORKSPACE_STYLES.pillBar}>
          <button
            onClick={() => setActiveTab("earthwork")}
            className={
              activeTab === "earthwork"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Earthwork
          </button>
          <button
            onClick={() => setActiveTab("payitems")}
            className={
              activeTab === "payitems"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Cost Sheets
          </button>
          <button
            onClick={() => setActiveTab("renovation")}
            className={
              activeTab === "renovation"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Renovation
          </button>
          <button
            onClick={() => setActiveTab("stairs")}
            className={
              activeTab === "stairs"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Stairs
          </button>
          <button
            onClick={() => setActiveTab("curtainwalls")}
            className={
              activeTab === "curtainwalls"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Curtains
          </button>
          <button
            onClick={() => setActiveTab("assemblies")}
            className={
              activeTab === "assemblies"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Doors/Wins
          </button>
          <button
            onClick={() => setActiveTab("roofs")}
            className={
              activeTab === "roofs"
                ? WORKSPACE_STYLES.btnPillActive
                : WORKSPACE_STYLES.btnPill
            }
          >
            Roofs
          </button>
        </div>
      </div>

      {activeTab === "earthwork" && (
        <div className="flex flex-col gap-3">
          {/* Average End Area Volumes List */}
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader + " flex items-center justify-between"}>
              <span>Average End Area Volumes</span>
              <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 text-[9px] h-4">
                TIN Ground
              </Badge>
            </h4>
            <DataGrid
              title="Average End Area Volumes"
              onExportCsv={() => {}}
              columns={[
                { id: "station", header: "Station Interval", width: 100, pinned: true },
                { id: "cut", header: "Cut (CY)", width: 80, align: "right" },
                { id: "fill", header: "Fill (CY)", width: 80, align: "right" },
                { id: "net", header: "Net", width: 90, align: "right", accessor: (row: any) => (
                  <span className={row.net < 0 ? "text-rose-500" : "text-emerald-500"}>
                    {row.net > 0 ? `+${row.net.toFixed(1)} (C)` : `${row.net.toFixed(1)} (F)`}
                  </span>
                )}
              ]}
              data={[
                { station: "0+00 to 2+00", cut: 150.0, fill: 320.0, net: -170.0 },
                { station: "2+00 to 5+00", cut: 450.0, fill: 180.0, net: 270.0 },
                { station: "5+00 to 8+00", cut: 610.0, fill: 120.0, net: 490.0 },
                { station: "Cumulative", cut: 1210.0, fill: 620.0, net: 590.0 }
              ]}
            />
          </div>

          {/* Mass Haul Diagram */}
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader}>
              Mass Haul Diagram Chart (Net Volume)
            </h4>
            <div className="h-[90px] w-full bg-slate-950/60 rounded-md overflow-hidden relative">
              <svg
                className="h-full w-full"
                viewBox="0 0 300 80"
                preserveAspectRatio="none"
              >
                <line
                  x1="0"
                  y1="40"
                  x2="300"
                  y2="40"
                  stroke="#475569"
                  strokeWidth="0.5"
                  strokeDasharray="2"
                />
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
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader}>
              Pay Item Cost Estimates
            </h4>
            <div className="flex flex-col gap-2">
              {assignedReports.map((r, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 border-b border-slate-800/60 pb-1.5 last:border-b-0"
                >
                  <div className={WORKSPACE_STYLES.listItem}>
                    <span>{r.elementName}</span>
                    <span>
                      $
                      {r.cost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className={WORKSPACE_STYLES.listItemSub}>
                    <span>{r.itemName}</span>
                    <span>
                      {r.qty.toFixed(1)} {r.unit}
                    </span>
                  </div>
                </div>
              ))}

              <div className={WORKSPACE_STYLES.summaryRow}>
                <span>Total Construction Est.</span>
                <span>
                  $
                  {totalCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick assign selector */}
          <div className={WORKSPACE_STYLES.cardSubtle + " flex flex-col gap-2"}>
            <span className={WORKSPACE_STYLES.cardHeader}>
              Assign Item to Selection
            </span>
            {selection.length > 0 ? (
              <div className="flex gap-1.5 items-center">
                <select className={WORKSPACE_STYLES.select}>
                  {payItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.id} - {item.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" className={WORKSPACE_STYLES.btnPrimary + " h-7 text-[10px] px-2"}>
                  Bind
                </Button>
              </div>
            ) : (
              <div className={WORKSPACE_STYLES.textMuted + " text-[10px] text-center py-2"}>
                Select an element on canvas to bind pay items.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "renovation" && (
        <div className="flex flex-col gap-3">
          {/* Renovation Quantities (Takeoffs) */}
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader + " flex items-center justify-between"}>
              <span>Renovation Quantity Takeoffs</span>
              <Badge className={WORKSPACE_STYLES.badge}>
                REQ-UNIMP-006
              </Badge>
            </h4>
            {(() => {
              const takeoffs = computeRenovationTakeoffs(site);
              return (
                <table className={WORKSPACE_STYLES.subtable}>
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                      <th className="py-1">Status</th>
                      <th className="py-1 text-center">Count</th>
                      <th className="py-1 text-right">Plan Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={WORKSPACE_STYLES.subtableRow}>
                      <td className="py-1 font-medium text-slate-200 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>{" "}
                        Existing
                      </td>
                      <td className="py-1 text-center font-mono font-semibold text-slate-200">
                        {takeoffs.existing.count}
                      </td>
                      <td className="py-1 text-right font-mono font-semibold text-slate-200">
                        {takeoffs.existing.totalArea.toFixed(1)} sqm
                      </td>
                    </tr>
                    <tr className={WORKSPACE_STYLES.subtableRow}>
                      <td className="py-1 font-medium text-emerald-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>{" "}
                        New Construction
                      </td>
                      <td className="py-1 text-center font-mono font-semibold text-emerald-400">
                        {takeoffs.new.count}
                      </td>
                      <td className="py-1 text-right font-mono font-semibold text-emerald-400">
                        {takeoffs.new.totalArea.toFixed(1)} sqm
                      </td>
                    </tr>
                    <tr className={WORKSPACE_STYLES.subtableRow}>
                      <td className="py-1 font-medium text-rose-400 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500"></span>{" "}
                        Demolition
                      </td>
                      <td className="py-1 text-center font-mono font-semibold text-rose-400">
                        {takeoffs.demolished.count}
                      </td>
                      <td className="py-1 text-right font-mono font-semibold text-rose-400">
                        {takeoffs.demolished.totalArea.toFixed(1)} sqm
                      </td>
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
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">
                REQ-UNIMP-010
              </Badge>
            </h4>
            {(() => {
              const warnings = runRenovationAudit(site);
              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    No renovation design violations or structural standard
                    overlaps detected.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500 font-medium"
                    >
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
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">
                REQ-UNIMP-025
              </Badge>
            </h4>
            {(() => {
              const stairs = site.elements.filter(
                (e) => e.kind === "stair",
              ) as Stair[];
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
                    const isHovered = hoveredElementId === stair.id;
                    const isSelected = selection.includes(stair.id);
                    return (
                      <div
                        key={stair.id}
                        className={cn(
                          "border-b border-border/40 pb-2 last:border-0 last:pb-0 p-1.5 rounded cursor-pointer transition-colors duration-150 border",
                          isHovered
                            ? "bg-amber-500/10 border-amber-500/30"
                            : isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "border-transparent",
                        )}
                        onMouseEnter={() => hoverElement(stair.id)}
                        onMouseLeave={() => hoverElement(null)}
                        onClick={() => select(stair.id)}
                      >
                        <div className="font-semibold text-slate-100 mb-1">
                          {stair.name} ({stair.stairType})
                        </div>
                        <table className={WORKSPACE_STYLES.subtable}>
                          <tbody>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Risers / Treads
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal}>
                                {geom.riserCount} R / {geom.treadCount} T
                              </td>
                            </tr>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Actual Riser Height
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal}>
                                {(geom.actualRiserHeight * 100).toFixed(1)} cm
                              </td>
                            </tr>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Concrete Volume
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal + " text-emerald-400"}>
                                {geom.concreteVolumeCuM.toFixed(2)} m³
                              </td>
                            </tr>
                            <tr>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Timber Board Feet
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal + " text-amber-400"}>
                                {geom.timberBoardFeet.toFixed(0)} BF
                              </td>
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
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader + " flex items-center justify-between"}>
              <span>Stairs Safety &amp; Clearance Audit</span>
              <Badge className={WORKSPACE_STYLES.badgeAmber}>
                REQ-UNIMP-017
              </Badge>
            </h4>
            {(() => {
              const warnings = getStairsSafetyWarnings(site);
              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    Stairs comply with structural limits and overhead clearance
                    standards.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500 font-medium"
                    >
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
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader + " flex items-center justify-between"}>
              <span>Panel Schedule &amp; Count</span>
              <Badge className={WORKSPACE_STYLES.badge}>
                REQ-UNIMP-040
              </Badge>
            </h4>
            {(() => {
              const walls = site.elements.filter(
                (e) => e.kind === "curtainwall",
              ) as CurtainWall[];
              if (walls.length === 0) {
                return (
                  <div className={WORKSPACE_STYLES.textMuted + " text-[10px] py-2 text-center"}>
                    No curtain walls drafted in the current site plan.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3">
                  {walls.map((wall) => {
                    const geom = calculateCurtainWallGeometry(wall);
                    const isHovered = hoveredElementId === wall.id;
                    const isSelected = selection.includes(wall.id);
                    return (
                      <div
                        key={wall.id}
                        className={cn(
                          "border-b border-slate-800/40 pb-2 last:border-0 last:pb-0 p-1.5 rounded cursor-pointer transition-colors duration-150 border",
                          isHovered
                            ? "bg-amber-500/10 border-amber-500/30"
                            : isSelected
                              ? "bg-cyan-500/10 border-cyan-500/30"
                              : "border-transparent",
                        )}
                        onMouseEnter={() => hoverElement(wall.id)}
                        onMouseLeave={() => hoverElement(null)}
                        onClick={() => select(wall.id)}
                      >
                        <div className="font-semibold text-slate-100 mb-1 flex justify-between">
                          <span>{wall.name}</span>
                          <span className="text-slate-400 text-[9px] font-mono">
                            U-Factor: {geom.overallUFactor.toFixed(3)} W/m²K
                          </span>
                        </div>
                        <table className={WORKSPACE_STYLES.subtable + " mb-2"}>
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 text-[9px]">
                              <th className="py-0.5">Material</th>
                              <th className="py-0.5">Dimensions</th>
                              <th className="py-0.5 text-right">Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {geom.inventory.map((item, idx) => (
                              <tr
                                key={idx}
                                className={WORKSPACE_STYLES.subtableRow}
                              >
                                <td className="py-0.5 capitalize text-slate-200">
                                  {item.material}
                                </td>
                                <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                  {item.width.toFixed(2)}m x{" "}
                                  {item.height.toFixed(2)}m
                                </td>
                                <td className={WORKSPACE_STYLES.subtableTdVal}>
                                  {item.count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-between items-center text-[9px] bg-muted/30 p-1 rounded border border-border/50">
                          <span className="text-muted-foreground">
                            Thermal Resistance:
                          </span>
                          <span className="font-semibold text-emerald-500">
                            R-{geom.overallRValue.toFixed(2)}
                          </span>
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
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">
                REQ-UNIMP-026
              </Badge>
            </h4>
            {(() => {
              const warnings = getCurtainWallWarnings(site);
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
                    <div
                      key={idx}
                      className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500 font-medium"
                    >
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
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4">
                REQ-UNIMP-050
              </Badge>
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
                  {schedule.map((item) => {
                    const isHovered = hoveredElementId === item.id;
                    const isSelected = selection.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "border-b border-border/40 pb-2 last:border-0 last:pb-0 p-1.5 rounded cursor-pointer transition-colors duration-150 border",
                          isHovered
                            ? "bg-amber-500/10 border-amber-500/30"
                            : isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "border-transparent",
                        )}
                        onMouseEnter={() => hoverElement(item.id)}
                        onMouseLeave={() => hoverElement(null)}
                        onClick={() => select(item.id)}
                      >
                        <div className="font-semibold text-foreground mb-1 flex justify-between">
                          <span>
                            {item.name} ({item.kind})
                          </span>
                          <span className="text-muted-foreground text-[9px] capitalize">
                            {item.type}
                          </span>
                        </div>
                        <table className="w-full text-left text-[10px]">
                          <tbody>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">
                                Dimensions (WxH)
                              </td>
                              <td className="py-0.5 text-right font-medium">
                                {item.width.toFixed(2)}m x{" "}
                                {item.height.toFixed(2)}m
                              </td>
                            </tr>
                            <tr className="border-b border-border/30">
                              <td className="py-0.5 text-muted-foreground">
                                Hardware / Frame
                              </td>
                              <td className="py-0.5 text-right font-medium text-amber-500">
                                {item.hardware}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-0.5 text-muted-foreground">
                                Fire / Sound / Glazing
                              </td>
                              <td className="py-0.5 text-right font-medium text-emerald-500">
                                {item.fireRating} / STC {item.stc} /{" "}
                                {item.safety}
                              </td>
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

          {/* Natural Lighting & ADA Egress Code Compliance (REQ-UNIMP-049) */}
          <div className="rounded-md border border-border bg-card p-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1.5 flex items-center justify-between">
              <span>Glazing &amp; Egress Code Auditing</span>
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">
                REQ-UNIMP-049
              </Badge>
            </h4>
            {(() => {
              const warnings = getDoorWindowCodeWarnings(site);
              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    All doors and windows comply with ADA clearances and glazing
                    area parameters.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500 font-medium"
                    >
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
          <div className={WORKSPACE_STYLES.cardSubtle}>
            <h4 className={WORKSPACE_STYLES.cardHeader + " flex items-center justify-between"}>
              <span>Roof Construction Takeoffs</span>
              <Badge className={WORKSPACE_STYLES.badge}>
                Material Volume
              </Badge>
            </h4>
            {(() => {
              const roofs = site.elements.filter(
                (e) => e.kind === "roof",
              ) as RoofElement[];
              if (roofs.length === 0) {
                return (
                  <div className={WORKSPACE_STYLES.textMuted + " text-[10px] py-2 text-center"}>
                    No roof elements drafted in the current site plan.
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                  {roofs.map((roof) => {
                    const res = calculateRoofGeometry(roof);
                    const isHovered = hoveredElementId === roof.id;
                    const isSelected = selection.includes(roof.id);
                    return (
                      <div
                        key={roof.id}
                        className={cn(
                          "border-b border-slate-800/40 pb-2 last:border-0 last:pb-0 p-1.5 rounded cursor-pointer transition-colors duration-150 border",
                          isHovered
                            ? "bg-amber-500/10 border-amber-500/30"
                            : isSelected
                              ? "bg-cyan-500/10 border-cyan-500/30"
                              : "border-transparent",
                        )}
                        onMouseEnter={() => hoverElement(roof.id)}
                        onMouseLeave={() => hoverElement(null)}
                        onClick={() => select(roof.id)}
                      >
                        <div className="font-semibold text-slate-100 mb-1 flex justify-between">
                          <span>{roof.name}</span>
                          <span className="text-slate-400 text-[9px] capitalize font-mono">
                            {roof.roofType} Roof
                          </span>
                        </div>
                        <table className={WORKSPACE_STYLES.subtable}>
                          <tbody>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Pitch Angle / Slope Factor
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal}>
                                {roof.pitch || 6}:12 (
                                {res.slopeFactor.toFixed(3)})
                              </td>
                            </tr>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Plan Area / True Slope Area
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal}>
                                {res.planAreaSqm.toFixed(1)} m² /{" "}
                                {res.trueAreaSqm.toFixed(1)} m²
                              </td>
                            </tr>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Plywood Sheathing Vol
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal + " text-amber-400"}>
                                {res.sheathingVolCuM.toFixed(2)} m³
                              </td>
                            </tr>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Fiberglass Insulation Vol
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal + " text-emerald-400"}>
                                {res.insulationVolCuM.toFixed(2)} m³
                              </td>
                            </tr>
                            <tr className={WORKSPACE_STYLES.subtableRow}>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Asphalt Shingles Weight
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal + " text-cyan-400"}>
                                {res.shingleWeightKg.toFixed(0)} kg
                              </td>
                            </tr>
                            <tr>
                              <td className={WORKSPACE_STYLES.subtableTdLabel}>
                                Timber Board Measure
                              </td>
                              <td className={WORKSPACE_STYLES.subtableTdVal + " text-purple-400"}>
                                {res.timberBoardFeet.toFixed(0)} BF
                              </td>
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
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] h-4">
                IRC R806.1
              </Badge>
            </h4>
            {(() => {
              const warnings = getRoofWarnings(site);
              const hasRoofs = site.elements.some((e: any) => e.kind === "roof");

              if (!hasRoofs) {
                return (
                  <div className="text-[10px] text-muted-foreground/80 py-2 text-center">
                    No roofs drafted to audit.
                  </div>
                );
              }

              if (warnings.length === 0) {
                return (
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-emerald-500">
                    All roof slopes comply with pitch requirements and attic
                    ventilation ratios.
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {warnings.map((w, idx) => (
                    <div
                      key={idx}
                      className="rounded border border-rose-500/20 bg-rose-500/5 p-2 text-[10px] text-rose-500 font-medium"
                    >
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

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-medium border",
        className,
      )}
    >
      {children}
    </span>
  );
}
