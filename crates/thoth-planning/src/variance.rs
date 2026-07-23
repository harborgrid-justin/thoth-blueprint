//! Zoning variance/waiver tracking against a rule library: a structured
//! record of which rule was varied, by how much, with what justification and
//! approval status — a data model and structural validation, not a legal
//! adjudication engine.
//!
//! Item 48 of the Theme 4 subdivision-design-automation gap analysis. This
//! module deliberately does not decide whether a variance *should* be
//! granted (that is a planning-commission/board-of-appeals judgment call
//! outside any software's competence); it records the request, checks it is
//! internally well-formed, and — the one piece of real logic here — can
//! suppress a [`ComplianceFinding`] from [`crate::rules::check_compliance`]
//! once a matching variance has been approved, so a compliance report
//! reflects "must be re-flagged unless a variance covers it" rather than
//! silently disappearing findings for ungranted requests.

use serde::{Deserialize, Serialize};
use thiserror::Error;
use thoth_spatial::ComplianceFinding;

/// Where a variance request stands in a jurisdiction's approval process.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VarianceStatus {
    Requested,
    UnderReview,
    Approved,
    Denied,
    Withdrawn,
}

/// A single recorded variance/waiver request against one rule for one
/// element. `rule_code` is expected to match a [`ComplianceFinding::code`]
/// this variance is meant to excuse (e.g. `"coverage.exceeded"`,
/// `"far.exceeded"`, `"height.exceeded"`, `"setback.consumesLot"` — see
/// `crate::rules::check_compliance`'s finding codes), though the model does
/// not require the rule to originate from this crate's own checker; a
/// jurisdiction's external rule library may use its own codes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ZoningVariance {
    pub id: String,
    /// The element (lot, zone, building, ...) this variance applies to.
    pub element_id: String,
    /// The rule code being varied.
    pub rule_code: String,
    /// The standard's normal required/allowed value.
    pub standard_value: f64,
    /// The value being requested instead.
    pub requested_value: f64,
    /// The applicant's stated justification for the deviation.
    pub justification: String,
    pub status: VarianceStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub approved_by: Option<String>,
    /// An ISO-8601 date string (kept as plain text — this crate has no date
    /// dependency, and the model doesn't need to compute with it).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision_date: Option<String>,
}

/// Everything that makes a [`ZoningVariance`] record structurally invalid.
#[derive(Debug, Clone, PartialEq, Error)]
pub enum VarianceError {
    #[error("Variance justification must not be empty.")]
    EmptyJustification,
    #[error(
        "Requested value ({requested}) equals the standard value ({standard}); this is not a deviation."
    )]
    NoDeviationRequested { standard: f64, requested: f64 },
    #[error("Variance rule_code must not be empty.")]
    EmptyRuleCode,
}

/// Validate a [`ZoningVariance`] record's structural well-formedness: a
/// non-empty rule code, a non-empty justification, and an actual numeric
/// deviation from the standard (a variance requesting exactly the standard
/// value is not a variance).
pub fn validate_variance(variance: &ZoningVariance) -> Result<(), VarianceError> {
    if variance.rule_code.trim().is_empty() {
        return Err(VarianceError::EmptyRuleCode);
    }
    if variance.justification.trim().is_empty() {
        return Err(VarianceError::EmptyJustification);
    }
    if (variance.requested_value - variance.standard_value).abs() < 1e-9 {
        return Err(VarianceError::NoDeviationRequested {
            standard: variance.standard_value,
            requested: variance.requested_value,
        });
    }
    Ok(())
}

/// The signed deviation a variance requests (`requested - standard`).
pub fn variance_deviation(variance: &ZoningVariance) -> f64 {
    variance.requested_value - variance.standard_value
}

/// The deviation as a fraction of the standard value (`None` if the standard
/// is zero, where a fractional deviation is undefined).
pub fn variance_deviation_fraction(variance: &ZoningVariance) -> Option<f64> {
    if variance.standard_value.abs() < 1e-12 {
        None
    } else {
        Some(variance_deviation(variance) / variance.standard_value)
    }
}

/// Every `Approved` variance in `variances` that applies to `element_id`.
pub fn approved_variances_for<'a>(
    variances: &'a [ZoningVariance],
    element_id: &str,
) -> Vec<&'a ZoningVariance> {
    variances
        .iter()
        .filter(|v| v.status == VarianceStatus::Approved && v.element_id == element_id)
        .collect()
}

/// `true` if an approved variance in `variances` covers `finding` (matching
/// both `element_id` and `rule_code` == the finding's code).
pub fn variance_covers_finding(variances: &[ZoningVariance], finding: &ComplianceFinding) -> bool {
    let Some(element_id) = finding.element_id.as_deref() else {
        return false;
    };
    approved_variances_for(variances, element_id)
        .iter()
        .any(|v| v.rule_code == finding.code)
}

/// Filter a compliance report, dropping any finding an approved variance
/// covers. Intended to run after [`crate::rules::check_compliance`]: the
/// checker itself stays variance-agnostic (it reports the plan's raw
/// standing against the rules), and this is the explicit, auditable step
/// that reconciles that report against granted relief.
pub fn suppress_findings_with_variances(
    findings: Vec<ComplianceFinding>,
    variances: &[ZoningVariance],
) -> Vec<ComplianceFinding> {
    findings
        .into_iter()
        .filter(|f| !variance_covers_finding(variances, f))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use thoth_spatial::ComplianceSeverity;

    fn variance(rule_code: &str, status: VarianceStatus, element_id: &str) -> ZoningVariance {
        ZoningVariance {
            id: "v1".to_string(),
            element_id: element_id.to_string(),
            rule_code: rule_code.to_string(),
            standard_value: 0.40,
            requested_value: 0.55,
            justification: "Irregular lot shape limits buildable coverage.".to_string(),
            status,
            approved_by: None,
            decision_date: None,
        }
    }

    #[test]
    fn validates_a_well_formed_variance() {
        let v = variance("coverage.exceeded", VarianceStatus::Approved, "lot-1");
        assert!(validate_variance(&v).is_ok());
    }

    #[test]
    fn rejects_empty_justification() {
        let mut v = variance("coverage.exceeded", VarianceStatus::Requested, "lot-1");
        v.justification = "   ".to_string();
        assert_eq!(
            validate_variance(&v),
            Err(VarianceError::EmptyJustification)
        );
    }

    #[test]
    fn rejects_a_no_op_deviation() {
        let mut v = variance("coverage.exceeded", VarianceStatus::Requested, "lot-1");
        v.requested_value = v.standard_value;
        assert_eq!(
            validate_variance(&v),
            Err(VarianceError::NoDeviationRequested {
                standard: 0.40,
                requested: 0.40
            })
        );
    }

    #[test]
    fn deviation_and_fraction_are_computed_correctly() {
        let v = variance("coverage.exceeded", VarianceStatus::Approved, "lot-1");
        assert!((variance_deviation(&v) - 0.15).abs() < 1e-9);
        assert!((variance_deviation_fraction(&v).unwrap() - 0.375).abs() < 1e-9);
    }

    #[test]
    fn only_approved_variances_suppress_findings() {
        let approved = variance("coverage.exceeded", VarianceStatus::Approved, "b1");
        let requested = variance("far.exceeded", VarianceStatus::Requested, "b1");
        let findings = vec![
            ComplianceFinding {
                severity: ComplianceSeverity::Error,
                code: "coverage.exceeded".to_string(),
                message: "over coverage".to_string(),
                element_id: Some("b1".to_string()),
            },
            ComplianceFinding {
                severity: ComplianceSeverity::Error,
                code: "far.exceeded".to_string(),
                message: "over FAR".to_string(),
                element_id: Some("b1".to_string()),
            },
            ComplianceFinding {
                severity: ComplianceSeverity::Error,
                code: "coverage.exceeded".to_string(),
                message: "unrelated element".to_string(),
                element_id: Some("b2".to_string()),
            },
        ];
        let remaining = suppress_findings_with_variances(findings, &[approved, requested]);
        // b1's coverage finding is suppressed (approved variance covers it);
        // b1's FAR finding remains (its variance is only `Requested`, not
        // `Approved`); b2's coverage finding remains (different element).
        assert_eq!(remaining.len(), 2);
        assert!(remaining.iter().any(|f| f.element_id.as_deref() == Some("b2")));
        assert!(remaining
            .iter()
            .any(|f| f.code == "far.exceeded" && f.element_id.as_deref() == Some("b1")));
    }
}
