//! Shared result/category types for the `smart` automation layer. Port of
//! `packages/domain/src/smart/types.ts`.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Which design domain a [`SmartExperience`]/[`ExperienceResult`] belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExperienceCategory {
    Hydraulics,
    Geometry,
    Grading,
    Subdivision,
    Structural,
    Erosion,
    PlanProduction,
}

/// The outcome status of running one auto-solver "experience".
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExperienceStatus {
    Optimal,
    Warning,
    Autofixed,
    Autosized,
}

/// The result of running one auto-solver "experience" against a design
/// input. `recommended_value` is `serde_json::Value` (rather than a fixed
/// Rust type) because the TS original's `recommendedValue?: number | string
/// | object` genuinely varies per experience — some report a single number,
/// some a short label string, some a small named-field object (e.g. `{
/// kCrest, kSag }`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExperienceResult {
    pub experience_id: String,
    pub code: String,
    pub name: String,
    pub category: ExperienceCategory,
    pub status: ExperienceStatus,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recommended_value: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_taken: Option<String>,
}
