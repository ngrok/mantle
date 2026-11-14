"use client";

import { Children, cloneElement, isValidElement, useContext, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { isInput } from "../input/is-input.js";
import { Slot } from "../slot/index.js";
import * as RadioPrimitive from "./primitive.js";
import { RadioStateContext, type RadioStateContextValue } from "./primitive.js";

type RadioGroupProps = RadioPrimitive.RootProps;

/**
 * A group of radio items. It manages the state of the children radios. Unstyled and simple.
 * Used as the root component for grouping related radio items where only one can be selected.
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
 * <RadioGroup.Root value={value} onChange={setValue}>
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
 * <RadioGroup.Root value={value} onChange={setValue}>
 *   <RadioGroup.Item value="option1">
 *     <RadioGroup.Indicator />
 *     <span>Option 1</span>
 *   </RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const Item = ({
	"data-slot": dataSlot,
	as: tag,
	children,
	className,
	ref,
	...props
}: RadioItemProps) => {
	return (
		<RadioPrimitive.Item
			data-slot={joinDataSlot(dataSlot, "radio-group-item")}
			className={cx(
				"group/radio cursor-pointer aria-disabled:cursor-default [&_label]:cursor-inherit flex gap-2 py-1 text-sm focus:outline-hidden",
				// Why the gate: the default indicator draws the focus ring on its circle.
				// An item with a custom indicator, or none, has no other focus treatment.
				"not-has-data-radio-default-indicator:focus-visible:ring-focus-accent not-has-data-radio-default-indicator:focus-visible:ring-4 not-has-data-radio-default-indicator:focus-visible:rounded-md",
				className,
			)}
			{...props}
			as={tag}
			ref={ref}
		>
			{children}
		</RadioPrimitive.Item>
	);
};

type RadioIndicatorProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
	children?: ReactNode | ((context: RadioStateContextValue) => ReactNode);
	/**
	 * Never rendered. `Choice.Indicator` injects the field's `name` for a
	 * control, and a `<div>` has no `name` attribute.
	 */
	name?: string;
} & WithDataSlot;

/**
 * The circle `RadioGroup.Indicator` draws when a consumer passes no children.
 * @private
 */
const DefaultRadioIndicator = ({ checked, disabled, focus, hover }: RadioStateContextValue) => (
	<span
		// Why: `RadioGroup.Item` reads this attribute to skip its own focus ring.
		data-radio-default-indicator=""
		className={cx(
			"flex size-4 items-center justify-center rounded-full border shrink-0",
			disabled && "cursor-default opacity-50",
			// Why an outline when unchecked: a solid gray circle reads as disabled.
			// Why a transparent border when checked: forced-colors mode removes the fill and
			// paints this border in a system color, so the circle keeps its outline.
			checked ? "bg-filled-accent border-transparent" : "bg-form border-form",
			hover && !disabled && (checked ? "bg-filled-accent-hover" : "border-neutral-400"),
			focus && !disabled && "ring-focus-accent ring-4",
		)}
	>
		{/* Why the forced-colors classes: forced-colors mode removes the fill, so the dot keeps a system color. */}
		{checked && (
			<span className="size-2 rounded-full bg-white shrink-0 forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]" />
		)}
	</span>
);

/**
 * The selection indicator for any radio item.
 * Use it as a child of `RadioGroup.Item`, `RadioGroup.ListItem`, or `RadioGroup.Card`.
 * By default, it's a circle that changes color when checked.
 * You can customize the indicator by passing children:
 * - a different component
 * - a render-props function that receives the radio state context and should return a component.
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
	const ctx = useContext(RadioStateContext);
	const indicator = typeof children === "function" ? children(ctx) : children;

	return (
		<div
			data-slot={joinDataSlot(dataSlot, "radio-group-indicator")}
			className={cx(
				"radio-indicator inline-flex size-5 select-none items-center justify-center shrink-0",
				className,
			)}
			{...props}
		>
			{children == null ? <DefaultRadioIndicator {...ctx} /> : indicator}
		</div>
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
const ListItem = ({
	"data-slot": dataSlot,
	as: tag,
	children,
	className,
	ref,
	...props
}: RadioListItemProps) => {
	return (
		<RadioPrimitive.Item
			data-slot={joinDataSlot(dataSlot, "radio-group-list-item")}
			className={cx(
				"group/radio [&_label]:cursor-inherit relative flex select-none gap-2 rounded-md px-3 py-2 text-sm",
				"cursor-pointer aria-disabled:cursor-default focus:outline-hidden",
				"focus-visible:ring-focus-accent focus-visible:z-1 focus-visible:ring-4",
				"not-aria-disabled:hover:bg-active-menu-item",
				"aria-checked:bg-selected-menu-item not-aria-disabled:hover:aria-checked:bg-active-selected-menu-item",
				"has-[.radio-indicator:first-child]:pl-2 has-[.radio-indicator:last-child]:pr-2",
				className,
			)}
			{...props}
			as={tag}
			ref={ref}
		>
			{children}
		</RadioPrimitive.Item>
	);
};

type RadioItemContentProps = HTMLAttributes<HTMLDivElement> & WithAsChild & WithDataSlot;

type RadioCardProps = RadioItemProps & WithDataSlot;

/**
 * A radio card item. Use it as a child of `RadioGroup`
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
const Card = ({
	"data-slot": dataSlot,
	as: tag,
	children,
	className,
	ref,
	...props
}: RadioCardProps) => {
	return (
		<RadioPrimitive.Item
			data-slot={joinDataSlot(dataSlot, "radio-group-card")}
			className={clsx(
				"group/radio border-card bg-card [&_label]:cursor-inherit relative rounded-md border p-4 text-sm",
				"cursor-pointer aria-disabled:cursor-default focus:outline-hidden",
				"focus-visible:ring-focus-accent focus-visible:ring-4",
				"first-of-type:rounded-tl-md first-of-type:rounded-tr-md last-of-type:rounded-bl-md last-of-type:rounded-br-md",
				"aria-disabled:border-form/50 not-aria-disabled:hover:bg-card-hover",
				"aria-checked:border-accent-500/50 aria-checked:bg-selected-menu-item not-aria-disabled:hover:aria-checked:bg-active-selected-menu-item",
				className,
			)}
			{...props}
			as={tag}
			ref={ref}
		>
			{children}
		</RadioPrimitive.Item>
	);
};

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
	const ctx = useContext(RadioStateContext);
	const Component = asChild ? Slot : "div";

	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "radio-group-item-content")}
			className={clsx("min-w-0 flex-1", ctx.disabled && "opacity-50", className)}
			{...props}
		>
			{children}
		</Component>
	);
};

type RadioInputSandboxProps = HTMLAttributes<HTMLDivElement> & WithDataSlot;

/**
 * A sandbox container for input elements composed within radio group items.
 * A click inside it still selects the radio, then focus returns to the input.
 * Keys other than Enter and Tab stop here, so typing does not move the
 * selection. When the item is disabled or unchecked, the input leaves the tab
 * order.
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
	onClick,
	onKeyDown,
	...props
}: RadioInputSandboxProps) => {
	const ref = useRef<HTMLDivElement>(null);
	const ctx = useContext(RadioStateContext);

	const singleChild = Children.only(children);

	// Prevent the child input from receiving focus when the parent radio group item is disabled or unchecked.
	const shouldPreventTabIndex = ctx.disabled || !ctx.checked;

	return (
		<div
			role="none"
			data-slot={joinDataSlot(dataSlot, "radio-group-input-sandbox")}
			ref={ref}
			onKeyDown={(event) => {
				if (ctx.disabled) {
					event.stopPropagation();
					event.preventDefault();
					return;
				}
				switch (event.key) {
					case "Enter":
					case "Tab":
						break;
					default:
						event.stopPropagation();
				}
				onKeyDown?.(event);
			}}
			onClick={(event) => {
				if (ctx.disabled) {
					event.stopPropagation();
					event.preventDefault();
					return;
				}
				const target = event.target;
				if (isInput(target)) {
					window.requestAnimationFrame(() => {
						target.focus();
					});
				}
				onClick?.(event);
			}}
			{...props}
		>
			{isValidElement<HTMLInputElement>(singleChild) &&
				cloneElement(singleChild, {
					disabled: ctx.disabled || singleChild.props.disabled,
					tabIndex: shouldPreventTabIndex ? -1 : singleChild.props.tabIndex,
				})}
		</div>
	);
};

/**
 * A group of radio items. It manages the state of the children radios.
 *
 * @useWhen Pick exactly one value from a few fixed options, with every option visible at once.
 *
 * @siblings
 * - `Select`: the set is long, or the form has little space.
 * - `Checkbox`: the user picks any number of options.
 * - `Choice`: each radio needs a title and a description beside it.
 * - `SegmentedControl`: a few short options switch a view or a mode in one row.
 *
 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogrouproot
 *
 * @example
 * Composition:
 * ```
 * # Default radios
 * RadioGroup.Root
 * └── RadioGroup.Item
 *     ├── RadioGroup.Indicator
 *     └── RadioGroup.ItemContent
 *
 * # List layout with descriptions
 * RadioGroup.List
 * └── RadioGroup.ListItem
 *     ├── RadioGroup.Indicator
 *     └── RadioGroup.ItemContent
 *
 * # Card-style radios
 * RadioGroup.Root
 * └── RadioGroup.Card
 *     └── RadioGroup.Indicator
 *
 * # Rich option layout (Choice)
 * RadioGroup.Root
 * └── RadioGroup.Item
 *     └── Choice.Root
 *         ├── Choice.Indicator
 *         │   └── RadioGroup.Indicator
 *         └── Choice.Content
 *             ├── Choice.Title
 *             └── Choice.Description
 * ```
 *
 * @example
 * ```tsx
 * <RadioGroup.Root value={value} onChange={setValue}>
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
const RadioGroup = {
	/**
	 * A radio card item with enhanced styling. Use it as a child of RadioGroup for card-based radio options.
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
	Card,
	/**
	 * The selection indicator for any radio item.
	 * Use it as a child of `RadioGroup.Item`, `RadioGroup.ListItem`, or `RadioGroup.Card`.
	 * By default, it's a circle that changes color when checked.
	 * You can customize the indicator by passing children:
	 * - a different component
	 * - a render-props function that receives the radio state context and should return a component.
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
	Indicator,
	/**
	 * A sandbox container for input elements composed within radio group items.
	 * A click inside it still selects the radio, then focus returns to the input.
	 * Keys other than Enter and Tab stop here, so typing does not move the
	 * selection. When the item is disabled or unchecked, the input leaves the tab
	 * order.
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
	InputSandbox,
	/**
	 * A simple radio item that can be used inside a radio group. The conventional use-case for basic radio options.
	 *
	 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogroupitem
	 *
	 * @example
	 * ```tsx
	 * <RadioGroup.Item value="option1">
	 *   <RadioGroup.Indicator />
	 *   <span>Option 1</span>
	 * </RadioGroup.Item>
	 * ```
	 */
	Item,
	/**
	 * The content wrapper for any radio item. Use it to wrap labels, descriptions, or content of a radio item.
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
	ItemContent,
	/**
	 * A bordered group of radio list items. Use RadioGroup.ListItem as direct children.
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
	List,
	/**
	 * A radio list item that is used inside a RadioGroup.List for connected list-style radio options.
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
	ListItem,
	/**
	 * A group of radio items. It manages the state of the children radios. Unstyled and simple.
	 * Used as the root component for grouping related radio items where only one can be selected.
	 *
	 * @see https://mantle.ngrok.com/components/forms/radio-group#radiogrouproot
	 *
	 * @example
	 * ```tsx
	 * <RadioGroup.Root value={value} onChange={setValue}>
	 *   <RadioGroup.Item value="option1">
	 *     <RadioGroup.Indicator />
	 *     <span>Option 1</span>
	 *   </RadioGroup.Item>
	 * </RadioGroup.Root>
	 * ```
	 */
	Root,
} as const;

export {
	//
	RadioGroup,
};
