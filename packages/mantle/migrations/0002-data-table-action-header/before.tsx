import { IconButton } from "@ngrok/mantle/button";
import {
	DataTable,
	DataTable as Grid,
	createColumnHelper,
	tableFeatures,
	useTable,
} from "@ngrok/mantle/data-table";
import { Table } from "@ngrok/mantle/table";
import { Table as PlainTable } from "@acme/ui";
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
		header: () => <DataTable.Header />,
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
		header: () => <Table.Header className="w-0">Actions</Table.Header>,
		cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
	}),
	columnHelper.display({
		id: "headless-actions",
		header: () => null,
		cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
	}),
	// The aliased import is the same part.
	columnHelper.display({
		id: "aliased-actions",
		header: () => <Grid.Header />,
		cell: () => <Grid.ActionCell>{null}</Grid.ActionCell>,
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
	// Negative case: a table the action cell renders keeps its own headers.
	columnHelper.display({
		id: "nested-actions",
		header: () => <DataTable.Header />,
		cell: () => (
			<DataTable.ActionCell>
				<Table.Root>
					<Table.Head>
						<Table.Row>
							<Table.Header>Nested</Table.Header>
						</Table.Row>
					</Table.Head>
				</Table.Root>
			</DataTable.ActionCell>
		),
	}),
	// Negative case: another library's Table.Header is not the part.
	columnHelper.display({
		id: "foreign-actions",
		header: () => <PlainTable.Header>Actions</PlainTable.Header>,
		cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
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
				header: () => <DataTable.Header />,
				cell: () => <DataTable.ActionCell>{null}</DataTable.ActionCell>,
			}),
		]),
	});
}
