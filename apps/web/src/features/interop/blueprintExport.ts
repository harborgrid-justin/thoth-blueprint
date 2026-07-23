import {
  bounds,
  isSpatialElement,
  siteToMeshes,
  unionBounds,
  writeCollada,
  type Point,
  type Site,
} from "@thoth/domain";
import { elementColor } from "@/lib/elementMeta";
import { downloadBlob, downloadText, slugify } from "./fileIo";

export { siteToMeshes };

// ---------------------------------------------------------------------------
// PNG — a raster snapshot of the 2D plan
// ---------------------------------------------------------------------------

/** Render the plan to a PNG raster and download it. Colors are resolved to hex. */
export async function exportPlanPng(
  site: Site,
  options: { maxSize?: number; background?: string } = {},
): Promise<void> {
  const maxSize = options.maxSize ?? 2000;
  const spatial = site.elements.filter(isSpatialElement);
  const extent = spatial.length
    ? unionBounds(spatial.map((e) => bounds(e.boundary)))
    : null;
  if (!extent) {
    throw new Error("Nothing to export — the plan has no drawn geometry.");
  }

  const pad = 0.06;
  const w = extent.maxX - extent.minX;
  const h = extent.maxY - extent.minY;
  const padX = w * pad;
  const padY = h * pad;
  const worldW = w + padX * 2;
  const worldH = h + padY * 2;
  const scale = maxSize / Math.max(worldW, worldH);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(worldW * scale);
  canvas.height = Math.round(worldH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D not available");
  }

  const project = (p: Point) => ({
    x: (p.x - extent.minX + padX) * scale,
    y: (p.y - extent.minY + padY) * scale,
  });

  ctx.fillStyle = options.background ?? "#f1f5f9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw back-to-front by layer order.
  const layerOrder = new Map(site.layers.map((l) => [l.id, l.order]));
  const ordered = [...spatial].sort(
    (a, b) =>
      (layerOrder.get(a.layerId) ?? 0) - (layerOrder.get(b.layerId) ?? 0),
  );

  for (const el of ordered) {
    const category = el.kind === "landuse" ? el.category : undefined;
    const color = elementColor(el.kind, category);
    ctx.beginPath();
    el.boundary.forEach((pt, i) => {
      const s = project(pt);
      if (i === 0) {
        ctx.moveTo(s.x, s.y);
      } else {
        ctx.lineTo(s.x, s.y);
      }
    });
    ctx.closePath();
    ctx.globalAlpha =
      el.kind === "building" ? 0.85 : el.kind === "region" ? 0.08 : 0.35;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(1, scale * 0.4);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  // Networks.
  for (const net of site.networks ?? []) {
    const nodes = new Map(net.nodes.map((n) => [n.id, n.point]));
    ctx.strokeStyle = net.kind === "road" ? "#334155" : "#0ea5e9";
    ctx.lineWidth = Math.max(1.5, scale * 1.2);
    for (const edge of net.edges) {
      const a = nodes.get(edge.from);
      const b = nodes.get(edge.to);
      if (!a || !b) {
        continue;
      }
      const sa = project(a);
      const sb = project(b);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (blob) {
    downloadBlob(`${slugify(site.name)}.png`, blob);
  }
}

// ---------------------------------------------------------------------------
// COLLADA (.dae) — the plan as a 3D model
// ---------------------------------------------------------------------------

/** Build COLLADA meshes from the site (terrain + extruded buildings) and download. */
export function exportSiteDae(site: Site): void {
  const meshes = siteToMeshes(site);
  if (meshes.length === 0) {
    throw new Error("Nothing to export — add terrain or buildings first.");
  }
  const dae = writeCollada(meshes);
  downloadText(`${slugify(site.name)}.dae`, dae, "model/vnd.collada+xml");
}

/**
 * Natively exports an SVG Plat Sheet directly to a 300 DPI ISO/ANSI PDF deliverable.
 * Zero external backend dependency — executes 100% in browser.
 */
export async function exportNativePlatPdf(
  svgElement: SVGSVGElement,
  filename: string = "prince-william-county-plat.pdf",
): Promise<void> {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);

  const viewBox = svgElement.getAttribute("viewBox") || "0 0 1056 816";
  const [, , vw, vh] = viewBox.split(" ").map(Number);
  const w = vw || 1056;
  const h = vh || 816;

  // 3x Super-sampling for 300 DPI print quality
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  const img = new Image();
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });

  const jpegUrl = canvas.toDataURL("image/jpeg", 0.95);
  const base64Data = jpegUrl.split(",")[1];
  const binaryJpeg = atob(base64Data);
  const jpegBytes = new Uint8Array(binaryJpeg.length);
  for (let i = 0; i < binaryJpeg.length; i++) {
    jpegBytes[i] = binaryJpeg.charCodeAt(i);
  }

  // Construct PDF 1.4 specification objects
  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n";
  const obj2 = "2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n";
  const obj3 = `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R>>\nendobj\n`;
  const streamHeader = `4 0 obj\n<</Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length}>>\nstream\n`;
  const streamFooter = "\nendstream\nendobj\n";
  const contentStream = `q ${w} 0 0 ${h} 0 0 cm /Im1 Do Q`;
  const obj5 = `5 0 obj\n<</Length ${contentStream.length}>>\nstream\n${contentStream}\nendstream\nendobj\n`;

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [
    encoder.encode(header),
    encoder.encode(obj1),
    encoder.encode(obj2),
    encoder.encode(obj3),
    encoder.encode(streamHeader),
    jpegBytes,
    encoder.encode(streamFooter),
    encoder.encode(obj5),
  ];

  // Calculate xref table offsets
  let offset = header.length;
  const offsets = [0];
  offsets.push(offset);
  offset += obj1.length;
  offsets.push(offset);
  offset += obj2.length;
  offsets.push(offset);
  offset += obj3.length;
  offsets.push(offset);
  offset += streamHeader.length + jpegBytes.length + streamFooter.length;
  offsets.push(offset);

  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${offset + obj5.length}\n%%EOF\n`;

  parts.push(encoder.encode(xref));
  parts.push(encoder.encode(trailer));

  const pdfBlob = new Blob(parts as BlobPart[], { type: "application/pdf" });
  downloadBlob(filename, pdfBlob);
}
