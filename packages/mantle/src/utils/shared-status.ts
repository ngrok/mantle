import type { RefCallback } from "react";

/** The live region of each container, and how many mounted elements use it. */
const statuses = new WeakMap<Element, { element: HTMLSpanElement; users: number }>();

/**
 * The element that holds the live region of `element`: the dialog around it,
 * else `<body>`. Why the dialog: a modal dialog makes the rest of the page
 * inert, and a screen reader does not hear a live region there.
 */
const statusContainer = (element: Element) =>
	element.closest("dialog") ?? element.ownerDocument.body;

/**
 * A ref callback that keeps one shared, visually hidden polite live region in
 * the element's container while the element is mounted. Why on mount: a
 * screen reader announces a change only in a live region that existed before
 * it. Why shared: a page with many controls that announce, such as a copy
 * button on each code block, then holds one region and not one for each.
 */
const mountSharedStatus: RefCallback<Element> = (element) => {
	if (element == null) {
		return undefined;
	}
	const container = statusContainer(element);
	let status = statuses.get(container);
	if (status == null) {
		const region = element.ownerDocument.createElement("span");
		region.setAttribute("role", "status");
		region.setAttribute("aria-live", "polite");
		region.className = "sr-only";
		region.dataset.slot = "shared-status";
		container.append(region);
		status = { element: region, users: 0 };
		statuses.set(container, status);
	}
	status.users += 1;
	const current = status;
	return () => {
		current.users -= 1;
		// Why a microtask: React detaches and attaches a new ref when a consumer's
		// ref changes, and the region must keep the text it holds.
		queueMicrotask(() => {
			if (current.users === 0 && statuses.get(container) === current) {
				current.element.remove();
				statuses.delete(container);
			}
		});
	};
};

/**
 * The shared live region of an element that `mountSharedStatus` mounted, or
 * `undefined`. Write a message to its `textContent`. A screen reader does not
 * read the same text twice, so a message that must repeat has to differ.
 */
const sharedStatus = (element: Element) => statuses.get(statusContainer(element))?.element;

export {
	//,
	mountSharedStatus,
	sharedStatus,
};
