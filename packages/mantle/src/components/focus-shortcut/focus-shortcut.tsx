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
	/** Whether a `FocusShortcut.Hint` is mounted, so the field tracks its state only for one. */
	hasHint: boolean;
	setHasHint: (hasHint: boolean) => void;
	setIsHintShown: (isHintShown: boolean) => void;
};

const FocusShortcutContext = createContext<FocusShortcutContextValue | null>(null);

// Why a second context: only the hint reads this value, so a change does not render the field and its child.
const FocusShortcutHintShownContext = createContext(false);

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

/**
 * The field and its ancestors in the rendered tree: through the slot a
 * light-DOM child renders in, and out of each shadow root.
 */
function* renderedAncestors(field: HTMLElement): Generator<Element> {
	for (let node: Element | null = field; node != null;) {
		yield node;
		const parent: Node | null = node.assignedSlot ?? node.parentNode;
		if (parent instanceof ShadowRoot) {
			node = parent.host;
		} else {
			node = parent instanceof Element ? parent : null;
		}
	}
}

/** Whether the field or an ancestor in the rendered tree matches the selector. */
function isWithin(field: HTMLElement, selector: string): boolean {
	for (const node of renderedAncestors(field)) {
		if (node.matches(selector)) {
			return true;
		}
	}
	return false;
}

/** Whether a field is disabled: natively, or with `aria-disabled` on it or on a group around it. */
function isDisabled(field: HTMLElement): boolean {
	return field.matches(":disabled") || isWithin(field, "[aria-disabled='true']");
}

/** Whether the `/` hint shows for a field: it is enabled, not focused, and empty. */
function canShowHint(field: HTMLElement): boolean {
	if (field.matches(":focus") || isDisabled(field)) {
		return false;
	}
	if (
		field instanceof HTMLInputElement ||
		field instanceof HTMLTextAreaElement ||
		field instanceof HTMLSelectElement
	) {
		return field.value === "";
	}
	return !field.isContentEditable || field.textContent === "";
}

/** Joins space-separated `aria-keyshortcuts` lists, without duplicates. */
function joinKeyShortcuts(...lists: Array<string | undefined>): string {
	return [...new Set(lists.flatMap((list) => list?.split(/\s+/) ?? []).filter(Boolean))].join(" ");
}

/**
 * Whether `/` goes to the field: no other text control takes the key, no
 * modifier or IME composition changes it, no earlier field took it, and the
 * field is enabled and not behind a modal.
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
		!field.matches(":disabled") &&
		// A modal makes the page behind it `inert` or `aria-hidden`.
		!isWithin(field, "[inert], [aria-hidden='true'], [aria-disabled='true']")
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
	const [hasHint, setHasHint] = useState(false);
	// Why hidden first: the server cannot read the field's value, and a hint over a filled field is wrong.
	const [isHintShown, setIsHintShown] = useState(false);
	// Why useMemo: a new object would render the field and its child on each `Root` render.
	const context = useMemo(() => ({ hasHint, setHasHint, setIsHintShown }), [hasHint]);
	return (
		<FocusShortcutContext value={context}>
			<FocusShortcutHintShownContext value={isHintShown}>{children}</FocusShortcutHintShownContext>
		</FocusShortcutContext>
	);
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
 * as the `id`, `name`, and ARIA that `Field.Control` passes, win over the
 * child's. Handlers, `className`, `style`, and `aria-describedby` compose with
 * the child's, as `Slot` composes them. Inside `Field.Control`, put
 * `FocusShortcut.Field` inside the control, around the field.
 *
 * `/` still types a slash in any text control. It does nothing with Meta,
 * Ctrl, or Alt held, while an IME composes, or on a key repeat. A field that
 * is disabled (natively, by a `fieldset`, or with `aria-disabled` on it or a
 * group around it), not displayed, or behind a modal does not take the key,
 * and leaves it to a later field. When two fields on a page have the shortcut,
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
	const { hasHint, setIsHintShown } = useFocusShortcutContext("FocusShortcut.Field");
	const fieldRef = useRef<HTMLElement | null>(null);

	// Why an effect and not the ref callback: a child that passes a new ref on each render
	// re-attaches the ref, and a re-added listener would move behind later fields.
	useEffect(() => {
		const handleWindowKeyDown = (event: KeyboardEvent) => {
			const field = fieldRef.current;
			if (field == null || !isFocusShortcut(event, field)) {
				return;
			}
			// A field that is not displayed does not take focus, and leaves the key to a later field.
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

	// Why state: the hint tracking below must restart when the child renders another element.
	const [field, setField] = useState<HTMLElement | null>(null);
	// Why stable: a new ref callback would detach and attach the child's own ref,
	// which runs a mount-time callback, such as autofocus, again.
	const fieldCallbackRef = useCallback((node: HTMLElement | null) => {
		fieldRef.current = node;
		setField(node);
	}, []);
	const composedRef = useComposedRefs(ref, fieldCallbackRef);

	// Why an effect and not the ref callback: the tracking starts and stops with the hint,
	// and must not detach the child's ref to do so.
	useIsomorphicLayoutEffect(() => {
		// Why only with a hint: without one, nothing reads the field's state.
		if (field == null || !hasHint) {
			return;
		}
		let resetTimer: ReturnType<typeof setTimeout> | undefined;
		const syncHint = () => setIsHintShown(field.isConnected && canShowHint(field));
		// Why the document and after a task: the field's form can change, and the `reset`
		// event fires before the form restores the values.
		const handleReset = (event: Event) => {
			if ("form" in field && event.target === field.form) {
				resetTimer = setTimeout(syncHint);
			}
		};
		// Why observe attributes: React writes a controlled `value` and `disabled` to the
		// attributes, so the hint follows state that only the child owns.
		const observer = new MutationObserver(syncHint);
		observer.observe(field, {
			attributeFilter: ["value", "disabled", "aria-disabled"],
			characterData: true,
			childList: true,
			subtree: true,
		});
		// A disabled `fieldset` or an `aria-disabled` group disables the field too.
		for (const node of renderedAncestors(field)) {
			if (node !== field) {
				observer.observe(node, { attributeFilter: ["disabled", "aria-disabled"] });
			}
		}
		const events = ["focus", "blur", "input", "change"];
		for (const type of events) {
			field.addEventListener(type, syncHint);
		}
		field.ownerDocument.addEventListener("reset", handleReset);
		syncHint();
		return () => {
			clearTimeout(resetTimer);
			observer.disconnect();
			for (const type of events) {
				field.removeEventListener(type, syncHint);
			}
			field.ownerDocument.removeEventListener("reset", handleReset);
			setIsHintShown(false);
		};
	}, [field, hasHint, setIsHintShown]);

	// Why on each render, before paint: a new `value` or `disabled` from the app fires no DOM event.
	useIsomorphicLayoutEffect(() => {
		if (hasHint && fieldRef.current != null) {
			setIsHintShown(canShowHint(fieldRef.current));
		}
	});

	const child = Children.only(children);
	// Why the part's plain props win: `Field.Control` sets `id`, `name`, and ARIA on this
	// part, and `Field.Item` owns them, so the child must not replace them. `Slot` still
	// composes handlers, `className`, `style`, and `aria-describedby`.
	const ownProps = Object.fromEntries(
		Object.entries(props).filter(
			([key, value]) =>
				value !== undefined && !/^on[A-Z]|^(?:className|style|aria-describedby)$/.test(key),
		),
	);
	return (
		<Slot {...props} data-slot={joinDataSlot(dataSlot, "focus-shortcut-field")} ref={composedRef}>
			{cloneElement(child, {
				...ownProps,
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
	const { setHasHint } = useFocusShortcutContext("FocusShortcut.Hint");
	const isHintShown = useContext(FocusShortcutHintShownContext);
	useIsomorphicLayoutEffect(() => {
		setHasHint(true);
		return () => setHasHint(false);
	}, [setHasHint]);
	// Why the part's props last: the field's `aria-keyshortcuts` names the key, so the hint stays decorative.
	const hintProps = {
		...props,
		"aria-hidden": true,
		className: cx("hover-none:hidden", className),
		hidden: !isHintShown,
	} as const;

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
