"use client";

import { isValidElement, useCallback, useId, useInsertionEffect, useRef, useState } from "react";
import type { HTMLAttributes, MouseEventHandler, ReactNode, RefCallback, RefObject } from "react";
import { createStore, useStoreValue } from "./store.js";
import type { Store } from "./store.js";

/** How long a typeahead search keeps the characters typed before it, in ms. */
const TYPEAHEAD_RESET_MS = 500;

/**
 * The hot state of a listbox. It lives in a store, so a move of the highlight
 * re-renders the two options that change, not the whole list.
 */
type ListboxState = {
	/** The `id` of the option that has visual focus, or `null`. */
	activeId: string | null;
	/** The label of the last selected or active option, so a closed select can show it. */
	itemLabel: { value: string; label: ReactNode; translate?: "yes" | "no" } | null;
	/** The option the last open moves to, so the selected option can render highlighted in the opening render. */
	openTarget: MoveTarget | null;
};

type MoveTarget = "next" | "previous" | "first" | "last" | "selected";

/**
 * The listbox behavior that `useOption`, `useSelect`, and `useCombobox` share.
 */
type Listbox = {
	id: string;
	/** The store of the hot state. The first call creates it. */
	getStore: () => Store<ListboxState>;
	ref: RefObject<HTMLElement | null>;
	selected: readonly string[];
	select: (value: string) => void;
	activate: (option: HTMLElement | null) => void;
	move: (target: MoveTarget) => void;
	/** Call before the owner opens a closed list: the list moves to `target` when it mounts. */
	moveOnOpen: (target: MoveTarget) => void;
	typeahead: (key: string) => boolean;
	listboxProps: HTMLAttributes<HTMLElement> & {
		ref: RefCallback<HTMLElement>;
		onMouseDown: MouseEventHandler<HTMLElement>;
	};
};

/** The enabled options of a listbox in DOM order. The DOM is the collection. */
const getOptions = (listbox: HTMLElement | null): HTMLElement[] =>
	listbox == null
		? []
		: Array.from(
				listbox.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'),
			);

/**
 * Scrolls `list` so that `option` shows in full. It moves no other scroll
 * container, and it reads offsets, so the open animation's scale changes nothing.
 */
const scrollIntoList = (list: HTMLElement, option: HTMLElement): void => {
	let top = 0;
	for (
		let node: Element | null = option;
		node instanceof HTMLElement && node !== list;
		node = node.offsetParent
	) {
		top += node.offsetTop;
	}
	top -= list.clientTop;
	if (top < list.scrollTop) {
		list.scrollTop = top;
	} else if (top + option.offsetHeight > list.scrollTop + list.clientHeight) {
		list.scrollTop = top + option.offsetHeight - list.clientHeight;
	}
};

/**
 * Finds the option to move to, wrapping at neither end. Pure, so the keyboard
 * contract is testable without a DOM.
 */
const findTarget = <T>({
	options,
	activeIndex,
	selectedIndex,
	target,
}: {
	options: readonly T[];
	activeIndex: number;
	selectedIndex: number;
	target: MoveTarget;
}): T | undefined => {
	switch (target) {
		case "first": {
			return options[0];
		}
		case "last": {
			return options.at(-1);
		}
		case "selected": {
			return options[selectedIndex] ?? options[0];
		}
		case "next": {
			return activeIndex === -1
				? options[0]
				: options[Math.min(activeIndex + 1, options.length - 1)];
		}
		case "previous": {
			return activeIndex === -1 ? options.at(-1) : options[Math.max(activeIndex - 1, 0)];
		}
		default: {
			return undefined;
		}
	}
};

/**
 * The parts of a listbox that live as long as its owner: the element refs,
 * the list ref, the typeahead text, a pending move, and the store. The store starts on its
 * first read, which an open list makes, so a closed picker holds none.
 */
const createListboxState = () => {
	let store: Store<ListboxState> | null = null;
	return {
		ref: { current: null as HTMLElement | null },
		searchRef: { current: { text: "", time: 0 } },
		// A move that found no options, such as before async results arrive.
		pendingMoveRef: { current: null as MoveTarget | null },
		getStore: (): Store<ListboxState> => {
			store ??= createStore<ListboxState>({ activeId: null, itemLabel: null, openTarget: null });
			return store;
		},
	};
};

/**
 * Owns the WAI-ARIA listbox pattern with `aria-activedescendant`: the active
 * option, selection, and typeahead. DOM focus stays on the element that owns
 * the listbox, such as a select trigger or a combobox input.
 *
 * It holds no open state and renders nothing. `useSelect` and `useCombobox`
 * compose it, and `useOption` reads it in each option. The open list writes
 * the `aria-activedescendant` of `ownerRef`, so a closed owner holds no
 * subscription, and a move of the highlight renders no owner.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *
 * @example
 * ```ts
 * const listbox = useListbox({ selected: value == null ? [] : [value], onSelect: setValue, ownerRef: triggerRef });
 * ```
 */
const useListbox = ({
	selected,
	onSelect,
	ownerRef,
}: {
	selected: readonly string[];
	onSelect: (value: string) => void;
	ownerRef: RefObject<HTMLElement | null>;
}): Listbox => {
	const id = useId();
	const [{ ref, searchRef, pendingMoveRef, getStore }] = useState(createListboxState);

	const activate = (option: HTMLElement | null) => {
		getStore().set({ activeId: option?.id ?? null });
		if (option != null && ref.current != null) {
			scrollIntoList(ref.current, option);
		}
	};

	const moveOnOpen = (target: MoveTarget) => {
		pendingMoveRef.current = target;
		getStore().set({ activeId: null, openTarget: target });
	};

	const move = (target: MoveTarget) => {
		const options = getOptions(ref.current);
		pendingMoveRef.current = options.length === 0 ? target : null;
		const activeId = getStore().get().activeId;
		const next = findTarget({
			options,
			activeIndex: options.findIndex((option) => option.id === activeId),
			selectedIndex: options.findIndex((option) => selected.includes(option.dataset.value ?? "")),
			target,
		});
		activate(next ?? null);
	};

	// Why it returns a boolean: the owner prevents the key's default only when
	// the key was a typeahead character.
	const typeahead = (key: string): boolean => {
		if (key.length !== 1) {
			return false;
		}
		const now = Date.now();
		const previous = searchRef.current;
		const searching = now - previous.time <= TYPEAHEAD_RESET_MS;
		if (key === " " && !searching) {
			return false;
		}
		const text = now - previous.time > TYPEAHEAD_RESET_MS ? key : previous.text + key;
		searchRef.current = { text, time: now };
		const options = getOptions(ref.current);
		const activeIndex = options.findIndex((option) => option.id === getStore().get().activeId);
		// Why the repeat check: pressing one letter again cycles through the
		// options that start with it, like a native select.
		const repeated = text.length > 1 && text === text.charAt(0).repeat(text.length);
		const query = (repeated ? key : text).toLowerCase();
		const start = repeated || text.length === 1 ? activeIndex + 1 : Math.max(activeIndex, 0);
		const ordered = [...options.slice(start), ...options.slice(0, start)];
		const match = ordered.find((option) =>
			(option.dataset.textValue ?? option.textContent ?? "").trim().toLowerCase().startsWith(query),
		);
		if (match != null) {
			activate(match);
		}
		return true;
	};

	// Why a stable callback: React detaches and attaches a new ref callback on each render, which
	// would rebuild the observer and the subscription on each keystroke.
	// Why an insertion effect: the ref callback and the observer can run in the same commit, before
	// a passive effect (`useCallbackRef`) writes this render's `move`.
	const moveRef = useRef(move);
	useInsertionEffect(() => {
		moveRef.current = move;
	});
	const listboxRef = useCallback<RefCallback<HTMLElement>>(
		(node) => {
			ref.current = node;
			if (node == null) {
				return;
			}
			const store = getStore();
			// Why an observer: options can mount after the move that needed them, such
			// as async results, or replace the active option. The highlight then
			// moves when the options change, with no effect and no extra render.
			const reconcile = () => {
				const { activeId } = store.get();
				const stale = activeId != null && !node.contains(document.getElementById(activeId));
				if (pendingMoveRef.current != null || stale) {
					moveRef.current(pendingMoveRef.current ?? "first");
				}
			};
			const observer = new MutationObserver(reconcile);
			observer.observe(node, { childList: true, subtree: true });
			// Why the open list writes the attribute: the owner needs no subscription
			// while closed. Each write reads the ref, because the list can attach
			// first, and the cleanup removes it from the element it wrote to, because
			// the owner's ref can be detached in the commit that closes the list.
			let written: HTMLElement | null = null;
			const showActive = () => {
				const owner = ownerRef.current ?? written;
				const { activeId } = store.get();
				if (activeId == null) {
					owner?.removeAttribute("aria-activedescendant");
					return;
				}
				owner?.setAttribute("aria-activedescendant", activeId);
				written = owner;
			};
			const unsubscribe = store.subscribe(showActive);
			showActive();
			// Why now too: the commit that attaches the list can also replace the
			// options before the observer starts.
			reconcile();
			return () => {
				observer.disconnect();
				unsubscribe();
				written?.removeAttribute("aria-activedescendant");
				ref.current = null;
			};
		},
		[ref, getStore, pendingMoveRef, ownerRef],
	);

	return {
		id,
		getStore,
		ref,
		selected,
		select: onSelect,
		activate,
		move,
		moveOnOpen,
		typeahead,
		listboxProps: {
			id,
			ref: listboxRef,
			role: "listbox",
			tabIndex: -1,
			// Why: a press inside the list must not move DOM focus off the owner.
			onMouseDown: (event) => {
				event.preventDefault();
			},
		},
	};
};

/**
 * The id an option renders with: under `asChild`, the child's own `id` wins
 * over the part's, as `Slot` merges it.
 */
const childId = ({
	asChild,
	children,
	id,
}: {
	asChild: boolean;
	children: ReactNode;
	id: string | undefined;
}): string | undefined =>
	asChild && isValidElement<{ id?: string }>(children) ? (children.props.id ?? id) : id;

/**
 * Wires one option into its listbox: an `id`, `role="option"`,
 * `aria-selected`, highlight on hover, and selection on click. The option
 * re-renders only when its own highlight or selection changes.
 *
 * @example
 * ```tsx
 * const { optionProps } = useOption(listbox, { value: "apple" });
 * return <div {...optionProps}>Apple</div>;
 * ```
 */
const useOption = (
	listbox: Listbox,
	{
		value,
		disabled = false,
		textValue,
		id: idProp,
	}: {
		value: string;
		disabled?: boolean;
		textValue?: string;
		/** The id the option renders with, such as an `asChild` child's own `id`. */
		id?: string;
	},
) => {
	const generatedId = useId();
	const id = idProp ?? generatedId;
	const selected = listbox.selected.includes(value);
	// Why the open target: an open to the selected option highlights it in the
	// opening render, so the move that follows changes no option.
	const active = useStoreValue(
		listbox.getStore(),
		(state) =>
			state.activeId === id ||
			(state.activeId == null &&
				state.openTarget === "selected" &&
				selected &&
				!disabled &&
				listbox.selected.length === 1),
	);
	return {
		active,
		selected,
		optionProps: {
			id,
			role: "option",
			"aria-selected": selected,
			"aria-disabled": disabled || undefined,
			"data-value": value,
			"data-text-value": textValue,
			"data-highlighted": active ? "" : undefined,
			"data-state": selected ? "checked" : "unchecked",
			"data-disabled": disabled ? "" : undefined,
			onPointerMove: (event: { currentTarget: HTMLElement }) => {
				// Why not `activate`: a hover must not scroll a half-visible option.
				if (!disabled && !active) {
					listbox.getStore().set({ activeId: event.currentTarget.id });
				}
			},
			onClick: () => {
				if (!disabled) {
					listbox.select(value);
				}
			},
		},
	};
};

export {
	//,
	childId,
	findTarget,
	getOptions,
	useListbox,
	useOption,
};
export type {
	//,
	Listbox,
	ListboxState,
	MoveTarget,
};
