"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import type { SelfClosingWithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { Kbd } from "../kbd/kbd.js";
import { Slot } from "../slot/slot.js";

type FocusShortcutContextValue = {
	isHintShown: boolean;
	setIsHintShown: (isHintShown: boolean) => void;
};

const FocusShortcutContext = createContext<FocusShortcutContextValue | null>(null);

function useFocusShortcutContext(part: string): FocusShortcutContextValue {
	const context = useContext(FocusShortcutContext);
	invariant(context, `${part} must be rendered inside FocusShortcut.Root.`);
	return context;
}

/** Whether a key press goes into a control that takes text, where `/` must type a slash. */
function isTextControl(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || target.matches("input, textarea, select"))
	);
}

/** Whether the `/` hint shows for a field: it is empty, enabled, and not focused. */
function canShowHint(field: HTMLElement): boolean {
	if (field.matches(":focus, :disabled")) {
		return false;
	}
	return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
		? field.value === ""
		: true;
}

/**
 * Whether `/` goes to the field: no other text control takes the key, no
 * modifier or IME composition changes it, and no earlier field took it.
 */
function isFocusShortcut(event: KeyboardEvent, field: HTMLElement): boolean {
	return (
		event.key === "/" &&
		!event.defaultPrevented &&
		!event.repeat &&
		!event.isComposing &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.altKey &&
		// The composed path starts at a text field inside a shadow root, where `target` is the host.
		!isTextControl(event.composedPath()[0] ?? null) &&
		// A modal hides the page behind it with `inert` or `aria-hidden`, and a field there must not take focus.
		field.closest("[inert], [aria-hidden='true']") == null
	);
}

/**
 * The props for `FocusShortcut.Root`.
 */
type FocusShortcutRootProps = {
	/** One `FocusShortcut.Field` and, where the design shows it, one `FocusShortcut.Hint`. */
	children?: ReactNode;
};

/**
 * Connects one `FocusShortcut.Field` to its `FocusShortcut.Hint`. It renders
 * no element of its own, so it can wrap a field and a hint anywhere in the
 * markup.
 *
 * @see https://mantle.ngrok.com/components/forms/focus-shortcut#focusshortcutroot
 *
 * @example
 * ```tsx
 * <FocusShortcut.Root>
 *   <Input>
 *     <MagnifyingGlassIcon />
 *     <FocusShortcut.Field>
 *       <InputCapture aria-label="Filter endpoints" placeholder="Filter endpoints" />
 *     </FocusShortcut.Field>
 *     <FocusShortcut.Hint />
 *   </Input>
 * </FocusShortcut.Root>
 * ```
 */
function Root({ children }: FocusShortcutRootProps) {
	// Why hidden first: the server cannot read the field's value, and a hint over a filled field is wrong.
	const [isHintShown, setIsHintShown] = useState(false);
	// Why useMemo: each `Hint` and `Field` reads the context, and a new object would render both on each `Root` render.
	const context = useMemo(() => ({ isHintShown, setIsHintShown }), [isHintShown]);
	return <FocusShortcutContext value={context}>{children}</FocusShortcutContext>;
}

/**
 * The props for `FocusShortcut.Field`.
 */
type FocusShortcutFieldProps = WithDataSlot & {
	/**
	 * The one focusable field that `/` focuses, such as `Input`, `InputCapture`,
	 * `TextArea`, `Combobox.Input`, or `Query.Input`. Its `ref` must reach the
	 * element that takes focus.
	 */
	children: ReactElement;
};

/**
 * Makes `/` move focus into its child field from anywhere on the page. It
 * renders no element of its own: it merges `aria-keyshortcuts="/"` onto the
 * child and keeps the child's own shortcuts in the list.
 *
 * `/` still types a slash in any text control. It does nothing with Meta,
 * Ctrl, or Alt held, while an IME composes, or on a key repeat. A field that
 * is disabled, not displayed, or behind a modal does not take the key, and
 * leaves it to a later field. When two fields on a page have the shortcut,
 * `/` goes to the field that mounted first and can take focus.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                    | Description                                     |
 * | -------------- | ------------------------ | ----------------------------------------------- |
 * | `data-slot`    | `"focus-shortcut-field"` | Joined onto the child's own `data-slot` chain.  |
 *
 * @see https://mantle.ngrok.com/components/forms/focus-shortcut#focusshortcutfield
 *
 * @example
 * ```tsx
 * <FocusShortcut.Root>
 *   <Input>
 *     <MagnifyingGlassIcon />
 *     <FocusShortcut.Field>
 *       <InputCapture aria-label="Filter endpoints" placeholder="Filter endpoints" />
 *     </FocusShortcut.Field>
 *     <FocusShortcut.Hint />
 *   </Input>
 * </FocusShortcut.Root>
 * ```
 */
// Why no asChild: the part renders no element of its own, and it always merges onto its child.
function Field({ children, "data-slot": dataSlot }: FocusShortcutFieldProps) {
	const { setIsHintShown } = useFocusShortcutContext("FocusShortcut.Field");
	const fieldRef = useRef<HTMLElement | null>(null);

	// Why a ref callback: the listeners live as long as the element, with no effect.
	const ref = useCallback(
		(field: HTMLElement | null) => {
			fieldRef.current = field;
			if (field == null) {
				return;
			}
			const syncHint = () => setIsHintShown(canShowHint(field));
			const handleWindowKeyDown = (event: KeyboardEvent) => {
				if (!isFocusShortcut(event, field)) {
					return;
				}
				// A field that is disabled or not displayed does not take focus, and leaves the key to a later field.
				field.focus();
				if (!field.matches(":focus")) {
					return;
				}
				// The prevented default also tells a later field that this one took the key.
				event.preventDefault();
			};
			field.addEventListener("focus", syncHint);
			field.addEventListener("blur", syncHint);
			field.addEventListener("input", syncHint);
			window.addEventListener("keydown", handleWindowKeyDown);
			return () => {
				fieldRef.current = null;
				field.removeEventListener("focus", syncHint);
				field.removeEventListener("blur", syncHint);
				field.removeEventListener("input", syncHint);
				window.removeEventListener("keydown", handleWindowKeyDown);
			};
		},
		[setIsHintShown],
	);

	// Why on each render, before paint: a new `value` or `disabled` from the app fires no DOM event.
	useIsomorphicLayoutEffect(() => {
		if (fieldRef.current != null) {
			setIsHintShown(canShowHint(fieldRef.current));
		}
	});

	return (
		<Slot
			aria-keyshortcuts="/"
			data-slot={joinDataSlot(dataSlot, "focus-shortcut-field")}
			ref={ref}
		>
			{children}
		</Slot>
	);
}

/**
 * The props for `FocusShortcut.Hint`.
 */
type FocusShortcutHintProps = Omit<ComponentProps<"kbd">, "children" | "hidden" | "translate"> &
	SelfClosingWithAsChild &
	WithDataSlot;

/**
 * The `/` key that shows where the design places it, such as at the right
 * edge of an `Input`. It shows only while the field is empty, enabled, and not
 * focused, on a device that can hover. A device that cannot hover, such as a
 * phone, usually has no key to press.
 *
 * The hint is `aria-hidden`, because the field's `aria-keyshortcuts` names the
 * key to assistive tech. It stays mounted and toggles the native `hidden`
 * attribute, so the layout around it does not remount. On the server it
 * renders `hidden`, because the server cannot read the field's value.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value                         | Description                                        |
 * | -------------- | ----------------------------- | -------------------------------------------------- |
 * | `data-slot`    | `"focus-shortcut-hint kbd"`   | On the `<kbd>`. `Kbd` adds `kbd` to the chain.     |
 *
 * @see https://mantle.ngrok.com/components/forms/focus-shortcut#focusshortcuthint
 *
 * @example
 * ```tsx
 * <FocusShortcut.Root>
 *   <Input>
 *     <MagnifyingGlassIcon />
 *     <FocusShortcut.Field>
 *       <InputCapture aria-label="Filter endpoints" placeholder="Filter endpoints" />
 *     </FocusShortcut.Field>
 *     <FocusShortcut.Hint />
 *   </Input>
 * </FocusShortcut.Root>
 * ```
 */
function Hint({
	asChild,
	children,
	className,
	"data-slot": dataSlot,
	...props
}: FocusShortcutHintProps) {
	const { isHintShown } = useFocusShortcutContext("FocusShortcut.Hint");
	const hintProps = {
		"aria-hidden": true,
		className: cx("hover-none:hidden", className),
		...props,
		hidden: !isHintShown,
	};

	if (asChild) {
		return (
			<Slot data-slot={joinDataSlot(dataSlot, "focus-shortcut-hint")} {...hintProps} translate="no">
				{children}
			</Slot>
		);
	}

	return (
		<Kbd data-slot={joinDataSlot(dataSlot, "focus-shortcut-hint")} {...hintProps}>
			/
		</Kbd>
	);
}

export {
	//,
	Root,
	Field,
	Hint,
};
export type {
	//,
	FocusShortcutRootProps,
	FocusShortcutFieldProps,
	FocusShortcutHintProps,
};
