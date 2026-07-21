import { formatRelativeTime, formatNumber } from "@/lib/format";

export function formatCheckpointTime(createdAt: string): string {
  return formatRelativeTime(createdAt);
}

export function formatCheckpointCount(count: number): string {
  return formatNumber(count);
}
