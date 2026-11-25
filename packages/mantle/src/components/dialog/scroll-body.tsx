"use client";

import type { ComponentProps } from "react";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { findTabbableDescendants } from "../alert/tabbable-neighbors.js";

/**
 * Whether a node is an element.
 *
 * Why `nodeType`: an element in another window's document, such as a frame
 * that React renders into, is no instance of this window's `Element`.
 */
const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;

/**
 * Puts `body` in the Tab order while it scrolls and holds nothing tabbable,
 * so a keyboard user can scroll it with the arrow keys. Chromium does this for
 * each scroll container; Safari does it for none. Returns the cleanup.
 *
 * Why both observers: a resize of the body or a child changes whether it
 * scrolls, and a change in the content changes whether it holds a tab stop.
 * Why `focusout`: a focused body keeps its tab stop, or the browser moves
 * focus to the page. It checks again when focus leaves.
 */
const observeKeyboardScroll = (body: HTMLDivElement | null): (() => void) | undefined => {
	// Why the `ResizeObserver` check: jsdom has none and no layout, so nothing scrolls there.
	if (body == null || typeof ResizeObserver === "undefined") {
		return undefined;
	}
	const update = () => {
		const scrolls = body.scrollHeight > body.clientHeight || body.scrollWidth > body.clientWidth;
		// Why the write only on a change: the write is a mutation that runs `update` again.
		const reachable = scrolls && findTabbableDescendants(body).length === 0;
		if (reachable && !body.hasAttribute("tabindex")) {
			body.setAttribute("tabindex", "0");
		} else if (!reachable && body.hasAttribute("tabindex") && !body.matches(":focus")) {
			body.removeAttribute("tabindex");
		}
	};
	const resize = new ResizeObserver(update);
	resize.observe(body);
	for (const child of body.children) {
		resize.observe(child);
	}
	// Why no `observe` for an attribute change: `update` writes `tabindex` inside
	// the resize callback, and a new observation of `body` there fires a loop error.
	const mutation = new MutationObserver((records) => {
		for (const record of records) {
			if (record.target !== body) {
				continue;
			}
			// Why removed first: `replaceChildren` can list a kept child in both.
			for (const node of record.removedNodes) {
				if (isElement(node)) {
					resize.unobserve(node);
				}
			}
			for (const node of record.addedNodes) {
				if (isElement(node)) {
					resize.observe(node);
				}
			}
		}
		update();
	});
	mutation.observe(body, {
		characterData: true,
		childList: true,
		subtree: true,
		attributeFilter: ["disabled", "hidden", "href", "inert", "tabindex"],
	});
	body.addEventListener("focusout", update);
	update();
	return () => {
		body.removeEventListener("focusout", update);
		mutation.disconnect();
		resize.disconnect();
	};
};

/**
 * The scrolling `div` of `Dialog.Body` and `Sheet.Body`. A `tabIndex` from the
 * consumer turns the automatic tab stop off.
 */
const ScrollBody = ({ ref, ...props }: ComponentProps<"div">) => {
	const composedRef = useComposedRefs(ref, props.tabIndex == null ? observeKeyboardScroll : null);
	return <div ref={composedRef} {...props} />;
};

export {
	//,
	ScrollBody,
};
