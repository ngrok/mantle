"use client";

import type { ComponentProps, HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import {
	Children,
	cloneElement,
	createContext,
	isValidElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
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
		(target.isContentEditable ||
			target.matches(
				"textarea, select, input:not([type=checkbox], [type=radio], [type=button], [type=submit], [type=reset], [type=image], [type=range], [type=color], [type=file])",
			))
	);
}

/** Whether a field is disabled, natively or with `aria-disabled`, which keeps it focusable. */
function isDisabled(field: HTMLElement): boolean {
	return field.matches(":disabled, [aria-disabled='true']");
}

/** Whether an ancestor hides the field from the user, across shadow roots. A modal does this to the page behind it. */
function isHidden(field: HTMLElement): boolean {
	for (let node: Element | null = field; node != null;) {
		if (node.closest("[inert], [aria-hidden='true']") != null) {
			return true;
		}
		const root = node.getRootNode();
		node = root instanceof ShadowRoot ? root.host : null;
	}
	return false;
}

/** Whether the `/` hint shows for a field: it is empty, enabled, and not focused. */
function canShowHint(field: HTMLElement): boolean {
	if (field.matches(":focus") || isDisabled(field)) {
		return false;
	}
	return field instanceof HTMLInputElement ||
		field instanceof HTMLTextAreaElement ||
		field instanceof HTMLSelectElement
		? field.value === ""
		: true;
}

/** Joins space-separated `aria-keyshortcuts` lists, without duplicates. */
function joinKeyShortcuts(...lists: Array<string | undefined>): string {
	return [...new Set(lists.flatMap((list) => list?.split(/\s+/) ?? []).filter(Boolean))].join(" ");
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
		!isDisabled(field) &&
		!isHidden(field)
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
type FocusShortcutFieldProps = Omit<HTMLAttributes<HTMLElement>, "children"> &
	WithDataSlot & {
		/**
		 * The one focusable field that `/` focuses, such as `Input`, `InputCapture`,
		 * `TextArea`, `Combobox.Input`, or `Query.Input`. Its `ref` must reach the
		 * element that takes focus.
		 */
		children: ReactElement<{ "aria-keyshortcuts"?: string }>;
		/** Composed with the child's own `ref`, as `Field.Control` passes one. */
		ref?: Ref<HTMLElement>;
	};

/**
 * Makes `/` move focus into its child field from anywhere on the page. It
 * renders no element of its own: it merges `aria-keyshortcuts="/"` onto the
 * child and keeps the child's own shortcuts in the list. Its other props, such
 * as the ones `Field.Control` passes, merge onto the child as `Slot` merges them.
 *
 * `/` still types a slash in any text control. It does nothing with Meta,
 * Ctrl, or Alt held, while an IME composes, or on a key repeat. A field that
 * is disabled (natively or with `aria-disabled`), not displayed, or behind a
 * modal does not take the key, and leaves it to a later field. When two fields on a page have the shortcut,
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
function Field({
	"aria-keyshortcuts": ownKeyShortcuts,
	children,
	"data-slot": dataSlot,
	ref,
	...props
}: FocusShortcutFieldProps) {
	const { setIsHintShown } = useFocusShortcutContext("FocusShortcut.Field");
	const fieldRef = useRef<HTMLElement | null>(null);

	// Why an effect and not the ref callback: a child that passes a new ref on each render
	// re-attaches the ref, and a re-added listener would move behind later fields.
	useEffect(() => {
		const handleWindowKeyDown = (event: KeyboardEvent) => {
			const field = fieldRef.current;
			if (field == null || !isFocusShortcut(event, field)) {
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
		window.addEventListener("keydown", handleWindowKeyDown);
		return () => window.removeEventListener("keydown", handleWindowKeyDown);
	}, []);

	const fieldCallbackRef = useCallback(
		(field: HTMLElement | null) => {
			fieldRef.current = field;
			if (field == null) {
				return;
			}
			const syncHint = () => setIsHintShown(field.isConnected && canShowHint(field));
			// Why after a task: the `reset` event fires before the form restores the values.
			const syncAfterReset = () => setTimeout(syncHint);
			// Why observe attributes: React writes a controlled `value` and `disabled` to the
			// attributes, so the hint follows state that only the child owns.
			const observer = new MutationObserver(syncHint);
			observer.observe(field, {
				attributeFilter: ["value", "disabled"],
				characterData: true,
				childList: true,
				subtree: true,
			});
			const form =
				field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
					? field.form
					: null;
			field.addEventListener("focus", syncHint);
			field.addEventListener("blur", syncHint);
			field.addEventListener("input", syncHint);
			form?.addEventListener("reset", syncAfterReset);
			syncHint();
			return () => {
				fieldRef.current = null;
				observer.disconnect();
				field.removeEventListener("focus", syncHint);
				field.removeEventListener("blur", syncHint);
				field.removeEventListener("input", syncHint);
				form?.removeEventListener("reset", syncAfterReset);
				setIsHintShown(false);
			};
		},
		[setIsHintShown],
	);
	const composedRef = useComposedRefs(ref, fieldCallbackRef);

	// Why on each render, before paint: a new `value` or `disabled` from the app fires no DOM event.
	useIsomorphicLayoutEffect(() => {
		if (fieldRef.current != null) {
			setIsHintShown(canShowHint(fieldRef.current));
		}
	});

	const child = Children.only(children);
	return (
		<Slot {...props} data-slot={joinDataSlot(dataSlot, "focus-shortcut-field")} ref={composedRef}>
			{/* Why clone: `Slot` lets the child's own `aria-keyshortcuts` replace the part's. */}
			{cloneElement(child, {
				"aria-keyshortcuts": joinKeyShortcuts(
					child.props["aria-keyshortcuts"],
					ownKeyShortcuts,
					"/",
				),
			})}
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
		// Why clone: `Slot` lets the child's props win, and the part owns `hidden`, `aria-hidden`, and `translate`.
		return (
			<Slot data-slot={joinDataSlot(dataSlot, "focus-shortcut-hint")} {...hintProps}>
				{isValidElement<HTMLAttributes<HTMLElement>>(children)
					? cloneElement(children, {
							"aria-hidden": true,
							hidden: hintProps.hidden,
							translate: "no",
						})
					: children}
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
