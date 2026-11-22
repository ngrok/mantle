"use client";

import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "./use-controllable-state.js";
import { useListbox } from "./use-listbox.js";
import type { Listbox } from "./use-listbox.js";

type UseComboboxProps = {
	/** The controlled text of the input. Pair with `onInputValueChange`. */
	inputValue?: string;
	/** The text of the input on first render. Use for uncontrolled text. */
	defaultInputValue?: string;
	/** Called when the text of the input changes. */
	onInputValueChange?: (inputValue: string) => void;
	/** The controlled value of the picked option. Pair with `onValueChange`. */
	value?: string;
	/** The value of the picked option on first render. */
	defaultValue?: string;
	/** Called when the user picks an option. */
	onValueChange?: (value: string) => void;
	/** The controlled open state. Pair with `onOpenChange`. */
	open?: boolean;
	/** Whether the list is open on first render. */
	defaultOpen?: boolean;
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void;
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
	onInputValueChange,
	value: valueProp,
	defaultValue,
	onValueChange,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
}: UseComboboxProps): ComboboxBehavior & {
	/** The value of the picked option. */
	value: string | undefined;
	setValue: (value: string) => void;
	/** Returns the value and the text to their defaults, such as on a form reset. */
	reset: () => void;
} => {
	const [inputValue, setInputValue] = useControllableState({
		value: inputValueProp,
		defaultValue: defaultInputValue,
		onChange: onInputValueChange,
	});
	const [value, setValue] = useControllableState({
		value: valueProp,
		defaultValue,
		onChange: (next: string | undefined) => {
			if (next != null) {
				onValueChange?.(next);
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
		selected: value == null ? [] : [value],
		onSelect: (next) => {
			setValue(next);
			setInputValue(next);
			setOpen(false);
		},
		ownerRef: inputRef,
		selectionFollowsHighlight: true,
	});
	const reset = () => {
		setValue(defaultValue ?? "");
		setInputValue(defaultInputValue);
	};
	return { value, setValue, reset, open, setOpen, inputValue, setInputValue, listbox, inputRef };
};

/**
 * Wires the input of a combobox: `role="combobox"`, `aria-autocomplete`, the
 * expanded state, and the keyboard contract of the editable combobox pattern.
 * The input keeps Home, End, and the other editing keys. The open list sets
 * the input's `aria-activedescendant`.
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

	// Why no flushSync: the list moves to `target` when it mounts, in the
	// commit that opens it.
	const openTo = (target: "first" | "last" | null) => {
		if (target == null) {
			listbox.activate(null);
		} else {
			listbox.moveOnOpen(target);
		}
		setOpen(true);
	};

	return {
		ref: combobox.inputRef,
		role: "combobox",
		autoComplete: "off",
		"aria-autocomplete": "list" as const,
		"aria-expanded": open,
		"aria-controls": open ? listbox.id : undefined,
		// Why: the open list writes this attribute, so no consumer value may render over it.
		"aria-activedescendant": undefined,
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
			// Why: an input method uses the arrows, Enter, and Escape for its own candidates.
			if (event.nativeEvent.isComposing) {
				return;
			}
			// Why: Shift, Ctrl, or Meta with an arrow selects or moves through the text.
			const arrow = event.key === "ArrowDown" || event.key === "ArrowUp";
			if (arrow && (event.shiftKey || event.ctrlKey || event.metaKey)) {
				return;
			}
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
					// submits the form.
					if (!open) {
						return;
					}
					event.preventDefault();
					// Why a click: it runs the item's own handlers, and an `asChild` link
					// navigates, as with a pointer.
					const { activeId } = listbox.getStore().get();
					const active = activeId == null ? null : document.getElementById(activeId);
					if (active?.dataset.value != null && active.getAttribute("aria-disabled") !== "true") {
						active.click();
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
