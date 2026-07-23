//! Small shared numeric helpers used across the planning rules/metrics
//! engine. Port of `packages/domain/src/planning/common/math.ts`.

/// Clamp a value to the closed unit interval `[0, 1]`.
///
/// Used throughout the metrics engine (coverage, impervious ratio, open-space
/// ratio) to guard against floating-point overshoot at the boundaries rather
/// than reporting a nonsensical >100% or negative ratio.
pub fn clamp01(v: f64) -> f64 {
    v.clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamps_below_zero_to_zero() {
        assert_eq!(clamp01(-0.5), 0.0);
    }

    #[test]
    fn clamps_above_one_to_one() {
        assert_eq!(clamp01(1.5), 1.0);
    }

    #[test]
    fn passes_through_interior_values() {
        assert_eq!(clamp01(0.42), 0.42);
    }
}
