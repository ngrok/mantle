"use client";

import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps, ReactNode } from "react";
import { cloneElement, Fragment, isValidElement, useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon } from "../icon/icon.js";
import { Skeleton } from "../skeleton/skeleton.js";
import { Slot } from "../slot/index.js";

/**
 * The breadcrumb landmark. Renders a `<nav>` with a default
 * `aria-label="Breadcrumb"` per the WAI-ARIA breadcrumb pattern — pass your
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
 * Scrolls a trail to its end, where the current page is, when that end has moved
 * since the last pin. A moved end is the only thing that takes the scroll
 * position away from the reader: their own scroll survives every other commit,
 * resize, and re-measure.
 *
 * @param element - The trail's scroll container.
 * @param previousEnd - The end offset this last pinned at, or `undefined` before
 *   the first pin.
 * @returns The end offset it pinned at, or `previousEnd` when it left the trail
 *   alone.
 *
 * @example
 * pinnedEnd.current = pinTrailToEnd(list, pinnedEnd.current);
 */
function pinTrailToEnd(element: Element, previousEnd: number | undefined) {
	// The end is an offset, not a width, so a row that narrows around unchanged
	// crumbs moves it just as a swapped trail does.
	const end = element.scrollWidth - element.clientWidth;
	// The end sits where it did, so whatever the reader scrolled to still shows
	// them what they scrolled it to show.
	if (end === previousEnd) {
		return previousEnd;
	}

	// A crumb under focus outranks the current page: scrolling now would carry the
	// focus ring out of view, and the reader has no gesture that brings it back.
	if (element.contains(document.activeElement)) {
		return previousEnd;
	}

	element.scrollLeft = end;

	return end;
}

/**
 * The ordered list of crumbs. Renders an `<ol>` — an **ordered** list, because
 * the order of the items is the hierarchy, from the root to the current page.
 * Lays the crumbs out in one row of muted, small text.
 *
 * A trail wider than its container scrolls sideways instead of wrapping to a
 * second row, which a one-row app header has no space for. Its edges carry the
 * same `scroll-fade-x` mask as `Tabs.List`: an edge with crumbs beyond it fades
 * out, and an edge with nothing beyond it stays flush.
 *
 * The trail keeps its end in view, because the end is the current page. It
 * scrolls itself there whenever that end moves — on mount, when a navigation
 * swaps the crumbs, and when the row around it resizes — and leaves the reader's
 * own scroll position alone the rest of the time, including while a crumb holds
 * focus. Tabbing to a crumb the trail has scrolled past is the browser's own
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
	const scrollRef = useRef<HTMLOListElement>(null);
	const composedRef = useComposedRefs(scrollRef, ref);
	// The end offset the trail last pinned at, which is what tells a commit that
	// swapped the crumbs apart from one that changed nothing about them.
	const pinnedEnd = useRef<number | undefined>(undefined);

	// A navigation swaps the crumbs without touching the row's own size, so only a
	// fresh measurement after the commit can see the end move.
	useIsomorphicLayoutEffect(() => {
		const element = scrollRef.current;
		if (element != null) {
			pinnedEnd.current = pinTrailToEnd(element, pinnedEnd.current);
		}
	});

	useEffect(() => {
		const element = scrollRef.current;
		if (element == null) {
			return;
		}

		// Why an observer: a window drag, a sidebar collapse, or a zoom change moves
		// the end with no render to hang a measurement off, and a narrower row moves
		// the end further away — leaving the current page off to the right, out of
		// view, until something else re-renders.
		const observer = new ResizeObserver(() => {
			pinnedEnd.current = pinTrailToEnd(element, pinnedEnd.current);
		});
		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, []);

	return (
		<Comp
			ref={composedRef}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-list")}
			className={cx(
				"text-muted flex items-center gap-1.5 text-sm",
				// The trail scrolls rather than wraps, masked at both edges like
				// Tabs.List. min-w-0 is what lets the row shrink — and so scroll —
				// when the list is itself a flex item.
				"scroll-fade-x min-w-0 overflow-x-auto overscroll-x-none",
				// overflow-x-auto promotes overflow-y to auto, and the mask paints
				// nothing outside the border box, so a focused crumb's ring needs room
				// reserved inside the scrollport; the negative margin gives that room
				// back to the surrounding layout. Same trade as CodeBlock.TabList.
				"-m-1 p-1",
				// The mask fades 40px at each edge, and the browser scrolls a crumb it
				// tabs to only as far as the scroll padding asks for — 40px matches the
				// two, so a focused crumb lands clear of the fade instead of under it.
				"scroll-px-10",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};

/**
 * A single crumb. Renders an `<li>` (`role="listitem"`) that lays out its
 * content — a `Breadcrumb.Link`, a `Breadcrumb.Label`, or a `Breadcrumb.Page`
 * — inline.
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
 * A link to an ancestor page in the hierarchy. Renders an `<a>` by default;
 * the component is router-agnostic — use `asChild` to compose the styling
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
 * A crumb that is not a link — a level with no page of its own, such as a
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
 * The current page — the last crumb in the trail. Renders a `<span>` (not a
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
 * The props for `Breadcrumb.Separator`. When `asChild` is set, `children` is
 * required: the child element is what gets rendered, so an `asChild` separator
 * without children would clone the default caret icon into the list — invalid
 * `<ol>` content. The union makes that misuse a compile error.
 */
type BreadcrumbSeparatorProps = Omit<ComponentProps<"li">, "children"> &
	(
		| {
				asChild: true;
				children: ReactNode;
		  }
		| {
				asChild?: false | undefined;
				children?: ReactNode;
		  }
	);

/**
 * A purely visual divider between crumbs, hidden from assistive technology.
 * Renders an `<li>` with `role="presentation"` and `aria-hidden="true"` — a
 * listitem sibling of `Breadcrumb.Item` elements per the APG breadcrumb
 * pattern, so it never counts as a crumb. Children default to a size-3.5
 * caret icon (`<Icon svg={<CaretRightIcon />} className="size-3.5" />`); pass
 * your own children (e.g. a slash) to replace it. With `asChild`, children
 * are required — the child element is what renders.
 *
 * Like `Breadcrumb.Item`, the divider never shrinks (`shrink-0`), so a trail
 * too wide for its container scrolls in `Breadcrumb.List` instead.
 *
 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumbseparator
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
const Separator = ({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: BreadcrumbSeparatorProps & WithDataSlot) => {
	const Comp = asChild ? Slot : "li";
	// Slot merges child props over slot props, so with asChild the enforced
	// ARIA must be cloned onto the child element itself to stay un-overridable.
	const content =
		asChild && isValidElement<ComponentProps<"li">>(children)
			? cloneElement(children, { role: "presentation", "aria-hidden": "true" })
			: (children ?? <Icon svg={<CaretRightIcon />} className="size-3.5" />);

	return (
		<Comp
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "breadcrumb-separator")}
			className={cx("shrink-0", className)}
			{...props}
			role="presentation"
			aria-hidden="true"
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
	 * How many crumbs the placeholder stands in for. Match it to the trail the
	 * resolved content renders, so the row keeps its width when the real crumbs
	 * arrive.
	 */
	itemCount: number;
	/**
	 * The screen-reader status announcement while the trail loads. Set it for
	 * localization.
	 *
	 * @default "Loading breadcrumbs…"
	 */
	label?: string;
};

/**
 * A placeholder for a trail segment whose labels are still loading. Renders
 * one `<li>` holding `itemCount` crumb-sized bars divided by carets, plus a
 * screen-reader-only `role="status"` announcement. Use it as the pending
 * fallback for a crumb whose label only exists in fetched data, and match
 * `itemCount` to the trail the resolved content renders, so the row keeps its
 * width when the real crumbs replace it.
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
 * 		<Breadcrumb.Skeleton itemCount={2} />
 * 	</Breadcrumb.List>
 * </Breadcrumb.Root>
 * ```
 */
// Why no asChild: the part's whole value is the placeholder content it
// generates; a swapped element would discard the bars and the announcer.
const BreadcrumbSkeleton = ({
	className,
	"data-slot": dataSlot,
	itemCount,
	label = "Loading breadcrumbs…",
	ref,
	...props
}: BreadcrumbSkeletonProps & WithDataSlot) => (
	<li
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "breadcrumb-skeleton")}
		className={cx("inline-flex shrink-0 items-center gap-1.5", className)}
		{...props}
	>
		<span role="status" className="sr-only">
			{label}
		</span>
		{Array.from({ length: itemCount }, (_, index) => (
			<Fragment key={index}>
				{index > 0 && <Icon svg={<CaretRightIcon />} className="size-3.5" aria-hidden="true" />}
				{/* Why the alternating widths: a trail's labels differ in length, and a
				stable guess beats a measured swap. */}
				<Skeleton aria-hidden="true" className={cx(index % 2 === 0 ? "w-24" : "w-16")} />
			</Fragment>
		))}
	</li>
);

/**
 * Compound component for WAI-ARIA breadcrumb navigation — the path from a
 * root to the current page as an ordered list of links inside a labeled
 * `<nav>` landmark. Router-agnostic: compose `Breadcrumb.Link` onto your app
 * router's link via `asChild`. A trail too wide for its row scrolls sideways
 * with faded edges instead of wrapping, and starts at the current page.
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
const Breadcrumb = {
	/**
	 * The breadcrumb landmark. Renders a `<nav>` with a default
	 * `aria-label="Breadcrumb"` — pass your own `aria-label` to override it.
	 * Carries no visual styling; `min-w-0` is what lets the landmark shrink
	 * inside a flex row so the trail scrolls.
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
	Root,
	/**
	 * The ordered list of crumbs. Renders an `<ol>` — the order of the items
	 * is the hierarchy, from the root to the current page. A trail wider than
	 * its container scrolls sideways with a faded edge instead of wrapping, and
	 * starts at the current page.
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
	List,
	/**
	 * A single crumb. Renders an `<li>` containing a `Breadcrumb.Link`, a
	 * `Breadcrumb.Label`, or a `Breadcrumb.Page`. The crumb never shrinks, so a
	 * wide trail scrolls instead of breaking a label across two lines.
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
	Item,
	/**
	 * A link to an ancestor page. Renders an `<a>` by default; use `asChild`
	 * to compose onto your app router's link (e.g. react-router's `<Link>`).
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
	Link,
	/**
	 * A crumb that is not a link — a level with no page of its own, such as a
	 * section whose index URL only redirects. Renders a `<span>` with no
	 * `aria-current` and no link semantics.
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
	Label,
	/**
	 * The current page — the last crumb. Renders a `<span>` (not a link) with
	 * `aria-current="page"`; the ARIA is the part's whole contract and is not
	 * overridable.
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
	Page,
	/**
	 * A purely visual divider between crumbs, hidden from assistive
	 * technology (`role="presentation"` + `aria-hidden`). Children default to
	 * a caret icon; pass your own (e.g. a slash) to replace it. Like the crumbs
	 * it divides, it never shrinks.
	 *
	 * @see https://mantle.ngrok.com/components/navigation/breadcrumb#breadcrumbseparator
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
	Separator,
	/**
	 * A placeholder for a trail segment whose labels are still loading: one
	 * `<li>` holding `itemCount` crumb-sized bars divided by carets, plus a
	 * screen-reader-only `role="status"` announcement. Match `itemCount` to the
	 * trail the resolved content renders, so the row keeps its width when the
	 * real crumbs replace it.
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
	 * 		<Breadcrumb.Skeleton itemCount={2} />
	 * 	</Breadcrumb.List>
	 * </Breadcrumb.Root>
	 * ```
	 */
	Skeleton: BreadcrumbSkeleton,
} as const;

export {
	//,
	Breadcrumb,
};
