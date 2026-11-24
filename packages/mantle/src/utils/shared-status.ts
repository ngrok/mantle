import type { RefCallback } from "react";

type Status = { element: HTMLSpanElement; users: number };

/** The live region of each container, and how many mounted elements use it. */
const statuses = new WeakMap<Element, Status>();

/** The container that each mounted element holds a region in. */
const registrations = new WeakMap<Element, Element>();

/**
 * The element that holds the live region of `element`: the dialog around it,
 * else `<body>`. Why the dialog: a modal dialog makes the rest of the page
 * inert, and a screen reader does not hear a live region there.
 */
const statusContainer = (element: Element) =>
	element.closest("dialog") ?? element.ownerDocument.body;

/** Adds one user to the region of `container`, and makes the region when it has none. */
function acquire(container: Element): { status: Status; fresh: boolean } {
	const existing = statuses.get(container);
	if (existing != null) {
		existing.users += 1;
		return { status: existing, fresh: false };
	}
	const region = container.ownerDocument.createElement("span");
	region.setAttribute("role", "status");
	region.setAttribute("aria-live", "polite");
	region.className = "sr-only";
	region.dataset.slot = "shared-status";
	container.append(region);
	const status = { element: region, users: 1 };
	statuses.set(container, status);
	return { status, fresh: true };
}

/** Removes one user from the region of `container`, and removes the region with its last user. */
function release(container: Element) {
	const status = statuses.get(container);
	if (status == null) {
		return;
	}
	status.users -= 1;
	// Why a microtask: React detaches and attaches a new ref when a consumer's
	// ref changes, and the region must keep the text it holds.
	queueMicrotask(() => {
		if (status.users === 0 && statuses.get(container) === status) {
			status.element.remove();
			statuses.delete(container);
		}
	});
}

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
	acquire(container);
	registrations.set(element, container);
	return () => {
		const current = registrations.get(element);
		registrations.delete(element);
		if (current != null) {
			release(current);
		}
	};
};

/**
 * Announces `message` in the shared region of an element that
 * `mountSharedStatus` mounted.
 *
 * A screen reader does not read the same text twice. With `repeat`, a message
 * equal to the region's text gets a trailing no-break space, so it reads
 * again. Without it, an equal message writes nothing.
 *
 * When the element moved to another container, such as into a dialog, its
 * region moves with it. A new region gets the message one frame later,
 * because a screen reader skips a region that is made and filled at once.
 */
function announce(element: Element, message: string, { repeat = false } = {}) {
	const container = statusContainer(element);
	const registered = registrations.get(element);
	let status = statuses.get(container);
	let fresh = false;
	if (registered !== container) {
		const acquired = acquire(container);
		status = acquired.status;
		fresh = acquired.fresh;
		if (registered != null) {
			registrations.set(element, container);
			release(registered);
		} else {
			// Why: an element that is not mounted keeps no region.
			release(container);
		}
	}
	if (status == null) {
		return;
	}
	const region = status.element;
	if (region.textContent === message && !repeat) {
		return;
	}
	const text = region.textContent === message ? `${message}\u00A0` : message;
	if (fresh) {
		requestAnimationFrame(() => {
			region.textContent = text;
		});
	} else {
		region.textContent = text;
	}
}

export {
	//,
	announce,
	mountSharedStatus,
};
