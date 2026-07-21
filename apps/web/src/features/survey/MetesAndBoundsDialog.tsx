import * as React from "react";
import { Compass, Plus, Trash2, CheckCircle2, Ruler } from "lucide-react";
import {
  bearingToAzimuth,
  boundaryArea,
  densifyBoundary,
  defaultSpatialContext,
  type Point,
  type Polygon,
  type Parcel,
  type Lot,
  type Building,
  type Easement,
  type RightOfWay,
} from "@thoth/domain";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useUiStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CourseRow {
  id: string;
  ns: "N" | "S";
  deg: number;
  min: number;
  sec: number;
  ew: "E" | "W";
  distance: number;
  isCurve: boolean;
  arcLength: number;
  radius: number;
}

const DEFAULT_COURSES: CourseRow[] = [
  { id: "c1", ns: "N", deg: 3, min: 52, sec: 8, ew: "E", distance: 178.64, isCurve: false, arcLength: 0, radius: 0 },
  { id: "c2", ns: "N", deg: 81, min: 44, sec: 15, ew: "E", distance: 82.79, isCurve: false, arcLength: 0, radius: 0 },
  { id: "c3", ns: "S", deg: 9, min: 56, sec: 35, ew: "E", distance: 189.40, isCurve: false, arcLength: 0, radius: 0 },
  { id: "c4", ns: "N", deg: 86, min: 7, sec: 52, ew: "W", distance: 16.99, isCurve: true, arcLength: 110.05, radius: 498.00 },
];

export function MetesAndBoundsDialog() {
  const open = useUiStore((s) => s.cogoOpen);
  const setOpen = useUiStore((s) => s.setCogoOpen);
  const site = useWorkspaceStore((s) => s.site);

  const [pobX, setPobX] = React.useState<number>(0);
  const [pobY, setPobY] = React.useState<number>(0);
  const [courses, setCourses] = React.useState<CourseRow[]>(DEFAULT_COURSES);
  const [lotName, setLotName] = React.useState<string>("Lot 11, Section 6 — Knightsbridge Drive");
  const [includeResidence, setIncludeResidence] = React.useState<boolean>(true);
  const [includeEasements, setIncludeEasements] = React.useState<boolean>(true);

  // Calculate polygon vertices from bearing + distance calls
  const { boundary, arcs, totalPerimeter, calculatedAreaSqFt, closureError } = React.useMemo(() => {
    const pts: Point[] = [{ x: pobX, y: pobY }];
    const edgeArcs: Record<number, number> = {};
    let current = { x: pobX, y: pobY };
    let perimeter = 0;

    courses.forEach((c, idx) => {
      const az = bearingToAzimuth({ ns: c.ns, deg: c.deg, min: c.min, sec: c.sec, ew: c.ew });
      // Convert azimuth to radians (0 = North/up = -Y, 90 = East = +X)
      const rad = (az * Math.PI) / 180;
      const dx = c.distance * Math.sin(rad);
      const dy = -c.distance * Math.cos(rad); // North is -Y in plan coordinates

      current = { x: current.x + dx, y: current.y + dy };
      perimeter += c.distance;

      if (idx < courses.length - 1) {
        pts.push(current);
      }

      if (c.isCurve && c.radius > 0 && c.arcLength > 0) {
        const delta = c.arcLength / c.radius;
        const bulge = Math.tan(delta / 4) * (c.ew === "W" ? -1 : 1);
        edgeArcs[idx] = bulge;
      }
    });

    const closePt = pts[0];
    const dx = current.x - closePt.x;
    const dy = current.y - closePt.y;
    const error = Math.sqrt(dx * dx + dy * dy);

    const area = boundaryArea(pts, edgeArcs);

    return {
      boundary: pts,
      arcs: edgeArcs,
      totalPerimeter: perimeter,
      calculatedAreaSqFt: area,
      closureError: error,
    };
  }, [pobX, pobY, courses]);

  function addCourse() {
    setCourses((prev) => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        ns: "N",
        deg: 0,
        min: 0,
        sec: 0,
        ew: "E",
        distance: 100,
        isCurve: false,
        arcLength: 0,
        radius: 0,
      },
    ]);
  }

  function updateCourse(id: string, patch: Partial<CourseRow>) {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function commitPlatToCanvas() {
    if (!site) return;

    // Build parcel & lot elements
    const parcel: Parcel = {
      id: `parcel_cogo_${Date.now()}`,
      kind: "parcel",
      name: `${lotName} (${calculatedAreaSqFt.toFixed(0)} sq ft)`,
      boundary,
      arcs,
      layerId: "c-prop",
    };

    const lot: Lot = {
      id: `lot_cogo_${Date.now()}`,
      kind: "lot",
      name: lotName,
      boundary,
      arcs,
      setback: 25,
      layerId: "c-prop-lot",
    };

    const newElements = [parcel, lot];

    // Optional Residence Footprint (#12720)
    if (includeResidence) {
      const house: Building = {
        id: `bldg_cogo_${Date.now()}`,
        kind: "building",
        name: "Two Story Brick & Frame House with Basement #12720",
        boundary: [
          { x: pobX + 26.65, y: pobY + 42.0 },
          { x: pobX + 66.55, y: pobY + 42.0 },
          { x: pobX + 66.55, y: pobY + 78.4 },
          { x: pobX + 52.05, y: pobY + 78.4 },
          { x: pobX + 52.05, y: pobY + 90.4 },
          { x: pobX + 26.65, y: pobY + 90.4 },
        ],
        storeys: 2,
        height: 30,
        dwellingUnits: 1,
        layerId: "a-bldg",
      };
      newElements.push(house);
    }

    // Optional Easements & R.O.W.
    if (includeEasements) {
      const row: RightOfWay = {
        id: `row_cogo_${Date.now()}`,
        kind: "row",
        name: "Knightsbridge Drive (54' R/W — 650.98' to P.C. @ Berwick Place)",
        boundary: [
          { x: pobX - 20, y: pobY - 54 },
          { x: pobX + 150, y: pobY - 54 },
          { x: pobX + 150, y: pobY },
          { x: pobX - 20, y: pobY },
        ],
        layerId: "c-road",
      };

      const northSewer: Easement = {
        id: `esmt_sewer_${Date.now()}`,
        kind: "easement",
        name: "20' Sanitary Sewer Easement",
        boundary: [
          { x: pobX + 12.05, y: pobY + 158.23 },
          { x: pobX + 93.98, y: pobY + 170.12 },
          { x: pobX + 93.98, y: pobY + 190.12 },
          { x: pobX + 12.05, y: pobY + 178.23 },
        ],
        layerId: "c-ease",
      };

      const westStorm: Easement = {
        id: `esmt_storm_${Date.now()}`,
        kind: "easement",
        name: "20' Storm Drainage Easement",
        boundary: [
          { x: pobX, y: pobY },
          { x: pobX + 20, y: pobY },
          { x: pobX + 32.05, y: pobY + 178.23 },
          { x: pobX + 12.05, y: pobY + 178.23 },
        ],
        layerId: "c-ease",
      };

      const eastUtility: Easement = {
        id: `esmt_ingress_${Date.now()}`,
        kind: "easement",
        name: "40' Ingress-Egress and Utility Easement",
        boundary: [
          { x: pobX + 86.68, y: pobY + 3.57 },
          { x: pobX + 126.68, y: pobY + 3.57 },
          { x: pobX + 93.98, y: pobY + 190.12 },
          { x: pobX + 53.98, y: pobY + 190.12 },
        ],
        layerId: "c-ease",
      };

      newElements.push(row, northSewer, westStorm, eastUtility);
    }

    useWorkspaceStore.getState().addElements(newElements);
    setOpen(false);
  }

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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" /> COGO Metes &amp; Bounds Plat Builder
          </DialogTitle>
          <DialogDescription>
            Hand-enter survey bearing and distance calls to construct an exact plat diagram on the canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Left / Center: Course Table */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Survey Calls (Courses)</span>
              <Button variant="outline" size="sm" onClick={addCourse}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Course
              </Button>
            </div>

            <ScrollArea className="h-[280px] rounded-md border p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-1 text-left">N/S</th>
                    <th className="p-1 text-left">Deg°</th>
                    <th className="p-1 text-left">Min'</th>
                    <th className="p-1 text-left">Sec"</th>
                    <th className="p-1 text-left">E/W</th>
                    <th className="p-1 text-left">Dist (ft)</th>
                    <th className="p-1 text-center">Curve</th>
                    <th className="p-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, i) => (
                    <React.Fragment key={c.id}>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="p-1">
                          <select
                            value={c.ns}
                            onChange={(e) => updateCourse(c.id, { ns: e.target.value as "N" | "S" })}
                            className="rounded border p-1"
                          >
                            <option value="N">N</option>
                            <option value="S">S</option>
                          </select>
                        </td>
                        <td className="p-1"><Input type="number" value={c.deg} onChange={(e) => updateCourse(c.id, { deg: Number(e.target.value) })} className="w-12 h-7 text-xs" /></td>
                        <td className="p-1"><Input type="number" value={c.min} onChange={(e) => updateCourse(c.id, { min: Number(e.target.value) })} className="w-12 h-7 text-xs" /></td>
                        <td className="p-1"><Input type="number" value={c.sec} onChange={(e) => updateCourse(c.id, { sec: Number(e.target.value) })} className="w-12 h-7 text-xs" /></td>
                        <td className="p-1">
                          <select
                            value={c.ew}
                            onChange={(e) => updateCourse(c.id, { ew: e.target.value as "E" | "W" })}
                            className="rounded border p-1"
                          >
                            <option value="E">E</option>
                            <option value="W">W</option>
                          </select>
                        </td>
                        <td className="p-1"><Input type="number" value={c.distance} onChange={(e) => updateCourse(c.id, { distance: Number(e.target.value) })} className="w-16 h-7 text-xs" /></td>
                        <td className="p-1 text-center">
                          <input type="checkbox" checked={c.isCurve} onChange={(e) => updateCourse(c.id, { isCurve: e.target.checked })} />
                        </td>
                        <td className="p-1">
                          {courses.length > 3 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCourse(c.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                      {c.isCurve && (
                        <tr className="bg-muted/30 text-[11px]">
                          <td colSpan={8} className="p-1.5 pl-6">
                            <div className="flex items-center gap-3">
                              <span>Arc L (ft):</span>
                              <Input type="number" value={c.arcLength} onChange={(e) => updateCourse(c.id, { arcLength: Number(e.target.value) })} className="w-16 h-6 text-xs" />
                              <span>Radius R (ft):</span>
                              <Input type="number" value={c.radius} onChange={(e) => updateCourse(c.id, { radius: Number(e.target.value) })} className="w-16 h-6 text-xs" />
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
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={includeResidence} onChange={(e) => setIncludeResidence(e.target.checked)} />
                Include Residence Footprint (#12720)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={includeEasements} onChange={(e) => setIncludeEasements(e.target.checked)} />
                Include Easements &amp; R.O.W.
              </label>
            </div>
          </div>

          {/* Right: Live Preview & Math */}
          <div className="space-y-3 rounded-md border p-3 bg-muted/20">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Live Boundary Preview</span>

            <div className="h-40 rounded border bg-background flex items-center justify-center overflow-hidden">
              <svg viewBox={`${minX} ${minY} ${vw} ${vh}`} className="w-full h-full">
                <polygon
                  points={densified.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                  fill="#2563eb"
                  fillOpacity={0.15}
                  stroke="#2563eb"
                  strokeWidth={1.5}
                />
                {densified.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={1.5} fill="#0f172a" />
                ))}
              </svg>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calculated Area:</span>
                <span className="font-semibold">{calculatedAreaSqFt.toLocaleString("en-US", { maximumFractionDigits: 0 })} sq ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Acres:</span>
                <span className="font-semibold">{(calculatedAreaSqFt / 43560).toFixed(3)} AC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perimeter:</span>
                <span>{totalPerimeter.toFixed(2)} ft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closure Error:</span>
                <Badge variant={closureError < 1 ? "secondary" : "outline"} className="text-[10px]">
                  {closureError.toFixed(3)} ft
                </Badge>
              </div>
            </div>

            <Button className="w-full" size="sm" onClick={commitPlatToCanvas}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Draw Plat on Canvas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
