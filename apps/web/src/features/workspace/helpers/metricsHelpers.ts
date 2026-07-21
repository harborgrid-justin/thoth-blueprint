import { type AreaUnit } from "@thoth/domain";
import { formatNumber, formatArea, formatPercent, formatRatio } from "@/lib/format";
import { formatLength, resolveLengthUnit } from "@/lib/units";

export const AREA_UNITS: AreaUnit[] = ["sqm", "sqft", "acres", "hectares", "sqkm", "sqmi"];

export function sumNetworkMeters(networks: any[], kindFilter: (kind: string) => boolean): number {
  return networks.filter((n) => kindFilter(n.kind)).reduce((s, n) => s + n.lengthMeters, 0);
}

export function formatInfrastructureReadout(roadMeters: number, utilityMeters: number, spatial: any) {
  const roadLengthText = formatLength(roadMeters, spatial, "auto", 0);
  const utilityLengthText = formatLength(utilityMeters, spatial, "auto", 0);
  const totalMetersText = formatNumber(roadMeters + utilityMeters, 0);
  const roadRatio = formatRatio(roadMeters / Math.max(1, roadMeters + utilityMeters));
  const roadPercent = formatPercent(roadMeters / Math.max(1, roadMeters + utilityMeters), 0);
  const unit = resolveLengthUnit(spatial, "auto");
  return { roadLengthText, utilityLengthText, totalMetersText, roadRatio, roadPercent, unit };
}

export function formatAreaSliceReadout(area: number, share: number, unit: AreaUnit) {
  const areaText = formatArea(area, unit);
  const percentText = formatPercent(share, 1);
  return { areaText, percentText };
}
