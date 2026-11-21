// Why "use no memo": a server component can render this file. A stateless part gains little from
// the compiler, and its cache hook would make the build mark the chunk "use client".
"use no memo";

import type { ComponentProps } from "react";
import { cloneElement, isValidElement } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Skeleton } from "../skeleton/skeleton.js";
import { Slot } from "../slot/index.js";
import { Separator, TrailScroller } from "./breadcrumb-client.js";

/**
 * The breadcrumb landmark. Renders a `<nav>` with a default
 * `aria-label="Breadcrumb"` per the WAI-ARIA breadcrumb pattern. Pass your
 * own `aria-label` to override it (e.g. for localization or when a page has
 * multiple breadcrumb trails). Carries no visual styling. Its one layout class
 * is `min-w-0`: inside a flex row such as `AppLayout.Header` the landmark must
 * shrink below the trail's width, or `Breadcrumb.List` never scrolls and the
 * crumbs push their siblings out of the row.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumbroot
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
const Root = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"nav"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "nav";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb")}
			aria-label="Breadcrumb"
			className={cx("min-w-0", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The ordered list of crumbs. Renders an `<ol>` (an **ordered** list), because
 * the order of the items is the hierarchy, from the root to the current page.
 * Lays the crumbs out in one row of muted, small text.
 *
 * A trail wider than its container scrolls sideways instead of wrapping to a
 * second row, which a one-row app header has no space for. Its edges carry the
 * same `scroll-fade-x` mask as `Tabs.List`: an edge with crumbs beyond it fades
 * out, and an edge with nothing beyond it stays flush.
 *
 * The trail keeps its end in view, because the end is the current page. It
 * scrolls itself there whenever that end moves: on mount, when a navigation
 * swaps the crumbs, and when the row around it resizes. The rest of the time,
 * it leaves the reader's own scroll position alone, including while a crumb
 * holds focus. Tabbing to a crumb the trail has scrolled past is the browser's own
 * job, and `scroll-padding` the width of the fade zone is what lands that crumb
 * clear of the fade rather than under it.
 *
 * To wrap instead, pass `className="flex-wrap overflow-x-visible"`. The mask
 * needs a scrollport to animate against, so without one it renders fully
 * opaque and the row wraps as it did before.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumblist
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
const List = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"ol"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "ol";

	// Why the scroller wraps the finished element: it is the only client code in
	// the trail, so a server page sends the browser the scroller and not `cx`.
	return (
		<TrailScroller ref={ref}>
			<Comp
				data-slot={joinDataSlot(dataSlot, "breadcrumb-list")}
				className={cx(
					"text-muted flex items-center gap-1.5 text-sm",
					// The trail scrolls rather than wraps, masked at both edges like
					// Tabs.List. min-w-0 is what lets the row shrink (and so scroll)
					// when the list is itself a flex item.
					"scroll-fade-x min-w-0 overflow-x-auto overscroll-x-none",
					// overflow-x-auto promotes overflow-y to auto, and the mask paints
					// nothing outside the border box, so a focused crumb's ring needs room
					// reserved inside the scrollport; the negative margin gives that room
					// back to the surrounding layout. Same trade as CodeBlock.TabList.
					"-m-1 p-1",
					// The mask fades 40px at each edge, and the browser scrolls a crumb it
					// tabs to only as far as the scroll padding asks for. 40px matches the
					// two, so a focused crumb lands clear of the fade instead of under it.
					"scroll-px-10",
					className,
				)}
				{...props}
			>
				{children}
			</Comp>
		</TrailScroller>
	);
};

/**
 * A single crumb. Renders an `<li>` (`role="listitem"`) that lays out its
 * content (a `Breadcrumb.Link`, a `Breadcrumb.Label`, or a `Breadcrumb.Page`)
 * inline.
 *
 * The crumb never shrinks (`shrink-0`). A squeezed crumb would break its own
 * label across two lines, so a trail too wide for its container scrolls in
 * `Breadcrumb.List` instead.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumbitem
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
const Item = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"li"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "li";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-item")}
			className={cx("inline-flex shrink-0 items-center gap-1.5", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A link to an ancestor page in the hierarchy. Renders an `<a>` by default.
 * The component is router-agnostic: use `asChild` to compose the styling
 * onto your app router's link (e.g. react-router's `<Link>`) so client-side
 * navigation kicks in.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
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
 *
 * @example
 * ```tsx
 * <Breadcrumb.Link asChild>
 * 	<Link to={href("/endpoints")}>Endpoints</Link>
 * </Breadcrumb.Link>
 * ```
 */
const Link = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"a"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "a";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-link")}
			className={cx("hover:text-strong transition-colors", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A crumb that is not a link: a level with no page of its own, such as a
 * section whose index URL only redirects (`Settings` in `Settings > General`).
 * Renders a `<span>` with no `aria-current` and no link semantics, so the
 * trail shows the level without offering it as a destination. Use
 * `Breadcrumb.Link` for an ancestor a user can visit and `Breadcrumb.Page`
 * for the current page.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumblabel
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Label>Settings</Breadcrumb.Label>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Page>General</Breadcrumb.Page>
 * 		</Breadcrumb.Item>
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
const Label = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"span"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "span";

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-label")}
			className={cx("text-muted", className)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * The current page (the last crumb in the trail). Renders a `<span>` (not a
 * link; the user is already here) with `aria-current="page"`. The ARIA is the
 * part's whole contract, so `aria-current` is always emitted and is not
 * overridable via props.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb
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
const Page = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"span"> & WithAsChild & WithDataSlot) => {
	const Comp = asChild ? Slot : "span";
	// Slot merges child props over slot props, so with asChild the enforced
	// ARIA must be cloned onto the child element itself to stay un-overridable.
	const content =
		asChild && isValidElement<ComponentProps<"span">>(children)
			? cloneElement(children, { "aria-current": "page" })
			: children;

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-page")}
			className={cx("text-muted", className)}
			{...props}
			aria-current="page"
		>
			{content}
		</Comp>
	);
};

/**
 * The props for `Breadcrumb.Skeleton`. `children` is omitted on purpose: the
 * part owns its placeholder content.
 */
type BreadcrumbSkeletonProps = Omit<ComponentProps<"li">, "children"> & {
	/**
	 * The screen-reader status announcement while the crumb loads. Set it for
	 * localization.
	 *
	 * @default "Loading breadcrumbs…"
	 */
	label?: string;
};

/**
 * A placeholder crumb for a label that is still loading. Renders one `<li>`
 * as a crumb-sized pulsing bar carrying a screen-reader-only `role="status"`
 * announcement. The bar is `w-24` by default. Pass a `w-*` utility for your
 * best-guess width, so the row's shape holds when the real crumb replaces it.
 * One skeleton usually stands in for a whole pending segment; compose several
 * with `Breadcrumb.Separator` when the segment's shape matters.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumbskeleton
 *
 * @example
 * ```tsx
 * <Breadcrumb.Root>
 * 	<Breadcrumb.List>
 * 		<Breadcrumb.Item>
 * 			<Breadcrumb.Link href="/apps">Apps</Breadcrumb.Link>
 * 		</Breadcrumb.Item>
 * 		<Breadcrumb.Separator />
 * 		<Breadcrumb.Skeleton className="w-40" />
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
// Why no asChild: the part's whole value is the placeholder bar it renders;
// a swapped element would discard the announcer wired inside it.
const BreadcrumbSkeleton = ({
	className,
	"data-slot": dataSlot,
	label = "Loading breadcrumbs…",
	ref,
	...props
}: BreadcrumbSkeletonProps & WithDataSlot) => (
	// Why aria-hidden={false}: `Skeleton` hides itself by default, and the
	// `role="status"` announcer lives inside this bar.
	<Skeleton asChild aria-hidden={false}>
		<li
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-skeleton")}
			className={cx("w-24 shrink-0", className)}
			{...props}
		>
			<span role="status" className="sr-only">
				{label}
			</span>
		</li>
	</Skeleton>
);

export {
	//,
	Root,
	List,
	Item,
	Link,
	Label,
	Page,
	Separator,
	BreadcrumbSkeleton,
};
