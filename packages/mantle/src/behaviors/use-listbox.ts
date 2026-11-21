"use client";

import { useId, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode, RefObject } from "react";
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
};

type MoveTarget = "next" | "previous" | "first" | "last" | "selected";

/**
 * The listbox behavior that `useOption`, `useSelect`, and `useCombobox` share.
 */
type Listbox = {
	id: string;
	store: Store<ListboxState>;
	ref: RefObject<HTMLElement | null>;
	selected: readonly string[];
	select: (value: string) => void;
	activate: (option: HTMLElement | null) => void;
	move: (target: MoveTarget) => void;
	typeahead: (key: string) => boolean;
	listboxProps: HTMLAttributes<HTMLElement> & {
		ref: RefObject<HTMLElement | null>;
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
 * Owns the WAI-ARIA listbox pattern with `aria-activedescendant`: the active
 * option, selection, and typeahead. DOM focus stays on the element that owns
 * the listbox, such as a select trigger or a combobox input.
 *
 * It holds no open state and renders nothing. `useSelect` and `useCombobox`
 * compose it, and `useOption` reads it in each option.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 *
 * @example
 * ```ts
 * const listbox = useListbox({ selected: value == null ? [] : [value], onSelect: setValue });
 * ```
 */
const useListbox = ({
	selected,
	onSelect,
}: {
	selected: readonly string[];
	onSelect: (value: string) => void;
}): Listbox => {
	const id = useId();
	const ref = useRef<HTMLElement | null>(null);
	const [store] = useState(() => createStore<ListboxState>({ activeId: null, itemLabel: null }));
	const search = useRef({ text: "", time: 0 });

	const activate = (option: HTMLElement | null) => {
		store.set({ activeId: option?.id ?? null });
		option?.scrollIntoView({ block: "nearest" });
	};

	const move = (target: MoveTarget) => {
		const options = getOptions(ref.current);
		const activeId = store.get().activeId;
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
		const previous = search.current;
		const searching = now - previous.time <= TYPEAHEAD_RESET_MS;
		if (key === " " && !searching) {
			return false;
		}
		const text = now - previous.time > TYPEAHEAD_RESET_MS ? key : previous.text + key;
		search.current = { text, time: now };
		const options = getOptions(ref.current);
		const activeIndex = options.findIndex((option) => option.id === store.get().activeId);
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

	return {
		id,
		store,
		ref,
		selected,
		select: onSelect,
		activate,
		move,
		typeahead,
		listboxProps: {
			id,
			ref,
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
	}: {
		value: string;
		disabled?: boolean;
		textValue?: string;
	},
) => {
	const id = useId();
	const active = useStoreValue(listbox.store, (state) => state.activeId === id);
	const selected = listbox.selected.includes(value);
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
					listbox.store.set({ activeId: event.currentTarget.id });
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
