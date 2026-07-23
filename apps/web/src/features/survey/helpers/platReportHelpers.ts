import { formatNumber } from "@/lib/format";

export { csvCell, dmsText, generateCoursesCsv, slug } from "@thoth/domain";

export function signed(value: number, digits = 2): string {
  const rounded = Number(value.toFixed(digits));
  const s = formatNumber(Math.abs(rounded), digits);
  return rounded < 0 ? `−${s}` : `+${s}`;
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
