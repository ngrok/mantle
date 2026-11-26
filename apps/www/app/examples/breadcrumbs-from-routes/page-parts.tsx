import { Table } from "@ngrok/mantle/table";
import type { ReactNode } from "react";

/**
 * A demo page's title block. The trail names the place; the `<h1>` names the
 * page, so the two never have to repeat each other.
 */
function PageHeader({ title, description }: { title: ReactNode; description: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<h1 className="text-strong text-2xl font-medium">{title}</h1>
			<p className="text-muted text-sm">{description}</p>
		</div>
	);
}

/** A table of resources; each child is a {@link ResourceRow}. */
function ResourceList({ label, children }: { label: string; children: ReactNode }) {
	return (
		<Table.Root>
			<Table.Element aria-label={label}>
				<Table.Head>
					<Table.Row>
						<Table.Header>Name</Table.Header>
						<Table.Header width="fit">ID</Table.Header>
					</Table.Row>
				</Table.Head>
				<Table.Body>{children}</Table.Body>
			</Table.Element>
		</Table.Root>
	);
}

/**
 * One resource in a {@link ResourceList}: the title (a link when the resource
 * has a page) and its identifier.
 */
function ResourceRow({ title, meta }: { title: ReactNode; meta: string }) {
	return (
		<Table.Row>
			<Table.Cell className="font-medium">{title}</Table.Cell>
			<Table.Cell width="fit">
				<code translate="no" className="text-muted text-xs">
					{meta}
				</code>
			</Table.Cell>
		</Table.Row>
	);
}

export {
	//,
	PageHeader,
	ResourceList,
	ResourceRow,
};
