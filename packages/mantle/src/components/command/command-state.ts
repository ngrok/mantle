"use client";

import type { Listbox } from "../../behaviors/use-listbox.js";
import { getOptions, scrollIntoList } from "../../behaviors/use-listbox.js";
import { commandScore } from "./command-score.js";

/**
 * Scores an item for a query, from 0 (hide the item) to 1 (the best match).
 * The default is {@link commandScore}.
 */
type CommandFilter = (value: string, search: string, keywords?: string[]) => number;

/**
 * The palette state that `useCommandState` reads. Its shape matches cmdk's, so
 * a selector written for cmdk reads the same values.
 */
type CommandState = {
	/** The query text. */
	search: string;
	/** The value of the active item, or `""` when no item is active. */
	value: string;
	/** The `id` of the active item's element. */
	selectedItemId?: string;
	filtered: {
		/** The number of items that match the query. A `forceMount` item does not count. */
		count: number;
		/** The score of each item for the query, by element `id`. Empty when no query filters. */
		items: Map<string, number>;
		/** The element `id`s of the groups that hold a match. Empty when no query filters. */
		groups: Set<string>;
	};
};

/** What an item registers with its root when it mounts or renders. */
type CommandItemEntry = {
	value: string;
	keywords: string[];
	forceMount: boolean;
	disabled: boolean;
	onSelect: ((value: string) => void) | undefined;
};

/** The root props that the state reads at event time. */
type CommandOptions = {
	filter: CommandFilter | undefined;
	shouldFilter: boolean | undefined;
	onValueChange: ((value: string) => void) | undefined;
	loop: boolean;
	disablePointerSelection: boolean;
};

const GROUP_SELECTOR = '[data-slot~="command-group"]';
const GROUP_ITEMS_SELECTOR = '[data-slot="command-group-items"]';
const GROUP_HEADING_SELECTOR = '[data-slot="command-group-heading"]';

/** The child of `container` that holds `node`: an item, or the wrapper a consumer put around it. */
const childOf = (container: Element, node: Element): Element | null => {
	let child: Element | null = node;
	while (child != null && child.parentElement !== container) {
		child = child.parentElement;
	}
	return child;
};

/**
 * Puts `nodes`, children of `container`, in this order. It keeps the longest run
 * that already stands in order and moves only the rest, so a query that changes
 * the order a little moves a few nodes, not every match.
 */
const place = (container: Element, nodes: Element[]) => {
	const target = new Map(nodes.map((node, index) => [node, index]));
	const current = Array.from(container.children).filter((child) => target.has(child));
	// The longest increasing run of target positions, in O(n log n): `tails[length]` ends the best run of that length.
	const tails: number[] = [];
	const previous: number[] = [];
	for (const [index, node] of current.entries()) {
		const position = target.get(node) ?? 0;
		let low = 0;
		let high = tails.length;
		while (low < high) {
			const middle = (low + high) >> 1;
			if ((target.get(current[tails[middle] ?? 0] ?? node) ?? 0) < position) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		previous[index] = low > 0 ? (tails[low - 1] ?? -1) : -1;
		tails[low] = index;
	}
	const keep = new Set<Element>();
	for (let index = tails.at(-1) ?? -1; index >= 0; index = previous[index] ?? -1) {
		const node = current[index];
		if (node != null) {
			keep.add(node);
		}
	}
	if (keep.size === nodes.length) {
		return;
	}
	// Why after the previous node, not at the end: a child that mounted during the search after every node stays after them.
	const first = nodes.find((node) => keep.has(node));
	let previousNode: Element | null = null;
	for (const node of nodes) {
		if (!keep.has(node)) {
			if (previousNode == null) {
				first?.before(node);
			} else {
				previousNode.after(node);
			}
		}
		previousNode = node;
	}
};

/**
 * The state of one palette. The DOM is the collection: a filter pass reads the
 * options under the list, writes `hidden` on each item and group, and moves
 * the matches into score order. No item re-renders on a keystroke.
 */
const createCommand = (initialValue: string) => {
	const state: CommandState = {
		search: "",
		value: initialValue,
		selectedItemId: undefined,
		filtered: { count: 0, items: new Map(), groups: new Set() },
	};
	const listeners = new Set<() => void>();
	const entries = new WeakMap<Element, CommandItemEntry>();
	// The order of each container's children before the first sort, to restore when the query clears.
	const natural = new Map<Element, Map<Element, number>>();
	const optionsRef: { current: CommandOptions } = {
		current: {
			filter: undefined,
			shouldFilter: undefined,
			onValueChange: undefined,
			loop: false,
			disablePointerSelection: false,
		},
	};
	const listboxRef: { current: Listbox | null } = { current: null };
	const inputRef: { current: HTMLElement | null } = { current: null };
	let list: HTMLElement | null = null;
	let counted = false;
	let scheduled = false;
	let highlighted: HTMLElement | null = null;
	/** True while the root applies its controlled `value`, which must not echo through `onValueChange`. */
	let syncing = false;
	/** The last controlled `value`, and whether it named no item and cleared the active item. */
	let controlled: string | undefined;
	let cleared = false;

	const emit = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	const getActive = (): HTMLElement | null => {
		const activeId = listboxRef.current?.getStore().get().activeId;
		const element = activeId == null ? null : document.getElementById(activeId);
		return element != null && list?.contains(element) === true ? element : null;
	};

	/** Activates `option` and scrolls it into the list, with its group heading when it leads the group. */
	const focusOption = (option: HTMLElement) => {
		const listbox = listboxRef.current;
		if (list == null || listbox == null) {
			return;
		}
		const items = option.closest(GROUP_ITEMS_SELECTOR);
		if (items instanceof HTMLElement && getOptions(items)[0] === option) {
			const heading = items.parentElement?.querySelector(GROUP_HEADING_SELECTOR);
			if (heading instanceof HTMLElement) {
				scrollIntoList(list, heading);
			}
		}
		listbox.activate(option);
	};

	const moveTo = (target: "first" | "last") => {
		const options = getOptions(list);
		const option = target === "first" ? options[0] : options.at(-1);
		if (option == null) {
			listboxRef.current?.activate(null);
			return;
		}
		focusOption(option);
	};

	const findByValue = (value: string): HTMLElement | undefined =>
		getOptions(list).find((option) => option.dataset.value === value);

	const snapshot = (container: Element) => {
		if (!natural.has(container)) {
			natural.set(
				container,
				new Map(Array.from(container.children, (child, index) => [child, index])),
			);
		}
	};

	/**
	 * Puts each container's children back in the order they had before the
	 * first sort, and moves only the children out of order. A child that
	 * mounted during the search stays at the end when it follows every saved
	 * child, and goes to the front otherwise.
	 */
	const restore = () => {
		for (const [container, order] of natural) {
			let last = container.lastElementChild;
			while (last != null && !order.has(last)) {
				last = last.previousElementSibling;
			}
			// Why the front: React put a prepended item before the first item's node, which the sort moved down.
			const mounted: Element[] = [];
			for (
				let child = last == null ? null : container.firstElementChild;
				child != null && child !== last;
				child = child.nextElementSibling
			) {
				if (!order.has(child)) {
					mounted.push(child);
				}
			}
			if (mounted.length > 0) {
				container.prepend(...mounted);
			}
			place(
				container,
				[...order.keys()].filter((node) => node.parentElement === container),
			);
		}
		natural.clear();
	};

	/**
	 * Sorts the matches by score: in each group, the items; in the list, the
	 * items outside a group, then the groups by their best item. A tie keeps
	 * the order the items had before the search.
	 */
	const sort = (scored: Map<HTMLElement, number>) => {
		if (list == null) {
			return;
		}
		const byContainer = new Map<Element, Map<Element, number>>();
		const groupScores = new Map<Element, number>();
		const add = (container: Element, node: Element | null, score: number) => {
			if (node == null) {
				return;
			}
			let scores = byContainer.get(container);
			if (scores == null) {
				scores = new Map();
				byContainer.set(container, scores);
			}
			const previous = scores.get(node);
			scores.set(node, previous == null ? score : Math.max(score, previous));
		};
		for (const [option, score] of scored) {
			const items = option.closest(GROUP_ITEMS_SELECTOR);
			const container = items != null && list.contains(items) ? items : list;
			add(container, childOf(container, option), score);
			const group = container === list ? null : container.closest(GROUP_SELECTOR);
			if (group != null) {
				groupScores.set(group, Math.max(score, groupScores.get(group) ?? 0));
			}
		}
		for (const [group, score] of groupScores) {
			// Why a negative offset: the groups go after the items outside a group, as in cmdk.
			add(list, childOf(list, group), score - 2);
		}
		for (const [container, scores] of byContainer) {
			snapshot(container);
			const order = natural.get(container);
			const rank = (node: Element) => order?.get(node) ?? Number.POSITIVE_INFINITY;
			const nodes = [...scores.keys()].toSorted(
				(first, second) =>
					(scores.get(second) ?? 0) - (scores.get(first) ?? 0) || rank(first) - rank(second),
			);
			place(container, nodes);
		}
	};

	/**
	 * The filter pass. It hides each item that scores 0 for the query, hides
	 * each group with no match, sorts the matches, and counts them. Then it
	 * keeps the active item, or moves to the first item when `selectFirst` is
	 * set or the active item went away.
	 */
	const refresh = ({ selectFirst }: { selectFirst: boolean }) => {
		if (list == null) {
			return;
		}
		const { filter = commandScore, shouldFilter } = optionsRef.current;
		const filtering = state.search !== "" && shouldFilter !== false;
		const scored = new Map<HTMLElement, number>();
		let count = 0;
		state.filtered.items = new Map();
		state.filtered.groups = new Set();

		for (const option of list.querySelectorAll<HTMLElement>('[role="option"]')) {
			const entry = entries.get(option);
			if (entry == null) {
				continue;
			}
			let visible = true;
			if (filtering && !entry.forceMount) {
				const score = entry.value === "" ? 0 : filter(entry.value, state.search, entry.keywords);
				state.filtered.items.set(option.id, score);
				visible = score > 0;
				if (visible) {
					scored.set(option, score);
				}
			}
			if (visible && !entry.forceMount) {
				count++;
			}
			if (option.hidden === visible) {
				option.hidden = !visible;
			}
		}

		for (const group of list.querySelectorAll<HTMLElement>(GROUP_SELECTOR)) {
			const items = group.querySelector(GROUP_ITEMS_SELECTOR);
			const matched = items?.querySelector('[role="option"]:not([hidden])') != null;
			const visible = !filtering || matched || group.hasAttribute("data-force-mount");
			if (filtering && matched && items != null) {
				state.filtered.groups.add(items.id);
			}
			if (group.hidden === visible) {
				group.hidden = !visible;
			}
		}

		if (filtering) {
			sort(scored);
		} else {
			restore();
		}
		state.filtered.count = count;
		counted = true;

		const activeId = listboxRef.current?.getStore().get().activeId;
		const active = getActive();
		if (selectFirst) {
			moveTo("first");
		} else if (active == null || active.hidden) {
			const match = state.value === "" ? undefined : findByValue(state.value);
			if (match != null) {
				focusOption(match);
			} else if (!cleared && (state.value === "" || activeId != null)) {
				moveTo("first");
			}
		}
		emit();
	};

	/** Runs a filter pass after the current commit. */
	const schedule = () => {
		// Why a microtask: many items mount or unmount in one commit, and one pass after the commit covers them all.
		if (!scheduled) {
			scheduled = true;
			queueMicrotask(() => {
				scheduled = false;
				refresh({ selectFirst: false });
			});
		}
	};

	/** Mirrors the active option into the state, `data-selected`, and `onValueChange`. */
	const showActive = () => {
		const active = getActive();
		if (active != null) {
			cleared = false;
		}
		if (active !== highlighted) {
			highlighted?.removeAttribute("data-selected");
			active?.setAttribute("data-selected", "true");
			highlighted = active;
		}
		state.selectedItemId = active?.id;
		const value = active?.dataset.value ?? "";
		if (value !== state.value) {
			state.value = value;
			if (!syncing) {
				optionsRef.current.onValueChange?.(value);
			}
		}
		emit();
	};

	/** Moves the highlight by one item, or to the next or previous group with `byGroup`. */
	const moveBy = ({ change, byGroup = false }: { change: 1 | -1; byGroup?: boolean }) => {
		const active = getActive();
		const group = active?.closest<HTMLElement>(GROUP_SELECTOR);
		if (byGroup && group != null && list != null) {
			const groups = Array.from(list.querySelectorAll<HTMLElement>(GROUP_SELECTOR));
			for (
				let index = groups.indexOf(group) + change;
				index >= 0 && index < groups.length;
				index += change
			) {
				const [option] = getOptions(groups[index] ?? null);
				if (option != null) {
					focusOption(option);
					return;
				}
			}
		}
		const options = getOptions(list);
		const index = active == null ? -1 : options.indexOf(active);
		const next = index + change;
		const wrapped = next < 0 ? options.at(-1) : options[next % options.length];
		const target = optionsRef.current.loop ? wrapped : options[next];
		if (target != null) {
			focusOption(target);
		}
	};

	return {
		state,
		optionsRef,
		listboxRef,
		inputRef,
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		/** Whether the first filter pass ran and found no match. */
		isEmpty: () => counted && state.filtered.count === 0,
		setSearch: (search: string) => {
			if (search === state.search) {
				return;
			}
			state.search = search;
			refresh({ selectFirst: true });
		},
		/** Activates the item with `value`, as the root's controlled `value` asks. */
		setValue: (value: string) => {
			const changed = controlled !== undefined;
			controlled = value;
			state.value = value;
			const match = findByValue(value);
			syncing = true;
			if (match != null) {
				focusOption(match);
			} else if (changed) {
				// Why only on a change: on mount the first item is active, as in cmdk. Later, a value with no item leaves no item active until the user moves or types, so `Enter` cannot run the item that was active before.
				cleared = true;
				listboxRef.current?.activate(null);
			}
			syncing = false;
			state.value = value;
			emit();
		},
		/**
		 * Registers an item's element. Call it from the item's ref callback on
		 * each render, so the entry has the latest props and text.
		 */
		register: (
			node: HTMLElement,
			{ value, ...entry }: Omit<CommandItemEntry, "value"> & { value: string | undefined },
		) => {
			const resolved = (value ?? node.textContent ?? "").trim();
			entries.set(node, { ...entry, value: resolved });
			if (node.dataset.value !== resolved) {
				node.dataset.value = resolved;
			}
			schedule();
		},
		schedule,
		/** Runs an item's `onSelect` and makes it the active item, as a click or `Enter` does. */
		select: (option: Element | null) => {
			const entry = option == null ? undefined : entries.get(option);
			if (option == null || entry == null || entry.disabled) {
				return;
			}
			listboxRef.current?.getStore().set({ activeId: option.id });
			entry.onSelect?.(entry.value);
		},
		/** The list's ref callback: the first filter pass, and the mirror of the active option. */
		attachList: (node: HTMLElement | null) => {
			list = node;
			const listbox = listboxRef.current;
			if (node == null || listbox == null) {
				return undefined;
			}
			const unsubscribe = listbox.getStore().subscribe(showActive);
			refresh({ selectFirst: false });
			// Why keep `highlighted` and `natural`: StrictMode and an inline `ref` detach and attach the same list, and a reset would leave a second `data-selected` row and lose the order to restore.
			return () => {
				unsubscribe();
				list = null;
			};
		},
		moveBy,
		moveTo,
		getActive,
		/** The input's ref callback: the owner of the list's `aria-activedescendant`. */
		attachInput: (node: HTMLElement | null) => {
			inputRef.current = node;
		},
	};
};

/** The state of one palette, which its parts read from context. */
type Command = ReturnType<typeof createCommand>;

export {
	//,
	createCommand,
};

export type {
	//,
	Command,
	CommandFilter,
	CommandOptions,
	CommandState,
};
