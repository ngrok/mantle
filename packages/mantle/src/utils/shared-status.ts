import type { RefCallback } from "react";

type Status = { element: HTMLSpanElement; users: number };

/** The live region of each container, and how many mounted elements use it. */
const statuses = new WeakMap<Element, Status>();

/**
 * How long a message stays in a region. Why clear it: the region is in the
 * page, so a screen reader that reads to the end of the page would find an
 * old "Copied". Why 7 seconds: a polite message can wait behind the current
 * speech, and React Aria's announcer keeps a message for the same time.
 */
const CLEAR_DELAY_MS = 7000;

/** The pending clear of each region. */
const clearTimers = new WeakMap<HTMLSpanElement, ReturnType<typeof setTimeout>>();

/** The container that each mounted element holds a region in. */
const registrations = new WeakMap<Element, Element>();

/** A message to announce, and the element that announced it. See `announce` for `repeat`. */
type Message = { element: Element; message: string; repeat: boolean };

/** The latest message of each element. A held message that is not the latest is old. */
const latestMessages = new WeakMap<Element, Message>();

/** A region's held message, for one attachment of the region. `null` means no message yet. */
type Pending = { message: Message | null };

/** The regions that a screen reader has not seen yet. */
const pendingMessages = new WeakMap<HTMLSpanElement, Pending>();

/** Whether `value` is an element. Why not `instanceof`: a node from another window fails it. */
const isElement = (value: unknown): value is Element =>
	typeof value === "object" && value != null && "nodeType" in value && value.nodeType === 1;

/** The shadow host of the root that holds `node`, or `null` in a document. */
function hostOf(node: Node): Element | null {
	const root = node.getRootNode();
	return "host" in root && isElement(root.host) ? root.host : null;
}

/**
 * The element that holds the live region of `element`: the modal around it,
 * else `<body>`. Why the modal: a modal dialog makes the rest of the page
 * inert, and a screen reader does not hear a live region there. Why the
 * rendered tree, through slots and shadow roots: `closest` stops at a shadow
 * root and skips the slot that places an element in a modal.
 */
function statusContainer(element: Element): Element {
	for (
		let node: Element | null = element;
		node != null;
		node = node.assignedSlot ?? node.parentElement ?? hostOf(node)
	) {
		if (node.matches('dialog, [aria-modal="true"]')) {
			return node;
		}
	}
	return element.ownerDocument.body;
}

/**
 * Puts `region` in `container`, and holds its messages until the next paint.
 * Why after a paint: a screen reader skips a region that is made and filled
 * before it sees the region empty. A frame callback runs before the paint, so
 * the timeout in it runs after.
 */
function attach(container: Element, region: HTMLSpanElement) {
	// Why the shadow root: a host renders only its shadow tree, and a modal can be a host.
	(container.shadowRoot ?? container).append(region);
	// Why carry the message: an attachment again must not drop a held message.
	const pending: Pending = { message: pendingMessages.get(region)?.message ?? null };
	pendingMessages.set(region, pending);
	requestAnimationFrame(() => {
		setTimeout(() => {
			// Why: only the latest attachment writes its held message.
			if (pendingMessages.get(region) !== pending) {
				return;
			}
			pendingMessages.delete(region);
			const { message } = pending;
			// Why announce again: the element can unmount or move before the paint.
			if (message != null && latestMessages.get(message.element) === message) {
				announce(message.element, message.message, { repeat: message.repeat });
			}
		});
	});
}

/**
 * Adds one user to the region of `container`, and makes the region when it
 * has none. Why attach a region again: a page can remove it, such as when
 * React renders the document again after a hydration error.
 */
function acquire(container: Element) {
	const existing = statuses.get(container);
	if (existing != null) {
		existing.users += 1;
		if (!existing.element.isConnected) {
			attach(container, existing.element);
		}
		return;
	}
	const region = container.ownerDocument.createElement("span");
	region.setAttribute("role", "status");
	region.setAttribute("aria-live", "polite");
	region.setAttribute("aria-atomic", "true");
	region.className = "sr-only";
	region.dataset.slot = "shared-status";
	statuses.set(container, { element: region, users: 1 });
	attach(container, region);
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
			clearTimeout(clearTimers.get(status.element));
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

/** Writes a message to `region`, and clears the region `CLEAR_DELAY_MS` later. */
function writeMessage(region: HTMLSpanElement, { message, repeat }: Message) {
	const current = region.textContent;
	// Why both spellings: a repeat adds a no-break space, and it says the same message.
	if (!repeat && (current === message || current === `${message}\u00A0`)) {
		return;
	}
	region.textContent = current === message ? `${message}\u00A0` : message;
	clearTimeout(clearTimers.get(region));
	clearTimers.set(
		region,
		setTimeout(() => {
			region.textContent = "";
		}, CLEAR_DELAY_MS),
	);
}

/**
 * Announces `message` in the shared region of an element that
 * `mountSharedStatus` mounted. An element that is not mounted, or not in the
 * document, announces nothing, such as a copy button whose copy finished
 * after it unmounted.
 *
 * A screen reader does not read the same text twice. With `repeat`, a message
 * equal to the region's text gets a trailing no-break space, so it reads
 * again. Without it, an equal message writes nothing.
 *
 * The region clears `CLEAR_DELAY_MS` after each write.
 *
 * When the element moved to another container, such as into a dialog, its
 * region moves with it. A new region gets the latest message after the next
 * paint.
 */
function announce(element: Element, message: string, { repeat = false } = {}) {
	const registered = registrations.get(element);
	if (registered == null || !element.isConnected) {
		return;
	}
	const container = statusContainer(element);
	if (registered !== container) {
		acquire(container);
		registrations.set(element, container);
		release(registered);
	}
	const region = statuses.get(container)?.element;
	if (region == null) {
		return;
	}
	if (!region.isConnected) {
		attach(container, region);
	}
	const next = { element, message, repeat };
	latestMessages.set(element, next);
	// Why the latest only: a caller can announce twice for one action, and the
	// last request wins.
	const pending = pendingMessages.get(region);
	if (pending != null) {
		pending.message = next;
		return;
	}
	writeMessage(region, next);
}

export {
	//,
	announce,
	mountSharedStatus,
};
