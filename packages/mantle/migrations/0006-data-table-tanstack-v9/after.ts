import { createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { create } from "zustand";

type Invoice = { createdAt: Date; amount: number };

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Invoice>();

export const columns = columnHelper.columns([
	columnHelper.accessor("createdAt", {
		header: "Created",
		sortFn: "datetime",
	}),
]);

export function useInvoices(data: Invoice[]) {
	const table = useTable({ features, data, columns });
	return table.state.sorting;
}

// Negative case: a store's getState stays.
export const useStore = create(() => ({ page: 1 }));
export const page = useStore.getState().page;
