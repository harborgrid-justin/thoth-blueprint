import type { Point } from "../../spatial/geometry";
import type { QuadrantBearing } from "../types/survey";

const DEG = 180 / Math.PI;

function approx(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

/** Azimuth clockwise from north (−Y), in degrees [0, 360), from `a` to `b`. */
export function azimuth(a: Point, b: Point): number {
  const east = b.x - a.x;
  const north = -(b.y - a.y);
  const deg = Math.atan2(east, north) * DEG;
  return (deg + 360) % 360;
}

/** Convert a decimal-degree angle into whole degrees/minutes/seconds with carry. */
export function toDms(angleDeg: number): {
  degrees: number;
  minutes: number;
  seconds: number;
} {
  const sign = angleDeg < 0 ? -1 : 1;
  const a = Math.abs(angleDeg);
  let degrees = Math.floor(a);
  const remMin = (a - degrees) * 60;
  let minutes = Math.floor(remMin);
  let seconds = Math.round((remMin - minutes) * 60);
  if (seconds >= 60) {
    seconds -= 60;
    minutes += 1;
  }
  if (minutes >= 60) {
    minutes -= 60;
    degrees += 1;
  }
  return { degrees: degrees * sign, minutes, seconds };
}

/** Convert an azimuth into a quadrant bearing. */
export function azimuthToBearing(az: number): QuadrantBearing {
  const a = ((az % 360) + 360) % 360;

  // Cardinal directions.
  if (approx(a, 0)) {
    return {
      ns: "N",
      degrees: 0,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "N",
    };
  }
  if (approx(a, 90)) {
    return {
      ns: "N",
      degrees: 90,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "E",
    };
  }
  if (approx(a, 180)) {
    return {
      ns: "S",
      degrees: 0,
      minutes: 0,
      seconds: 0,
      ew: "E",
      cardinal: "S",
    };
  }
  if (approx(a, 270)) {
    return {
      ns: "N",
      degrees: 90,
      minutes: 0,
      seconds: 0,
      ew: "W",
      cardinal: "W",
    };
  }

  let ns: "N" | "S";
  let ew: "E" | "W";
  let angle: number;
  if (a < 90) {
    ns = "N";
    ew = "E";
    angle = a;
  } else if (a < 180) {
    ns = "S";
    ew = "E";
    angle = 180 - a;
  } else if (a < 270) {
    ns = "S";
    ew = "W";
    angle = a - 180;
  } else {
    ns = "N";
    ew = "W";
    angle = 360 - a;
  }
  const { degrees, minutes, seconds } = toDms(angle);
  return { ns, degrees, minutes, seconds, ew };
}

/** Format a quadrant bearing as e.g. `N45°30′15″E`, or `Due North`. */
export function formatBearing(b: QuadrantBearing): string {
  if (b.cardinal) {
    return { N: "Due North", S: "Due South", E: "Due East", W: "Due West" }[
      b.cardinal
    ];
  }
  const d = String(b.degrees).padStart(2, "0");
  const m = String(b.minutes).padStart(2, "0");
  const s = String(b.seconds).padStart(2, "0");
  return `${b.ns}${d}°${m}′${s}″${b.ew}`;
}

/** Convenience: quadrant bearing text directly from two points. */
export function bearingText(a: Point, b: Point): string {
  return formatBearing(azimuthToBearing(azimuth(a, b)));
}

/**
 * Azimuth (degrees clockwise from north) reconstructed from a quadrant bearing.
 * The exact inverse of {@link azimuthToBearing}, used to close a traverse from
 * the *recorded* (rounded) bearings actually printed on the plat.
 */
export function bearingToAzimuth(b: QuadrantBearing): number {
  if (b.cardinal) {
    return { N: 0, E: 90, S: 180, W: 270 }[b.cardinal];
  }
  const angle = b.degrees + b.minutes / 60 + b.seconds / 3600;
  if (b.ns === "N" && b.ew === "E") {
    return angle;
  }
  if (b.ns === "S" && b.ew === "E") {
    return 180 - angle;
  }
  if (b.ns === "S" && b.ew === "W") {
    return 180 + angle;
  }
  return 360 - angle; // N…W
}
