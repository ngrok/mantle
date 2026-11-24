"use client";

import { useCallback, useRef } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { findTabbableDescendants, isTabbable } from "../components/alert/tabbable-neighbors.js";
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
	/** The open popup box, which holds the listbox and an optional footer outside it. */
	popupRef: { current: HTMLElement | null };
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
	const popupRef = useRef<HTMLElement | null>(null);
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
	return {
		value,
		setValue,
		reset,
		open,
		setOpen,
		inputValue,
		setInputValue,
		listbox,
		inputRef,
		popupRef,
	};
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
		onBlur: (event: FocusEvent<HTMLInputElement>) => {
			// Why: focus that moves to a control in the popup's footer stays in the combobox.
			const { relatedTarget } = event;
			if (!(relatedTarget instanceof Node && combobox.popupRef.current?.contains(relatedTarget))) {
				setOpen(false);
			}
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
				case "Tab": {
					// Why: Tab moves into the popup's footer, and the list stays open. With
					// no control there, Tab leaves the field and the blur closes the list.
					const popup = open ? combobox.popupRef.current : null;
					const first = popup == null ? undefined : findTabbableDescendants(popup)[0];
					if (!event.shiftKey && first != null) {
						event.preventDefault();
						first.focus();
					}
					return;
				}
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

/**
 * The first element after `anchor` in document order, outside `popup`, that
 * takes focus. Returns `false` when none does, so the browser's own Tab runs.
 */
const focusAfter = (anchor: HTMLElement, popup: HTMLElement): boolean => {
	const candidates = findTabbableDescendants(anchor.ownerDocument.body).filter(
		(element) =>
			!popup.contains(element) &&
			(anchor.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 &&
			!anchor.contains(element),
	);
	for (const candidate of candidates) {
		candidate.focus();
		if (candidate.ownerDocument.activeElement === candidate) {
			return true;
		}
	}
	return false;
};

/**
 * Wires the open popup box of a combobox. The box holds the listbox and an
 * optional footer, which sits outside the listbox because a listbox holds only
 * options and groups. Focus in the footer keeps the list open:
 *
 * - Escape closes the list, and focus returns to the input.
 * - Shift+Tab from the first footer control returns to the input.
 * - Tab from the last one moves to the control after `anchorRef`, and the list closes.
 * - Focus that leaves the box and `anchorRef` closes the list.
 * - A footer control that turns disabled or unmounts while it has focus returns focus to the input.
 *
 * Put `footerRef` on the element that holds the footer.
 *
 * @example
 * ```tsx
 * const popupProps = useComboboxPopup(combobox, { anchorRef: combobox.inputRef });
 * return <div {...popupProps}>{listbox}{footer}</div>;
 * ```
 */
const useComboboxPopup = (
	combobox: ComboboxBehavior,
	{ anchorRef }: { anchorRef: { current: HTMLElement | null } },
) => {
	const { inputRef, setOpen } = combobox;
	// Why a stable callback: a new ref callback on each render would rebuild the observer.
	const footerRef = useCallback(
		(host: HTMLElement | null) => {
			if (host == null) {
				return;
			}
			const observer = new MutationObserver(() => {
				const { activeElement, body } = host.ownerDocument;
				if (activeElement == null || activeElement === body) {
					inputRef.current?.focus();
				}
			});
			observer.observe(host, { childList: true, subtree: true });
			return () => observer.disconnect();
		},
		[inputRef],
	);
	const inAnchor = (node: unknown) =>
		node instanceof Node && anchorRef.current?.contains(node) === true;
	return {
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
			const box = event.currentTarget;
			if (event.key === "Escape") {
				// Why: a modal dialog closes on an Escape that nothing prevented.
				event.preventDefault();
				setOpen(false);
				inputRef.current?.focus();
				return;
			}
			if (event.key !== "Tab") {
				return;
			}
			const tabbables = findTabbableDescendants(box);
			if (event.shiftKey && event.target === tabbables[0]) {
				event.preventDefault();
				inputRef.current?.focus();
				return;
			}
			const anchor = anchorRef.current;
			// Why: the box is in a portal, so the browser's next stop is not the control after the field.
			if (!event.shiftKey && event.target === tabbables.at(-1) && anchor != null) {
				if (focusAfter(anchor, box)) {
					event.preventDefault();
					setOpen(false);
				}
			}
		},
		onBlur: (event: FocusEvent<HTMLElement>) => {
			const { relatedTarget } = event;
			const inside =
				relatedTarget instanceof Node &&
				(event.currentTarget.contains(relatedTarget) || inAnchor(relatedTarget));
			if (inside) {
				return;
			}
			// Why: a footer control that turns disabled, such as "Load more" while it
			// loads, drops focus to the page. Focus returns to the input, and the list stays open.
			if (relatedTarget == null && event.target.matches(":disabled")) {
				inputRef.current?.focus();
				return;
			}
			setOpen(false);
		},
		// Why an observer: a focused control that unmounts sends no blur that React sees,
		// and focus falls to the page.
		footerRef,
		onMouseDown: (event: { target: EventTarget; preventDefault: () => void }) => {
			// Why: a press on the box's own surface must not move focus off the input.
			const target = event.target instanceof Element ? event.target : null;
			const control = target?.closest<HTMLElement>(
				"a, button, input, select, textarea, [tabindex]",
			);
			if (control == null || !isTabbable(control)) {
				event.preventDefault();
			}
		},
	};
};

export {
	//,
	useCombobox,
	useComboboxInput,
	useComboboxPopup,
};
export type {
	//,
	ComboboxBehavior,
	UseComboboxProps,
};
