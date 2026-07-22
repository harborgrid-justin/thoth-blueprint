import type { Point2D } from '@thoth/domain';

/**
 * Formats a station value in feet into standard Civil 3D notation (e.g. 1250 -> "12+50.00").
 */
export function formatStation(stationFt: number): string {
  const rounded = Math.round(stationFt * 100) / 100;
  const major = Math.floor(rounded / 100);
  const minor = (rounded % 100).toFixed(2).padStart(5, '0');
  return `${major}+${minor}`;
}

/**
 * Formats a bearing angle in degrees into degrees-minutes-seconds string.
 */
export function formatBearingDMS(bearingDeg: number): string {
  const deg = Math.floor(bearingDeg);
  const minFloat = (bearingDeg - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60);
  return `${deg}°${min.toString().padStart(2, '0')}'${sec.toString().padStart(2, '0')}"`;
}

/**
 * Converts polygon vertices array to SVG path 'd' attribute string.
 */
export function verticesToSvgPath(vertices: Point2D[], scale: number = 1.0, offsetX: number = 0, offsetY: number = 0): string {
  if (!vertices || vertices.length === 0) return '';
  const pointsStr = vertices
    .map((v, i) => {
      const px = v.x * scale + offsetX;
      const py = v.y * scale + offsetY;
      return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(' ');
  return `${pointsStr} Z`;
}
