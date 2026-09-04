import type { ResolvedCrumb } from "@ngrok/mantle/breadcrumb";
import { Breadcrumb, buildCrumbs } from "@ngrok/mantle/breadcrumb";
import { Fragment } from "react";
import { Link, useMatches } from "react-router";
import { useOriginCrumbs } from "~/features/navigation-origin/use-origin-crumbs";

/** A crumb the renderer wraps in its own `Breadcrumb.Item`. */
type ItemCrumb = Exclude<ResolvedCrumb, { kind: "content" }>;

/**
 * One crumb's content. The deepest crumb is the current page; a label crumb is
 * a plain `Breadcrumb.Label`; every other crumb links to its route.
 */
function CrumbContent({ crumb, isCurrentPage }: { crumb: ItemCrumb; isCurrentPage: boolean }) {
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
 * current page (`aria-current="page"`, not a link), and every earlier one links
 * to its route — except a label crumb, which renders as a non-link
 * `Breadcrumb.Label`, and a content crumb, which renders its own items. A
 * content crumb decides link vs current page itself, because the renderer
 * cannot see inside it.
 *
 * Kept separate from {@link RouteBreadcrumbs} so nothing here touches the router:
 * this is the half you can render with a fixture in a test.
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
						{crumb.kind === "content" ? (
							crumb.content
						) : (
							<Breadcrumb.Item>
								<CrumbContent crumb={crumb} isCurrentPage={index === crumbs.length - 1} />
							</Breadcrumb.Item>
						)}
					</Fragment>
				))}
			</Breadcrumb.List>
		</Breadcrumb.Root>
	);
}

/**
 * The breadcrumb trail for the current route. Render it once, in your app shell's
 * header: it derives everything from the matched route chain and from
 * `location.state`, so no route needs to push anything up.
 *
 * Two derived lists, composed. With no origin, the trail is the route trail:
 * where the reader is. With an origin, it is a stack: the first page's
 * ancestors, one crumb per hop, and this page's leaf. This page's own ancestors
 * step aside, because they are not where the reader was. If your app has no
 * origin trail, drop the `useOriginCrumbs()` line and the ternary; nothing else
 * changes.
 *
 * This is the only piece that touches the router, which keeps the hooks at the edge.
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
	const originCrumbs = useOriginCrumbs();
	const routeCrumbs = buildCrumbs(useMatches());
	const crumbs =
		originCrumbs.length === 0 ? routeCrumbs : [...originCrumbs, ...routeCrumbs.slice(-1)];
	return <Breadcrumbs crumbs={crumbs} />;
}

export {
	//,
	Breadcrumbs,
	RouteBreadcrumbs,
};
