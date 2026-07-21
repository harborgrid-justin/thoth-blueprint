import _ from "lodash";
import { type SurveyReport } from "@thoth/domain";
import { formatNumber } from "@/lib/format";

export function signed(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  const s = formatNumber(Math.abs(rounded), digits);
  return rounded < 0 ? `−${s}` : `+${s}`;
}

export function dmsText(a: { degrees: number; minutes: number; seconds: number }): string {
  const d = String(Math.abs(a.degrees));
  const m = String(a.minutes).padStart(2, "0");
  const sec = String(a.seconds).padStart(2, "0");
  return `${d}°${m}′${sec}″`;
}

export function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tract";
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function generateCoursesCsv(report: SurveyReport, u: string): string {
  const rows = [
    ["Course", "From", "To", "Bearing", `Distance (${u})`, `Latitude (${u})`, `Departure (${u})`],
    ..._.map(report.courses, (c) => [
      String(c.index),
      c.fromLabel,
      c.toLabel,
      c.bearingText,
      c.distance.toFixed(2),
      c.latitude.toFixed(2),
      c.departure.toFixed(2),
    ]),
  ];
  return _.map(rows, (r) => _.map(r, csvCell).join(",")).join("\n");
}
