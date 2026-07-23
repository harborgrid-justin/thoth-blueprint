//! A parametric, jurisdiction-configurable zoning/ordinance rule engine.
//!
//! `thoth_planning::rules::check_compliance` (read that module before this
//! one) hard-codes exactly one buildable-envelope-adjacent rule set: a
//! zone's `max_coverage`/`max_far`/`max_height`/`allowed_uses` fields,
//! checked by a fixed sequence of `if let`s. That is the right shape for the
//! zoning fields the domain model bakes directly into `Zone`/`Lot`/
//! `Building`, but it can't express a jurisdiction's *other* ordinances (a
//! minimum lot area, a per-yard setback minimum, a parking ratio) without a
//! code change every time a jurisdiction's rule book differs.
//!
//! This module generalizes that shape: a [`Rule`] is a **value** — a kind
//! (one of a fixed, documented set of parametrized checks), its numeric
//! parameters, a severity, and an optional zone-designation scope — not a
//! hard-coded `if` branch. A jurisdiction's [`RuleSet`] is a named list of
//! `Rule`s; the [`JurisdictionRuleRegistry`] holds one `RuleSet` per
//! `jurisdiction_id` and [`JurisdictionRuleRegistry::evaluate_site`] selects
//! and runs whichever set is active for a [`thoth_planning::Site`]'s own
//! `jurisdiction_id`, producing [`ComplianceFinding`]s — the same finding
//! type `thoth_planning::rules::check_compliance` produces, so callers can
//! merge both engines' output into one findings list without a second
//! vocabulary.
//!
//! # Rule schema
//!
//! A [`Rule`] is:
//!
//! ```text
//! Rule {
//!   id:              String              // stable identifier, e.g. "r1-min-lot-area"
//!   name:            String              // human-readable label for a review UI
//!   kind:            RuleKind            // which check, and its parameter(s) — see below
//!   severity:        ComplianceSeverity  // Error | Warning | Info, stamped onto every finding this rule produces
//!   applies_to_zone: Option<String>      // restrict to a Zone.designation (e.g. "R-1"); None = every zone/lot in scope
//! }
//! ```
//!
//! `RuleKind` is a closed, documented set of parametrized checks — adding a
//! new *kind* of check is a code change (a new variant + evaluator arm), but
//! configuring an *instance* of an existing kind (thresholds, target yard,
//! zone scope) is pure data, which is the configuration surface a future
//! jurisdiction-admin UI needs:
//!
//! | Variant | Parameters | Evaluated against | Passes when |
//! |---|---|---|---|
//! | `MinLotArea` | `min_area` (plan units²) | Every [`Lot`] in scope | lot boundary area ≥ `min_area` |
//! | `MaxBuildingHeight` | `max_height` (plan units) | Every [`Building`] in scope with a `height` | `height` ≤ `max_height` |
//! | `MaxFar` | `max_far` | Every [`Building`] in scope on a [`Lot`] | (footprint × storeys) / lot area ≤ `max_far` |
//! | `MaxCoverage` | `max_coverage` (0–1) | Every [`Building`] in scope on a [`Lot`] | footprint / lot area ≤ `max_coverage` |
//! | `MinSetback` | `yard` ([`YardType`]), `min_setback` | Every [`Lot`] in scope with a `setback` | `setback` ≥ `min_setback` |
//! | `ParkingRatioPerUnit` | `spaces_per_unit` | Every [`Building`] in scope with `dwelling_units` | informational only — see below |
//!
//! "In scope" means: if `applies_to_zone` is `Some(designation)`, only
//! elements whose centroid falls inside a [`Zone`] with that `designation`
//! are checked (an element outside every zone, or inside a
//! non-matching one, is silently skipped for that rule — the rule simply
//! doesn't apply there). If `applies_to_zone` is `None`, every element of
//! the relevant kind on the site is checked regardless of zone.
//!
//! **Scoping note on `MinSetback`**: the domain model (`thoth_planning::Lot`)
//! carries a single uniform `setback: Option<f64>`, not a per-yard-type
//! setback. `YardType` is accepted and threaded into the finding's message
//! for a jurisdiction that conceptually wants front/side/rear minimums
//! documented and reviewed, but until `Lot` grows per-yard setback fields,
//! multiple `MinSetback` rules with different `yard`s all check the same
//! scalar. This is documented, not silently wrong: the finding message
//! always names which yard the rule was configured for.
//!
//! **Scoping note on `ParkingRatioPerUnit`**: nothing in `thoth_planning`
//! models *supplied* parking spaces (there is no `ParkingLot`/parking-space
//! count element), so this rule cannot compare required vs. actual and
//! never fails. It always emits an [`ComplianceSeverity::Info`]-style
//! finding (using the rule's configured severity) stating the required
//! space count, so a reviewer sees the requirement even though the engine
//! can't yet check supply against it.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use thoth_planning::elements::{Building, Lot, PlanElement, Zone};
use thoth_planning::Site;
use thoth_spatial::{
    area as polygon_area, centroid, point_in_polygon, ComplianceFinding, ComplianceSeverity,
};

use crate::error::GovernanceError;

/// Which building-setback yard a [`RuleKind::MinSetback`] rule targets. Kept
/// distinct from the geometry itself (see the module docs' scoping note) so
/// a jurisdiction's rule book can name its front/side/rear minimums even
/// before the domain model can enforce them independently.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum YardType {
    Front,
    Side,
    Rear,
}

/// The concrete check a [`Rule`] performs, carrying its own parameter(s).
/// See the module docs' schema table for what each variant evaluates and
/// when it passes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RuleKind {
    MinLotArea { min_area: f64 },
    MaxBuildingHeight { max_height: f64 },
    MaxFar { max_far: f64 },
    MaxCoverage { max_coverage: f64 },
    MinSetback { yard: YardType, min_setback: f64 },
    ParkingRatioPerUnit { spaces_per_unit: f64 },
}

impl RuleKind {
    /// A short, stable code stamped onto every [`ComplianceFinding`] this
    /// kind produces (mirrors the dot-namespaced convention
    /// `thoth_planning::rules::check_compliance` already uses, e.g.
    /// `"coverage.exceeded"`), so findings from both engines sort/group
    /// consistently in a review UI.
    fn finding_code(&self) -> &'static str {
        match self {
            RuleKind::MinLotArea { .. } => "lotArea.tooSmall",
            RuleKind::MaxBuildingHeight { .. } => "height.exceeded",
            RuleKind::MaxFar { .. } => "far.exceeded",
            RuleKind::MaxCoverage { .. } => "coverage.exceeded",
            RuleKind::MinSetback { .. } => "setback.tooSmall",
            RuleKind::ParkingRatioPerUnit { .. } => "parking.required",
        }
    }

    /// Reject a parameter combination that can never evaluate sensibly.
    /// Called once, at [`Rule::new`]/[`RuleSet::new`] construction time —
    /// not on every evaluation — so a malformed rule is rejected where it's
    /// configured, not silently miscomputed every time a site is checked.
    fn validate(&self) -> Result<(), String> {
        match *self {
            RuleKind::MinLotArea { min_area } if min_area <= 0.0 => {
                Err(format!("min_area must be positive, got {min_area}"))
            }
            RuleKind::MaxBuildingHeight { max_height } if max_height <= 0.0 => {
                Err(format!("max_height must be positive, got {max_height}"))
            }
            RuleKind::MaxFar { max_far } if max_far <= 0.0 => {
                Err(format!("max_far must be positive, got {max_far}"))
            }
            RuleKind::MaxCoverage { max_coverage }
                if !(0.0..=1.0).contains(&max_coverage) =>
            {
                Err(format!(
                    "max_coverage must be within 0.0..=1.0 (a fraction of lot area), got {max_coverage}"
                ))
            }
            RuleKind::MinSetback { min_setback, .. } if min_setback < 0.0 => {
                Err(format!("min_setback cannot be negative, got {min_setback}"))
            }
            RuleKind::ParkingRatioPerUnit { spaces_per_unit } if spaces_per_unit < 0.0 => {
                Err(format!(
                    "spaces_per_unit cannot be negative, got {spaces_per_unit}"
                ))
            }
            _ => Ok(()),
        }
    }
}

/// One named, parametrized ordinance check within a jurisdiction's
/// [`RuleSet`]. See the module docs for the full schema.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub kind: RuleKind,
    pub severity: ComplianceSeverity,
    /// Restrict this rule to elements zoned with this `Zone::designation`
    /// (e.g. `"R-1"`). `None` applies the rule to every element of the
    /// relevant kind on the site, regardless of zone.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub applies_to_zone: Option<String>,
}

impl Rule {
    /// Construct a rule, validating its parameters up front.
    /// [`GovernanceError::InvalidRuleParameter`] if `kind`'s parameters
    /// can never evaluate sensibly (e.g. a negative area, a coverage ratio
    /// outside 0–1).
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        kind: RuleKind,
        severity: ComplianceSeverity,
        applies_to_zone: Option<String>,
    ) -> Result<Self, GovernanceError> {
        let id = id.into();
        kind.validate()
            .map_err(|reason| GovernanceError::InvalidRuleParameter {
                rule: id.clone(),
                reason,
            })?;
        Ok(Self {
            id,
            name: name.into(),
            kind,
            severity,
            applies_to_zone,
        })
    }
}

/// A named, jurisdiction-scoped collection of [`Rule`]s — the unit a
/// [`JurisdictionRuleRegistry`] registers and selects by
/// `Site::jurisdiction_id`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuleSet {
    pub jurisdiction_id: String,
    pub name: String,
    pub rules: Vec<Rule>,
}

impl RuleSet {
    /// Construct a rule set. Rules are validated individually at
    /// [`Rule::new`] time, so this constructor just holds them; it exists
    /// primarily for symmetry/documentation and for a future admin UI to
    /// have a single obvious entry point.
    pub fn new(
        jurisdiction_id: impl Into<String>,
        name: impl Into<String>,
        rules: Vec<Rule>,
    ) -> Self {
        Self {
            jurisdiction_id: jurisdiction_id.into(),
            name: name.into(),
            rules,
        }
    }
}

/// The zones, lots, and buildings extracted from a [`Site`] once, reused
/// across every rule evaluated against it.
struct SiteIndex<'a> {
    zones: Vec<&'a Zone>,
    lots: Vec<&'a Lot>,
    buildings: Vec<&'a Building>,
}

impl<'a> SiteIndex<'a> {
    fn build(site: &'a Site) -> Self {
        let mut zones = Vec::new();
        let mut lots = Vec::new();
        let mut buildings = Vec::new();
        for element in &site.elements {
            match element {
                PlanElement::Zone(z) => zones.push(z),
                PlanElement::Lot(l) => lots.push(l),
                PlanElement::Building(b) => buildings.push(b),
                _ => {}
            }
        }
        Self {
            zones,
            lots,
            buildings,
        }
    }

    /// The zone (if any) whose boundary contains `point`.
    fn zone_at(&self, point: thoth_spatial::Point) -> Option<&'a Zone> {
        self.zones
            .iter()
            .copied()
            .find(|z| point_in_polygon(point, &z.base.boundary))
    }

    /// The lot (if any) whose boundary contains `point`.
    fn lot_at(&self, point: thoth_spatial::Point) -> Option<&'a Lot> {
        self.lots
            .iter()
            .copied()
            .find(|l| point_in_polygon(point, &l.base.boundary))
    }

    /// Whether `zone` (or the absence of one) satisfies a rule's
    /// `applies_to_zone` scope.
    fn in_scope(zone: Option<&Zone>, applies_to_zone: Option<&str>) -> bool {
        match applies_to_zone {
            None => true,
            Some(designation) => zone.is_some_and(|z| z.designation == designation),
        }
    }
}

/// Evaluate every rule in `rule_set` against `site`, producing
/// [`ComplianceFinding`]s for every violation (and, for
/// [`RuleKind::ParkingRatioPerUnit`], an informational finding regardless of
/// compliance — see the module docs). This performs no jurisdiction
/// matching itself — pair it with [`JurisdictionRuleRegistry::evaluate_site`]
/// to select the right `rule_set` for a site automatically, or call this
/// directly when the caller already knows which rule set applies (e.g. a
/// "preview against a candidate rule set" tool).
pub fn evaluate(rule_set: &RuleSet, site: &Site) -> Vec<ComplianceFinding> {
    let index = SiteIndex::build(site);
    let mut findings = Vec::new();
    for rule in &rule_set.rules {
        evaluate_rule(rule, &index, &mut findings);
    }
    findings
}

fn evaluate_rule<'a>(rule: &Rule, index: &SiteIndex<'a>, findings: &mut Vec<ComplianceFinding>) {
    match &rule.kind {
        RuleKind::MinLotArea { min_area } => {
            for lot in &index.lots {
                let zone = index.zone_at(centroid(&lot.base.boundary));
                if !SiteIndex::in_scope(zone, rule.applies_to_zone.as_deref()) {
                    continue;
                }
                let lot_area = polygon_area(&lot.base.boundary);
                if lot_area + 1e-9 < *min_area {
                    findings.push(ComplianceFinding {
                        severity: rule.severity,
                        code: rule.kind.finding_code().to_string(),
                        message: format!(
                            "{} (rule \"{}\") is {:.1} plan units², below the required minimum of {:.1}.",
                            lot.base.name, rule.name, lot_area, min_area
                        ),
                        element_id: Some(lot.base.id.clone()),
                    });
                }
            }
        }
        RuleKind::MaxBuildingHeight { max_height } => {
            for building in &index.buildings {
                let Some(height) = building.height else {
                    continue;
                };
                let zone = index.zone_at(centroid(&building.base.boundary));
                if !SiteIndex::in_scope(zone, rule.applies_to_zone.as_deref()) {
                    continue;
                }
                if height > *max_height + 1e-9 {
                    findings.push(ComplianceFinding {
                        severity: rule.severity,
                        code: rule.kind.finding_code().to_string(),
                        message: format!(
                            "{} (rule \"{}\") height {:.1} exceeds the maximum of {:.1}.",
                            building.base.name, rule.name, height, max_height
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }
        RuleKind::MaxFar { max_far } => {
            for building in &index.buildings {
                let center = centroid(&building.base.boundary);
                let zone = index.zone_at(center);
                if !SiteIndex::in_scope(zone, rule.applies_to_zone.as_deref()) {
                    continue;
                }
                let Some(lot) = index.lot_at(center) else {
                    continue;
                };
                let lot_area = polygon_area(&lot.base.boundary);
                if lot_area <= 0.0 {
                    continue;
                }
                let footprint = polygon_area(&building.base.boundary);
                let far = (footprint * building.storeys.max(1.0)) / lot_area;
                if far > *max_far + 1e-9 {
                    findings.push(ComplianceFinding {
                        severity: rule.severity,
                        code: rule.kind.finding_code().to_string(),
                        message: format!(
                            "{} (rule \"{}\") FAR {:.2} exceeds the maximum of {:.2}.",
                            building.base.name, rule.name, far, max_far
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }
        RuleKind::MaxCoverage { max_coverage } => {
            for building in &index.buildings {
                let center = centroid(&building.base.boundary);
                let zone = index.zone_at(center);
                if !SiteIndex::in_scope(zone, rule.applies_to_zone.as_deref()) {
                    continue;
                }
                let Some(lot) = index.lot_at(center) else {
                    continue;
                };
                let lot_area = polygon_area(&lot.base.boundary);
                if lot_area <= 0.0 {
                    continue;
                }
                let footprint = polygon_area(&building.base.boundary);
                let coverage = footprint / lot_area;
                if coverage > *max_coverage + 1e-9 {
                    findings.push(ComplianceFinding {
                        severity: rule.severity,
                        code: rule.kind.finding_code().to_string(),
                        message: format!(
                            "{} (rule \"{}\") covers {:.0}% of its lot; the maximum is {:.0}%.",
                            building.base.name,
                            rule.name,
                            coverage * 100.0,
                            max_coverage * 100.0
                        ),
                        element_id: Some(building.base.id.clone()),
                    });
                }
            }
        }
        RuleKind::MinSetback { yard, min_setback } => {
            for lot in &index.lots {
                let Some(setback) = lot.setback else {
                    continue;
                };
                let zone = index.zone_at(centroid(&lot.base.boundary));
                if !SiteIndex::in_scope(zone, rule.applies_to_zone.as_deref()) {
                    continue;
                }
                if setback + 1e-9 < *min_setback {
                    findings.push(ComplianceFinding {
                        severity: rule.severity,
                        code: rule.kind.finding_code().to_string(),
                        message: format!(
                            "{} (rule \"{}\") {yard:?}-yard setback {:.1} is below the required minimum of {:.1}.",
                            lot.base.name, rule.name, setback, min_setback
                        ),
                        element_id: Some(lot.base.id.clone()),
                    });
                }
            }
        }
        RuleKind::ParkingRatioPerUnit { spaces_per_unit } => {
            for building in &index.buildings {
                let Some(units) = building.dwelling_units else {
                    continue;
                };
                let zone = index.zone_at(centroid(&building.base.boundary));
                if !SiteIndex::in_scope(zone, rule.applies_to_zone.as_deref()) {
                    continue;
                }
                let required = units * spaces_per_unit;
                findings.push(ComplianceFinding {
                    severity: rule.severity,
                    code: rule.kind.finding_code().to_string(),
                    message: format!(
                        "{} (rule \"{}\") requires at least {:.1} parking spaces for {:.0} dwelling units \
                         (parking-space supply is not yet modeled, so this reports the requirement only).",
                        building.base.name, rule.name, required, units
                    ),
                    element_id: Some(building.base.id.clone()),
                });
            }
        }
    }
}

/// A directory of one [`RuleSet`] per jurisdiction, keyed by
/// `jurisdiction_id`. This is the object a caller holds process-wide (or per
/// tenant) and queries with a [`Site`] to get "whichever rule set is active
/// for this site's jurisdiction" without the call site knowing which
/// jurisdiction that is ahead of time.
#[derive(Debug, Default)]
pub struct JurisdictionRuleRegistry {
    rule_sets: HashMap<String, RuleSet>,
}

impl JurisdictionRuleRegistry {
    /// An empty registry.
    pub fn new() -> Self {
        Self {
            rule_sets: HashMap::new(),
        }
    }

    /// Register `rule_set` under its own `jurisdiction_id`.
    /// [`GovernanceError::DuplicateJurisdiction`] if a rule set is already
    /// registered for that jurisdiction — call [`Self::replace`] if the
    /// intent is to update one.
    pub fn register(&mut self, rule_set: RuleSet) -> Result<(), GovernanceError> {
        if self.rule_sets.contains_key(&rule_set.jurisdiction_id) {
            return Err(GovernanceError::DuplicateJurisdiction(
                rule_set.jurisdiction_id.clone(),
            ));
        }
        self.rule_sets
            .insert(rule_set.jurisdiction_id.clone(), rule_set);
        Ok(())
    }

    /// Register `rule_set`, replacing any existing rule set for the same
    /// jurisdiction (e.g. a jurisdiction admin publishing an updated rule
    /// book).
    pub fn replace(&mut self, rule_set: RuleSet) {
        self.rule_sets
            .insert(rule_set.jurisdiction_id.clone(), rule_set);
    }

    /// The rule set registered for `jurisdiction_id`, if any.
    pub fn get(&self, jurisdiction_id: &str) -> Option<&RuleSet> {
        self.rule_sets.get(jurisdiction_id)
    }

    /// Select and run whichever rule set is active for `site`'s own
    /// `jurisdiction_id`. [`GovernanceError::NoJurisdictionAssigned`] if the
    /// site has none; [`GovernanceError::UnknownJurisdiction`] if it names
    /// one this registry has no rule set for.
    pub fn evaluate_site(&self, site: &Site) -> Result<Vec<ComplianceFinding>, GovernanceError> {
        let jurisdiction_id = site
            .jurisdiction_id
            .as_deref()
            .ok_or_else(|| GovernanceError::NoJurisdictionAssigned(site.id.clone()))?;
        let rule_set = self
            .get(jurisdiction_id)
            .ok_or_else(|| GovernanceError::UnknownJurisdiction(jurisdiction_id.to_string()))?;
        Ok(evaluate(rule_set, site))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_planning::elements::new_base;
    use thoth_spatial::{ElementKind, Point, Polygon, SpatialContext, Unit};

    fn ctx() -> SpatialContext {
        SpatialContext {
            crs: "EPSG:3857".to_string(),
            units: Unit::Meters,
            scale: 1.0,
        }
    }

    fn square(size: f64) -> Polygon {
        vec![
            Point::new(0.0, 0.0),
            Point::new(size, 0.0),
            Point::new(size, size),
            Point::new(0.0, size),
        ]
    }

    fn square_at(x0: f64, y0: f64, size: f64) -> Polygon {
        vec![
            Point::new(x0, y0),
            Point::new(x0 + size, y0),
            Point::new(x0 + size, y0 + size),
            Point::new(x0, y0 + size),
        ]
    }

    /// A jurisdiction with four realistic rules: minimum lot area, maximum
    /// building height, maximum FAR, and a front-yard minimum setback —
    /// scoped to the "R-1" zone.
    fn sample_rule_set() -> RuleSet {
        RuleSet::new(
            "jur-riverside",
            "Riverside Municipal Code — R-1",
            vec![
                Rule::new(
                    "r1-min-lot-area",
                    "Minimum lot area",
                    RuleKind::MinLotArea { min_area: 500.0 },
                    ComplianceSeverity::Error,
                    Some("R-1".to_string()),
                )
                .unwrap(),
                Rule::new(
                    "r1-max-height",
                    "Maximum building height",
                    RuleKind::MaxBuildingHeight { max_height: 10.0 },
                    ComplianceSeverity::Error,
                    Some("R-1".to_string()),
                )
                .unwrap(),
                Rule::new(
                    "r1-max-far",
                    "Maximum floor area ratio",
                    RuleKind::MaxFar { max_far: 0.5 },
                    ComplianceSeverity::Error,
                    Some("R-1".to_string()),
                )
                .unwrap(),
                Rule::new(
                    "r1-front-setback",
                    "Minimum front-yard setback",
                    RuleKind::MinSetback {
                        yard: YardType::Front,
                        min_setback: 3.0,
                    },
                    ComplianceSeverity::Warning,
                    Some("R-1".to_string()),
                )
                .unwrap(),
            ],
        )
    }

    /// A site with one R-1 zone, one conforming lot/building, one lot too
    /// small, and a building that's too tall and over FAR.
    fn sample_site() -> Site {
        let zone = Zone {
            base: new_base("z1", ElementKind::Zone, "Zone R-1", "l", square(1000.0)),
            designation: "R-1".to_string(),
            allowed_uses: vec![],
            max_coverage: None,
            max_far: None,
            max_height: None,
            min_setback: None,
        };
        // A conforming 30x30 (900 m²) lot with a small, short building.
        let good_lot = Lot {
            base: new_base(
                "lot-good",
                ElementKind::Lot,
                "Lot A",
                "l",
                square_at(10.0, 10.0, 30.0),
            ),
            parcel_id: None,
            block_id: None,
            setback: Some(4.0),
        };
        let good_building = Building {
            base: new_base(
                "bldg-good",
                ElementKind::Building,
                "House A",
                "l",
                square_at(15.0, 15.0, 10.0), // 100 m² footprint, well within lot
            ),
            lot_id: Some("lot-good".to_string()),
            storeys: 1.0,
            height: Some(6.0),
            dwelling_units: Some(1.0),
            use_: None,
        };
        // A non-conforming 10x10 (100 m²) lot — under the 500 m² minimum —
        // with an over-height, over-FAR building and an under-minimum
        // setback.
        let bad_lot = Lot {
            base: new_base(
                "lot-bad",
                ElementKind::Lot,
                "Lot B",
                "l",
                square_at(100.0, 100.0, 10.0),
            ),
            parcel_id: None,
            block_id: None,
            setback: Some(1.0),
        };
        let bad_building = Building {
            base: new_base(
                "bldg-bad",
                ElementKind::Building,
                "House B",
                "l",
                square_at(100.0, 100.0, 9.0), // 81 m² footprint on a 100 m² lot
            ),
            lot_id: Some("lot-bad".to_string()),
            storeys: 1.0,
            height: Some(15.0),
            dwelling_units: Some(4.0),
            use_: None,
        };

        Site {
            id: "s1".to_string(),
            name: "Sample Site".to_string(),
            spatial: ctx(),
            layers: vec![],
            elements: vec![
                PlanElement::Zone(zone),
                PlanElement::Lot(good_lot),
                PlanElement::Building(good_building),
                PlanElement::Lot(bad_lot),
                PlanElement::Building(bad_building),
            ],
            jurisdiction_id: Some("jur-riverside".to_string()),
            geoid: None,
            control_lines: None,
            civil_symbols: None,
            networks: None,
        }
    }

    #[test]
    fn rule_construction_rejects_invalid_parameters() {
        let err = Rule::new(
            "bad",
            "Bad rule",
            RuleKind::MaxCoverage { max_coverage: 1.5 },
            ComplianceSeverity::Error,
            None,
        )
        .unwrap_err();
        assert!(matches!(err, GovernanceError::InvalidRuleParameter { .. }));

        assert!(Rule::new(
            "bad2",
            "Bad rule 2",
            RuleKind::MinLotArea { min_area: -1.0 },
            ComplianceSeverity::Error,
            None,
        )
        .is_err());
    }

    #[test]
    fn compliant_lot_and_building_produce_no_findings_for_that_element() {
        let rule_set = sample_rule_set();
        let site = sample_site();
        let findings = evaluate(&rule_set, &site);

        assert!(!findings
            .iter()
            .any(|f| f.element_id.as_deref() == Some("lot-good")));
        assert!(!findings
            .iter()
            .any(|f| f.element_id.as_deref() == Some("bldg-good")));
    }

    #[test]
    fn non_conforming_lot_and_building_are_all_flagged() {
        let rule_set = sample_rule_set();
        let site = sample_site();
        let findings = evaluate(&rule_set, &site);

        let bad_lot_codes: Vec<&str> = findings
            .iter()
            .filter(|f| f.element_id.as_deref() == Some("lot-bad"))
            .map(|f| f.code.as_str())
            .collect();
        assert!(bad_lot_codes.contains(&"lotArea.tooSmall"));
        assert!(bad_lot_codes.contains(&"setback.tooSmall"));

        let bad_building_codes: Vec<&str> = findings
            .iter()
            .filter(|f| f.element_id.as_deref() == Some("bldg-bad"))
            .map(|f| f.code.as_str())
            .collect();
        assert!(bad_building_codes.contains(&"height.exceeded"));
        assert!(bad_building_codes.contains(&"far.exceeded"));
    }

    #[test]
    fn zone_scoping_skips_elements_outside_the_named_zone() {
        // A rule scoped to a zone designation that doesn't exist on the
        // site never fires, even against an otherwise-violating lot.
        let rule = Rule::new(
            "scoped",
            "Scoped-out rule",
            RuleKind::MinLotArea {
                min_area: 100_000.0,
            },
            ComplianceSeverity::Error,
            Some("C-2".to_string()),
        )
        .unwrap();
        let rule_set = RuleSet::new("jur-riverside", "Scoped", vec![rule]);
        let findings = evaluate(&rule_set, &sample_site());
        assert!(findings.is_empty());
    }

    #[test]
    fn parking_rule_reports_requirement_without_failing() {
        let rule = Rule::new(
            "parking",
            "Parking ratio",
            RuleKind::ParkingRatioPerUnit {
                spaces_per_unit: 2.0,
            },
            ComplianceSeverity::Info,
            None,
        )
        .unwrap();
        let rule_set = RuleSet::new("jur-riverside", "Parking", vec![rule]);
        let findings = evaluate(&rule_set, &sample_site());

        let good = findings
            .iter()
            .find(|f| f.element_id.as_deref() == Some("bldg-good"))
            .unwrap();
        assert_eq!(good.severity, ComplianceSeverity::Info);
        assert!(good.message.contains("2.0 parking spaces"));
    }

    #[test]
    fn registry_evaluates_a_site_via_its_own_jurisdiction_id() {
        let mut registry = JurisdictionRuleRegistry::new();
        registry.register(sample_rule_set()).unwrap();

        let findings = registry.evaluate_site(&sample_site()).unwrap();
        assert!(findings.iter().any(|f| f.code == "lotArea.tooSmall"));
    }

    #[test]
    fn registry_errors_on_missing_or_unknown_jurisdiction() {
        let registry = JurisdictionRuleRegistry::new();
        let mut site = sample_site();

        let err = registry.evaluate_site(&site).unwrap_err();
        assert!(matches!(err, GovernanceError::UnknownJurisdiction(_)));

        site.jurisdiction_id = None;
        let err = registry.evaluate_site(&site).unwrap_err();
        assert!(matches!(err, GovernanceError::NoJurisdictionAssigned(_)));
    }

    #[test]
    fn registry_rejects_duplicate_jurisdiction_registration() {
        let mut registry = JurisdictionRuleRegistry::new();
        registry.register(sample_rule_set()).unwrap();
        let err = registry.register(sample_rule_set()).unwrap_err();
        assert!(matches!(err, GovernanceError::DuplicateJurisdiction(_)));

        // `replace` is the sanctioned way to update.
        registry.replace(sample_rule_set());
        assert!(registry.get("jur-riverside").is_some());
    }
}
