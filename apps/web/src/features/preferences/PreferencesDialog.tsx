import type { ReactNode } from "react";
import { areaUnitLabel, listRegionPlugins, PRESET_GEOID_PLUGINS, type AreaUnit } from "@thoth/domain";
import { usePrefsStore } from "@/store/prefsStore";
import { useUiStore } from "@/store/uiStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import type { AngleFormat, CoordFormat, LengthUnitPref } from "@/lib/units";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AREA_UNITS: AreaUnit[] = [
  "sqm",
  "sqft",
  "acres",
  "hectares",
  "sqkm",
  "sqmi",
];
const LENGTH_UNITS: { value: LengthUnitPref; label: string }[] = [
  { value: "auto", label: "Follow plan units" },
  { value: "meters", label: "Metric (m)" },
  { value: "feet", label: "Imperial (ft)" },
];
const ANGLE_FORMATS: { value: AngleFormat; label: string }[] = [
  { value: "dms", label: "Bearing (N45°30′15″E)" },
  { value: "dd", label: "Azimuth (137.5°)" },
];
const COORD_FORMATS: { value: CoordFormat; label: string }[] = [
  { value: "xy", label: "Plan x / y" },
  { value: "survey", label: "Survey northing / easting" },
];

/** Display & unit preferences dialog (`FE-PREFS-001…005`). */
export function PreferencesDialog() {
  const open = useUiStore((s) => s.prefsOpen);
  const setOpen = useUiStore((s) => s.setPrefsOpen);
  const prefs = usePrefsStore();
  const jurisdictionId = useWorkspaceStore((s) => s.site?.jurisdictionId ?? "");
  const setJurisdiction = useWorkspaceStore((s) => s.setJurisdiction);
  const plugins = listRegionPlugins();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Display preferences</DialogTitle>
          <DialogDescription>
            How measurements, coordinates, and bearings are shown. Your plan's
            stored geometry and coordinate system are never changed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Row label="Jurisdiction (region plug-in)">
            <PrefSelect
              value={jurisdictionId || "none"}
              options={[
                { value: "none", label: "None (base capabilities)" },
                ...plugins.map((p) => ({ value: p.id, label: p.name })),
                ...PRESET_GEOID_PLUGINS.map((p) => ({ value: p.geoid, label: `${p.name} (GEOID: ${p.geoid})` })),
              ]}
              onChange={(v) => setJurisdiction(v === "none" ? null : v)}
            />
          </Row>

          <Row label="Length units">
            <PrefSelect
              value={prefs.lengthUnit}
              options={LENGTH_UNITS}
              onChange={(v) => prefs.setLengthUnit(v as LengthUnitPref)}
            />
          </Row>

          <Row label="Area units">
            <PrefSelect
              value={prefs.areaUnit}
              options={AREA_UNITS.map((u) => ({
                value: u,
                label: `${areaUnitLabel(u)} (${u})`,
              }))}
              onChange={(v) => prefs.setAreaUnit(v as AreaUnit)}
            />
          </Row>

          <Row label="Bearing format">
            <PrefSelect
              value={prefs.angleFormat}
              options={ANGLE_FORMATS}
              onChange={(v) => prefs.setAngleFormat(v as AngleFormat)}
            />
          </Row>

          <Row label="Coordinate readout">
            <PrefSelect
              value={prefs.coordFormat}
              options={COORD_FORMATS}
              onChange={(v) => prefs.setCoordFormat(v as CoordFormat)}
            />
          </Row>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
            <div>
              <Label className="text-sm text-foreground">
                High-contrast mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Stronger borders and text for readability.
              </p>
            </div>
            <Switch
              checked={prefs.highContrast}
              onCheckedChange={prefs.setHighContrast}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-foreground">{label}</Label>
      <div className="w-56">{children}</div>
    </div>
  );
}

function PrefSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
