import { IconButton } from "@ngrok/mantle/button";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { Table } from "@ngrok/mantle/table";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";

type Payment = { id: string; amount: number };

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Payment>();

export const columns = columnHelper.columns([
	columnHelper.accessor("id", {
		id: "id",
		header: () => <DataTable.Header>ID</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.display({
		id: "actions",
		header: () => <DataTable.ActionHeader />,
		cell: () => (
			<DataTable.ActionCell>
				<IconButton
					appearance="ghost"
					intent="neutral"
					type="button"
					label="Open actions"
					icon={<DotsThreeIcon weight="bold" />}
				/>
			</DataTable.ActionCell>
		),
	}),
	columnHelper.display({
		id: "labelled-actions",
		header: () => <DataTable.ActionHeader className="w-0">Actions</DataTable.ActionHeader>,
		cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
	}),
	columnHelper.display({
		id: "headless-actions",
		header: () => <DataTable.ActionHeader />,
		cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
	}),
	// Negative cases: a column without an action cell keeps its header.
	columnHelper.display({
		id: "spacer",
		header: () => null,
		cell: () => <DataTable.Cell>{null}</DataTable.Cell>,
	}),
	columnHelper.accessor("amount", {
		id: "amount",
		header: () => <Table.Header>Amount</Table.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);

// Negative case: the options object holds every column, so only the action
// column's own object decides.
export function useInlineTable(data: Payment[]) {
	return useTable({
		features,
		data,
		columns: columnHelper.columns([
			columnHelper.accessor("amount", {
				id: "amount",
				header: () => <DataTable.Header>Amount</DataTable.Header>,
				cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
			}),
			columnHelper.display({
				id: "actions",
				header: () => <DataTable.ActionHeader />,
				cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
			}),
		]),
	});
}
