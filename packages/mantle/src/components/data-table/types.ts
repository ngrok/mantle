import type { CellData, RowData, TableFeatures } from "@tanstack/react-table";
import { sortingDirections as baseSortingDirections } from "../../utils/sorting/direction.js";

const sortDirections = [...baseSortingDirections, "unsorted"] as const;
type SortDirection = (typeof sortDirections)[number];

/**
 * How wide a `DataTable` column renders. `"fit"` makes the column only as wide
 * as its widest content, on one line, and gives the spare width to the other
 * columns.
 */
type ColumnWidth = "fit";

/**
 * The column `meta` fields that `DataTable.Header` and `DataTable.Cell` read
 * through their `column` prop. Tables with no `columnMeta` slot get these
 * fields from the global `ColumnMeta` interface. A table with a `columnMeta`
 * slot must add them to the slot type, because the slot replaces the global
 * interface.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#sizing-a-column-to-its-content
 *
 * @example
 * ```tsx
 * type PaymentsColumnMeta = DataTableColumnMeta & { align?: "start" | "end" };
 *
 * const features = tableFeatures({
 *   columnMeta: metaHelper<PaymentsColumnMeta>(),
 * });
 * ```
 */
type DataTableColumnMeta = {
	/**
	 * How wide the column renders. When omitted, the browser shares the
	 * table's spare width across every column.
	 */
	width?: ColumnWidth;
};

declare module "@tanstack/react-table" {
	// Why an interface: module augmentation merges only into an interface.
	// oxlint-disable-next-line typescript/consistent-type-definitions, typescript/no-empty-interface, typescript/no-empty-object-type -- declaration merge into TanStack's ColumnMeta
	interface ColumnMeta<
		in out TFeatures extends TableFeatures,
		in out TData extends RowData,
		TValue extends CellData = CellData,
	> extends DataTableColumnMeta {}
}

export {
	//,
	sortDirections,
};

export type {
	//,
	ColumnWidth,
	DataTableColumnMeta,
	SortDirection,
};
