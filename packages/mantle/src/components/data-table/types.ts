import type { CellData, RowData, TableFeatures } from "@tanstack/react-table";
import type { ColumnWidth } from "../table/table.js";
import { sortingDirections as baseSortingDirections } from "../../utils/sorting/direction.js";

const sortDirections = [...baseSortingDirections, "unsorted"] as const;
type SortDirection = (typeof sortDirections)[number];

/**
 * The column `meta` fields that `DataTable.Header` and `DataTable.Cell` read
 * through their `column` prop. Tables with no `columnMeta` slot get these
 * fields from the global `ColumnMeta` interface. A table with a `columnMeta`
 * slot must add them to the slot type, because the slot replaces the global
 * interface.
 *
 * @see https://mantle.ngrok.com/components/data-display/data-table#sizing-a-column
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
	 * How the column sizes. When omitted, the column stays on one line, shares
	 * the table's spare width, and truncates a value that does not fit. `"fit"`
	 * never truncates; `"wrap"` lets prose wrap.
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
