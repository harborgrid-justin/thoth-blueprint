import type { Member } from "@/api";
import { formatNumber } from "@/lib/format";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function partitionMembers(members: Member[], maxShown = 4) {
  const shown = members.slice(0, maxShown);
  const extra = members.length - shown.length;
  const extraText = extra > 0 ? `+${formatNumber(extra)}` : "";
  return { shown, extra, extraText };
}
