"use client";

import type { RefCallback, RefObject } from "react";
import { useCallback, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./use-isomorphic-layout-effect.js";

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
 * The region it scrolls is the element itself when it scrolls, or its nearest
 * scrolling ancestor, such as `AppLayout.Body` or `AppLayout.SidePanelBody`.
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
	// Why a ref: the detach runs after the last render and saves that render's key.
	const keyRef = useRef(key);
	useIsomorphicLayoutEffect(() => {
		keyRef.current = key;
	});

	// Why a callback ref with a cleanup: it runs when the element attaches and
	// detaches, also when content swaps the element in after the first render.
	// React runs it in the commit, before paint, and the detach while the element
	// still has its layout.
	return useCallback(
		(content: HTMLElement | null) => {
			if (content == null) {
				return;
			}
			const anchor = anchorRef.current;
			if (anchor != null && anchor.key === keyRef.current) {
				scrollToAnchor(content, anchor);
			}
			return () => {
				anchorRef.current = { key: keyRef.current, ...readAnchor(content) };
			};
		},
		[anchorRef],
	);
}

/** The element that scrolls `content`: itself when it scrolls, else its nearest scrolling ancestor. */
function scrollRegionOf(content: HTMLElement): HTMLElement {
	let element: HTMLElement | null = content;
	while (element != null) {
		const { overflowY } = getComputedStyle(element);
		if (overflowY === "auto" || overflowY === "scroll") {
			return element;
		}
		element = element.parentElement;
	}
	return document.scrollingElement instanceof HTMLElement
		? document.scrollingElement
		: document.documentElement;
}

/**
 * Reads where the reader is in `content`: from the content down, the first
 * child in the flow that reaches below the region's top edge, until an
 * element with no such child. Why in the flow: visually hidden text is
 * positioned out of it, so its box is not where the text reads.
 */
function readAnchor(content: HTMLElement): Pick<ScrollAnchor, "path" | "fraction"> {
	const edge = scrollRegionOf(content).getBoundingClientRect().top;
	const path: Array<number> = [];
	let element: Element = content;
	for (;;) {
		const index = Array.from(element.children).findIndex(
			(child) =>
				getComputedStyle(child).position !== "absolute" &&
				child.getBoundingClientRect().bottom > edge,
		);
		const child = element.children[index];
		if (child == null) {
			break;
		}
		path.push(index);
		element = child;
	}
	const { top, height } = element.getBoundingClientRect();
	return { path, fraction: height > 0 ? (edge - top) / height : 0 };
}

/**
 * Scrolls the region of `content` so its top edge is at `anchor` again. When
 * the path ends early, because the content has fewer elements than when it was
 * read, it scrolls to the top of the deepest element it reached.
 */
function scrollToAnchor(content: HTMLElement, anchor: Pick<ScrollAnchor, "path" | "fraction">) {
	const region = scrollRegionOf(content);
	let element: Element = content;
	let fraction = anchor.fraction;
	for (const index of anchor.path) {
		const child = element.children[index];
		if (child == null) {
			fraction = 0;
			break;
		}
		element = child;
	}
	const { top, height } = element.getBoundingClientRect();
	region.scrollTop += top + fraction * height - region.getBoundingClientRect().top;
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
