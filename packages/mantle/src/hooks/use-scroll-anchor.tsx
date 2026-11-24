"use client";

import type { RefCallback, RefObject } from "react";
import { useCallback } from "react";

const heldScrollRegions = new WeakMap<HTMLElement, () => boolean>();

/** Applies pending anchor layout changes and reports whether the anchor still owns the region's position. */
export function hasScrollAnchor(region: HTMLElement): boolean {
	return heldScrollRegions.get(region)?.() ?? false;
}

/**
 * Where a reader is in some content: the child indexes from the content's
 * element down to the deepest element at the top edge of the region that
 * scrolls it, and how far that edge is into the element, as a fraction of its
 * height. A path and a fraction, not a `scrollTop`: the same content laid out
 * at another width wraps differently, so the same text sits at another offset.
 *
 * Treat it as opaque. Hold it in a ref that outlives the content, and pass the
 * ref to {@link useScrollAnchor}.
 *
 * @see https://mantle.ngrok.com/hooks#usescrollanchor
 */
type ScrollAnchor = {
	/** The `key` the content had when the anchor was read. */
	key: string | number | undefined;
	path: Array<number>;
	fraction: number;
	/** Pixels from the element's top edge, for an edge in a gap above it. */
	offset: number;
};

/**
 * The options for {@link useScrollAnchor}.
 *
 * @see https://mantle.ngrok.com/hooks#usescrollanchor
 *
 * @example
 * ```tsx
 * const anchorContent = useScrollAnchor({ anchorRef: scrollAnchorRef, key: messages.at(-1)?.id });
 * ```
 */
type UseScrollAnchorOptions = {
	/**
	 * Holds the reader's place between two mounts. Create it above every place
	 * that shows the same content, such as in the provider that holds a
	 * conversation, so it outlives each of them.
	 */
	anchorRef: RefObject<ScrollAnchor | null>;
	/**
	 * Names the content the anchor belongs to. The region scrolls back to the
	 * anchor only when the key is the same as when the anchor was read, so a
	 * new message or a new conversation scrolls the way the content decides.
	 * Pass the id of the last item. Omit it to restore every anchor.
	 */
	key?: string | number;
};

/**
 * Keeps the reader's place in some content across a remount, at the same
 * width or another. Returns a ref for the content's element. When the element
 * detaches, the hook writes the reader's place to `anchorRef`; when an element
 * attaches, it scrolls back to that place before the first paint.
 *
 * The region it scrolls is the element itself or its nearest ancestor that
 * can scroll up and down, such as `AppLayout.Body` or `AppLayout.SidePanelBody`,
 * else the document. Fixed and sticky children do not count as the place,
 * and the restore is instant even under `scroll-behavior: smooth`.
 * Until the reader scrolls, a later change of the content's width, such as a
 * sidebar that expands again, restores the place again.
 * Put the ref on an element whose subtree is the same in every place the
 * content shows, such as a transcript's list, so the place reads the same in
 * each.
 *
 * Use it when one piece of content has two homes that a navigation swaps,
 * such as a conversation that is a page on one route and a side panel on the
 * others. The reader finds the same text at the top edge in the new home, and
 * a view transition between the two snapshots the new home already there.
 *
 * Content that scrolls on its own when it changes, such as to the newest
 * message, skips that scroll on mount, or the scroll overrides the anchor.
 * Attach one element for each anchor at a time.
 *
 * @see https://mantle.ngrok.com/hooks#usescrollanchor
 *
 * @example
 * ```tsx
 * function Transcript() {
 *   const { messages, scrollAnchorRef } = useConversation();
 *   const anchorContent = useScrollAnchor({ anchorRef: scrollAnchorRef, key: messages.at(-1)?.id });
 *
 *   return (
 *     <ol ref={anchorContent}>
 *       {messages.map((message) => (
 *         <li key={message.id}>{message.text}</li>
 *       ))}
 *     </ol>
 *   );
 * }
 * ```
 */
function useScrollAnchor({ anchorRef, key }: UseScrollAnchorOptions): RefCallback<HTMLElement> {
	// Why a callback ref with a cleanup: it runs when the element attaches and
	// detaches, also when content swaps the element in after the first render.
	// React runs it in the commit, before paint, and the detach while the element
	// still has its layout. Why `key` is a dependency: a new key detaches and
	// attaches again, so the place is written with the old key and not restored,
	// and an attach in the same commit as a key change reads the new key.
	return useCallback(
		(content: HTMLElement | null) => {
			if (content == null) {
				return;
			}
			const anchor = anchorRef.current;
			const release =
				anchor != null && anchor.key === key ? holdAnchor(content, anchor) : () => false;
			return () => {
				// Why keep a held place: the reader has not moved from it, and a region
				// that cannot reach it yet shows a clamped place that is not theirs.
				const place = release() && anchor != null ? anchor : readAnchor(content);
				anchorRef.current = { ...place, key };
			};
		},
		[anchorRef, key],
	);
}

/**
 * The events a reader scrolls with: a wheel, a touch, a press on a scrollbar,
 * or a key. They end a hold at once, before the scroll they start.
 */
const readerScrollEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Scrolls `content` to `anchor` now, and again each time its width changes
 * until the reader scrolls or the content changes height at the same width.
 * Returns the function that ends the hold. It returns true when the reader
 * has not scrolled since, so their place is still `anchor`.
 *
 * Why hold: the layout can settle at another width a frame after the content
 * attaches, such as when a sidebar that yielded to a side panel expands again
 * on the page, and the text reflows under the reader. A resize observer runs
 * after layout and before paint, so each new width shows the place at once. A
 * change in height at the same width is new content, such as a streaming
 * reply, and it scrolls the way the content decides. A reader's wheel, touch,
 * press, or key ends the hold, and so does any move of the region that the
 * hold did not make, such as an app that scrolls to its newest message.
 */
function holdAnchor(content: HTMLElement, anchor: Omit<ScrollAnchor, "key">): () => boolean {
	let region = scrollToAnchor(content, anchor);
	if (typeof ResizeObserver === "undefined") {
		return () => false;
	}
	let expected = 0;
	let holding = true;
	let size = content.getBoundingClientRect();
	const moved = () => Math.abs(region.scrollTop - expected) > 1;
	// The document scrolls the window, so its scroll events fire there.
	const scrollTarget = () => (region === document.scrollingElement ? window : region);
	const onScroll = () => {
		if (moved()) {
			release();
		}
	};
	let unpin: (() => void) | undefined;
	// Why pin: the browser's own scroll anchoring moves the region when the text
	// reflows. With it off, only the reader or the app moves the region, and a
	// move ends the hold.
	const pin = (next: HTMLElement) => {
		scrollTarget().removeEventListener("scroll", onScroll);
		unpin?.();
		region = next;
		const overflowAnchor = next.style.overflowAnchor;
		next.style.overflowAnchor = "none";
		heldScrollRegions.set(next, () => {
			update();
			return holding;
		});
		unpin = () => {
			next.style.overflowAnchor = overflowAnchor;
			heldScrollRegions.delete(next);
		};
		expected = next.scrollTop;
		scrollTarget().addEventListener("scroll", onScroll, { passive: true });
	};
	// A follower can run before ResizeObserver, so both paths apply the same pending layout change.
	const update = () => {
		const next = content.getBoundingClientRect();
		if (moved()) {
			release();
		} else if (next.width !== size.width) {
			pin(scrollToAnchor(content, anchor));
		} else if (next.height !== size.height) {
			release();
		}
		size = next;
	};
	const observer = new ResizeObserver(update);
	const release = () => {
		const held = holding && !moved();
		holding = false;
		observer.disconnect();
		scrollTarget().removeEventListener("scroll", onScroll);
		unpin?.();
		for (const type of readerScrollEvents) {
			window.removeEventListener(type, release, true);
		}
		return held;
	};
	pin(region);
	observer.observe(content);
	for (const type of readerScrollEvents) {
		window.addEventListener(type, release, { capture: true, passive: true });
	}
	return release;
}

/**
 * The element that scrolls `content`: itself or its nearest ancestor that can
 * scroll on the block axis, else the document. An element with
 * `overflow: auto` counts when it scrolls now, or when it is taller than what
 * it holds, as a fixed-height region is when wider text fits it. Why not every
 * one: a wrapper that grows with its content, or that scrolls only sideways,
 * never moves the text up or down.
 */
function scrollRegionOf(content: HTMLElement): HTMLElement {
	let element: HTMLElement | null = content;
	while (element != null) {
		const { overflowY } = getComputedStyle(element);
		if (
			(overflowY === "auto" || overflowY === "scroll") &&
			(element.scrollHeight > element.clientHeight || hasRoomBelow(element))
		) {
			return element;
		}
		element = element.parentElement;
	}
	return document.scrollingElement instanceof HTMLElement
		? document.scrollingElement
		: document.documentElement;
}

/**
 * Whether `element` is taller than what it holds: space is left below the end
 * of its content, inside its padding. A wrapper that grows with its content
 * has none. Why down the chain of last children: a bottom margin collapses
 * through a parent, so the content ends at the lowest margin edge on it.
 */
function hasRoomBelow(element: HTMLElement): boolean {
	const style = getComputedStyle(element);
	const innerBottom =
		element.getBoundingClientRect().bottom -
		Number.parseFloat(style.borderBottomWidth) -
		Number.parseFloat(style.paddingBottom);
	let contentBottom = element.getBoundingClientRect().top + Number.parseFloat(style.borderTopWidth);
	// Why a range for each text node: the element's own text has no box. Only its
	// own: text clipped inside a nested scroller reaches past what it shows.
	for (const node of element.childNodes) {
		if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
			const range = document.createRange();
			range.selectNodeContents(node);
			contentBottom = Math.max(contentBottom, range.getBoundingClientRect().bottom);
		}
	}
	let last = Array.from(element.children).findLast(scrollsWithText);
	while (last != null) {
		contentBottom = Math.max(
			contentBottom,
			last.getBoundingClientRect().bottom + Number.parseFloat(getComputedStyle(last).marginBottom),
		);
		last = Array.from(last.children).findLast(scrollsWithText);
	}
	return innerBottom - contentBottom > 1;
}

/**
 * The region's top edge in the viewport. The document's scrolling element
 * moves with the page, so its box is not where the reader's edge is.
 */
function topEdgeOf(region: HTMLElement): number {
	return region === document.scrollingElement ? 0 : region.getBoundingClientRect().top;
}

/**
 * The box `element` lays out its text in. For the region itself, that is its
 * whole scrolled content, so text-only content that scrolls itself still has
 * a place.
 */
function textBoxOf(element: Element, region: HTMLElement): { top: number; height: number } {
	if (element === region) {
		return { top: topEdgeOf(region) - region.scrollTop, height: region.scrollHeight };
	}
	const { top, height } = element.getBoundingClientRect();
	return { top, height };
}

/**
 * Whether a child scrolls with the text. Visually hidden text is positioned
 * out of the flow, and a fixed or sticky child stays at the edge while the
 * text scrolls under it, so its box is not where the text reads.
 */
function scrollsWithText(child: Element): boolean {
	const { position } = getComputedStyle(child);
	return position !== "absolute" && position !== "fixed" && position !== "sticky";
}

/** Whether `element` has text of its own, beside its child elements. */
function hasOwnText(element: Element): boolean {
	return Array.from(element.childNodes).some(
		(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
	);
}

/**
 * Reads where the reader is in `content`. From the content down, it goes into
 * the first child that scrolls with the text and reaches below the edge.
 *
 * - When that child holds the edge, it goes on into the child's children.
 * - When the edge is above that child and the element has text of its own,
 *   or the child is the first, the edge is in that text or the padding, and
 *   the element is the anchor. Its text reflows with it.
 * - Else the edge is in a gap between two children: it anchors the next one
 *   and the gap in pixels, because a gap does not reflow.
 */
function readAnchor(content: HTMLElement): Omit<ScrollAnchor, "key"> {
	const region = scrollRegionOf(content);
	const edge = topEdgeOf(region);
	const path: Array<number> = [];
	let element: Element = content;
	for (;;) {
		const children = Array.from(element.children);
		const candidates = children.filter(scrollsWithText);
		const next = candidates.findIndex((child) => child.getBoundingClientRect().bottom > edge);
		const child = candidates[next];
		if (child == null) {
			break;
		}
		const { top } = child.getBoundingClientRect();
		if (top > edge && (next === 0 || hasOwnText(element))) {
			break;
		}
		path.push(children.indexOf(child));
		element = child;
		if (top > edge) {
			return { path, fraction: 0, offset: edge - top };
		}
	}
	const { top, height } = textBoxOf(element, region);
	return { path, fraction: height > 0 ? (edge - top) / height : 0, offset: 0 };
}

/**
 * Scrolls the region of `content` so its top edge is at `anchor` again, at
 * once. Why not a `scrollTop` write: it follows `scroll-behavior: smooth`, and
 * a smooth scroll ends after the paint. When the path ends early, because the
 * content has fewer elements than when it was read, it scrolls to the top of
 * the deepest element it reached. Returns the region.
 */
function scrollToAnchor(content: HTMLElement, anchor: Omit<ScrollAnchor, "key">): HTMLElement {
	const region = scrollRegionOf(content);
	let element: Element = content;
	let { fraction, offset } = anchor;
	for (const index of anchor.path) {
		const child = element.children[index];
		if (child == null) {
			fraction = 0;
			offset = 0;
			break;
		}
		element = child;
	}
	const { top, height } = textBoxOf(element, region);
	region.scrollTo({
		top: region.scrollTop + top + fraction * height + offset - topEdgeOf(region),
		behavior: "instant",
	});
	return region;
}

export {
	//,
	useScrollAnchor,
};
export type {
	//,
	ScrollAnchor,
	UseScrollAnchorOptions,
};
