import {
	CursorPagination,
	PaginationRange,
	getOffsetPaginatedSlice,
	useOffsetPagination,
} from "@ngrok/mantle/pagination";
import { Table } from "@ngrok/mantle/table";

import { PreviewCanvas } from "~/components/preview-canvas";

export const invoices = [
	{
		invoice: "INV001",
		paymentStatus: "Paid",
		totalAmount: "$250.00",
		paymentMethod: "Credit Card",
	},
	{
		invoice: "INV002",
		paymentStatus: "Pending",
		totalAmount: "$150.00",
		paymentMethod: "PayPal",
	},
	{
		invoice: "INV003",
		paymentStatus: "Unpaid",
		totalAmount: "$350.00",
		paymentMethod: "Bank Transfer",
	},
	{
		invoice: "INV004",
		paymentStatus: "Paid",
		totalAmount: "$450.00",
		paymentMethod: "Credit Card",
	},
	{
		invoice: "INV005",
		paymentStatus: "Paid",
		totalAmount: "$550.00",
		paymentMethod: "PayPal",
	},
	{
		invoice: "INV006",
		paymentStatus: "Pending",
		totalAmount: "$200.00",
		paymentMethod: "Bank Transfer",
	},
	{
		invoice: "INV007",
		paymentStatus: "Unpaid",
		totalAmount: "$300.00",
		paymentMethod: "Credit Card",
	},
];

export const statuses = ["Paid", "Pending", "Unpaid"];

export const methods = ["Credit Card", "PayPal", "Bank Transfer"];

export const manyInvoices = Array.from({ length: 128 }, (_, index) => ({
	invoice: `INV${String(index + 1).padStart(3, "0")}`,
	paymentStatus: statuses[index % statuses.length],
	paymentMethod: methods[index % methods.length],
	totalAmount: `$${((index * 37) % 900) + 100}.00`,
}));

export function PaginatedInvoicesExample() {
	const pagination = useOffsetPagination({ listSize: manyInvoices.length, pageSize: 10 });
	const pageInvoices = getOffsetPaginatedSlice(manyInvoices, pagination);

	return (
		<div className="flex w-full flex-col gap-4">
			<Table.Root>
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header width="fit">Invoice</Table.Header>
							<Table.Header width="fit">Status</Table.Header>
							<Table.Header>Method</Table.Header>
							<Table.Header width="fit" className="text-right">
								Amount
							</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						{pageInvoices.map((invoice) => (
							<Table.Row key={invoice.invoice}>
								<Table.Cell width="fit" className="font-medium">
									{invoice.invoice}
								</Table.Cell>
								<Table.Cell width="fit">{invoice.paymentStatus}</Table.Cell>
								<Table.Cell>{invoice.paymentMethod}</Table.Cell>
								<Table.Cell width="fit" className="text-right">
									{invoice.totalAmount}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Element>
			</Table.Root>
			<CursorPagination.Root
				className="flex flex-wrap justify-between"
				pageSize={pagination.pageSize}
				onChangePageSize={pagination.setPageSize}
			>
				<PaginationRange
					offset={pagination.offset}
					pageSize={pagination.pageSize}
					total={manyInvoices.length}
					noun={{ singular: "invoice", plural: "invoices" }}
				/>
				<div className="flex items-center gap-2">
					<CursorPagination.PageSizeSelect />
					<CursorPagination.Buttons
						hasPreviousPage={pagination.hasPreviousPage}
						hasNextPage={pagination.hasNextPage}
						onPreviousPage={pagination.previousPage}
						onNextPage={pagination.nextPage}
					/>
				</div>
			</CursorPagination.Root>
		</div>
	);
}

export const ExampleTable = () => {
	return (
		<Table.Root>
			<Table.Element>
				<Table.Caption>A list of your recent invoices.</Table.Caption>
				<Table.Head>
					<Table.Row>
						<Table.Header width="fit">Invoice</Table.Header>
						<Table.Header width="fit">Status</Table.Header>
						<Table.Header>Method</Table.Header>
						<Table.Header width="fit" className="text-right">
							Amount
						</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>
					{invoices.map((invoice) => (
						<Table.Row key={invoice.invoice}>
							<Table.Cell width="fit" className="font-medium">
								{invoice.invoice}
							</Table.Cell>
							<Table.Cell width="fit">{invoice.paymentStatus}</Table.Cell>
							<Table.Cell>{invoice.paymentMethod}</Table.Cell>
							<Table.Cell width="fit" className="text-right">
								{invoice.totalAmount}
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
				<Table.Foot>
					<Table.Row>
						<Table.Cell colSpan={3}>Total</Table.Cell>
						<Table.Cell width="fit" className="text-right">
							$2,500.00
						</Table.Cell>
					</Table.Row>
				</Table.Foot>
			</Table.Element>
		</Table.Root>
	);
};

/** The first example on the Table docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="gap-2">
			<ExampleTable />
		</PreviewCanvas>
	);
}

/** The "Pagination" example on the Table docs page. */
export function PaginationExample() {
	return (
		<PreviewCanvas>
			<PaginatedInvoicesExample />
		</PreviewCanvas>
	);
}

const tokens = [
	{
		id: "pat_…4uRjpirH",
		description: "Created via ngrok OAuth",
		owner: "wesley@example.com",
		created: "4d ago",
	},
	{
		id: "pat_…o8xvn6M4",
		description: "ship pat 2",
		owner: "takoda@example.com",
		created: "4d ago",
	},
	{
		id: "pat_…3P2R30Rn",
		description:
			"A long description that someone pasted in to explain what this token is for in production",
		owner: "svc-deploy-pipeline@example.com",
		created: "5d ago",
	},
];

/** The "Sizing a column" example on the Table docs page. */
export function SizingAColumnExample() {
	return (
		<PreviewCanvas>
			<Table.Root>
				<Table.Element>
					<Table.Head>
						<Table.Row>
							<Table.Header width="fit">ID</Table.Header>
							<Table.Header>Description</Table.Header>
							<Table.Header>Owner</Table.Header>
							<Table.Header width="fit">Created</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						{tokens.map((token) => (
							<Table.Row key={token.id}>
								<Table.Cell width="fit">{token.id}</Table.Cell>
								<Table.Cell className="font-sans">{token.description}</Table.Cell>
								<Table.Cell className="font-sans">{token.owner}</Table.Cell>
								<Table.Cell width="fit" className="font-sans">
									{token.created}
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Element>
			</Table.Root>
		</PreviewCanvas>
	);
}
