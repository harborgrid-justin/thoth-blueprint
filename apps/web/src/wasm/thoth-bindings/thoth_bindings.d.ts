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

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly area: (a: any) => [number, number, number];
    readonly centroid: (a: any) => [number, number, number];
    readonly offsetPolygon: (a: any, b: number) => [number, number, number];
    readonly perimeter: (a: any) => [number, number, number];
    readonly pointInPolygon: (a: any, b: any) => [number, number, number];
    readonly setPanicHook: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
