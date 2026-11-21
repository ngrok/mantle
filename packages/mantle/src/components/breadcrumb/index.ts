/**
 * Re-exports for the Breadcrumb component.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 */

import * as BreadcrumbParts from "./breadcrumb-parts.js";

/**
 * Compound component for WAI-ARIA breadcrumb navigation: the path from a
 * root to the current page as an ordered list of links inside a labeled
 * `<nav>` landmark. Router-agnostic: compose `Breadcrumb.Link` onto your app
 * router's link via `asChild`. A trail too wide for its row scrolls sideways
 * with faded edges instead of wrapping, and starts at the current page.
 *
 * @useWhen Show where the current page sits in a hierarchy, as a trail of links from a root page.
 *
 * @siblings
 * - `Tabs`: the user switches between peer views of one page.
 * - `Sidebar`: the app needs persistent navigation to its top-level pages.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
 *
 * @example
 * Composition:
 * ```
 * Breadcrumb.Root
 * └── Breadcrumb.List
 *     ├── Breadcrumb.Item
 *     │   └── Breadcrumb.Link
 *     ├── Breadcrumb.Separator
 *     ├── Breadcrumb.Item
 *     │   └── Breadcrumb.Label
 *     ├── Breadcrumb.Separator
 *     ├── Breadcrumb.Item
 *     │   └── Breadcrumb.Page
 *     └── Breadcrumb.Skeleton
 * ```
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>ep_2h8…</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Breadcrumb = BreadcrumbParts;

export {
	//,
	Breadcrumb,
};

export {
	//,
	buildCrumbs,
	hasBreadcrumb,
	routeBreadcrumb,
} from "./route-breadcrumb.js";

export type {
	//,
	BreadcrumbHandle,
	BreadcrumbMatch,
	Crumb,
	ResolvedCrumb,
	RouteBreadcrumb,
} from "./route-breadcrumb.js";
