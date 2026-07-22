import * as React from "react";
import { Ruler, Trash2 } from "lucide-react";
import {
  isSpatialElement,
  measuredArea,
  measuredPerimeter,
  type PlanElement,
} from "@thoth/domain";
import { elementMeta } from "@/lib/elementMeta";
import { formatArea, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useInteropStore } from "@/store/interopStore";
import { usePropertiesState } from "./hooks/usePropertiesState";
import { countCurvedEdges, updateUnderlayDimension } from "./helpers/propertiesHelpers";


/** Inspector for the current selection: element attributes and measurements. */
export function PropertiesPanel() {
  const {
    site,
    selection,
    selectedElement,
    validatedAlignments,
    deleteSelection,
  } = usePropertiesState();

  const underlay = useInteropStore((s) => s.underlay);
  const updateUnderlay = useInteropStore((s) => s.updateUnderlay);
  const clearUnderlay = useInteropStore((s) => s.clearUnderlay);

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

        {/* Underlay Settings */}
        {underlay && (
          <div className="mt-2 border-t border-border/40 pt-3">
            <div className="flex justify-between items-center mb-1.5">
               <h4 className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wide">
                 Blueprint Underlay
               </h4>
               <Button variant="ghost" size="sm" onClick={clearUnderlay} className="h-5 px-1.5 text-rose-500">
                 Clear
               </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="Opacity (0-1)" value={underlay.opacity} step={0.1} onCommit={(v) => updateUnderlay({ opacity: Math.max(0, Math.min(1, v)) })} />
              <NumberField label="Rotation (deg)" value={underlay.rotation || 0} step={1} onCommit={(v) => updateUnderlay({ rotation: v })} />
              <NumberField label="Width" value={underlay.bounds.maxX - underlay.bounds.minX} step={10} onCommit={(w) => {
                 updateUnderlay({ bounds: updateUnderlayDimension(underlay.bounds, "width", w) });
              }} />
              <NumberField label="Height" value={underlay.bounds.maxY - underlay.bounds.minY} step={10} onCommit={(h) => {
                 updateUnderlay({ bounds: updateUnderlayDimension(underlay.bounds, "height", h) });
              }} />
              <NumberField label="Center X" value={(underlay.bounds.minX + underlay.bounds.maxX) / 2} step={10} onCommit={(cx) => {
                 updateUnderlay({ bounds: updateUnderlayDimension(underlay.bounds, "centerX", cx) });
              }} />
              <NumberField label="Center Y" value={(underlay.bounds.minY + underlay.bounds.maxY) / 2} step={10} onCommit={(cy) => {
                 updateUnderlay({ bounds: updateUnderlayDimension(underlay.bounds, "centerY", cy) });
              }} />
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

function InspectorSection({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-border/40 last:border-0" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/30">
        {title}
        <span className="transition-transform group-open:rotate-180 opacity-50">▼</span>
      </summary>
      <div className="flex flex-col gap-2 p-3 pt-1">
        {children}
      </div>
    </details>
  );
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
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b border-border/40 p-3 pb-2 gap-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="capitalize">
            {meta.label}
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Isolate">
              <span className="text-[10px]">I</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Hide">
              <span className="text-[10px]">H</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={deleteSelection} title="Delete">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="font-cad text-lg font-bold">
          {element.kind === "note" ? element.text : element.kind === "tree" ? element.species : element.kind === "spot" ? element.label : element.name}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <InspectorSection title="General">
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
        </InspectorSection>

        {isSpatialElement(element) && (
          <InspectorSection title="Geometry">
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Area"
                value={formatArea(
                  measuredArea(element.boundary, site.spatial, "sqm"),
                  "sqm",
                )}
                title={`${formatArea(measuredArea(element.boundary, site.spatial, "sqft"), "sqft")}\n${formatArea(measuredArea(element.boundary, site.spatial, "acres"), "acres")}\n${formatArea(measuredArea(element.boundary, site.spatial, "hectares"), "hectares")}`}
                readOnly
              />
              <Field
                label="Perimeter"
                value={`${formatNumber(measuredPerimeter(element.boundary, site.spatial), 1)} m`}
                title={`${formatNumber(measuredPerimeter(element.boundary, site.spatial) * 3.28084, 1)} ft`}
                readOnly
              />
              <Field
                label="Vertices"
                value={String(element.boundary.length)}
                readOnly
              />
            </div>
          </InspectorSection>
        )}

        {element.kind === "planting" && (
          <InspectorSection title="Planting Data">
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
          </InspectorSection>
        )}

        {element.kind === "tree" && (
          <InspectorSection title="Tree Data">
            <NumberField
              label="Canopy radius"
              value={element.canopyRadius}
              step={0.5}
              onCommit={(v) => set({ canopyRadius: Math.max(0.5, v) })}
            />
          </InspectorSection>
        )}

        <InspectorSection title="CAD / Metadata">
          <LayerSelect
            value={element.layerId}
            options={site.layers}
            onChange={(layerId) => set({ layerId })}
          />
        </InspectorSection>

        {isSpatialElement(element) && (
          <InspectorSection title="Curve Actions" defaultOpen={false}>
            <CurveControl element={element} />
          </InspectorSection>
        )}

        {isSpatialElement(element) && (
          <div className="p-3 pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPlat(element.id)}
              className="w-full"
            >
              <Ruler className="h-4 w-4" /> Survey / plat report
            </Button>
          </div>
        )}
      </div>
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
  title,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  title?: string;
}) {
  return (
    <div className="flex flex-col gap-1" title={title}>
      <Label>{label}</Label>
      <Input value={value} readOnly={readOnly} className={`h-7 text-xs font-cad ${readOnly ? "bg-muted/50 text-muted-foreground border-transparent" : "bg-background"}`} />
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
        className="h-7 text-xs font-cad"
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
        className="h-7 text-xs font-cad"
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
