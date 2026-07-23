import * as React from "react";
import { Compass, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { densifyBoundary } from "@thoth/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMetesAndBoundsState } from "./hooks/useMetesAndBoundsState";
import { SURVEY_STYLES } from "./styles/surveyDesignSystem";

export function MetesAndBoundsDialog() {
  const {
    open,
    setOpen,
    site,
    courses,
    includeResidence,
    setIncludeResidence,
    includeEasements,
    setIncludeEasements,
    boundary,
    arcs,
    totalPerimeter,
    calculatedAreaSqFt,
    closureError,
    addCourse,
    updateCourse,
    removeCourse,
    commitPlatToCanvas,
  } = useMetesAndBoundsState();

  if (!site) return null;

  // Preview ViewBox
  const densified = densifyBoundary(boundary, arcs, 2);
  const minX = Math.min(...densified.map((p) => p.x)) - 20;
  const maxX = Math.max(...densified.map((p) => p.x)) + 20;
  const minY = Math.min(...densified.map((p) => p.y)) - 20;
  const maxY = Math.max(...densified.map((p) => p.y)) + 20;
  const vw = Math.max(maxX - minX, 50);
  const vh = Math.max(maxY - minY, 50);

  return (

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl bg-background border-border text-foreground animate-dialog-in">
        <DialogHeader>
          <DialogTitle className={SURVEY_STYLES.dialogTitle}>
            <Compass className="h-5 w-5 text-amber-400" /> COGO Metes &amp; Bounds Plat Builder
          </DialogTitle>
          <DialogDescription>
            Hand-enter survey bearing and distance calls to construct an exact plat diagram on the canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Left / Center: Course Table */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className={SURVEY_STYLES.label}>Survey Calls (Courses)</span>
              <Button variant="outline" size="sm" onClick={addCourse} className={SURVEY_STYLES.btnSecondary}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Course
              </Button>
            </div>

            <ScrollArea className="h-[280px] rounded-md border border-border p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className={SURVEY_STYLES.tableTh}>N/S</th>
                    <th className={SURVEY_STYLES.tableTh}>Deg°</th>
                    <th className={SURVEY_STYLES.tableTh}>Min'</th>
                    <th className={SURVEY_STYLES.tableTh}>Sec"</th>
                    <th className={SURVEY_STYLES.tableTh}>E/W</th>
                    <th className={SURVEY_STYLES.tableTh}>Dist (ft)</th>
                    <th className={SURVEY_STYLES.tableTh + " text-center"}>Curve</th>
                    <th className={SURVEY_STYLES.tableTh}></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <React.Fragment key={c.id}>

                      <tr className={SURVEY_STYLES.tableRow}>
                        <td className="p-1">
                          <select
                            value={c.ns}
                            onChange={(e) => updateCourse(c.id, { ns: e.target.value as "N" | "S" })}
                            className={SURVEY_STYLES.select + " p-1"}
                          >
                            <option value="N">N</option>
                            <option value="S">S</option>
                          </select>
                        </td>
                        <td className="p-1"><Input type="number" value={c.deg} onChange={(e) => updateCourse(c.id, { deg: Number(e.target.value) })} className={SURVEY_STYLES.input + " w-12 h-7 text-xs"} /></td>
                        <td className="p-1"><Input type="number" value={c.min} onChange={(e) => updateCourse(c.id, { min: Number(e.target.value) })} className={SURVEY_STYLES.input + " w-12 h-7 text-xs"} /></td>
                        <td className="p-1"><Input type="number" value={c.sec} onChange={(e) => updateCourse(c.id, { sec: Number(e.target.value) })} className={SURVEY_STYLES.input + " w-12 h-7 text-xs"} /></td>
                        <td className="p-1">
                          <select
                            value={c.ew}
                            onChange={(e) => updateCourse(c.id, { ew: e.target.value as "E" | "W" })}
                            className={SURVEY_STYLES.select + " p-1"}
                          >
                            <option value="E">E</option>
                            <option value="W">W</option>
                          </select>
                        </td>
                        <td className="p-1"><Input type="number" value={c.distance} onChange={(e) => updateCourse(c.id, { distance: Number(e.target.value) })} className={SURVEY_STYLES.input + " w-16 h-7 text-xs"} /></td>
                        <td className="p-1 text-center">
                          <input type="checkbox" checked={c.isCurve} onChange={(e) => updateCourse(c.id, { isCurve: e.target.checked })} />
                        </td>
                        <td className="p-1">
                          {courses.length > 3 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-400 hover:bg-muted" onClick={() => removeCourse(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                      {c.isCurve && (
                        <tr className="bg-card/60 text-[11px]">
                          <td colSpan={8} className="p-1.5 pl-6">
                            <div className="flex items-center gap-3">
                              <span className={SURVEY_STYLES.label}>Arc L (ft):</span>
                              <Input type="number" value={c.arcLength} onChange={(e) => updateCourse(c.id, { arcLength: Number(e.target.value) })} className={SURVEY_STYLES.input + " w-16 h-6 text-xs"} />
                              <span className={SURVEY_STYLES.label}>Radius R (ft):</span>
                              <Input type="number" value={c.radius} onChange={(e) => updateCourse(c.id, { radius: Number(e.target.value) })} className={SURVEY_STYLES.input + " w-16 h-6 text-xs"} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </ScrollArea>

            {/* Options */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                <input type="checkbox" checked={includeResidence} onChange={(e) => setIncludeResidence(e.target.checked)} />
                Include Residence Footprint (#12720)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                <input type="checkbox" checked={includeEasements} onChange={(e) => setIncludeEasements(e.target.checked)} />
                Include Easements &amp; R.O.W.
              </label>
            </div>
          </div>

          {/* Right: Live Preview & Math */}
          <div className={SURVEY_STYLES.card + " space-y-3"}>
            <span className={SURVEY_STYLES.label}>Live Boundary Preview</span>

            <div className="h-40 rounded border border-border bg-background flex items-center justify-center overflow-hidden">
              <svg viewBox={`${minX} ${minY} ${vw} ${vh}`} className="w-full h-full">
                <polygon
                  points={densified.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
                {densified.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#fbbf24" />
                ))}
              </svg>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculated Area:</span>
                <span className="font-semibold text-foreground">{calculatedAreaSqFt.toLocaleString("en-US", { maximumFractionDigits: 0 })} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acres:</span>
                <span className="font-semibold text-foreground">{(calculatedAreaSqFt / 43560).toFixed(3)} AC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perimeter:</span>
                <span className="text-foreground">{totalPerimeter.toFixed(2)} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closure Error:</span>
                <span className={SURVEY_STYLES.badge}>
                  {closureError.toFixed(3)} ft
                </span>
              </div>
            </div>

            <Button className={SURVEY_STYLES.btnPrimary + " w-full"} size="sm" onClick={commitPlatToCanvas}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Draw Plat on Canvas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
