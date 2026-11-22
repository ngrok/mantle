import type { Row as TableRow, RowData, TableFeatures } from "@tanstack/react-table";

/**
 * Compute the stable DOM `id` for a row's expanded detail row. Shared by
 * `DataTable.RowExpandButton` (as its `aria-controls` target) and
 * `DataTable.ExpandedRow` (as its `id`) so the accessibility association is
 * _derived_ from the row (never synchronized state) and stays correct whether
 * or not the detail panel is currently rendered.
 *
 * REQUIRED: configure the table with a stable `getRowId` so `row.id` (and thus
 * this id) is stable across sorting/filtering/pagination. Any `row.id` value is
 * safe: it is URL-encoded into a valid, whitespace-free HTML id token (and thus
 * a valid `aria-controls` IDREF), so display names with spaces, URLs, and emails
 * all work; `getRowId` controls the value.
 *
 * @example
 * ```tsx
 * <DataTable.RowExpandButton row={row} label={row.original.name} />
 * // ...renders aria-controls={expandedRowId(row)} while expanded, and
 * <DataTable.ExpandedRow row={row}>...</DataTable.ExpandedRow>
 * // ...renders id={expandedRowId(row)}, the same value, so they stay associated.
 * ```
 */
function expandedRowId<TFeatures extends TableFeatures, TData extends RowData>(
	row: TableRow<TFeatures, TData>,
): string {
	// `encodeURIComponent` guarantees a whitespace-free, valid HTML id token (and
	// thus a valid `aria-controls` IDREF) for ANY `getRowId` value, e.g. a display
	// name like "Acme Inc". Both the toggle's `aria-controls` and the expanded
	// row's `id` derive from this one function, so encoding both sides keeps them
	// equal and preserves the accessibility association.
	return `data-table-expanded-row-${encodeURIComponent(row.id)}`;
}

export { expandedRowId };
