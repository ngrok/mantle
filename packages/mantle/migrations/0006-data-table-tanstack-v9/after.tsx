import {
	createColumnHelper,
	sortFn_basic,
	tableFeatures,
	useTable,
} from "@ngrok/mantle/data-table";
import { create } from "zustand";

type Invoice = { createdAt: Date; amount: number };

declare const data: Invoice[];
declare const machine: { getState(): string };
declare const useTableStore: { getState(): { page: number } };

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

// A `useTable` result under any name, and the `table` a column callback receives.
export function useInvoices() {
	const invoices = useTable({ features, data, columns });
	const { sorting } = invoices.state;
	return {
		sorting,
		pagination: columnHelper.display({ cell: ({ table }) => table.state.pagination }),
	};
}

// A name that ends in `table` reads as the instance when the file imports the data table.
export function readPage(usersTable: ReturnType<typeof useTable>) {
	return usersTable.state.pagination;
}

// Negative cases: a state machine, a store, and the sortFns registry stay.
export const state = machine.getState();
export const useStore = create(() => ({ page: 1 }));
export const page = useStore.getState().page;
export const storePage = useTableStore.getState().page;
export const registry = { sortFns: { basic: sortFn_basic } };
