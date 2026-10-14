import { createColumnHelper, sortFn_basic, tableFeatures } from "@ngrok/mantle/data-table";

type Invoice = { createdAt: Date; amount: number };

declare const table: { getState(): { sorting: unknown } };
declare const usersTable: { getState(): { pagination: unknown } };
declare const machine: { getState(): string };

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Invoice>();

export const columns = columnHelper.columns([
	columnHelper.accessor("createdAt", {
		header: "Created",
		sortFn: "datetime",
	}),
	columnHelper.accessor("amount", {
		header: "Amount",
		sortFn: (rowA, rowB) => rowA.original.amount - rowB.original.amount,
	}),
]);

export const { sorting } = table.state;
export const page = usersTable.state.pagination;

// Negative cases: a state machine's getState and the sortFns registry stay.
export const state = machine.getState();
export const registry = { sortFns: { basic: sortFn_basic } };
