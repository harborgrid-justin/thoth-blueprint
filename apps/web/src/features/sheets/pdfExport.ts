/**
 * Vector PDF export via `pdf-lib`. Consumes the same {@link SheetPrimitive} IR
 * the on-screen SVG uses, so the PDF is a true vector match of the sheet — one
 * `PDFPage` per sheet at the sheet's exact point dimensions. Shapes are emitted
 * as SVG paths (pdf-lib's `drawSvgPath`, anchored at the page top-left so the
 * point-space, y-down IR maps 1:1); text is drawn with an embedded font.
 */

import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import {
  getRegionPlugin,
  sortSheets,
  US_PLSS_DEFAULT,
  type DrawingSet,
  type Site,
} from "@thoth/domain";
import { buildSheetPrimitives, sheetLayout } from "./builders";
import type { Pt, SheetPrimitive } from "./scene";

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function pathFromPts(pts: Pt[], close: boolean): string {
  if (!pts.length) return "";
  const head = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  const rest = pts.slice(1).map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  return `${head} ${rest}${close ? " Z" : ""}`;
}

function circlePath(cx: number, cy: number, r: number): string {
  return (
    `M ${(cx - r).toFixed(2)} ${cy.toFixed(2)} ` +
    `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0 ` +
    `a ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-r * 2).toFixed(2)} 0 Z`
  );
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function drawPrim(page: PDFPage, hPt: number, p: SheetPrimitive, fonts: Fonts): void {
  const topLeft = { x: 0, y: hPt };
  switch (p.t) {
    case "line":
      page.drawSvgPath(pathFromPts([p.a, p.b], false), {
        ...topLeft,
        borderColor: hexToRgb(p.color ?? "#0f172a"),
        borderWidth: p.w ?? 0.5,
        borderDashArray: p.dash,
      });
      break;
    case "polyline":
      page.drawSvgPath(pathFromPts(p.pts, !!p.close), {
        ...topLeft,
        borderColor: hexToRgb(p.color ?? "#0f172a"),
        borderWidth: p.w ?? 0.5,
        borderDashArray: p.dash,
      });
      break;
    case "polygon":
      page.drawSvgPath(pathFromPts(p.pts, true), {
        ...topLeft,
        color: p.fill && p.fill !== "none" && p.fill !== "transparent" ? hexToRgb(p.fill) : undefined,
        opacity: p.fillOpacity ?? (p.fill ? 1 : 0),
        borderColor: p.stroke && p.stroke !== "none" ? hexToRgb(p.stroke) : undefined,
        borderWidth: p.w ?? 0,
        borderDashArray: p.dash,
      });
      break;
    case "rect":
      page.drawSvgPath(pathFromPts([{ x: p.x, y: p.y }, { x: p.x + p.w, y: p.y }, { x: p.x + p.w, y: p.y + p.h }, { x: p.x, y: p.y + p.h }], true), {
        ...topLeft,
        color: p.fill && p.fill !== "none" && p.fill !== "transparent" ? hexToRgb(p.fill) : undefined,
        opacity: p.fillOpacity ?? (p.fill ? 1 : 0),
        borderColor: p.stroke && p.stroke !== "none" ? hexToRgb(p.stroke) : undefined,
        borderWidth: p.sw ?? 0,
        borderDashArray: p.dash,
      });
      break;
    case "circle":
      page.drawSvgPath(circlePath(p.c.x, p.c.y, p.r), {
        ...topLeft,
        color: p.fill && p.fill !== "none" && p.fill !== "transparent" ? hexToRgb(p.fill) : undefined,
        opacity: p.fillOpacity ?? (p.fill && p.fill !== "none" && p.fill !== "transparent" ? 1 : 0),
        borderColor: p.stroke && p.stroke !== "none" ? hexToRgb(p.stroke) : undefined,
        borderWidth: p.sw ?? 0,
      });
      break;
    case "text": {
      const font = (p.weight ?? 400) >= 600 ? fonts.bold : fonts.regular;
      const width = font.widthOfTextAtSize(p.text, p.size);
      let x = p.at.x;
      if (p.anchor === "middle") x -= width / 2;
      else if (p.anchor === "end") x -= width;
      // Flip y for PDF (origin bottom-left); baseline ≈ scene y.
      const y = hPt - p.at.y;
      page.drawText(p.text, {
        x,
        y,
        size: p.size,
        font,
        color: hexToRgb(p.color ?? "#0f172a"),
        rotate: p.angle ? degrees(-p.angle) : undefined,
      });
      break;
    }
  }
}

/** Build a multi-page PDF for a whole drawing set and return its bytes. */
export async function drawingSetToPdf(set: DrawingSet, site: Site): Promise<Uint8Array> {
  const plugin = getRegionPlugin(site.jurisdictionId) ?? US_PLSS_DEFAULT;
  const unit = plugin.sheetStandards?.unit ?? "in";
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  for (const sheet of sortSheets(set)) {
    const layout = sheetLayout(sheet, unit);
    const page = doc.addPage([layout.wPt, layout.hPt]);
    const prims = buildSheetPrimitives(set, sheet, site, plugin);
    for (const prim of prims) drawPrim(page, layout.hPt, prim, fonts);
  }
  return doc.save();
}

function download(bytes: Uint8Array, filename: string): void {
  // Copy into a fresh (non-shared) ArrayBuffer-backed view so the bytes satisfy
  // BlobPart under the DOM lib's ArrayBuffer-vs-SharedArrayBuffer typing.
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build and download the drawing set as a multi-page PDF. */
export async function exportDrawingSetPdf(set: DrawingSet, site: Site, filename = "drawing-set.pdf"): Promise<void> {
  const bytes = await drawingSetToPdf(set, site);
  download(bytes, filename);
}
