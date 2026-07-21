import * as React from "react";
import { Ruler, Trash2 } from "lucide-react";
import {
  isSpatialElement,
  LAND_USE_DEFINITIONS,
  measuredArea,
  measuredPerimeter,
  type LandUseCategory,
  type PlanElement,
} from "@thoth/domain";
import { elementMeta } from "@/lib/elementMeta";
import { formatArea, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePropertiesState } from "./hooks/usePropertiesState";
import { countCurvedEdges } from "./helpers/propertiesHelpers";

/** Inspector for the current selection: element attributes and measurements. */
export function PropertiesPanel() {
  const {
    site,
    selection,
    selectedElement,
    validatedAlignments,
    deleteSelection,
  } = usePropertiesState();

  if (!site) {
    return null;
  }

  if (selection.length === 0) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Site
        </h3>
        <Field label="Name" value={site.name} readOnly />
        <div className="grid grid-cols-3 gap-2">
          <Field label="CRS" value={site.spatial.crs} readOnly />
          <Field label="Units" value={site.spatial.units} readOnly />
          <Field label="Scale" value={`1:${site.spatial.scale}`} readOnly />
        </div>

        {/* Alignment Design Criteria & AASHTO Checks */}
        {validatedAlignments.length > 0 && (
          <div className="mt-2 border-t border-border/40 pt-3">
            <h4 className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wide mb-1.5">
              Alignment Design Speeds &amp; Checks
            </h4>
            <div className="flex flex-col gap-2">
              {validatedAlignments.map((item: any) => {
                const { align, resolved, speed, violations } = item;
                return (
                  <div
                    key={align.id}
                    className="rounded border border-border bg-muted/10 p-2"
                  >
                    <div className="flex justify-between items-center text-[11px] font-semibold">
                      <span className="text-primary">{align.name}</span>
                      <span className="text-muted-foreground">{speed} MPH</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                      <span>Length: {resolved.length.toFixed(1)} ft</span>
                      <span>Curves: {resolved.curves.length}</span>
                    </div>

                    {/* Violations List */}
                    {violations.length > 0 ? (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {violations.map((v: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-[9px] text-rose-400 bg-rose-500/10 rounded px-1.5 py-0.5 border border-rose-500/15"
                          >
                            ⚠️ Min R: {v.requiredRadius} ft | Curve R:{" "}
                            {v.curveRadius.toFixed(1)} ft
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5 border border-emerald-500/15 mt-1.5">
                        ✅ Design standards fully satisfied.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground/70 mt-1">
          Select an element to edit its planning attributes, or pick a drawing
          tool to add parcels, zones, lots, land uses, and buildings.
        </p>
      </div>
    );
  }

  if (selection.length > 1) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Selection
        </h3>
        <p className="text-sm text-foreground">
          {selection.length} elements selected
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteSelection}
          className="w-full"
        >
          <Trash2 className="h-4 w-4" /> Delete {selection.length} elements
        </Button>
      </div>
    );
  }

  if (!selectedElement) {
    return null;
  }

  return <SingleElementInspector element={selectedElement} />;
}

function SingleElementInspector({ element }: { element: PlanElement }) {
  const { site, updateElement, deleteSelection, openPlat } =
    usePropertiesState();
  if (!site) {
    return null;
  }
  const meta = elementMeta(element.kind);

  const set = (patch: Partial<PlanElement>) => updateElement(element.id, patch);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Properties
        </h3>
        <Badge variant="outline" className="capitalize">
          {meta.label}
        </Badge>
      </div>

      {element.kind === "note" ? (
        <TextField
          label="Text"
          value={element.text}
          onCommit={(text) => set({ text })}
        />
      ) : element.kind === "tree" ? (
        <TextField
          label="Species"
          value={element.species ?? ""}
          onCommit={(species) => set({ species })}
        />
      ) : element.kind === "spot" ? (
        <TextField
          label="Label"
          value={element.label ?? ""}
          onCommit={(label) => set({ label })}
        />
      ) : (
        <TextField
          label="Name"
          value={element.name}
          onCommit={(name) => set({ name })}
        />
      )}

      {isSpatialElement(element) && (
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Area"
            value={formatArea(
              measuredArea(element.boundary, site.spatial, "sqm"),
              "sqm",
            )}
            readOnly
          />
          <Field
            label="Perimeter"
            value={`${formatNumber(measuredPerimeter(element.boundary, site.spatial), 1)} m`}
            readOnly
          />
          <Field
            label="Vertices"
            value={String(element.boundary.length)}
            readOnly
          />
        </div>
      )}

      {element.kind === "parcel" && (
        <TextField
          label="APN"
          value={element.apn ?? ""}
          onCommit={(apn) => set({ apn })}
        />
      )}

      {element.kind === "zone" && (
        <>
          <TextField
            label="Designation"
            value={element.designation}
            onCommit={(designation) => set({ designation })}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Max coverage"
              value={element.maxCoverage ?? 0}
              step={0.05}
              onCommit={(v) => set({ maxCoverage: v })}
            />
            <NumberField
              label="Max FAR"
              value={element.maxFar ?? 0}
              step={0.1}
              onCommit={(v) => set({ maxFar: v })}
            />
            <NumberField
              label="Max height"
              value={element.maxHeight ?? 0}
              onCommit={(v) => set({ maxHeight: v })}
            />
            <NumberField
              label="Min setback"
              value={element.minSetback ?? 0}
              onCommit={(v) => set({ minSetback: v })}
            />
          </div>
        </>
      )}

      {element.kind === "landuse" && (
        <LandUseSelect
          value={element.category}
          onChange={(category) => set({ category })}
        />
      )}

      {element.kind === "lot" && (
        <NumberField
          label="Setback"
          value={element.setback ?? 0}
          onCommit={(v) => set({ setback: v })}
        />
      )}

      {element.kind === "building" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Storeys"
              value={element.storeys}
              onCommit={(v) => set({ storeys: Math.max(1, Math.round(v)) })}
            />
            <NumberField
              label="Height"
              value={element.height ?? 0}
              onCommit={(v) => set({ height: v })}
            />
            <NumberField
              label="Dwelling units"
              value={element.dwellingUnits ?? 0}
              onCommit={(v) =>
                set({ dwellingUnits: Math.max(0, Math.round(v)) })
              }
            />
          </div>
          <LandUseSelect
            label="Use"
            value={element.use ?? "residential"}
            onChange={(use) => set({ use })}
          />
        </>
      )}

      {element.kind === "row" && (
        <NumberField
          label="Width"
          value={element.width ?? 0}
          onCommit={(v) => set({ width: v })}
        />
      )}

      {element.kind === "openspace" && (
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <Label className="text-sm text-foreground">Public dedication</Label>
          <Switch
            checked={element.dedicated ?? false}
            onCheckedChange={(dedicated) => set({ dedicated })}
          />
        </div>
      )}

      {element.kind === "region" && (
        <SelectField
          label="Region type"
          value={element.regionType ?? "estate"}
          options={[
            "estate",
            "district",
            "watershed",
            "reserve",
            "agricultural",
            "settlement",
          ]}
          onChange={(regionType) =>
            set({ regionType: regionType as typeof element.regionType })
          }
        />
      )}

      {element.kind === "water" && (
        <SelectField
          label="Water type"
          value={element.waterType ?? "pond"}
          options={["lake", "pond", "river", "stream", "wetland", "reservoir"]}
          onChange={(waterType) =>
            set({ waterType: waterType as typeof element.waterType })
          }
        />
      )}

      {element.kind === "planting" && (
        <>
          <SelectField
            label="Planting type"
            value={element.plantingType ?? "forest"}
            options={["lawn", "forest", "garden", "orchard", "crop", "meadow"]}
            onChange={(plantingType) =>
              set({ plantingType: plantingType as typeof element.plantingType })
            }
          />
          <NumberField
            label="Canopy cover (0–1)"
            value={element.canopyCover ?? 0}
            step={0.05}
            onCommit={(v) => set({ canopyCover: Math.max(0, Math.min(1, v)) })}
          />
        </>
      )}

      {element.kind === "grade" && (
        <>
          <NumberField
            label="Target elevation"
            value={element.targetElevation}
            step={0.5}
            onCommit={(v) => set({ targetElevation: v })}
          />
          <SelectField
            label="Method"
            value={element.method ?? "flat"}
            options={["flat", "terrace"]}
            onChange={(method) =>
              set({ method: method as typeof element.method })
            }
          />
        </>
      )}

      {element.kind === "tree" && (
        <NumberField
          label="Canopy radius"
          value={element.canopyRadius}
          step={0.5}
          onCommit={(v) => set({ canopyRadius: Math.max(0.5, v) })}
        />
      )}

      {element.kind === "spot" && (
        <NumberField
          label="Elevation (z)"
          value={element.z}
          step={0.5}
          onCommit={(z) => set({ z })}
        />
      )}

      <LayerSelect
        value={element.layerId}
        options={site.layers}
        onChange={(layerId) => set({ layerId })}
      />

      {isSpatialElement(element) && <CurveControl element={element} />}

      {isSpatialElement(element) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openPlat(element.id)}
          className="w-full"
        >
          <Ruler className="h-4 w-4" /> Survey / plat report
        </Button>
      )}

      <Button
        variant="destructive"
        size="sm"
        onClick={deleteSelection}
        className="mt-1 w-full"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
    </div>
  );
}

/** Curve editing affordance for a spatial element (see canvas ◇ edge handles). */
function CurveControl({ element }: { element: PlanElement }) {
  const { clearArcs } = usePropertiesState();
  if (!isSpatialElement(element)) {
    return null;
  }
  const curveCount = countCurvedEdges(element);
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground">Curved edges</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {curveCount}
        </span>
      </div>
      <p className="text-xs leading-snug text-muted-foreground/80">
        Drag an edge&apos;s ◇ midpoint handle on the canvas to turn it into a
        circular arc.
      </p>
      {curveCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearArcs(element.id)}
          className="w-full"
        >
          Straighten {curveCount} curve{curveCount === 1 ? "" : "s"}
        </Button>
      )}
    </div>
  );
}

function LandUseSelect({
  value,
  onChange,
  label = "Category",
}: {
  value: LandUseCategory;
  onChange: (v: LandUseCategory) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as LandUseCategory)}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAND_USE_DEFINITIONS.map((d) => (
            <SelectItem key={d.category} value={d.category}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                {d.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function LayerSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>Layer</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="capitalize">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Field({
  label,
  value,
  readOnly,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input value={value} readOnly={readOnly} className="h-8" />
    </div>
  );
}

function TextField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input
        value={draft}
        className="h-8"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onCommit,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
}) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => setDraft(String(value)), [value]);
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input
        type="number"
        step={step}
        value={draft}
        className="h-8"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const parsed = Number(draft);
          if (!Number.isNaN(parsed) && parsed !== value) {
            onCommit(parsed);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </div>
  );
}
