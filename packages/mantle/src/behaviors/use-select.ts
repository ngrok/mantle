"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "./use-controllable-state.js";
import { useListbox } from "./use-listbox.js";
import type { Listbox, MoveTarget } from "./use-listbox.js";

type UseSelectProps = {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
};

/**
 * The state of one select, which its parts read from context.
 */
type SelectBehavior = {
	open: boolean;
	setOpen: (open: boolean) => void;
	value: string | undefined;
	disabled: boolean;
	listbox: Listbox;
	triggerRef: { current: HTMLButtonElement | null };
};

/**
 * Owns the WAI-ARIA select-only combobox pattern: a button that opens a
 * listbox and picks one value. DOM focus never leaves the trigger, and Tab
 * cannot move it while the list is open. A press outside closes the list
 * through the trigger's blur. The page stays live, as with a native select. Call it in the root part; call
 * `useSelectTrigger` in the trigger and `useOption` in each option.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
 *
 * @example
 * ```tsx
 * const select = useSelect({ defaultValue: "apple" });
 * return <SelectContext value={select}>{children}</SelectContext>;
 * ```
 */
const useSelect = ({
	value: valueProp,
	defaultValue,
	onValueChange,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	disabled = false,
}: UseSelectProps): SelectBehavior => {
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
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const listbox = useListbox({
		selected: value == null ? [] : [value],
		onSelect: (next) => {
			setValue(next);
			setOpen(false);
		},
		ownerRef: triggerRef,
	});
	return { open, setOpen, value, disabled, listbox, triggerRef };
};

/** The keys that open a closed select, and the option each one moves to. */
const openKeys: Record<string, MoveTarget> = {
	ArrowDown: "selected",
	ArrowUp: "selected",
	Enter: "selected",
	" ": "selected",
	Home: "first",
	End: "last",
};

/** The keys that move the highlight in an open select. */
const moveKeys: Record<string, MoveTarget> = {
	ArrowDown: "next",
	ArrowUp: "previous",
	Home: "first",
	End: "last",
};

/**
 * Wires the trigger of a select: `role="combobox"`, the expanded state, and
 * the keyboard contract of the select-only combobox pattern. DOM focus stays
 * on the trigger while the list is open, and the open list sets the
 * trigger's `aria-activedescendant`.
 *
 * @example
 * ```tsx
 * const triggerProps = useSelectTrigger(select);
 * return <button {...triggerProps}>{label}</button>;
 * ```
 */
const useSelectTrigger = (select: SelectBehavior) => {
	const { open, setOpen, listbox, disabled } = select;

	// Why no flushSync: the list moves to `target` when it mounts, in the
	// commit that opens it.
	const openTo = (target: MoveTarget) => {
		listbox.moveOnOpen(target);
		setOpen(true);
	};

	const pickActive = () => {
		// Why a click: it runs the item's own handlers, as with a pointer.
		const { activeId } = listbox.getStore().get();
		const active = activeId == null ? null : document.getElementById(activeId);
		if (active?.dataset.value != null && active.getAttribute("aria-disabled") !== "true") {
			active.click();
			return;
		}
		setOpen(false);
	};

	return {
		ref: select.triggerRef,
		type: "button" as const,
		role: "combobox",
		disabled,
		"aria-haspopup": "listbox" as const,
		"aria-expanded": open,
		"aria-controls": open ? listbox.id : undefined,
		// Why: the open list writes this attribute, so no consumer value may render over it.
		"aria-activedescendant": undefined,
		onClick: () => {
			if (open) {
				setOpen(false);
				return;
			}
			// Why focus: Safari does not focus a clicked button, and the trigger's
			// blur closes the list when focus leaves, such as on Tab.
			select.triggerRef.current?.focus();
			openTo("selected");
		},
		onBlur: () => {
			setOpen(false);
		},
		onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
			const { key } = event;
			if (!open) {
				const target = openKeys[key];
				if (target != null) {
					event.preventDefault();
					openTo(target);
					return;
				}
				if (!event.altKey && !event.ctrlKey && !event.metaKey && key.length === 1) {
					flushSync(() => {
						setOpen(true);
					});
					listbox.typeahead(key);
				}
				return;
			}
			if (event.altKey && key === "ArrowUp") {
				event.preventDefault();
				pickActive();
				return;
			}
			const target = moveKeys[key];
			if (target != null) {
				event.preventDefault();
				listbox.move(target);
				return;
			}
			switch (key) {
				case "Enter": {
					event.preventDefault();
					pickActive();
					return;
				}
				case " ": {
					// Why: a space inside a typeahead word searches; on its own it picks.
					event.preventDefault();
					if (!listbox.typeahead(key)) {
						pickActive();
					}
					return;
				}
				case "Escape": {
					event.preventDefault();
					setOpen(false);
					return;
				}
				case "Tab": {
					// Why: as with a native select, focus stays until Enter, Escape, or a pick.
					event.preventDefault();
					return;
				}
				default: {
					if (!event.altKey && !event.ctrlKey && !event.metaKey && key.length === 1) {
						event.preventDefault();
						listbox.typeahead(key);
					}
				}
			}
		},
	};
};

export {
	//,
	useSelect,
	useSelectTrigger,
};
export type {
	//,
	SelectBehavior,
	UseSelectProps,
};
