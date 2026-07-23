//! The `smart` automation layer — auto-solvers that recommend or apply a
//! design value rather than merely auditing one, each an "experience" (a
//! numbered code + a status + a human-readable recommendation). Port of
//! `packages/domain/src/smart/**`.
//!
//! **Scope of this pass** (see `GAP_CLOSE_STATUS.md` item 9 for the full
//! accounting): `packages/domain/src/smart/` is ~2,000 lines across 9 TS
//! files, entirely unported before this pass. Per the task brief's
//! best-effort framing, this pass ports the modules that are genuinely
//! self-contained — no `Site`/element traversal, no cross-crate terrain or
//! network types, just formulas over an embedded reference table — in full,
//! rather than touching all nine shallowly:
//!
//! - [`geometry`] — `smartGeometry.ts` (experiences 16–30, AASHTO roadway
//!   geometry). **Fully ported.**
//! - [`structural`] — `smartStructural.ts` (experiences 61–75, IBC/IRC
//!   architectural/structural sizing). **Fully ported.**
//! - [`subdivision`] — `smartSubdivision.ts` (experiences 46–60,
//!   subdivision/site-layout sizing). **Fully ported.**
//!
//! **Not ported this pass**: `engine.ts` (the experience registry/dispatcher
//! that ties every module's functions to `ExperienceCategory` metadata —
//! doable, but only meaningfully useful once more of the nine modules exist
//! to register), `smartErosion.ts`/`smartGrading.ts`/`smartHydraulics.ts`/
//! `smartPlanProduction.ts` (each reads `Site`-attached civil/hydraulic/
//! terrain state this crate's stubs (`civil_stub.rs`) don't fully model, or
//! composes with `thoth-civil` grading/terrain types the way
//! `grading_optimizer.rs` already documented choosing not to depend on).

pub mod geometry;
pub mod structural;
pub mod subdivision;
pub mod types;

pub use types::{ExperienceCategory, ExperienceResult, ExperienceStatus};
