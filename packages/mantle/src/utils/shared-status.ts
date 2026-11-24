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

/** The latest message for a new region, written on the next frame. */
const pendingMessages = new WeakMap<HTMLSpanElement, Message>();

/** A message to announce. See `announce` for `repeat`. */
type Message = { message: string; repeat: boolean };

/** Writes a message to `region`. */
function writeMessage(region: HTMLSpanElement, { message, repeat }: Message) {
	if (region.textContent === message && !repeat) {
		return;
	}
	region.textContent = region.textContent === message ? `${message}\u00A0` : message;
}

/**
 * Announces `message` in the shared region of an element that
 * `mountSharedStatus` mounted. An element that is not mounted announces
 * nothing, such as a copy button whose copy finished after it unmounted.
 *
 * A screen reader does not read the same text twice. With `repeat`, a message
 * equal to the region's text gets a trailing no-break space, so it reads
 * again. Without it, an equal message writes nothing.
 *
 * When the element moved to another container, such as into a dialog, its
 * region moves with it. A new region gets the latest message one frame later,
 * because a screen reader skips a region that is made and filled at once.
 */
function announce(element: Element, message: string, { repeat = false } = {}) {
	const registered = registrations.get(element);
	if (registered == null) {
		return;
	}
	const container = statusContainer(element);
	let fresh = false;
	if (registered !== container) {
		fresh = acquire(container).fresh;
		registrations.set(element, container);
		release(registered);
	}
	const region = statuses.get(container)?.element;
	if (region == null) {
		return;
	}
	if (!fresh && !pendingMessages.has(region)) {
		writeMessage(region, { message, repeat });
		return;
	}
	// Why one write for each frame: a caller can announce twice for one action,
	// such as a theme updater that runs twice, and the last request wins.
	const scheduled = pendingMessages.has(region);
	pendingMessages.set(region, { message, repeat });
	if (!scheduled) {
		requestAnimationFrame(() => {
			const pending = pendingMessages.get(region);
			pendingMessages.delete(region);
			if (pending != null) {
				writeMessage(region, pending);
			}
		});
	}
}

export {
	//,
	announce,
	mountSharedStatus,
};
