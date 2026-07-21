import { areaUnitLabel, type AreaUnit } from "@thoth/domain";

/** Format a number with thousands separators and fixed fractional digits. */
export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Format an area value with its unit label, choosing digits by magnitude. */
export function formatArea(value: number, unit: AreaUnit): string {
  const digits = unit === "acres" || unit === "hectares" ? 2 : 0;
  return `${formatNumber(value, digits)} ${areaUnitLabel(unit)}`;
}

/** Format a 0–1 fraction as a percentage. */
export function formatPercent(fraction: number, digits = 0): string {
  return `${formatNumber(fraction * 100, digits)}%`;
}

/** Format a ratio like FAR to two decimals. */
export function formatRatio(value: number): string {
  return value.toFixed(2);
}

/** Relative time label for a timestamp (e.g. "3 hours ago"). */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins} min ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  return new Date(iso).toLocaleDateString();
}
