/* tslint:disable */
/* eslint-disable */

/**
 * Absolute area of a polygon in plan units², regardless of winding order.
 *
 * `polygon`: `{x:number,y:number}[]` (a closed ring; do not repeat the first
 * point as the last). Mirrors `area()` in `packages/domain/src/spatial/geometry.ts`.
 */
export function area(polygon: any): number;

/**
 * Area-weighted centroid of a polygon. Falls back to the vertex mean if
 * degenerate (fewer than 3 points), matching `thoth_spatial::geometry::centroid`.
 *
 * `polygon`: `{x:number,y:number}[]`. Returns `{x:number,y:number}`.
 */
export function centroid(polygon: any): any;

/**
 * Offset (inset/outset) a simple polygon by `distance` plan units. Returns
 * `null` (not an error) when the offset collapses the ring — this is an
 * expected, well-formed result (e.g. a setback wider than the parcel),
 * mirroring `offsetPolygon(): Polygon | null` in the TS source.
 *
 * `polygon`: `{x:number,y:number}[]`. Returns `{x:number,y:number}[] | null`.
 */
export function offsetPolygon(polygon: any, distance: number): any;

/**
 * Perimeter of a closed polygon in plan units (includes the closing edge).
 *
 * `polygon`: `{x:number,y:number}[]`.
 */
export function perimeter(polygon: any): number;

/**
 * Point-in-polygon test using the ray-casting (even-odd) rule. Points
 * exactly on an edge are considered inside.
 *
 * `point`: `{x:number,y:number}`. `polygon`: `{x:number,y:number}[]`.
 */
export function pointInPolygon(point: any, polygon: any): boolean;

/**
 * Install `console_error_panic_hook` so a Rust panic becomes a catchable,
 * readable JS error/console message instead of silently trapping the wasm
 * instance. Idempotent — safe to call more than once (subsequent calls are
 * no-ops), but callers only need to call it once, before anything else in
 * this module, typically right after `await init()`.
 *
 * This is deliberately **not** wired as a `#[wasm_bindgen(start)]` function:
 * start functions run at module-instantiation time, before the caller has a
 * chance to decide *whether* they want the hook installed (e.g. a host that
 * already installs its own global panic hook). Making it an explicit,
 * idempotent call keeps that decision with the embedder.
 */
export function setPanicHook(): void;
