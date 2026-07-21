import {
  bounds,
  createId,
  isSpatialElement,
  unionBounds,
  type Bounds,
  type Site,
} from "@thoth/domain";
import type { Underlay } from "@/store/interopStore";

/**
 * Import a raster blueprint (PNG/JPG) as a positioned underlay. The image is
 * placed to cover the current plan extent (or a default world rectangle when the
 * plan is empty) so it reads as a georeferenced reference beneath the plan.
 */
export async function importUnderlayImage(
  file: File,
  site: Site,
): Promise<Underlay> {
  const url = URL.createObjectURL(file);
  const { width, height } = await imageSize(url);
  const aspect = width / height || 1;

  const placeBounds = planExtent(site) ?? defaultBounds();
  const bw = placeBounds.maxX - placeBounds.minX;
  const bh = placeBounds.maxY - placeBounds.minY;
  // Fit the image aspect inside the placement bounds, centered.
  let fitW = bw;
  let fitH = bw / aspect;
  if (fitH > bh) {
    fitH = bh;
    fitW = bh * aspect;
  }
  const cx = (placeBounds.minX + placeBounds.maxX) / 2;
  const cy = (placeBounds.minY + placeBounds.maxY) / 2;

  return {
    id: createId("underlay"),
    name: file.name.replace(/\.[^.]+$/, ""),
    url,
    bounds: {
      minX: cx - fitW / 2,
      minY: cy - fitH / 2,
      maxX: cx + fitW / 2,
      maxY: cy + fitH / 2,
    },
    opacity: 0.75,
    visible: true,
  };
}

function imageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

function planExtent(site: Site): Bounds | null {
  const spatial = site.elements.filter(isSpatialElement);
  return spatial.length
    ? unionBounds(spatial.map((e) => bounds(e.boundary)))
    : null;
}

function defaultBounds(): Bounds {
  return { minX: 0, minY: 0, maxX: 300, maxY: 200 };
}
