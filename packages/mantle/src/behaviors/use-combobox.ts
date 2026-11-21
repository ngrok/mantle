"use client";

import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useStoreValue } from "./store.js";
import { useControllableState } from "./use-controllable-state.js";
import { useListbox } from "./use-listbox.js";
import type { Listbox } from "./use-listbox.js";

type UseComboboxProps = {
	/** The controlled text of the input. Pair with `setInputValue`. */
	inputValue?: string;
	/** The text of the input on first render. Use for uncontrolled text. */
	defaultInputValue?: string;
	/** Called when the text of the input changes. */
	setInputValue?: (value: string) => void;
	/** The controlled value of the picked option. Pair with `setSelectedValue`. */
	selectedValue?: string;
	/** The value of the picked option on first render. */
	defaultSelectedValue?: string;
	/** Called when the user picks an option. */
	setSelectedValue?: (value: string) => void;
	/** The controlled open state. Pair with `setOpen`. */
	open?: boolean;
	/** Whether the list is open on first render. */
	defaultOpen?: boolean;
	/** Called when the open state changes. */
	setOpen?: (open: boolean) => void;
};

/**
 * The state of one combobox, which its parts read from context.
 */
type ComboboxBehavior = {
	open: boolean;
	setOpen: (open: boolean) => void;
	inputValue: string;
	setInputValue: (value: string) => void;
	listbox: Listbox;
	inputRef: { current: HTMLInputElement | null };
};

/**
 * Owns the WAI-ARIA editable combobox pattern with list autocomplete: a text
 * input that filters a listbox popup. The consumer filters the options from
 * `inputValue`. DOM focus never leaves the input, so a press outside closes
 * the list through the input's blur, with no document listener. Call it in
 * the root part; call `useComboboxInput` in the input and `useOption` in each
 * option.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
 *
 * @example
 * ```tsx
 * const combobox = useCombobox({ defaultInputValue: "" });
 * return <ComboboxContext value={combobox}>{children}</ComboboxContext>;
 * ```
 */
const useCombobox = ({
	inputValue: inputValueProp,
	defaultInputValue = "",
	setInputValue: onInputValueChange,
	selectedValue: selectedProp,
	defaultSelectedValue,
	setSelectedValue: onSelectedChange,
	open: openProp,
	defaultOpen = false,
	setOpen: onOpenChange,
}: UseComboboxProps): ComboboxBehavior => {
	const [inputValue, setInputValue] = useControllableState({
		value: inputValueProp,
		defaultValue: defaultInputValue,
		onChange: onInputValueChange,
	});
	const [selected, setSelected] = useControllableState({
		value: selectedProp,
		defaultValue: defaultSelectedValue,
		onChange: (next: string | undefined) => {
			if (next != null) {
				onSelectedChange?.(next);
			}
		},
	});
	const [open, setOpen] = useControllableState({
		value: openProp,
		defaultValue: defaultOpen,
		onChange: onOpenChange,
	});
	const inputRef = useRef<HTMLInputElement | null>(null);
	const listbox = useListbox({
		selected: selected == null ? [] : [selected],
		onSelect: (next) => {
			setSelected(next);
			setInputValue(next);
			setOpen(false);
		},
	});
	return { open, setOpen, inputValue, setInputValue, listbox, inputRef };
};

/**
 * Wires the input of a combobox: `role="combobox"`, `aria-autocomplete`, the
 * expanded state, the active descendant, and the keyboard contract of the
 * editable combobox pattern. The input keeps Home, End, and the other
 * editing keys.
 *
 * `autoSelect` gives the first option the highlight as the text changes, so
 * Enter picks it. `"always"` also highlights it when the list opens.
 *
 * @example
 * ```tsx
 * const inputProps = useComboboxInput(combobox, { autoSelect: "always" });
 * return <input {...inputProps} />;
 * ```
 */
const useComboboxInput = (
	combobox: ComboboxBehavior,
	{ autoSelect = "always" }: { autoSelect?: boolean | "always" } = {},
) => {
	const { open, setOpen, listbox, inputValue, setInputValue } = combobox;
	const activeId = useStoreValue(listbox.store, (state) => state.activeId);

	const openTo = (target: "first" | "last" | null) => {
		setOpen(true);
		if (target == null) {
			listbox.activate(null);
			return;
		}
		listbox.move(target);
	};

	return {
		ref: combobox.inputRef,
		role: "combobox",
		autoComplete: "off",
		"aria-autocomplete": "list" as const,
		"aria-expanded": open,
		"aria-controls": listbox.id,
		"aria-activedescendant": open && activeId != null ? activeId : undefined,
		value: inputValue,
		onChange: (event: ChangeEvent<HTMLInputElement>) => {
			const next = event.target.value;
			if (autoSelect === false) {
				setInputValue(next);
				openTo(null);
				return;
			}
			// Why flushSync: the consumer filters the options from the new text, and
			// the highlight must land on the first option of the new list. A layout
			// effect would run on each render instead of on each keystroke.
			flushSync(() => {
				setInputValue(next);
				setOpen(true);
			});
			listbox.move("first");
		},
		onClick: () => {
			if (!open) {
				openTo(autoSelect === "always" ? "first" : null);
			}
		},
		onBlur: () => {
			setOpen(false);
		},
		onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
			switch (event.key) {
				case "ArrowDown": {
					event.preventDefault();
					if (!open) {
						openTo(event.altKey ? null : "first");
						return;
					}
					listbox.move("next");
					return;
				}
				case "ArrowUp": {
					event.preventDefault();
					if (!open) {
						openTo("last");
						return;
					}
					listbox.move("previous");
					return;
				}
				case "Enter": {
					// Why: while the list is open, Enter picks or does nothing. It never
					// submits the form, and it waits for an input method to finish.
					if (!open || event.nativeEvent.isComposing) {
						return;
					}
					event.preventDefault();
					const active = activeId == null ? null : document.getElementById(activeId);
					const picked = active?.dataset.value;
					if (picked != null && active?.getAttribute("aria-disabled") !== "true") {
						listbox.select(picked);
					}
					return;
				}
				case "Escape": {
					if (open) {
						event.preventDefault();
						setOpen(false);
					}
					return;
				}
				default: {
					// The input keeps every other key.
				}
			}
		},
	};
};

export {
	//,
	useCombobox,
	useComboboxInput,
};
export type {
	//,
	ComboboxBehavior,
	UseComboboxProps,
};
