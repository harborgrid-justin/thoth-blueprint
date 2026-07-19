import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AreaUnit } from "@thoth/domain";
import type { AngleFormat, CoordFormat, LengthUnitPref } from "@/lib/units";

/**
 * User display preferences, persisted across sessions (localStorage). These are
 * presentation-only: they change how measurements, coordinates, and bearings are
 * shown, never the plan's stored geometry or its {@link SpatialContext}. Realizes
 * the `FE-PREFS-*` requirements (unit system, area unit, angle & coordinate
 * formats, and a high-contrast display mode).
 */
export interface PrefsState {
  /** Area unit for metrics and area readouts. */
  areaUnit: AreaUnit;
  /** Length display unit: follow the plan, or force metric/imperial. */
  lengthUnit: LengthUnitPref;
  /** Bearing/angle display format. */
  angleFormat: AngleFormat;
  /** Cursor coordinate readout format. */
  coordFormat: CoordFormat;
  /** High-contrast display mode for accessibility (NFR-A11Y-001). */
  highContrast: boolean;

  setAreaUnit(unit: AreaUnit): void;
  setLengthUnit(unit: LengthUnitPref): void;
  setAngleFormat(format: AngleFormat): void;
  setCoordFormat(format: CoordFormat): void;
  setHighContrast(on: boolean): void;
  toggleHighContrast(): void;
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      areaUnit: "acres",
      lengthUnit: "auto",
      angleFormat: "dms",
      coordFormat: "xy",
      highContrast: false,

      setAreaUnit: (areaUnit) => set({ areaUnit }),
      setLengthUnit: (lengthUnit) => set({ lengthUnit }),
      setAngleFormat: (angleFormat) => set({ angleFormat }),
      setCoordFormat: (coordFormat) => set({ coordFormat }),
      setHighContrast: (highContrast) => set({ highContrast }),
      toggleHighContrast: () => set((s) => ({ highContrast: !s.highContrast })),
    }),
    { name: "thoth.prefs", version: 1 },
  ),
);
