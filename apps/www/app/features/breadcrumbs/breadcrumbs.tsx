import { Breadcrumb } from "@ngrok/mantle/breadcrumb";
import { Fragment } from "react";
import { Link, useMatches } from "react-router";
import type { ResolvedCrumb } from "./route-breadcrumb";
import { buildCrumbs } from "./route-breadcrumb";

/**
 * One crumb's content. The deepest crumb is the current page; a label crumb is
 * a plain `Breadcrumb.Label`; every other crumb links to its route.
 */
function CrumbContent({ crumb, isCurrentPage }: { crumb: ResolvedCrumb; isCurrentPage: boolean }) {
	if (isCurrentPage) {
		return <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>;
	}

	if (crumb.kind === "label") {
		// a section prefix whose index URL only redirects — a link there would
		// bounce the user back to where they already are
		return <Breadcrumb.Label>{crumb.label}</Breadcrumb.Label>;
	}

	return (
		// asChild, so the router owns navigation — a bare href on
		// Breadcrumb.Link would full-page-navigate
		<Breadcrumb.Link asChild>
			<Link to={crumb.to}>{crumb.label}</Link>
		</Breadcrumb.Link>
	);
}

/**
 * Renders a breadcrumb trail from already-resolved crumbs. The last crumb is the
 * current page (`aria-current="page"`, not a link); every earlier one links to its
 * route, except a label crumb, which renders as a non-link `Breadcrumb.Label`.
 *
 * Kept separate from {@link RouteBreadcrumbs} so nothing here touches the router:
 * this is the half you can render with a fixture in a test, or in a docs demo that
 * cannot mount a second router.
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   crumbs={[
 *     { kind: "link", key: "endpoints:0", label: "Endpoints", to: "/endpoints" },
 *     { kind: "link", key: "endpoint:0", label: "ep_1", to: "/endpoints/cloud/ep_1" },
 *   ]}
 * />
 * ```
 */
function Breadcrumbs({ crumbs }: { crumbs: ReadonlyArray<ResolvedCrumb> }) {
	if (crumbs.length === 0) {
		return null;
	}

	return (
		<Breadcrumb.Root>
			<Breadcrumb.List>
				{crumbs.map((crumb, index) => (
					<Fragment key={crumb.key}>
						{index > 0 && <Breadcrumb.Separator />}
						<Breadcrumb.Item>
							<CrumbContent crumb={crumb} isCurrentPage={index === crumbs.length - 1} />
						</Breadcrumb.Item>
					</Fragment>
				))}
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

/**
 * The breadcrumb trail for the current route. Render it once, in your app shell's
 * header — it derives everything from the matched route chain, so no route needs to
 * push anything up.
 *
 * This is the only piece that touches the router, which keeps the hook at the edge.
 *
 * @example
 * ```tsx
 * <AppLayout.Header>
 *   <Sidebar.Trigger />
 *   <RouteBreadcrumbs />
 * </AppLayout.Header>
 * ```
 */
function RouteBreadcrumbs() {
	return <Breadcrumbs crumbs={buildCrumbs(useMatches())} />;
}

export {
	//,
	Breadcrumbs,
	RouteBreadcrumbs,
};
