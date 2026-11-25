"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { findTabbableDescendants } from "../components/alert/tabbable-neighbors.js";
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
	/**
	 * Returns the text that the option with `value` shows, or `undefined` when
	 * no option has it. A preset `value` or `defaultValue`, and a reset, write it
	 * into the input when no input text is set.
	 */
	textFor?: (value: string) => string | undefined;
};

/** The text a node shows, without its `hidden` and `aria-hidden` parts, on one line. */
const shownText = (node: Node): string => {
	const read = (each: Node): string => {
		if (each.nodeType === Node.TEXT_NODE) {
			return each.textContent ?? "";
		}
		if (
			!(each instanceof Element) ||
			each.hasAttribute("hidden") ||
			each.getAttribute("aria-hidden") === "true"
		) {
			return "";
		}
		return Array.from(each.childNodes, read).join("");
	};
	return read(node).replace(/\s+/g, " ").trim();
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
	/** The element in the popup box that holds the footer, after the listbox. */
	footerRef: { current: HTMLElement | null };
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
	defaultInputValue,
	onInputValueChange,
	value: valueProp,
	defaultValue,
	onValueChange,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	textFor,
}: UseComboboxProps): ComboboxBehavior & {
	/** The value of the picked option. */
	value: string | undefined;
	setValue: (value: string) => void;
	/** Returns the value and the text to their defaults, such as on a form reset. */
	reset: () => void;
} => {
	// Why the value as a fallback: an item that is not loaded, or that a component of
	// your own renders, has no text to read.
	const textOf = (option: string | undefined) =>
		option == null || option === "" ? "" : (textFor?.(option) ?? option);
	// Why lazy states: the walks for the preset texts run once, on the first render.
	// The default's text outlives a filter that later hides its item, for a reset.
	const [defaultText] = useState(() => defaultInputValue ?? textOf(defaultValue));
	const [text, setText] = useState(() =>
		valueProp === undefined || defaultInputValue !== undefined ? defaultText : textOf(valueProp),
	);
	/** The value whose text the input shows, to see a controlled `value` change. */
	const [shownFor, setShownFor] = useState(valueProp ?? defaultValue);
	// Why during render: a controlled `value` that the app changes, such as on its own
	// form reset, shows its item's text in the same render, with no effect.
	if (inputValueProp === undefined && valueProp !== undefined && valueProp !== shownFor) {
		setShownFor(valueProp);
		setText(textOf(valueProp));
	}
	const inputValue = inputValueProp ?? text;
	const setInputValue = (next: string) => {
		if (Object.is(next, inputValue)) {
			return;
		}
		if (inputValueProp === undefined) {
			setText(next);
		}
		onInputValueChange?.(next);
	};
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
	const footerRef = useRef<HTMLElement | null>(null);
	const listbox = useListbox({
		selected: value == null ? [] : [value],
		onSelect: (next) => {
			// Why: a pick unmounts the popup, so focus in its footer would fall to the page.
			const popup = popupRef.current;
			if (popup != null && popup.contains(popup.ownerDocument.activeElement)) {
				inputRef.current?.focus();
			}
			// Why the option's text: the input shows what the user picked, not an ID.
			// Why before `setValue`: an `onValueChange` that closes the list removes the option.
			const option = Array.from(popup?.querySelectorAll('[role="option"]') ?? []).find(
				(each) => each.getAttribute("data-value") === next,
			);
			const picked =
				(option instanceof HTMLElement && (option.dataset.textValue ?? shownText(option))) || next;
			setValue(next);
			setShownFor(next);
			setInputValue(picked);
			setOpen(false);
		},
		ownerRef: inputRef,
		selectionFollowsHighlight: true,
	});
	const reset = () => {
		setValue(defaultValue ?? "");
		setShownFor(defaultValue);
		setInputValue(defaultText);
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
		footerRef,
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
 * A click or a Tab into the input opens the list. Focus from script does not.
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
	/** Whether focus entered the input since its last key press, so a Tab's keyup there is an entry. */
	const entered = useRef(false);

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
		onFocus: () => {
			entered.current = true;
		},
		// Why the capture phase: a consumer's `onKeyDown` that cancels Tab keeps focus
		// here, and its keyup must not count as an entry.
		onKeyDownCapture: () => {
			entered.current = false;
		},
		onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => {
			// Why the keyup: Tab's keyup lands on the control that Tab focused, so a Tab
			// into the field opens the list as a click does. Focus from script, such as a
			// dialog's autofocus or the return from the footer, opens nothing.
			// Why Alt counts: Safari moves between fields and links with Option+Tab.
			const entry = event.key === "Tab" && !event.ctrlKey && !event.metaKey && entered.current;
			entered.current = false;
			if (entry && !open) {
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
					// Why the footer only: an option rendered as a link is tabbable too, and arrows reach it.
					const footer = open ? combobox.footerRef.current : null;
					const first = footer == null ? undefined : findTabbableDescendants(footer)[0];
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

/** The controls that take focus from a press in the popup's footer. */
const TEXT_ENTRY =
	'textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="button"], [type="checkbox"], [type="radio"], [type="submit"], [type="reset"], [type="image"])';

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
 * - A press on a footer control keeps focus on the input, unless the control is a text field.
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
	const { inputRef, setOpen, footerRef: footerElementRef } = combobox;
	// Why a stable callback: a new ref callback on each render would rebuild the observer.
	const footerRef = useCallback(
		(host: HTMLElement | null) => {
			footerElementRef.current = host;
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
			return () => {
				observer.disconnect();
				footerElementRef.current = null;
			};
		},
		[inputRef, footerElementRef],
	);
	const inAnchor = (node: unknown) =>
		node instanceof Node && anchorRef.current?.contains(node) === true;
	return {
		onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
			// Why: `Content`'s own `onKeyDown` runs first and can cancel the key, and an
			// input method in a footer text field uses Escape for its own candidates.
			if (event.defaultPrevented || event.nativeEvent.isComposing) {
				return;
			}
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
			const footer = footerElementRef.current;
			const tabbables = footer == null ? [] : findTabbableDescendants(footer);
			if (event.shiftKey && event.target === tabbables[0]) {
				event.preventDefault();
				inputRef.current?.focus();
				return;
			}
			const anchor = anchorRef.current;
			// Why: the box is in a portal, so the browser's next stop is not the control after the field.
			if (!event.shiftKey && event.target === tabbables.at(-1) && anchor != null) {
				// Why no setOpen: the footer control's blur closes the list, unless `Content.onBlur` cancels it.
				if (focusAfter(anchor, box)) {
					event.preventDefault();
				}
			}
		},
		onBlur: (event: FocusEvent<HTMLElement>) => {
			// Why: `Content`'s own `onBlur` runs first and can keep the list open.
			if (event.defaultPrevented) {
				return;
			}
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
			// Why: only a text field takes focus from a press. A press on a button, a switch,
			// or a link keeps focus on the input, and its click still runs. Safari never
			// focuses a button on a press, so the input's blur would close the list first.
			const target = event.target instanceof Element ? event.target : null;
			if (target?.closest(TEXT_ENTRY) == null) {
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
