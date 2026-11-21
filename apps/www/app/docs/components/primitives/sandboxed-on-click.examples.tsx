import { IconButton } from "@ngrok/mantle/button";
import { SandboxedOnClick } from "@ngrok/mantle/sandboxed-on-click";
import { Table } from "@ngrok/mantle/table";
import { BookIcon } from "@phosphor-icons/react/dist/ssr/Book";

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

/** The first example on the SandboxedOnClick docs page. */
export function OverviewExample() {
	return (
		<PreviewCanvas className="gap-2">
			<Table.Root>
				<Table.Element>
					<Table.Caption>A list of your recent invoices.</Table.Caption>
					<Table.Head>
						<Table.Row>
							<Table.Header className="w-25">Invoice</Table.Header>
							<Table.Header>Status</Table.Header>
							<Table.Header>Method</Table.Header>
							<Table.Header className="text-right">Amount</Table.Header>
							<Table.Header className="text-right">Actions</Table.Header>
						</Table.Row>
					</Table.Head>
					<Table.Body>
						{invoices.map((invoice) => (
							<Table.Row
								key={invoice.invoice}
								className="cursor-pointer"
								onClick={() => {
									window.alert(`Clicked on ${invoice.invoice}!`);
								}}
							>
								<Table.Cell className="font-medium">{invoice.invoice}</Table.Cell>
								<Table.Cell>{invoice.paymentStatus}</Table.Cell>
								<Table.Cell>{invoice.paymentMethod}</Table.Cell>
								<Table.Cell className="text-right">{invoice.totalAmount}</Table.Cell>
								<Table.Cell className="text-right">
									<SandboxedOnClick allowClickEventDefault>
										<IconButton
											appearance="ghost"
											intent="neutral"
											size="sm"
											label="See ngrok docs"
											icon={<BookIcon />}
											asChild
										>
											<a href="https://ngrok.com/docs" target="_blank" rel="noopener noreferrer" />
										</IconButton>
									</SandboxedOnClick>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
					<Table.Foot>
						<Table.Row>
							<Table.Cell colSpan={3}>Total</Table.Cell>
							<Table.Cell className="text-right">$2,500.00</Table.Cell>
							<Table.Cell />
						</Table.Row>
					</Table.Foot>
				</Table.Element>
			</Table.Root>
		</PreviewCanvas>
	);
}

/** The "Polymorphism" example on the SandboxedOnClick docs page. */
export function PolymorphismExample() {
	return (
		<PreviewCanvas>
			<SandboxedOnClick asChild allowClickEventDefault>
				<a href="https://ngrok.com/docs" target="_blank" rel="noopener noreferrer">
					See ngrok docs
				</a>
			</SandboxedOnClick>
		</PreviewCanvas>
	);
}
