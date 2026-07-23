//! Small shared helpers used by several drawing modules. Port of
//! `packages/domain/src/drawing/common/**`.

pub mod format;
pub mod units;
pub mod vector;

pub use format::{format_thousands_fixed, safe_id, xml_escape};
pub use units::{paper_per_model, paper_to_points};
pub use vector::left_normal;
