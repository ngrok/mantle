"use client";

import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import type { ComponentProps, ReactElement, ReactNode, Ref } from "react";
import { cloneElement, isValidElement, useEffect, useRef } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Icon } from "../icon/icon.js";
import { Slot } from "../slot/index.js";

// Why a client file: `TrailScroller` measures the trail after each commit, and the default
// `Separator` caret is a Phosphor icon, which reads Phosphor's `IconContext`.

/**
 * Keeps the current page of `Breadcrumb.List` in view. It puts a ref on its one
 * child, the list element, and scrolls that element to its end after each
 * commit and each resize.
 *
 * Why a separate part: `Breadcrumb.List` merges its classes with `cx` and
 * resolves `asChild` on the server, then passes the finished element here, so
 * the browser gets this scroller and not `cx` or `Slot`.
 *
 * @private
 */
const TrailScroller = ({
	children,
	ref,
}: {
	/**
	 * The list element, already rendered with its classes and slots.
	 */
	children: ReactElement<{ ref?: Ref<HTMLOListElement> }>;
	/**
	 * The consumer's ref, which reaches the list element.
	 */
	ref?: Ref<HTMLOListElement>;
}) => {
	const scrollRef = useRef<HTMLOListElement>(null);
	// Why the child's ref too: `cloneElement` replaces it, and an `asChild` child
	// such as a component that takes a ref may carry its own.
	const composedRef = useComposedRefs(scrollRef, ref, children.props.ref);
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
		// the end further away. That leaves the current page off to the right, out
		// of view, until something else re-renders.
		const observer = new ResizeObserver(() => {
			pinnedEnd.current = pinTrailToEnd(element, pinnedEnd.current);
		});
		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, []);

	return cloneElement(children, { ref: composedRef });
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
 * The props for `Breadcrumb.Separator`. When `asChild` is set, `children` is
 * required: the child element is what gets rendered, so an `asChild` separator
 * without children would clone the default caret icon into the list, which is
 * invalid `<ol>` content. The union makes that misuse a compile error.
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
 * Renders an `<li>` with `role="presentation"` and `aria-hidden="true"`: a
 * listitem sibling of `Breadcrumb.Item` elements per the APG breadcrumb
 * pattern, so it never counts as a crumb. Children default to a size-3.5
 * caret icon (`<Icon svg={<CaretRightIcon />} className="size-3.5" />`); pass
 * your own children (e.g. a slash) to replace it. With `asChild`, children
 * are required: the child element is what renders.
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

export {
	//,
	Separator,
	TrailScroller,
};
