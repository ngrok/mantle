"use client";

import { Children, cloneElement, isValidElement, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { isInteractiveTarget } from "../../utils/interactive-target.js";
import { Slot } from "../slot/index.js";
import * as RadioPrimitive from "./primitive.js";
import { RadioItemContext } from "./radio-item-context.js";

type RadioGroupProps = RadioPrimitive.RootProps;

/**
 * A group of radio items. It manages the state of the children radios. Unstyled and simple.
 * Used as the root component for grouping related radio items where only one can be selected.
 * Each item holds a native `<input type="radio">`, so the browser owns the one Tab
 * stop, Space, and the form contract: `name`, `required`, `form`, and reset. The root moves the
 * arrow keys, so they wrap at either end in every browser.
 *
 * The recommended Field composition is `Field.Set` + `Field.Legend` + `RadioGroup.Root`,
 * which uses fieldset semantics so all radios share a single accessible name from the
 * legend. As an alternative, when individual items render inside a `Field.Control`,
 * each item picks up `aria-invalid`, `aria-errormessage`, and `aria-describedby` from
 * `FieldControlContext`. Inside any item, a `Choice.Title` names the option through
 * `aria-labelledby` and a `Choice.Description` describes it through `aria-describedby`.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogrouproot
 *
 * @example
 * ```tsx
 * <RadioGroup.Root value={value} onValueChange={setValue}>
 *   <RadioGroup.Item value="option1">
 *     <RadioGroup.Indicator />
 *     <span>Option 1</span>
 *   </RadioGroup.Item>
 *   <RadioGroup.Item value="option2">
 *     <RadioGroup.Indicator />
 *     <span>Option 2</span>
 *   </RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const Root = ({ "data-slot": dataSlot, ref, ...props }: RadioGroupProps) => (
	<RadioPrimitive.Root data-slot={joinDataSlot(dataSlot, "radio-group")} {...props} ref={ref} />
);

type RadioItemProps = RadioPrimitive.ItemProps;

/**
 * A simple radio item that can be used inside a radio group. The "conventional" use-case.
 * Must be a child of `RadioGroup`.
 *
 * It renders a `<div>` with a native radio that covers it. Style its state with
 * `has-[>input:checked]:`, `has-[>input:disabled]:`, and
 * `has-[>input:focus-visible]:`.
 *
 * When rendered inside `Field.Control` (an alternative to the recommended
 * `Field.Set` / `Field.Legend` composition), picks up `aria-invalid`,
 * `aria-errormessage`, and `aria-describedby` from `FieldControlContext`. A
 * `Choice.Title` inside the item names it through `aria-labelledby`, and a
 * `Choice.Description` describes it through `aria-describedby`. The option's
 * accessible name is then the title alone.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogroupitem
 *
 * @example
 * ```tsx
 * <RadioGroup.Root value={value} onValueChange={setValue}>
 *   <RadioGroup.Item value="option1">
 *     <RadioGroup.Indicator />
 *     <span>Option 1</span>
 *   </RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const Item = ({ className, ...props }: RadioItemProps) => (
	<RadioPrimitive.Item
		part="radio-group-item"
		className={cx(
			"group/radio cursor-pointer has-[>input:disabled]:cursor-default [&_label]:cursor-inherit flex gap-2 py-1 text-sm",
			// Why the gate: the default indicator draws the focus ring on its circle.
			// An item with a custom indicator, or none, has no other focus treatment.
			"not-has-data-radio-default-indicator:has-[>input:focus-visible]:focus-ring not-has-data-radio-default-indicator:has-[>input:focus-visible]:rounded-md",
			className,
		)}
		{...props}
	/>
);

/** The state of the radio item that a render-props `RadioGroup.Indicator` receives. */
type RadioIndicatorState = {
	checked: boolean;
	disabled: boolean;
};

type RadioIndicatorProps = Omit<ComponentProps<"span">, "children"> & {
	children?: ReactNode | ((state: RadioIndicatorState) => ReactNode);
	/**
	 * Never rendered. `Choice.Indicator` injects the field's `name` for a
	 * control, and a `<span>` has no `name` attribute.
	 */
	name?: string;
} & WithDataSlot;

/**
 * The circle `RadioGroup.Indicator` draws when a consumer passes no children.
 * It reads the item's native radio through the `group/radio` item, so it is
 * right before hydration. Why one element and not a component: it has no
 * props or state, so every indicator shares it and React skips its subtree.
 * @private
 */
const defaultRadioIndicator = (
	<span
		// Why: `RadioGroup.Item` reads this attribute to skip its own focus ring.
		data-radio-default-indicator=""
		className={cx(
			"flex size-4 items-center justify-center rounded-full border shrink-0",
			// Why an outline when unchecked: a solid gray circle reads as disabled.
			"bg-form border-form",
			// Why a transparent border when checked: forced-colors mode removes the fill and
			// paints this border in a system color, so the circle keeps its outline.
			"group-has-[>input:checked]/radio:bg-filled-accent group-has-[>input:checked]/radio:border-transparent",
			"group-hover/radio:group-has-[>input:enabled:not(:checked)]/radio:border-neutral-400",
			"group-hover/radio:group-has-[>input:enabled:checked]/radio:bg-filled-accent-hover",
			"group-has-[>input:disabled]/radio:cursor-default group-has-[>input:disabled]/radio:opacity-50",
			"group-has-[>input:focus-visible]/radio:focus-ring",
		)}
	>
		{/* Why the forced-colors classes: forced-colors mode removes the fill, so the dot keeps a system color. */}
		<span className="hidden group-has-[>input:checked]/radio:block size-2 rounded-full bg-white shrink-0 forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]" />
	</span>
);

/**
 * The selection indicator for any radio item.
 * Use it as a child of `RadioGroup.Item`, `RadioGroup.ListItem`, or `RadioGroup.Card`.
 * By default, it's a circle that changes color when checked.
 * You can customize the indicator by passing children:
 * - a different component
 * - a render-props function that receives `{ checked, disabled }` and returns a component.
 *   For hover and keyboard focus, style with `group-hover/radio:` and
 *   `group-has-[>input:focus-visible]/radio:`.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogroupindicator
 *
 * @example
 * ```tsx
 * <RadioGroup.Item value="option1">
 *   <RadioGroup.Indicator />
 *   <span>Option 1</span>
 * </RadioGroup.Item>
 * ```
 */
const Indicator = ({
	"data-slot": dataSlot,
	children,
	className,
	name: _name,
	...props
}: RadioIndicatorProps) => {
	const item = useContext(RadioItemContext);
	const indicator =
		typeof children === "function"
			? children({ checked: item?.checked ?? false, disabled: item?.disabled ?? false })
			: children;

	return (
		// Why a span: `Choice.Indicator` is a `<span>`, and a `<div>` inside it is invalid HTML.
		<span
			data-slot={joinDataSlot(dataSlot, "radio-group-indicator")}
			className={cx(
				"radio-indicator inline-flex size-5 select-none items-center justify-center shrink-0",
				className,
			)}
			{...props}
		>
			{children == null ? defaultRadioIndicator : indicator}
		</span>
	);
};

/**
 * A group of radio list items. Use RadioGroup.ListItem as direct children.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogrouplist
 *
 * @example
 * ```tsx
 * <RadioGroup.Root defaultValue="option1">
 *   <RadioGroup.List>
 *     <RadioGroup.ListItem value="option1">
 *       <RadioGroup.ItemContent>
 *         <Text>Option 1</Text>
 *       </RadioGroup.ItemContent>
 *     </RadioGroup.ListItem>
 *     <RadioGroup.ListItem value="option2">
 *       <RadioGroup.ItemContent>
 *         <Text>Option 2</Text>
 *       </RadioGroup.ItemContent>
 *     </RadioGroup.ListItem>
 *   </RadioGroup.List>
 * </RadioGroup.Root>
 * ```
 */
const List = ({ "data-slot": dataSlot, className, ref, ...props }: RadioGroupProps) => {
	return (
		<Root
			data-slot={joinDataSlot(dataSlot, "radio-group-list")}
			className={clsx(
				// Why 0.6875rem: the row radius (6px), the padding (4px), and the border (1px) add up to it.
				// The rows and their focus rings then follow the group corner.
				"border-form flex flex-col gap-px rounded-[0.6875rem] border p-1",
				className,
			)}
			{...props}
			ref={ref}
		/>
	);
};

type RadioListItemProps = RadioItemProps & WithDataSlot;

/**
 * A radio list item that is used inside a `RadioGroup.List`.
 *
 * It renders a `<div>` with a native radio that covers it. Style its state with
 * `has-[>input:checked]:`, `has-[>input:disabled]:`, and
 * `has-[>input:focus-visible]:`.
 *
 * When rendered inside `Field.Control` (an alternative to the recommended
 * `Field.Set` / `Field.Legend` composition), picks up `aria-invalid`,
 * `aria-errormessage`, and `aria-describedby` from `FieldControlContext`. A
 * `Choice.Title` inside the item names it through `aria-labelledby`, and a
 * `Choice.Description` describes it through `aria-describedby`. The option's
 * accessible name is then the title alone.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogrouplistitem
 *
 * @example
 * ```tsx
 * <RadioGroup.Root defaultValue="item1">
 *   <RadioGroup.List>
 *     <RadioGroup.ListItem value="item1">
 *       <RadioGroup.ItemContent>
 *         <Text>List Item 1</Text>
 *         <Text size="sm" className="text-muted">First option</Text>
 *       </RadioGroup.ItemContent>
 *     </RadioGroup.ListItem>
 *     <RadioGroup.ListItem value="item2">
 *       <RadioGroup.ItemContent>
 *         <Text>List Item 2</Text>
 *         <Text size="sm" className="text-muted">Second option</Text>
 *       </RadioGroup.ItemContent>
 *     </RadioGroup.ListItem>
 *   </RadioGroup.List>
 * </RadioGroup.Root>
 * ```
 */
const ListItem = ({ className, ...props }: RadioListItemProps) => (
	<RadioPrimitive.Item
		part="radio-group-list-item"
		className={cx(
			"group/radio [&_label]:cursor-inherit relative flex select-none gap-2 rounded-md px-3 py-2 text-sm",
			"cursor-pointer has-[>input:disabled]:cursor-default",
			"has-[>input:focus-visible]:focus-ring has-[>input:focus-visible]:z-1",
			"not-has-[>input:disabled]:hover:bg-active-menu-item",
			"has-[>input:checked]:bg-selected-menu-item not-has-[>input:disabled]:hover:has-[>input:checked]:bg-active-selected-menu-item",
			"has-[.radio-indicator:first-child]:pl-2 has-[.radio-indicator:last-child]:pr-2",
			className,
		)}
		{...props}
	/>
);

type RadioItemContentProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

type RadioCardProps = RadioItemProps & WithDataSlot;

/**
 * A radio card item. Use it as a child of `RadioGroup`
 *
 * It renders a `<div>` with a native radio that covers it. Style its state with
 * `has-[>input:checked]:`, `has-[>input:disabled]:`, and
 * `has-[>input:focus-visible]:`.
 *
 * When rendered inside `Field.Control` (an alternative to the recommended
 * `Field.Set` / `Field.Legend` composition), picks up `aria-invalid`,
 * `aria-errormessage`, and `aria-describedby` from `FieldControlContext`. A
 * `Choice.Title` inside the item names it through `aria-labelledby`, and a
 * `Choice.Description` describes it through `aria-describedby`. The option's
 * accessible name is then the title alone.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogroupcard
 *
 * @example
 * ```tsx
 * <RadioGroup.Root defaultValue="basic">
 *   <div className="space-y-3">
 *     <RadioGroup.Card value="basic">
 *       <RadioGroup.ItemContent>
 *         <Text weight="strong">Basic Plan</Text>
 *         <Text>$10/month</Text>
 *       </RadioGroup.ItemContent>
 *     </RadioGroup.Card>
 *     <RadioGroup.Card value="pro">
 *       <RadioGroup.ItemContent>
 *         <Text weight="strong">Pro Plan</Text>
 *         <Text>$25/month</Text>
 *       </RadioGroup.ItemContent>
 *     </RadioGroup.Card>
 *   </div>
 * </RadioGroup.Root>
 * ```
 */
const Card = ({ className, ...props }: RadioCardProps) => (
	<RadioPrimitive.Item
		part="radio-group-card"
		className={clsx(
			"group/radio border-card bg-card [&_label]:cursor-inherit relative block rounded-md border p-4 text-sm",
			"cursor-pointer has-[>input:disabled]:cursor-default",
			"has-[>input:focus-visible]:focus-ring",
			"first-of-type:rounded-tl-md first-of-type:rounded-tr-md last-of-type:rounded-bl-md last-of-type:rounded-br-md",
			"has-[>input:disabled]:border-form/50 not-has-[>input:disabled]:hover:bg-card-hover",
			"has-[>input:checked]:border-accent-500/50 has-[>input:checked]:bg-selected-menu-item not-has-[>input:disabled]:hover:has-[>input:checked]:bg-active-selected-menu-item",
			className,
		)}
		{...props}
	/>
);

/**
 * The content of any radio item. Use it to wrap any labels, descriptions, or content of a radio item.
 * Use it as a child of `RadioGroup.Item`, `RadioGroup.ListItem`, or `RadioGroup.Card`.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogroupitemcontent
 *
 * @example
 * ```tsx
 * <RadioGroup.Root defaultValue="option1">
 *   <RadioGroup.Item value="option1">
 *     <RadioGroup.Indicator />
 *     <RadioGroup.ItemContent>
 *       <Text weight="strong">Option 1</Text>
 *       <Text size="sm">Description for option 1</Text>
 *     </RadioGroup.ItemContent>
 *   </RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const ItemContent = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	...props
}: RadioItemContentProps) => {
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "radio-group-item-content")}
			className={clsx("min-w-0 flex-1 group-has-[>input:disabled]/radio:opacity-50", className)}
			{...props}
		>
			{children}
		</Component>
	);
};

type RadioInputSandboxProps = ComponentProps<"div"> & WithDataSlot;

/**
 * A sandbox container for input elements composed within radio group items.
 * A click on the input checks the radio and leaves focus on the input. When
 * the item is disabled or unchecked, the input leaves the tab order.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogroupinputsandbox
 *
 * @example
 * ```tsx
 * <RadioGroup.Root defaultValue="custom">
 *   <RadioGroup.Item value="custom">
 *     <RadioGroup.Indicator />
 *     <RadioGroup.ItemContent>
 *       <Text>Custom amount</Text>
 *       <RadioGroup.InputSandbox>
 *         <Input type="number" placeholder="Enter amount" />
 *       </RadioGroup.InputSandbox>
 *     </RadioGroup.ItemContent>
 *   </RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const InputSandbox = ({
	"data-slot": dataSlot,
	children,
	className,
	onClick,
	...props
}: RadioInputSandboxProps) => {
	const radioItem = useContext(RadioItemContext);
	const checked = radioItem?.checked ?? false;
	const disabled = radioItem?.disabled ?? false;

	const singleChild = Children.only(children);

	// Prevent the child input from receiving focus when the parent radio group item is disabled or unchecked.
	const shouldPreventTabIndex = disabled || !checked;

	return (
		<div
			role="none"
			data-slot={joinDataSlot(dataSlot, "radio-group-input-sandbox")}
			// Why: a click on the sandbox around its control must reach the sandbox, not the radio under it.
			className={cx("relative z-2", className)}
			onClick={(event) => {
				if (disabled) {
					event.stopPropagation();
					event.preventDefault();
					return;
				}
				onClick?.(event);
				if (event.defaultPrevented) {
					return;
				}
				if (!radioItem) {
					return;
				}
				if (!checked) {
					event.currentTarget.ownerDocument.getElementById(radioItem.radioId)?.click();
				}
				// Why: a click on the sandbox around its control, such as the border of an `Input`, focuses the
				// control. The default is prevented, so the item does not move focus to its radio.
				if (!isInteractiveTarget(event.target, event.currentTarget)) {
					event.preventDefault();
					event.currentTarget
						.querySelector<HTMLElement>("input, select, textarea, button, [contenteditable]")
						?.focus();
				}
			}}
			{...props}
		>
			{isValidElement<HTMLInputElement>(singleChild) &&
				cloneElement(singleChild, {
					disabled: disabled || singleChild.props.disabled,
					tabIndex: shouldPreventTabIndex ? -1 : singleChild.props.tabIndex,
				})}
		</div>
	);
};

export {
	//,
	Card,
	Indicator,
	InputSandbox,
	Item,
	ItemContent,
	List,
	ListItem,
	Root,
};
