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

/** A list of resources; each child is a {@link ResourceRow}. */
function ResourceList({ label, children }: { label: string; children: ReactNode }) {
	return (
		<ul
			aria-label={label}
			className="border-card-muted divide-card-muted divide-y rounded-lg border"
		>
			{children}
		</ul>
	);
}

/**
 * One resource in a {@link ResourceList}: the title (a link when the resource
 * has a page) and a muted identifier beside it.
 */
function ResourceRow({ title, meta }: { title: ReactNode; meta: string }) {
	return (
		<li className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
			<span className="text-strong font-medium">{title}</span>
			<code translate="no" className="text-muted text-xs">
				{meta}
			</code>
		</li>
	);
}

export {
	//,
	PageHeader,
	ResourceList,
	ResourceRow,
};
