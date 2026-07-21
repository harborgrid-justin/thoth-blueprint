import type { LandUseCategory, PlanElement } from "@thoth/domain";

/**
 * SVG hatch/fill pattern library — the area symbology that gives an engineering
 * drawing its density (water hatch, wetland marsh, woods, agricultural rows,
 * earthwork crosshatch, rip-rap stipple, concrete, open space). Patterns are in
 * user (screen) space so the hatch keeps a constant drafting weight at any zoom.
 *
 * Rendered once as a <defs> inside the canvas <svg>; areas overlay the matching
 * `url(#id)` on top of their solid tint.
 */
export function CanvasPatterns() {
  return (
    <defs>
      {/* Water — drafting wave lines. */}
      <pattern
        id="pat-water"
        width={26}
        height={11}
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M0 6 Q 6.5 1 13 6 T 26 6"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={0.8}
          opacity={0.55}
        />
      </pattern>

      {/* Wetland — water lines with marsh tufts. */}
      <pattern
        id="pat-wetland"
        width={28}
        height={20}
        patternUnits="userSpaceOnUse"
      >
        <line
          x1={0}
          y1={13}
          x2={28}
          y2={13}
          stroke="#0ea5e9"
          strokeWidth={0.6}
          opacity={0.5}
        />
        <line
          x1={6}
          y1={17}
          x2={20}
          y2={17}
          stroke="#0ea5e9"
          strokeWidth={0.6}
          opacity={0.5}
        />
        <path
          d="M6 12 L6 5 M4 8 L6 5 L8 8"
          fill="none"
          stroke="#15803d"
          strokeWidth={0.7}
          opacity={0.7}
        />
        <path
          d="M20 12 L20 6 M18 9 L20 6 L22 9"
          fill="none"
          stroke="#15803d"
          strokeWidth={0.7}
          opacity={0.7}
        />
      </pattern>

      {/* Woods / forest — scattered canopy dots. */}
      <pattern
        id="pat-forest"
        width={20}
        height={20}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={4} cy={5} r={1.5} fill="#16a34a" opacity={0.5} />
        <circle cx={14} cy={12} r={1.5} fill="#16a34a" opacity={0.5} />
        <circle cx={9} cy={17} r={1.2} fill="#16a34a" opacity={0.4} />
      </pattern>

      {/* Orchard — regular tree grid. */}
      <pattern
        id="pat-orchard"
        width={16}
        height={16}
        patternUnits="userSpaceOnUse"
      >
        <circle
          cx={8}
          cy={8}
          r={1.6}
          fill="none"
          stroke="#16a34a"
          strokeWidth={0.7}
          opacity={0.6}
        />
      </pattern>

      {/* Agricultural / crop — plow rows. */}
      <pattern id="pat-ag" width={12} height={9} patternUnits="userSpaceOnUse">
        <line
          x1={0}
          y1={4.5}
          x2={12}
          y2={4.5}
          stroke="#a16207"
          strokeWidth={0.5}
          opacity={0.5}
        />
      </pattern>

      {/* Earthwork / grading — 45° crosshatch. */}
      <pattern
        id="pat-earth"
        width={8}
        height={8}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={8}
          stroke="#b45309"
          strokeWidth={0.6}
          opacity={0.45}
        />
      </pattern>

      {/* Rip-rap / gravel — stipple. */}
      <pattern
        id="pat-gravel"
        width={12}
        height={12}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={2} cy={3} r={0.9} fill="#64748b" opacity={0.6} />
        <circle cx={8} cy={6} r={1.1} fill="#64748b" opacity={0.6} />
        <circle cx={5} cy={10} r={0.8} fill="#64748b" opacity={0.5} />
        <circle cx={11} cy={11} r={0.7} fill="#64748b" opacity={0.5} />
      </pattern>

      {/* Concrete / paving — fine dot grid. */}
      <pattern
        id="pat-concrete"
        width={7}
        height={7}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={1} cy={1} r={0.5} fill="#94a3b8" opacity={0.7} />
      </pattern>

      {/* Open space / park — sparse dots. */}
      <pattern
        id="pat-park"
        width={16}
        height={16}
        patternUnits="userSpaceOnUse"
      >
        <circle cx={4} cy={4} r={0.9} fill="#15803d" opacity={0.4} />
        <circle cx={12} cy={11} r={0.9} fill="#15803d" opacity={0.4} />
      </pattern>
    </defs>
  );
}

/** The hatch pattern id for an element, or null when it takes no hatch. */
export function patternFor(element: PlanElement): string | null {
  switch (element.kind) {
    case "water":
      return element.waterType === "wetland" ? "pat-wetland" : "pat-water";
    case "grade":
      return "pat-earth";
    case "openspace":
      return "pat-park";
    case "planting":
      switch (element.plantingType) {
        case "orchard":
          return "pat-orchard";
        case "crop":
          return "pat-ag";
        case "lawn":
        case "meadow":
          return "pat-park";
        default:
          return "pat-forest";
      }
    case "landuse":
      return landUsePattern(element.category);
    default:
      return null;
  }
}

function landUsePattern(category: LandUseCategory): string | null {
  switch (category) {
    case "agricultural":
      return "pat-ag";
    case "park":
    case "open-space":
      return "pat-park";
    case "industrial":
      return "pat-concrete";
    case "infrastructure":
      return "pat-gravel";
    default:
      return null;
  }
}
