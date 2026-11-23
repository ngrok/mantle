/**
 * The kept elements of each open modal, oldest first. Only the newest modal
 * applies its boundary: it makes the rest of the page inert, older modals
 * included, so a stack of boundaries adds nothing to it.
 */
const stack: Array<{ keep: readonly Element[] }> = [];

/** Undoes the boundary that is applied now. */
let undoApplied = () => {};

/**
 * Sets an inline style property and returns the cleanup that puts back the
 * value it found.
 */
const setStyle = (element: HTMLElement, property: string, value: string): (() => void) => {
	const previous = element.style.getPropertyValue(property);
	const priority = element.style.getPropertyPriority(property);
	element.style.setProperty(property, value);
	return () => {
		if (previous === "") {
			element.style.removeProperty(property);
			return;
		}
		element.style.setProperty(property, previous, priority);
	};
};

/** The elements that `element` names in `aria-labelledby` and `aria-describedby`. */
const referencesOf = (element: Element): Element[] => {
	const ids = `${element.getAttribute("aria-labelledby") ?? ""} ${element.getAttribute("aria-describedby") ?? ""}`;
	return ids
		.split(/\s+/)
		.map((id) => (id === "" ? null : document.getElementById(id)))
		.filter((referenced) => referenced != null);
};

/** The elements that name or describe a control inside `element`. */
const labelsWithin = (element: Element): Element[] => {
	const controls = [
		element,
		...element.querySelectorAll("[id], [aria-labelledby], [aria-describedby]"),
	];
	const found: Element[] = [];
	for (const control of controls) {
		if ("labels" in control && control.labels instanceof NodeList) {
			found.push(
				...Array.from(control.labels, (label: Node) => label).filter(
					(label) => label instanceof Element,
				),
			);
		}
		found.push(...referencesOf(control));
	}
	return found;
};

/** Makes the page inert around `keep`, and returns the cleanup that undoes it. */
const apply = (keep: readonly Element[]): (() => void) => {
	const root = document.documentElement;
	const cleanups: Array<() => void> = [];
	const gutter = window.innerWidth - root.clientWidth;
	cleanups.push(setStyle(root, "overflow", "hidden"));
	if (gutter > 0) {
		cleanups.push(setStyle(root, "padding-right", `${gutter}px`));
	}
	// Why only labels outside: a label inside a kept popup, such as a group
	// label, would otherwise make its sibling options inert.
	const outside = (element: Element) => !keep.some((kept) => kept.contains(element));
	// Why walk from each kept element up: the siblings along the path are the
	// rest of the page, and an ancestor of a kept element must stay live.
	const exposed = new Set<Element>();
	const expose = (element: Element) => {
		for (let node: Element | null = element; node != null && node !== document.body;) {
			exposed.add(node);
			node = node.parentElement;
		}
	};
	for (const element of [...keep, ...keep.flatMap(labelsWithin).filter(outside)]) {
		expose(element);
	}
	// Why: an ancestor, such as a dialog, keeps its name only while its title stays live.
	for (const ancestor of exposed) {
		for (const referenced of referencesOf(ancestor)) {
			expose(referenced);
		}
	}
	const hide = (sibling: Node) => {
		if (!(sibling instanceof HTMLElement) || exposed.has(sibling) || sibling.inert) {
			return;
		}
		sibling.inert = true;
		cleanups.push(() => {
			sibling.inert = false;
		});
	};
	const parents = new Set<Element>();
	for (const node of exposed) {
		if (node.parentElement != null) {
			parents.add(node.parentElement);
		}
	}
	for (const parent of parents) {
		for (const sibling of parent.children) {
			hide(sibling);
		}
	}
	// Why an observer: an element that mounts beside the path later, such as a
	// toast, is part of the page behind the popup too. A modal that opens later
	// applies its own boundary first, so it owns the popup it mounts.
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			for (const added of record.addedNodes) {
				hide(added);
			}
		}
	});
	for (const parent of parents) {
		observer.observe(parent, { childList: true });
	}
	cleanups.push(() => observer.disconnect());
	return () => {
		for (const cleanup of cleanups.toReversed()) {
			cleanup();
		}
	};
};

/**
 * Applies the newest modal's boundary again. Why undo first: the boundary
 * restores the values it found, and a modal that opened later can find
 * elements that an older boundary made inert, such as its own popup.
 */
const sync = () => {
	undoApplied();
	const newest = stack.at(-1);
	undoApplied = newest == null ? () => {} : apply(newest.keep);
};

/**
 * Makes the page behind a popup inert while the popup is open, the way a
 * modal does, and returns the cleanup that undoes it:
 *
 * - The page does not scroll. The root keeps its scrollbar gutter, so the
 *   layout does not shift.
 * - Each element outside `keep`, their labels, and their ancestors gets
 *   `inert`, including one that mounts while the popup is open. A screen
 *   reader reads only the popup and the control that owns it, Tab cannot
 *   reach the rest of the page, and a press there activates nothing: it lands
 *   on an ancestor, so the owner blurs and the popup closes.
 *
 * Modals stack: the newest one sets the boundary, and when it exits, the one
 * before it sets the boundary again. DOM focus stays where it is: the owner
 * keeps it, and the owner's keyboard handler keeps Tab inside. Call it from
 * the popup's ref callback while the popup is open.
 *
 * @example
 * ```ts
 * const exit = enterModal([trigger, popupHost]);
 * // when the trigger gets a new element while the popup stays open
 * exit.update([nextTrigger, popupHost]);
 * // later, when the popup closes
 * exit();
 * ```
 */
const enterModal = (
	keep: readonly Element[],
): (() => void) & { update: (keep: readonly Element[]) => void } => {
	const entry = { keep };
	stack.push(entry);
	sync();
	// Why in place: a modal that exits and enters again moves to the top of the
	// stack, above a modal that opened after it.
	const update = (next: readonly Element[]) => {
		entry.keep = next;
		if (stack.at(-1) === entry) {
			sync();
		}
	};
	const exit = () => {
		const index = stack.indexOf(entry);
		if (index === -1) {
			return;
		}
		stack.splice(index, 1);
		if (index === stack.length) {
			sync();
		}
	};
	return Object.assign(exit, { update });
};

export {
	//,
	enterModal,
};
