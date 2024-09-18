import { CodeBlock, CodeBlockBody, CodeBlockCode, CodeBlockCopyButton, fmtCode } from "@/code-block";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/table";
import type { HeadersFunction, MetaFunction } from "@remix-run/node";
import { Example } from "~/components/example";

export const meta: MetaFunction = () => {
	return [
		{ title: "@ngrok/mantle — Table" },
		{ name: "description", content: "mantle is ngrok's UI library and design system" },
	];
};

export const headers: HeadersFunction = () => {
	return {
		"Cache-Control": "max-age=300, stale-while-revalidate=604800",
	};
};

export default function Page() {
	return (
		<section className="space-y-4">
			<h1 className="text-5xl font-medium">Table</h1>
			<p className="font-body text-xl text-body">A responsive table component.</p>
			<div>
				<Example className="gap-2">
					<ExampleTable />
				</Example>
				<CodeBlock className="rounded-b-lg rounded-t-none">
					<CodeBlockBody>
						<CodeBlockCopyButton />
						<CodeBlockCode
							language="tsx"
							value={fmtCode`
							import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@ngrok/mantle/table";

							<Table>
								<TableCaption>A list of your recent invoices.</TableCaption>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[100px]">Invoice</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Method</TableHead>
										<TableHead className="text-right">Amount</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invoices.map((invoice) => (
										<TableRow key={invoice.invoice}>
											<TableCell className="font-medium">{invoice.invoice}</TableCell>
											<TableCell>{invoice.paymentStatus}</TableCell>
											<TableCell>{invoice.paymentMethod}</TableCell>
											<TableCell className="text-right">{invoice.totalAmount}</TableCell>
										</TableRow>
									))}
								</TableBody>
								<TableFooter>
									<TableRow>
										<TableCell colSpan={3}>Total</TableCell>
										<TableCell className="text-right">$2,500.00</TableCell>
									</TableRow>
								</TableFooter>
							</Table>
						`}
						/>
					</CodeBlockBody>
				</CodeBlock>
			</div>
		</section>
	);
}

const ExampleTable = () => {
	const invoices = [
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

	return (
		<div className="z-10 mt-4 overflow-hidden rounded-lg border border-card bg-card">
			<Table>
				<TableCaption>A list of your recent invoices.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[100px]">Invoice</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Method</TableHead>
						<TableHead className="text-right">Amount</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{invoices.map((invoice) => (
						<TableRow key={invoice.invoice}>
							<TableCell className="font-medium">{invoice.invoice}</TableCell>
							<TableCell>{invoice.paymentStatus}</TableCell>
							<TableCell>{invoice.paymentMethod}</TableCell>
							<TableCell className="text-right">{invoice.totalAmount}</TableCell>
						</TableRow>
					))}
				</TableBody>
				<TableFooter>
					<TableRow>
						<TableCell colSpan={3}>Total</TableCell>
						<TableCell className="text-right">$2,500.00</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
		</div>
	);
};
