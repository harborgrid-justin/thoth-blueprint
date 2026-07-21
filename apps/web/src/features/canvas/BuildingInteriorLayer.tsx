import {
  centroid,
  doorSwing,
  findWall,
  openingJambs,
  roomArea,
  wallPolygon,
  type BuildingModel,
  type Point,
  type Site,
  type Window as WindowOpening,
} from "@thoth/domain";
import { worldToScreen, type Viewport } from "./viewport";

const INK = "hsl(var(--foreground))";
const GLAZE = "#0284c7";
const HALO = "hsl(var(--canvas))";

/**
 * Renders building interiors as an architectural floor plan: room fills, wall
 * poché (solid-filled wall bodies), door leaves with swing arcs, window glazing,
 * and room tags (name / number / area). Draws the model's first level.
 */
export function BuildingInteriorLayer({ site, viewport }: { site: Site; viewport: Viewport }) {
  const models = site.buildingModels;
  if (!models || models.length === 0) {return null;}
  const project = (p: Point) => worldToScreen(p, viewport);
  const showTags = viewport.zoom > 1.4;

  return (
    <g className="pointer-events-none">
      {models.map((model) => (
        <BuildingPlan key={model.id} model={model} site={site} project={project} showTags={showTags} />
      ))}
    </g>
  );
}

function toPath(pts: Point[], project: (p: Point) => Point): string {
  return pts.map((p, i) => {
    const s = project(p);
    return `${i === 0 ? "M" : "L"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
  }).join(" ") + " Z";
}

function BuildingPlan({
  model,
  site,
  project,
  showTags,
}: {
  model: BuildingModel;
  site: Site;
  project: (p: Point) => Point;
  showTags: boolean;
}) {
  const level = model.levels[0];
  const walls = model.walls.filter((w) => !level || w.levelId === level.id);
  const wallIds = new Set(walls.map((w) => w.id));

  return (
    <g>
      {/* Room fills */}
      {model.rooms
        .filter((r) => !level || r.levelId === level.id)
        .map((room) => (
          <path key={room.id} d={toPath(room.boundary, project)} fill="#f1f5f9" fillOpacity={0.55} stroke="#cbd5e1" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        ))}

      {/* Wall poché */}
      {walls.map((wall) => (
        <path key={wall.id} d={toPath(wallPolygon(wall), project)} fill={INK} fillOpacity={0.85} stroke={INK} strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      ))}

      {/* Doors: white jamb gap + leaf + swing arc */}
      {model.doors.map((door) => {
        const wall = findWall(model, door.wallId);
        if (!wall || !wallIds.has(wall.id)) {return null;}
        const [j1, j2] = openingJambs(wall, door);
        const s1 = project(j1);
        const s2 = project(j2);
        const sw = doorSwing(wall, door);
        const hinge = project(sw.hinge);
        const leaf = project(sw.leafEnd);
        const arc = sw.arc.map(project).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        return (
          <g key={door.id}>
            <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={HALO} strokeWidth={3.5} vectorEffect="non-scaling-stroke" />
            <line x1={hinge.x} y1={hinge.y} x2={leaf.x} y2={leaf.y} stroke={INK} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
            <polyline points={arc} fill="none" stroke={INK} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}

      {/* Windows: glazing line across the jamb gap */}
      {model.windows.map((win: WindowOpening) => {
        const wall = findWall(model, win.wallId);
        if (!wall || !wallIds.has(wall.id)) {return null;}
        const [j1, j2] = openingJambs(wall, win);
        const s1 = project(j1);
        const s2 = project(j2);
        return <line key={win.id} x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={GLAZE} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />;
      })}

      {/* Room tags */}
      {showTags &&
        model.rooms
          .filter((r) => !level || r.levelId === level.id)
          .map((room) => {
            const c = project(centroid(room.boundary));
            return (
              <text key={`t${room.id}`} x={c.x} y={c.y} textAnchor="middle" fontSize={10} fill={INK} style={{ paintOrder: "stroke", stroke: HALO, strokeWidth: 2.5 }}>
                <tspan x={c.x} fontWeight={700}>{room.name}</tspan>
                <tspan x={c.x} dy={11} fontSize={8} fill="#475569">
                  {room.number} · {roomArea(room, site.spatial, "sqft").toFixed(0)} SF
                </tspan>
              </text>
            );
          })}
    </g>
  );
}
