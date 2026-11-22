"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createStore } from "./store.js";
import type { Store } from "./store.js";
import type { ComboboxBehavior, UseComboboxProps } from "./use-combobox.js";
import { useControllableState } from "./use-controllable-state.js";
import { getOptions, useListbox } from "./use-listbox.js";

type UseMultiSelectProps = Omit<UseComboboxProps, "value" | "defaultValue" | "onValueChange"> & {
	/** The controlled picked values. Pair with `onValueChange`. */
	value?: readonly string[];
	/** The picked values on first render. */
	defaultValue?: readonly string[];
	/** Called when the user picks or removes a value. */
	onValueChange?: (value: string[]) => void;
};

/**
 * The state of one multi-select, which its parts read from context. It is a
 * combobox whose options toggle, so `useComboboxInput` wires its input.
 */
type MultiSelectBehavior = ComboboxBehavior & {
	selected: readonly string[];
	/** Removes `value`, unless it is locked. Returns whether it removed it. */
	remove: (value: string) => boolean;
	/** The values that a pick, a click, or a key cannot remove. */
	locked: Store<{ values: readonly string[] }>;
	/** The trigger that holds the tags and the input, and anchors the list. */
	triggerRef: { current: HTMLElement | null };
	/** The tag of each selected value, so the keyboard can move focus between tags. */
	tags: Map<string, HTMLElement>;
};

const EMPTY: readonly string[] = [];

/**
 * Owns a multi-select combobox: a text input that filters a listbox popup
 * whose options toggle in and out of the selection. A pick clears the text
 * and keeps the list open and the highlight on the option. Call it in the
 * root part; call `useComboboxInput` in the input and `useOption` in each
 * option.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/listbox/#keyboardinteraction
 *
 * @example
 * ```tsx
 * const multiSelect = useMultiSelect({ defaultValue: ["us"] });
 * return <MultiSelectContext value={multiSelect}>{children}</MultiSelectContext>;
 * ```
 */
const useMultiSelect = ({
	value: valueProp,
	defaultValue = EMPTY,
	onValueChange,
	inputValue: inputValueProp,
	defaultInputValue = "",
	onInputValueChange,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
}: UseMultiSelectProps): MultiSelectBehavior => {
	const [selected, setSelected] = useControllableState<readonly string[]>({
		value: valueProp,
		defaultValue,
		onChange: (next) => onValueChange?.([...next]),
	});
	const [inputValue, setInputValue] = useControllableState({
		value: inputValueProp,
		defaultValue: defaultInputValue,
		onChange: onInputValueChange,
	});
	const [open, setOpen] = useControllableState({
		value: openProp,
		defaultValue: defaultOpen,
		onChange: onOpenChange,
	});
	const [locked] = useState(() => createStore({ values: EMPTY }));
	const [tags] = useState(() => new Map<string, HTMLElement>());
	const inputRef = useRef<HTMLInputElement | null>(null);
	const triggerRef = useRef<HTMLElement | null>(null);

	const remove = (value: string): boolean => {
		if (locked.get().values.includes(value)) {
			return false;
		}
		setSelected(selected.filter((item) => item !== value));
		return true;
	};

	const listbox = useListbox({
		selected,
		onSelect: (value) => {
			if (selected.includes(value)) {
				if (!remove(value)) {
					return;
				}
			} else {
				setSelected([...selected, value]);
			}
			// Why flushSync: clearing the text shows every option again, and the
			// highlight must stay on the picked option in that new list.
			flushSync(() => {
				setInputValue("");
			});
			listbox.activate(
				getOptions(listbox.ref.current).find((option) => option.dataset.value === value) ?? null,
			);
		},
	});

	return {
		open,
		setOpen,
		inputValue,
		setInputValue,
		listbox,
		inputRef,
		selected,
		remove,
		locked,
		triggerRef,
		tags,
	};
};

export {
	//,
	useMultiSelect,
};
export type {
	//,
	MultiSelectBehavior,
	UseMultiSelectProps,
};
