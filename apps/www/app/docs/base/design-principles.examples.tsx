import { Badge } from "@ngrok/mantle/badge";
import { DataTable, createColumnHelper, tableFeatures, useTable } from "@ngrok/mantle/data-table";
import { PreviewCanvas } from "~/components/preview-canvas";

type Endpoint = {
	id: string;
	name: string;
	url: string;
	upstream: string;
	status: "online" | "offline";
	created: string;
};

const endpoints: Endpoint[] = [
	{
		id: "ep_1",
		name: "checkout-api",
		url: "https://checkout.example.ngrok.app",
		upstream: "http://localhost:8080",
		status: "online",
		created: "Oct 22, 2026",
	},
	{
		id: "ep_2",
		name: "billing-webhooks",
		url: "https://billing.example.ngrok.app",
		upstream: "https://billing.internal.example.com:8443",
		status: "online",
		created: "Sep 30, 2026",
	},
	{
		id: "ep_3",
		name: "staging",
		url: "https://staging.example.ngrok.dev",
		upstream: "http://10.0.4.12:3000",
		status: "offline",
		created: "Aug 4, 2026",
	},
	{
		id: "ep_4",
		name: "payments-reconciliation",
		url: "https://payments.example.ngrok.app",
		upstream: "https://payments-reconciliation.internal.example.com:8443/v2/webhooks/settlements",
		status: "online",
		created: "Jul 18, 2026",
	},
];

const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, Endpoint>();

function StatusBadge({ status }: { status: Endpoint["status"] }) {
	return (
		<Badge appearance="muted" color={status === "online" ? "green" : "gray"}>
			{status === "online" ? "Online" : "Offline"}
		</Badge>
	);
}

const balancedColumns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header>Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("url", {
		id: "url",
		header: () => <DataTable.Header>URL</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("upstream", {
		id: "upstream",
		header: () => <DataTable.Header>Upstream</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("status", {
		id: "status",
		meta: { width: "fit" },
		header: (props) => <DataTable.Header column={props.column}>Status</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell column={props.column}>
				<StatusBadge status={props.getValue()} />
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("created", {
		id: "created",
		meta: { width: "fit" },
		header: (props) => <DataTable.Header column={props.column}>Created</DataTable.Header>,
		cell: (props) => <DataTable.Cell column={props.column}>{props.getValue()}</DataTable.Cell>,
	}),
]);

const unbalancedColumns = columnHelper.columns([
	columnHelper.accessor("name", {
		id: "name",
		header: () => <DataTable.Header className="w-full">Name</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("url", {
		id: "url",
		header: () => <DataTable.Header>URL</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("upstream", {
		id: "upstream",
		header: () => <DataTable.Header>Upstream</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("status", {
		id: "status",
		header: () => <DataTable.Header>Status</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<StatusBadge status={props.getValue()} />
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("created", {
		id: "created",
		header: () => <DataTable.Header>Created</DataTable.Header>,
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
]);

function EndpointsTable({ columns }: { columns: typeof balancedColumns }) {
	const table = useTable({ features, data: endpoints, columns, getRowId: (row) => row.id });

	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{table.getRowModel().rows.map((row) => (
					<DataTable.Row key={row.id} row={row} />
				))}
			</DataTable.Body>
		</DataTable.Root>
	);
}

/** The "Balanced columns" example on the Design Principles docs page. */
export function BalancedColumnsExample() {
	return (
		<PreviewCanvas>
			<div className="w-full">
				<EndpointsTable columns={balancedColumns} />
			</div>
		</PreviewCanvas>
	);
}

/** The "One column takes the row" example on the Design Principles docs page. */
export function UnbalancedColumnsExample() {
	return (
		<PreviewCanvas>
			<div className="w-full">
				<EndpointsTable columns={unbalancedColumns} />
			</div>
		</PreviewCanvas>
	);
}
