//! Bond-estimate generator (competitive gap-analysis Theme 5, item 54).
//!
//! A surety/bond estimate is a direct extension of the quantity-take-off
//! machinery already in [`crate::qto`]: sum a [`crate::schedule::ScheduleTable`]'s
//! quantities against a unit-cost pay-item list, exactly as
//! [`crate::qto::evaluate_pay_item_cost`] already prices one item, then add a
//! contingency percentage to reach a bondable surety total. This module adds
//! **no second cost-evaluation engine** — every line item's cost, including
//! an optional per-row custom formula, is priced by calling
//! [`crate::qto::evaluate_pay_item_cost`] (which itself defers to
//! [`crate::qto::evaluate_arithmetic`]'s hand-rolled recursive-descent
//! parser) directly.

use crate::error::DrawingError;
use crate::qto::{evaluate_pay_item_cost, PayItem, PayItemVariables};
use crate::schedule::{CellValue, ScheduleTable};

/// One priced line of a bond estimate.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct BondLineItem {
    pub pay_item_id: String,
    pub description: String,
    pub quantity: f64,
    pub unit: String,
    pub unit_cost: f64,
    pub extended_cost: f64,
}

/// A complete bond/surety estimate: priced line items, their subtotal, and
/// the contingency-inflated bondable total.
#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct BondEstimate {
    pub line_items: Vec<BondLineItem>,
    pub subtotal: f64,
    pub contingency_percent: f64,
    pub contingency_amount: f64,
    /// The final surety/bond amount: `subtotal + contingency_amount`.
    pub total_surety_amount: f64,
}

/// Generate a bond estimate from a schedule table of quantities and a
/// unit-cost pay-item list.
///
/// Each row of `table` must supply:
/// - `pay_item_column`: a cell whose text is a [`PayItem::id`] present in
///   `pay_items`.
/// - `quantity_column`: a cell parseable as a finite `f64` quantity.
///
/// and may optionally supply a `formula_column` cell (a custom cost formula
/// string in the same grammar [`evaluate_pay_item_cost`] accepts, e.g.
/// `"quantity * unitCost * 1.1"`) to override that item's default
/// `quantity * unitCost` pricing for that row alone.
///
/// Pricing itself is delegated verbatim to [`evaluate_pay_item_cost`]: this
/// function only resolves which [`PayItem`]/quantity/formula apply to each
/// row and sums the results.
///
/// # Errors
/// - [`DrawingError::MissingScheduleColumn`] if a row is missing
///   `pay_item_column` or `quantity_column`.
/// - [`DrawingError::UnknownPayItem`] if a row's pay-item id isn't in
///   `pay_items`.
/// - [`DrawingError::InvalidQuantity`] if a row's quantity cell isn't a
///   finite number.
/// - [`DrawingError::InvalidContingencyPercent`] if `contingency_percent` is
///   negative or non-finite.
pub fn generate_bond_estimate(
    table: &ScheduleTable,
    pay_item_column: &str,
    quantity_column: &str,
    formula_column: Option<&str>,
    pay_items: &[PayItem],
    contingency_percent: f64,
) -> Result<BondEstimate, DrawingError> {
    if !contingency_percent.is_finite() || contingency_percent < 0.0 {
        return Err(DrawingError::InvalidContingencyPercent(contingency_percent));
    }

    let mut line_items = Vec::with_capacity(table.rows.len());
    let mut subtotal = 0.0;

    for (row_index, row) in table.rows.iter().enumerate() {
        let pay_item_id = row
            .get(pay_item_column)
            .map(CellValue::display)
            .ok_or_else(|| DrawingError::MissingScheduleColumn {
                table_id: table.id.clone(),
                row_index,
                column: pay_item_column.to_string(),
            })?;
        let quantity_cell = row
            .get(quantity_column)
            .map(CellValue::display)
            .ok_or_else(|| DrawingError::MissingScheduleColumn {
                table_id: table.id.clone(),
                row_index,
                column: quantity_column.to_string(),
            })?;
        let quantity: f64 = quantity_cell
            .trim()
            .parse()
            .ok()
            .filter(|q: &f64| q.is_finite())
            .ok_or_else(|| DrawingError::InvalidQuantity {
                table_id: table.id.clone(),
                row_index,
                column: quantity_column.to_string(),
                value: quantity_cell.clone(),
            })?;

        let item = pay_items
            .iter()
            .find(|i| i.id == pay_item_id)
            .ok_or_else(|| DrawingError::UnknownPayItem(pay_item_id.clone()))?;

        let formula = formula_column.and_then(|col| row.get(col)).map(CellValue::display);

        // `evaluate_pay_item_cost` itself selects `length`/`area`/`count`
        // by the item's unit; setting all three to the same known quantity
        // means whichever one it picks resolves to the same value, so this
        // reuses the qto pricing function directly rather than
        // reimplementing its unit-dispatch logic here.
        let result = evaluate_pay_item_cost(
            item,
            PayItemVariables {
                length: Some(quantity),
                area: Some(quantity),
                count: Some(quantity),
            },
            formula.as_deref(),
        );

        subtotal += result.cost;
        line_items.push(BondLineItem {
            pay_item_id: item.id.clone(),
            description: item.name.clone(),
            quantity: result.quantity,
            unit: item.unit.clone(),
            unit_cost: item.unit_cost,
            extended_cost: result.cost,
        });
    }

    let contingency_amount = subtotal * contingency_percent / 100.0;
    Ok(BondEstimate {
        line_items,
        subtotal,
        contingency_percent,
        contingency_amount,
        total_surety_amount: subtotal + contingency_amount,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schedule::{ScheduleColumn, ScheduleRow};
    use approx::assert_relative_eq;

    fn pay_items() -> Vec<PayItem> {
        vec![
            PayItem {
                id: "p1".to_string(),
                name: "Silt fence".to_string(),
                unit: "LF".to_string(),
                unit_cost: 2.0,
                category: None,
            },
            PayItem {
                id: "p2".to_string(),
                name: "Sod".to_string(),
                unit: "SF".to_string(),
                unit_cost: 0.5,
                category: None,
            },
        ]
    }

    fn table(rows: Vec<(&str, &str)>) -> ScheduleTable {
        ScheduleTable {
            id: "bond-input".to_string(),
            title: "Quantities".to_string(),
            columns: vec![
                ScheduleColumn {
                    key: "item".to_string(),
                    label: "Item".to_string(),
                    align: None,
                },
                ScheduleColumn {
                    key: "qty".to_string(),
                    label: "Qty".to_string(),
                    align: None,
                },
            ],
            rows: rows
                .into_iter()
                .map(|(item, qty)| {
                    let mut row = ScheduleRow::new();
                    row.insert("item".to_string(), CellValue::from(item));
                    row.insert("qty".to_string(), CellValue::from(qty));
                    row
                })
                .collect(),
        }
    }

    #[test]
    fn generate_bond_estimate_sums_extended_costs_and_applies_contingency() {
        let t = table(vec![("p1", "100"), ("p2", "200")]);
        let estimate =
            generate_bond_estimate(&t, "item", "qty", None, &pay_items(), 10.0).unwrap();
        assert_eq!(estimate.line_items.len(), 2);
        assert_relative_eq!(estimate.line_items[0].extended_cost, 200.0, epsilon = 1e-9);
        assert_relative_eq!(estimate.line_items[1].extended_cost, 100.0, epsilon = 1e-9);
        assert_relative_eq!(estimate.subtotal, 300.0, epsilon = 1e-9);
        assert_relative_eq!(estimate.contingency_amount, 30.0, epsilon = 1e-9);
        assert_relative_eq!(estimate.total_surety_amount, 330.0, epsilon = 1e-9);
    }

    #[test]
    fn generate_bond_estimate_rejects_an_unknown_pay_item() {
        let t = table(vec![("unknown", "100")]);
        let err = generate_bond_estimate(&t, "item", "qty", None, &pay_items(), 0.0).unwrap_err();
        assert_eq!(err, DrawingError::UnknownPayItem("unknown".to_string()));
    }

    #[test]
    fn generate_bond_estimate_rejects_a_non_numeric_quantity() {
        let t = table(vec![("p1", "not-a-number")]);
        let err = generate_bond_estimate(&t, "item", "qty", None, &pay_items(), 0.0).unwrap_err();
        assert!(matches!(err, DrawingError::InvalidQuantity { .. }));
    }

    #[test]
    fn generate_bond_estimate_rejects_a_negative_contingency() {
        let t = table(vec![("p1", "100")]);
        let err = generate_bond_estimate(&t, "item", "qty", None, &pay_items(), -5.0).unwrap_err();
        assert_eq!(err, DrawingError::InvalidContingencyPercent(-5.0));
    }

    #[test]
    fn generate_bond_estimate_honors_a_per_row_custom_formula() {
        let mut t = table(vec![("p1", "100")]);
        t.columns.push(ScheduleColumn {
            key: "formula".to_string(),
            label: "Formula".to_string(),
            align: None,
        });
        t.rows[0].insert(
            "formula".to_string(),
            CellValue::from("quantity * unitCost + 50"),
        );
        let estimate =
            generate_bond_estimate(&t, "item", "qty", Some("formula"), &pay_items(), 0.0).unwrap();
        // 100 LF * $2/LF + $50 = $250
        assert_relative_eq!(estimate.subtotal, 250.0, epsilon = 1e-9);
    }

    #[test]
    fn generate_bond_estimate_reports_a_missing_quantity_column() {
        let t = table(vec![("p1", "100")]);
        let err =
            generate_bond_estimate(&t, "item", "missing-column", None, &pay_items(), 0.0).unwrap_err();
        assert_eq!(
            err,
            DrawingError::MissingScheduleColumn {
                table_id: "bond-input".to_string(),
                row_index: 0,
                column: "missing-column".to_string()
            }
        );
    }
}
