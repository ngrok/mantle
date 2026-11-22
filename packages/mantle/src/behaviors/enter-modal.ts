/**
 * The exit of each open modal, so nested modals restore in reverse order. One
 * stack for each document is enough, and it holds nothing while no modal is open.
 */
const stack: Array<() => void> = [];

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

/**
 * Makes the page behind a popup inert while the popup is open, the way a
 * modal does, and returns the cleanup that undoes it:
 *
 * - The page does not scroll. The root keeps its scrollbar gutter, so the
 *   layout does not shift.
 * - Each element outside `keep`, their labels, and their ancestors gets
 *   `inert`, including one that mounts while the popup is open. A screen reader reads only the popup and the control that owns
 *   it, Tab cannot reach the rest of the page, and a press there activates
 *   nothing: it lands on an ancestor, so the owner blurs and the popup closes.
 *
 * DOM focus stays where it is: the owner keeps it, and the owner's keyboard
 * handler keeps Tab inside. Call it from the popup's ref callback while the
 * popup is open.
 *
 * @example
 * ```ts
 * const exit = enterModal([trigger, popupHost]);
 * // later, when the popup closes
 * exit();
 * ```
 */
const enterModal = (keep: readonly Element[]): (() => void) => {
	const root = document.documentElement;
	const cleanups: Array<() => void> = [];
	const gutter = window.innerWidth - root.clientWidth;
	cleanups.push(setStyle(root, "overflow", "hidden"));
	if (gutter > 0) {
		cleanups.push(setStyle(root, "padding-right", `${gutter}px`));
	}
	// Why walk from each kept element up: the siblings along the path are the
	// rest of the page, and an ancestor of a kept element must stay live.
	const exposed = new Set<Element>();
	const expose = (element: Element) => {
		for (let node: Element | null = element; node != null && node !== document.body;) {
			exposed.add(node);
			node = node.parentElement;
		}
	};
	// Why only labels outside: a label inside a kept popup, such as a group
	// label, would otherwise make its sibling options inert.
	const outside = (element: Element) => !keep.some((kept) => kept.contains(element));
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
	// toast, is part of the page behind the popup too.
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
	const exit = () => {
		for (const cleanup of cleanups.toReversed()) {
			cleanup();
		}
	};
	stack.push(exit);
	return () => {
		// Why the stack: an inner modal that exits after an outer one would put
		// back values the outer one already restored.
		const index = stack.indexOf(exit);
		if (index === -1) {
			return;
		}
		for (const later of stack.splice(index).toReversed()) {
			later();
		}
	};
};

export {
	//,
	enterModal,
};
