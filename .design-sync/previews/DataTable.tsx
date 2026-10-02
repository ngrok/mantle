import {
	Badge,
	createColumnHelper,
	createSortedRowModel,
	DataTable,
	Empty,
	rowSortingFeature,
	sortFn_alphanumeric,
	sortFn_datetime,
	sortFn_text,
	tableFeatures,
	TrayIcon,
	useTable,
} from "@ngrok/mantle";

type Endpoint = {
	id: string;
	url: string;
	region: string;
	status: "online" | "offline";
	requests: number;
};

const endpoints: Endpoint[] = [
	{
		id: "ep_2abc",
		url: "https://api.acme.ngrok.app",
		region: "us-east",
		status: "online",
		requests: 128402,
	},
	{
		id: "ep_2def",
		url: "https://webhooks.acme.com",
		region: "eu-central",
		status: "online",
		requests: 40219,
	},
	{
		id: "ep_2ghi",
		url: "tcp://5.tcp.ngrok.io:21443",
		region: "ap-southeast",
		status: "offline",
		requests: 0,
	},
	{
		id: "ep_2jkl",
		url: "https://staging.acme.ngrok.dev",
		region: "us-west",
		status: "online",
		requests: 9871,
	},
];

const features = tableFeatures({
	rowSortingFeature,
	sortedRowModel: createSortedRowModel(),
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		datetime: sortFn_datetime,
		text: sortFn_text,
	},
});

const columnHelper = createColumnHelper<typeof features, Endpoint>();

const columns = columnHelper.columns([
	columnHelper.accessor("url", {
		id: "url",
		header: (props) => (
			<DataTable.Header column={props.column}>
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					URL
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell className="font-mono">{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("region", {
		id: "region",
		header: (props) => (
			<DataTable.Header column={props.column}>
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Region
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell>{props.getValue()}</DataTable.Cell>,
	}),
	columnHelper.accessor("status", {
		id: "status",
		header: (props) => <DataTable.Header column={props.column}>Status</DataTable.Header>,
		cell: (props) => (
			<DataTable.Cell>
				<Badge appearance="muted" color={props.getValue() === "online" ? "success" : "neutral"}>
					{props.getValue() === "online" ? "Online" : "Offline"}
				</Badge>
			</DataTable.Cell>
		),
	}),
	columnHelper.accessor("requests", {
		id: "requests",
		header: (props) => (
			<DataTable.Header column={props.column}>
				<DataTable.HeaderSortButton column={props.column} sortingMode="alphanumeric">
					Requests (24h)
				</DataTable.HeaderSortButton>
			</DataTable.Header>
		),
		cell: (props) => <DataTable.Cell>{props.getValue().toLocaleString("en-US")}</DataTable.Cell>,
	}),
]);

function EndpointsTable({ data }: { data: Endpoint[] }) {
	const table = useTable({
		features,
		data,
		columns,
		initialState: { sorting: [{ id: "requests", desc: true }] },
	});
	const rows = table.getRowModel().rows;

	return (
		<DataTable.Root table={table}>
			<DataTable.Head />
			<DataTable.Body>
				{rows.length > 0 ? (
					rows.map((row) => <DataTable.Row key={row.id} row={row} onClick={() => {}} />)
				) : (
					<DataTable.EmptyRow>
						<Empty.Root>
							<Empty.Icon svg={<TrayIcon />} />
							<Empty.Title>No endpoints yet</Empty.Title>
							<Empty.Description>
								<p>Endpoints you create will appear here.</p>
							</Empty.Description>
						</Empty.Root>
					</DataTable.EmptyRow>
				)}
			</DataTable.Body>
		</DataTable.Root>
	);
}

export const Sortable = () => <EndpointsTable data={endpoints} />;

export const EmptyState = () => <EndpointsTable data={[]} />;
