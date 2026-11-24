"use client";

import { createContext, useContext, useEffect, useId, useMemo, useRef } from "react";
import type { ComponentProps, ReactNode, Ref } from "react";
import invariant from "tiny-invariant";
import { useControllableState } from "../../behaviors/use-controllable-state.js";
import { useCallbackRef } from "../../hooks/use-callback-ref.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { CONTENT_CONTROL_SELECTOR, isInteractiveTarget } from "../../utils/interactive-target.js";
import { RadioItemContext } from "../radio-group/radio-item-context.js";
import { Slot } from "../slot/index.js";
import { Checkbox } from "./checkbox.js";

/** The value of a group with nothing checked. One array, so an unset `defaultValue` keeps its identity. */
const NOTHING_CHECKED: string[] = [];

/** The native checkbox of each card in a group, for the form reset. */
const CARD_CHECKBOX_SELECTOR = '[data-slot~="checkbox-group-card"] > input[type="checkbox"]';

type CheckboxGroupContextValue = {
	value: readonly string[];
	/** Checks or unchecks one value. */
	setChecked: (options: { value: string; checked: boolean }) => void;
	disabled: boolean;
	name: string | undefined;
	form: string | undefined;
};

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

type CheckboxGroupRootProps = Omit<ComponentProps<"div">, "defaultValue" | "ref"> & {
	/** The checked values. Pair it with `onValueChange`. */
	value?: string[];
	/**
	 * The checked values on first render, for an uncontrolled group. A form reset returns to them.
	 * @default []
	 */
	defaultValue?: string[];
	/** The event handler called with the checked values after the user checks or unchecks a card. */
	onValueChange?: (value: string[]) => void;
	/**
	 * Whether every card is disabled.
	 * @default false
	 */
	disabled?: boolean;
	/** The form field name. With a name, a form submits one entry for each checked value. */
	name?: string;
	/** The `id` of the form the checkboxes belong to, when the group sits outside it. Needs a `name`. */
	form?: string;
	ref?: Ref<HTMLDivElement>;
} & WithDataSlot;

/**
 * A group of checkbox cards. It holds the checked values, and the user can
 * check any number of cards. Each card holds a native
 * `<input type="checkbox">`, so the browser owns each Tab stop, Space, and
 * the form contract: with a `name`, a form submits one entry for each checked
 * value, and a reset returns to `defaultValue`.
 *
 * The recommended Field composition is `Field.Set` + `Field.Legend` +
 * `CheckboxGroup.Root`: the legend names the set. Inside any card, a
 * `Choice.Title` names the option through `aria-labelledby`, and a
 * `Choice.Description` describes it through `aria-describedby`.
 *
 * Why no `asChild`: the root is the `role="group"` element around the
 * checkboxes, and its form reset reads the cards inside it.
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox#checkboxgrouproot
 *
 * @example
 * ```tsx
 * <CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]} name="interests">
 *   <CheckboxGroup.Card value="tunnels">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">Tunnels</p>
 *       <p className="text-muted">Put a local service online.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 *   <CheckboxGroup.Card value="gateway">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">API gateway</p>
 *       <p className="text-muted">Secure and route API traffic.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 * </CheckboxGroup.Root>
 * ```
 */
const Root = ({
	"data-slot": dataSlot,
	children,
	defaultValue = NOTHING_CHECKED,
	disabled = false,
	form,
	name,
	onValueChange,
	ref,
	value,
	...props
}: CheckboxGroupRootProps) => {
	const [current, setValue] = useControllableState<readonly string[]>({
		value,
		defaultValue,
		onChange: (next) => onValueChange?.([...next]),
	});
	const groupRef = useRef<HTMLDivElement>(null);
	// Why: a click before hydration, or a choice the browser restores, checks or unchecks a
	// checkbox that React does not know about. React keeps it, so the value follows it. Why the
	// root and not each card: the cards of one commit would each set the value from the same render.
	const adoptCheckedBeforeHydration = useCallbackRef((group: HTMLDivElement | null) => {
		const inputs = Array.from(
			group?.querySelectorAll<HTMLInputElement>(CARD_CHECKBOX_SELECTOR) ?? [],
		);
		const unchecked = new Set(inputs.filter((input) => !input.checked).map((input) => input.value));
		const kept = current.filter((checkedValue) => !unchecked.has(checkedValue));
		const added = inputs
			.filter((input) => input.checked && !kept.includes(input.value))
			.map((input) => input.value);
		if (kept.length !== current.length || added.length > 0) {
			setValue([...kept, ...added]);
		}
	});
	// Why: a script that clicks several cards in one event, such as a "select all" button, gets one
	// React batch, so each card builds on the value the card before it set, not on the rendered one.
	const pendingValue = useRef<readonly string[] | null>(null);
	const composedRef = useComposedRefs(ref, groupRef, adoptCheckedBeforeHydration);
	const cardCheckboxes = () =>
		groupRef.current?.querySelectorAll<HTMLInputElement>(CARD_CHECKBOX_SELECTOR) ?? [];
	const keepCheckedOnReset = useCallbackRef(() => {
		for (const input of cardCheckboxes()) {
			input.defaultChecked = input.checked;
		}
	});
	const finishReset = useCallbackRef(() => {
		setValue(defaultValue);
		// Why: a parent `onReset` can set a new `value` before the browser resets the
		// checkboxes, so the checkboxes take the value React shows after the reset.
		const shown = value ?? defaultValue;
		for (const input of cardCheckboxes()) {
			input.checked = shown.includes(input.value);
		}
	});

	// Why an effect: the form owner can sit outside the group, so no element of the group can own the listener in a ref callback.
	useEffect(() => {
		const group = groupRef.current;
		const formOwner =
			form == null ? group?.closest("form") : group?.ownerDocument.getElementById(form);
		let timer: number | undefined;
		const handleReset = (event: Event) => {
			// Why: the browser resets each checkbox to its `checked` attribute, which React sets
			// only on mount. The checkboxes keep the value React shows until React sets the new one.
			keepCheckedOnReset();
			// Why a task: a reset handler later in the dispatch can cancel the reset, and
			// a reset button resets the checkboxes after the microtasks of its click.
			timer = window.setTimeout(() => {
				if (!event.defaultPrevented) {
					finishReset();
				}
			});
		};
		formOwner?.addEventListener("reset", handleReset);
		return () => {
			formOwner?.removeEventListener("reset", handleReset);
			window.clearTimeout(timer);
		};
	}, [finishReset, form, keepCheckedOnReset]);

	const context = useMemo<CheckboxGroupContextValue>(
		() => ({
			value: current,
			setChecked: ({ value: changed, checked }) => {
				const base = pendingValue.current ?? current;
				if (base.includes(changed) === checked) {
					return;
				}
				const next = checked
					? [...base, changed]
					: base.filter((checkedValue) => checkedValue !== changed);
				pendingValue.current = next;
				// Why a microtask: it runs after the whole event, so a value that a controlled parent
				// refuses does not carry into the next event.
				queueMicrotask(() => {
					pendingValue.current = null;
				});
				setValue(next);
			},
			disabled,
			name: name || undefined,
			// Why only with a name: a checkbox with no name submits nothing, so it needs no form owner.
			form: name ? form : undefined,
		}),
		[current, setValue, disabled, name, form],
	);

	return (
		<CheckboxGroupContext.Provider value={context}>
			<div
				role="group"
				data-slot={joinDataSlot(dataSlot, "checkbox-group")}
				{...props}
				ref={composedRef}
			>
				{children}
			</div>
		</CheckboxGroupContext.Provider>
	);
};

type CheckboxGroupCardProps = Omit<ComponentProps<"div">, "children"> & {
	children?: ReactNode;
	/**
	 * Whether this card is disabled.
	 * @default false
	 */
	disabled?: boolean;
	/** The value the group adds when the user checks this card. Required: a form submits it. */
	value: string;
	/** Focus this card's checkbox on mount. */
	autoFocus?: boolean;
} & WithDataSlot;

/**
 * A checkbox card. Use it inside `CheckboxGroup.Root`, alone or in a layout
 * element such as a grid. It looks like `RadioGroup.Card`: a bordered card
 * that takes an accent border and tint when checked.
 *
 * It renders a `<div>` with a native `<input type="checkbox">` that covers
 * it, over its content. Assistive technology outlines the whole card, and a
 * click anywhere on it toggles the checkbox. Links, buttons, labels, and form
 * controls in the card sit over the checkbox and keep their own clicks. When
 * the card holds none, assistive technology skips its text, which already
 * names the checkbox, so it stops once on each card. Style its state with
 * `has-[>input:checked]:`, `has-[>input:disabled]:`, and
 * `has-[>input:focus-visible]:`; from a child, use `group-has-[>input:checked]/checkbox:`.
 *
 * `id`, `autoFocus`, `aria-label`, `aria-labelledby`, and `aria-describedby`
 * go to the checkbox; the rest go to the card's `<div>`. A `Choice.Title`
 * inside the card names it through `aria-labelledby`, and a
 * `Choice.Description` describes it through `aria-describedby`.
 *
 * | Data Attribute | Value                           | Description                                                     |
 * | -------------- | ------------------------------- | --------------------------------------------------------------- |
 * | `data-slot`    | `"checkbox-group-card"`         | The card.                                                       |
 * | `data-slot`    | `"checkbox-group-card-label"`   | The `display: contents` wrapper of the card's children.         |
 *
 * Why no `asChild`: the card must render the native checkbox as its first child.
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox#checkboxgroupcard
 *
 * @example
 * ```tsx
 * <CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]} name="interests">
 *   <CheckboxGroup.Card value="tunnels">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">Tunnels</p>
 *       <p className="text-muted">Put a local service online.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 *   <CheckboxGroup.Card value="gateway">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">API gateway</p>
 *       <p className="text-muted">Secure and route API traffic.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 * </CheckboxGroup.Root>
 * ```
 */
const Card = ({
	"aria-describedby": ariaDescribedBy,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	autoFocus,
	children,
	className,
	"data-slot": dataSlot,
	disabled: disabledProp = false,
	id,
	onClick,
	value,
	...props
}: CheckboxGroupCardProps) => {
	const group = useContext(CheckboxGroupContext);
	invariant(group, "CheckboxGroup.Card must be rendered inside CheckboxGroup.Root.");
	const generatedId = useId();
	const checkboxId = id ?? generatedId;
	const titleId = `${generatedId}-title`;
	const descriptionId = `${generatedId}-description`;
	const contentId = `${generatedId}-content`;
	const checkboxRef = useRef<HTMLInputElement | null>(null);
	const forwardingClick = useRef(false);
	const checked = group.value.includes(value);
	const disabled = group.disabled || disabledProp;
	const itemContext = useMemo(
		() => ({ titleId, descriptionId, radioId: checkboxId, contentId, checked, disabled }),
		[titleId, descriptionId, checkboxId, contentId, checked, disabled],
	);

	return (
		<RadioItemContext.Provider value={itemContext}>
			{/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Why: the native checkbox in the card takes the keyboard; the click only widens its pointer target to the card. */}
			<div
				data-slot={joinDataSlot(dataSlot, "checkbox-group-card")}
				className={cx(
					// Why isolate: the checkbox and the controls over it stack inside the card, not over the page.
					"group/checkbox border-card bg-card [&_label]:cursor-inherit relative isolate block rounded-md border p-4 text-sm",
					"cursor-pointer has-[>input:disabled]:cursor-default",
					"has-[>input:focus-visible]:focus-ring",
					"has-[>input:disabled]:border-form/50 not-has-[>input:disabled]:hover:bg-card-hover",
					"has-[>input:checked]:border-accent-500/50 has-[>input:checked]:bg-selected-menu-item not-has-[>input:disabled]:hover:has-[>input:checked]:bg-active-selected-menu-item",
					className,
				)}
				{...props}
				onClick={(event) => {
					// Why: the click the card sends to its checkbox bubbles back here, and a caller handles one click once.
					if (forwardingClick.current) {
						return;
					}
					onClick?.(event);
					const checkbox = checkboxRef.current;
					if (checkbox == null) {
						return;
					}
					if (event.target === checkbox) {
						// Why: Safari does not focus a checkbox on a pointer click. A click that a part sends with
						// `click()` has no `detail`, and it keeps focus where the part put it.
						if (event.detail > 0 && !event.defaultPrevented) {
							checkbox.focus({ preventScroll: true });
						}
						return;
					}
					// Why a click on the card's text gets here: a test, such as Testing Library's `user.click()`,
					// sends it to the text, not to the checkbox over the text.
					if (event.defaultPrevented || isInteractiveTarget(event.target, event.currentTarget)) {
						return;
					}
					checkbox.focus({ preventScroll: true });
					forwardingClick.current = true;
					checkbox.click();
					forwardingClick.current = false;
				}}
			>
				<Checkbox
					// Why an IDREF to a part that may not render: an IDREF list with no element in the DOM is ignored.
					aria-describedby={ariaDescribedBy ? `${ariaDescribedBy} ${descriptionId}` : descriptionId}
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy ?? (ariaLabel == null ? contentId : undefined)}
					// oxlint-disable-next-line jsx-a11y/no-autofocus -- Why: the card passes the consumer's own `autoFocus` to its checkbox.
					autoFocus={autoFocus}
					checked={checked}
					// Why it covers the card over the content: assistive technology outlines the whole card, and a
					// click on the card lands on the checkbox itself. `mantle.css` lifts the content's controls over it.
					// Why `opacity-0!`: `Checkbox` dims a disabled box with `disabled:opacity-50`, which would show it.
					// Why no pointer events when disabled: a link in a disabled card's dimmed content keeps its click.
					className="absolute inset-0 z-1 m-0 size-full cursor-inherit opacity-0! disabled:pointer-events-none"
					// Why `defaultValue`: on a checkbox it sets the `value` attribute a form submits, and
					// `Checkbox` already passes one, so a `value` prop beside it makes React warn.
					defaultValue={value}
					disabled={disabled}
					form={group.form}
					id={checkboxId}
					name={group.name}
					onCheckedChange={(next) => group.setChecked({ value, checked: next })}
					ref={(input) => {
						checkboxRef.current = input;
						if (input == null) {
							return;
						}
						// Why: a label in the card is its title line, so it alone names the checkbox. The DOM
						// write needs no render, and React writes the attribute only when its prop changes.
						if (
							input.getAttribute("aria-labelledby") === contentId &&
							Array.from(input.parentElement?.getElementsByTagName("label") ?? []).some(
								(label) => label.htmlFor === checkboxId,
							)
						) {
							input.removeAttribute("aria-labelledby");
						}
						// Why: hidden content still names the checkbox, but a control in it must stay reachable.
						// The card's own title label is not a control: it only names the checkbox.
						const content = input.nextElementSibling;
						const hasControl = Array.from(
							content?.querySelectorAll(CONTENT_CONTROL_SELECTOR) ?? [],
						).some(
							(control) => !(control instanceof HTMLLabelElement && control.htmlFor === checkboxId),
						);
						if (!hasControl) {
							content?.setAttribute("aria-hidden", "true");
						} else {
							content?.removeAttribute("aria-hidden");
						}
					}}
				/>
				{/* Why a wrapper: a lone text child beside the checkbox would lose React's repair after a browser translation. */}
				{/* Why the checkbox's ref sets aria-hidden here: the checkbox reads this text as its name, so a screen
				reader in browse mode does not stop on it again. Before hydration, a control in the text stays reachable. */}
				<div
					id={contentId}
					data-slot="checkbox-group-card-label"
					className="covered-item-content contents"
				>
					{children}
				</div>
			</div>
		</RadioItemContext.Provider>
	);
};

/** The state of the card that a render-props `CheckboxGroup.Indicator` receives. */
type CheckboxGroupIndicatorState = {
	checked: boolean;
	disabled: boolean;
};

type CheckboxGroupIndicatorProps = Omit<ComponentProps<"span">, "children"> & {
	/** A custom mark, or a function of the card's state that returns one. Without it, the indicator draws a check box. */
	children?: ReactNode | ((state: CheckboxGroupIndicatorState) => ReactNode);
} & WithDataSlot;

/**
 * The check box `CheckboxGroup.Indicator` draws when a consumer passes no
 * children. It reads the card's native checkbox through the `group/checkbox`
 * card, so it is right before hydration. Why one element and not a component:
 * it has no props or state, so every indicator shares it and React skips its
 * subtree.
 * @private
 */
const defaultCheckboxIndicator = (
	<span
		// Why `clsx`: `cx` merges `bg-checked-icon` with `bg-accent-600` as one background utility and drops the fill.
		className={clsx(
			"block size-4 shrink-0 rounded border bg-center bg-no-repeat",
			"bg-form border-form",
			"group-has-[>input:checked]/checkbox:border-accent-600 group-has-[>input:checked]/checkbox:bg-accent-600 group-has-[>input:checked]/checkbox:bg-checked-icon",
			"group-hover/checkbox:group-has-[>input:enabled:not(:checked)]/checkbox:border-neutral-400",
			"group-has-[>input:disabled]/checkbox:opacity-50",
		)}
	/>
);

/**
 * The selection mark of a `CheckboxGroup.Card`. By default, it is a check
 * box that fills when the card is checked. To change the mark, pass:
 * - a different element, styled from the card's state with
 *   `group-has-[>input:checked]/checkbox:`, such as a checkmark that shows
 *   only when checked
 * - a render-props function that receives `{ checked, disabled }` and returns an element
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox#checkboxgroupindicator
 *
 * @example
 * ```tsx
 * <CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]} name="interests">
 *   <CheckboxGroup.Card value="tunnels">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">Tunnels</p>
 *       <p className="text-muted">Put a local service online.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 *   <CheckboxGroup.Card value="gateway">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">API gateway</p>
 *       <p className="text-muted">Secure and route API traffic.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 * </CheckboxGroup.Root>
 * ```
 */
const Indicator = ({
	"data-slot": dataSlot,
	children,
	className,
	...props
}: CheckboxGroupIndicatorProps) => {
	const item = useContext(RadioItemContext);
	const indicator =
		typeof children === "function"
			? children({ checked: item?.checked ?? false, disabled: item?.disabled ?? false })
			: children;

	return (
		<span
			data-slot={joinDataSlot(dataSlot, "checkbox-group-indicator")}
			className={cx(
				"inline-flex size-5 select-none items-center justify-center shrink-0",
				className,
			)}
			{...props}
		>
			{children == null ? defaultCheckboxIndicator : indicator}
		</span>
	);
};

type CheckboxGroupItemContentProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

/**
 * The content of a checkbox card: its title, description, and any other
 * content. It fills the space beside the indicator and dims with a disabled
 * card.
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox#checkboxgroupitemcontent
 *
 * @example
 * ```tsx
 * <CheckboxGroup.Root aria-label="Interests" defaultValue={["tunnels"]} name="interests">
 *   <CheckboxGroup.Card value="tunnels">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">Tunnels</p>
 *       <p className="text-muted">Put a local service online.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 *   <CheckboxGroup.Card value="gateway">
 *     <CheckboxGroup.ItemContent>
 *       <p className="text-strong font-medium">API gateway</p>
 *       <p className="text-muted">Secure and route API traffic.</p>
 *     </CheckboxGroup.ItemContent>
 *     <CheckboxGroup.Indicator />
 *   </CheckboxGroup.Card>
 * </CheckboxGroup.Root>
 * ```
 */
const ItemContent = ({
	"data-slot": dataSlot,
	asChild = false,
	className,
	...props
}: CheckboxGroupItemContentProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "checkbox-group-item-content")}
			className={cx("min-w-0 flex-1 group-has-[>input:disabled]/checkbox:opacity-50", className)}
			{...props}
		/>
	);
};

export {
	//,
	Card,
	Indicator,
	ItemContent,
	Root,
};
