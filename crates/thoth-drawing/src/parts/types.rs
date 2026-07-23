//! Parts catalog data model. Port of `packages/domain/src/parts/types.ts`.
//!
//! ## A deliberate divergence from the TS union types
//!
//! The TS `PartSpecification.category` field is typed as the closed union
//! [`PartCategory`], and `.unit` as a closed union of seven unit strings — but
//! the catalog JSON itself (`drawing.json`, `survey.json`) stores `category:
//! "drawing"` and `category: "survey"`, and `drawing.json` stores `unit: "in"`,
//! none of which are members of those declared unions. The TS loader papers
//! over this with `as unknown as PartSpecification[]` at the import site,
//! which erases the check entirely — so at runtime `category` and `unit` are
//! *actually* open strings, not the closed set the type declares.
//!
//! Faithfully porting the *behavior* (every catalog entry loads and is
//! searchable/filterable) rather than the *aspirational static type* means
//! `category` and `unit` are modeled here as plain [`String`]s. [`PartCategory`]
//! is kept as a real enum for the filter API ([`PartFilterOptions::category`],
//! `GlobalPartsDatabase::get_parts_by_category`) exactly where the TS source
//! uses it that way (nobody calls those with `"drawing"`/`"survey"`), so
//! callers who only care about the seven declared categories keep a typed,
//! exhaustive-match API.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

/// The declared part categories from `parts/types.ts`. See the module
/// rustdoc — the catalog's raw `category` field is a superset of this (it
/// also contains `"drawing"` and `"survey"`), so this enum is used for the
/// *typed filter* API only, not for storage.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PartCategory {
    Architectural,
    Electrical,
    Lumber,
    Civil,
    MechanicalPlumbing,
    Structural,
    Landscape,
    Custom,
}

impl PartCategory {
    /// The exact lowercase/snake_case string this category is stored as in
    /// catalog JSON (matches the TS union's string literals).
    pub const fn as_str(self) -> &'static str {
        match self {
            PartCategory::Architectural => "architectural",
            PartCategory::Electrical => "electrical",
            PartCategory::Lumber => "lumber",
            PartCategory::Civil => "civil",
            PartCategory::MechanicalPlumbing => "mechanical_plumbing",
            PartCategory::Structural => "structural",
            PartCategory::Landscape => "landscape",
            PartCategory::Custom => "custom",
        }
    }
}

/// A scalar property value in a part's free-form `properties` bag. JSON
/// property values in the catalog are strings, numbers, or booleans.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PropertyValue {
    String(String),
    Number(f64),
    Bool(bool),
}

impl PropertyValue {
    /// Borrow this value as a string, if it holds one.
    pub fn as_str(&self) -> Option<&str> {
        match self {
            PropertyValue::String(s) => Some(s),
            _ => None,
        }
    }

    /// This value as `f64`, if it holds a number.
    pub fn as_f64(&self) -> Option<f64> {
        match self {
            PropertyValue::Number(n) => Some(*n),
            _ => None,
        }
    }

    /// This value as a `bool`, if it holds one.
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            PropertyValue::Bool(b) => Some(*b),
            _ => None,
        }
    }
}

/// Physical dimensions of a part. Units follow the part's own `unit`/family
/// convention (feet or inches, per the TS comment) — not separately tagged.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct PartDimensions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub depth: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thickness: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub length: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub diameter: Option<f64>,
}

/// One entry in the parts catalog: a purchasable/specifiable real-world part
/// (a wall assembly, a fixture, a pipe, a sheet size, a hatch pattern, …).
///
/// `category` and `unit` are open strings — see the module rustdoc.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartSpecification {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    pub name: String,
    /// Open string — see the module rustdoc for why this isn't `PartCategory`.
    pub category: String,
    pub subcategory: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manufacturer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "modelNumber")]
    pub model_number: Option<String>,
    /// Open string (declared union in TS is `ea|ft|m|sqft|sqm|bdft|linear_ft`,
    /// but the catalog also stores `"in"`) — see the module rustdoc.
    pub unit: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dimensions: Option<PartDimensions>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub properties: Option<BTreeMap<String, PropertyValue>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

impl PartSpecification {
    /// Look up a property value by key, if `properties` is present and has it.
    pub fn property(&self, key: &str) -> Option<&PropertyValue> {
        self.properties.as_ref()?.get(key)
    }
}

/// Filter criteria for [`crate::parts::registry::GlobalPartsDatabase::search_parts`].
#[derive(Debug, Clone, Default, PartialEq)]
pub struct PartFilterOptions {
    pub category: Option<PartCategory>,
    pub subcategory: Option<String>,
    pub search_query: Option<String>,
    pub tags: Option<Vec<String>>,
    pub manufacturer: Option<String>,
}
