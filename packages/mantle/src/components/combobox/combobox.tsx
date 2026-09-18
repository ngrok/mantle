"use client";

import {
	Combobox as AriakitCombobox,
	ComboboxGroup as AriakitComboboxGroup,
	ComboboxGroupLabel as AriakitComboboxGroupLabel,
	ComboboxItem as AriakitComboboxItem,
	ComboboxItemValue as AriakitComboboxItemValue,
	ComboboxPopover as AriakitComboboxPopover,
	ComboboxProvider as AriakitComboboxProvider,
} from "@ariakit/react/combobox";
import type {
	ComboboxGroupLabelProps as AriakitComboboxGroupLabelProps,
	ComboboxGroupProps as AriakitComboboxGroupProps,
	ComboboxItemProps as AriakitComboboxItemProps,
	ComboboxItemValueProps as AriakitComboboxItemValueProps,
	ComboboxPopoverProps as AriakitComboboxPopoverProps,
	ComboboxProps as AriakitComboboxProps,
	ComboboxProviderProps as AriakitComboboxProviderProps,
} from "@ariakit/react/combobox";
import type { ComponentProps } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { parseValidation, useFieldValidation } from "../field/validation.js";
import type { WithValidation } from "../field/validation.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";

type ComboboxProps = AriakitComboboxProviderProps;

/**
 * The outermost part of a combobox. It owns the ariakit store that holds the query text, the open state, and the selection.
 *
 * Use Combobox for a list of options where the user types to filter — large static lists,
 * async/server-side data, or any single-select where search is helpful. For very small
 * finite lists with no filtering, prefer Select. For multi-selection, prefer MultiSelect.
 *
 * `Combobox.Content` renders in place at Tailwind `z-50`, Mantle's float tier —
 * it does not portal, so the dialog primitive's Escape guard can see it. Inside
 * an overlay it paints with the overlay's content. Outside one, an open overlay
 * (`z-60`) covers it.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxroot
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple" />
 *     <Combobox.Item value="Banana" />
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Root = ({ children, ...props }: ComboboxProps) => {
	return <AriakitComboboxProvider {...props}>{children}</AriakitComboboxProvider>;
};

type ComboboxInputProps = Omit<
	AriakitComboboxProps,
	"render" // we don't support a render prop for the combobox input
> &
	WithValidation;

/**
 * Renders a combobox input element for filtering a list of items.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxinput
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple" />
 *     <Combobox.Item value="Banana" />
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Input = ({
	"aria-invalid": _ariaInvalid,
	autoComplete = "list",
	autoSelect = "always",
	className,
	ref,
	validation: _validation,
	...props
}: ComboboxInputProps) => {
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	return (
		<AriakitCombobox
			aria-invalid={ariaInvalid}
			autoComplete={autoComplete}
			autoSelect={autoSelect}
			data-slot="combobox-input"
			className={cx(
				"pointer-coarse:text-base h-9 text-sm",
				"bg-form relative block w-full rounded-md border px-3 py-2 border-form text-strong font-sans",
				"placeholder:text-placeholder",
				"aria-disabled:opacity-50",
				"hover:border-neutral-400",
				"focus:outline-hidden focus:ring-4 aria-expanded:ring-4",
				"focus:border-accent-600 focus:ring-focus-accent aria-expanded:border-accent-600 aria-expanded:ring-focus-accent",
				"data-validation-success:border-success-600 data-validation-success:focus:border-success-600 data-validation-success:focus:ring-focus-success data-validation-success:aria-expanded:border-success-600 data-validation-success:aria-expanded:ring-focus-success",
				"data-validation-warning:border-warning-600 data-validation-warning:focus:border-warning-600 data-validation-warning:focus:ring-focus-warning data-validation-warning:aria-expanded:border-warning-600 data-validation-warning:aria-expanded:ring-focus-warning",
				"data-validation-error:border-danger-600 data-validation-error:focus:border-danger-600 data-validation-error:focus:ring-focus-danger data-validation-error:aria-expanded:border-danger-600 data-validation-error:aria-expanded:ring-focus-danger",
				"autofill:shadow-(--color-blue-50) autofill:bg-blue-50 autofill:[-webkit-text-fill-color:var(--text-color-strong)]", // Autofill styling on the input itself and any children with autofill styling
				className,
			)}
			data-validation={validation || undefined}
			ref={ref}
			{...props}
		/>
	);
};

type ComboboxContentProps = Omit<AriakitComboboxPopoverProps, "render"> & WithAsChild;

/**
 * Renders a popover that contains combobox content, e.g. Combobox.Items, Combobox.Groups, and Combobox.Separators.
 *
 * `Combobox.Content` renders in place at Tailwind `z-50`, Mantle's float tier —
 * it does not portal, so the dialog primitive's Escape guard can see it. Inside
 * an overlay it paints with the overlay's content. Outside one, an open overlay
 * (`z-60`) covers it.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxcontent
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple" />
 *     <Combobox.Item value="Banana" />
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Content = ({
	asChild = false,
	children,
	className,
	ref,
	sameWidth = true,
	unmountOnHide = true,
	...props
}: ComboboxContentProps) => {
	return (
		<AriakitComboboxPopover
			data-slot="combobox-content"
			className={cx(
				"border-popover bg-popover relative z-50 max-h-96 min-w-32 scrollbar overflow-y-scroll overflow-x-hidden rounded-md border shadow-md p-1 my-2 space-y-px font-sans focus:outline-hidden",
				className,
			)}
			ref={ref}
			render={asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined}
			sameWidth={sameWidth}
			unmountOnHide={unmountOnHide}
			{...props}
		>
			{children}
		</AriakitComboboxPopover>
	);
};

type ComboboxItemProps = Omit<AriakitComboboxItemProps, "render"> & WithAsChild;

/**
 * Renders a combobox item inside a Combobox.Content component.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxitem
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple" />
 *     <Combobox.Item value="Banana" />
 *     <Combobox.Item value="Orange" />
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Item = ({
	asChild = false,
	children,
	className,
	focusOnHover = true,
	ref,
	value,
	...props
}: ComboboxItemProps) => {
	return (
		<AriakitComboboxItem
			data-slot="combobox-item"
			className={cx(
				"cursor-pointer rounded-md px-2 py-1.5 text-strong text-sm flex min-w-0 gap-2 items-center [&>svg]:size-5 [&_svg]:shrink-0",
				"data-active-item:bg-active-menu-item",
				"aria-disabled:opacity-50",
				className,
			)}
			focusOnHover={focusOnHover}
			ref={ref}
			render={asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined}
			value={value}
			{...props}
		>
			{children}
		</AriakitComboboxItem>
	);
};

type ComboboxGroupProps = Omit<AriakitComboboxGroupProps, "render"> & WithAsChild;

/**
 * Renders a group for Combobox.Item elements.
 *
 * Optionally, render a Combobox.GroupLabel as a child to label the group.
 *
 * You should only reach for this component when it semantically makes sense to group items together, such as when a label is needed.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxgroup
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Group>
 *       <Combobox.GroupLabel>Fruits</Combobox.GroupLabel>
 *       <Combobox.Item value="Apple" />
 *       <Combobox.Item value="Banana" />
 *     </Combobox.Group>
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Group = ({ asChild = false, children, className, ref, ...props }: ComboboxGroupProps) => {
	return (
		<AriakitComboboxGroup
			data-slot="combobox-group"
			className={cx("space-y-px", className)}
			ref={ref}
			render={asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined}
			{...props}
		>
			{children}
		</AriakitComboboxGroup>
	);
};

type ComboboxGroupLabelProps = Omit<AriakitComboboxGroupLabelProps, "render"> & WithAsChild;

/**
 * Renders a label in a combobox group.
 *
 * This component should be wrapped with Combobox.Group so the aria-labelledby is correctly set on the group element.
 *
 * You should only reach for this component when it semantically makes sense to group items together, such as when a label is needed.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxgrouplabel
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Group>
 *       <Combobox.GroupLabel>Fruits</Combobox.GroupLabel>
 *       <Combobox.Item value="Apple" />
 *       <Combobox.Item value="Banana" />
 *     </Combobox.Group>
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const GroupLabel = ({
	asChild = false,
	children,
	className,
	ref,
	...props
}: ComboboxGroupLabelProps) => {
	return (
		<AriakitComboboxGroupLabel
			data-slot="combobox-group-label"
			className={cx("text-muted px-2 py-1 text-xs font-medium", className)}
			ref={ref}
			render={asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined}
			{...props}
		>
			{children}
		</AriakitComboboxGroupLabel>
	);
};

type ComboboxItemValueProps = Omit<AriakitComboboxItemValueProps<"span">, "render"> & WithAsChild;

/**
 * Highlights the match between the current Combobox.Input value (userValue) and parent Combobox.Item value.
 *
 * Renders a span element with the combobox item value as children.
 * The value is split into span elements.
 * Portions of the value matching the user input will have a data-user-value attribute, while the rest will have a data-autocomplete-value attribute.
 *
 * Should only be used as a child of Combobox.Item.
 * The item value is automatically set to the value of the closest Combobox.Item component's value prop.
 * The user input value is automatically set to the combobox store's value state.
 * Passing `value` or `userValue` overrides them, respectively.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxitemvalue
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple">
 *       🍎
 *       <Combobox.ItemValue />
 *     </Combobox.Item>
 *     <Combobox.Item value="Banana">
 *       🍌
 *       <Combobox.ItemValue />
 *     </Combobox.Item>
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const ItemValue = ({ asChild = false, className, ref, ...props }: ComboboxItemValueProps) => {
	return (
		<AriakitComboboxItemValue
			data-slot="combobox-item-value"
			className={cx(
				"*:data-user-value:font-medium flex-1 shrink-0 text-strong font-normal",
				className,
			)}
			ref={ref}
			render={asChild ? ({ ref, ...childProps }) => <Slot ref={ref} {...childProps} /> : undefined}
			{...props}
		/>
	);
};

/**
 * Renders a separator between Combobox.Items or Combobox.Groups.
 *
 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxseparator
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Group>
 *       <Combobox.Item value="Apple" />
 *       <Combobox.Item value="Banana" />
 *     </Combobox.Group>
 *     <Combobox.Separator />
 *     <Combobox.Item>
 *       Click me!
 *     </Combobox.Item>
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const ComboboxSeparatorComponent = ({
	className,
	ref,
	...props
}: ComponentProps<typeof Separator>) => (
	<Separator
		ref={ref}
		data-slot="combobox-separator"
		className={cx("-mx-1.25 my-1 w-auto", className)}
		{...props}
	/>
);

/**
 * Fill in a React input field with autocomplete & autosuggest functionalities.
 * Choose from a list of suggested values with full keyboard support.
 * It follows the WAI-ARIA Combobox Pattern and builds on the ariakit Combobox.
 *
 * Use Combobox for a list of options where the user types to filter — large static lists,
 * async/server-side data, or any single-select where search is helpful. For very small
 * finite lists with no filtering, prefer Select. For multi-selection, prefer MultiSelect.
 *
 * `Combobox.Content` renders in place at Tailwind `z-50`, Mantle's float tier —
 * it does not portal, so the dialog primitive's Escape guard can see it. Inside
 * an overlay it paints with the overlay's content. Outside one, an open overlay
 * (`z-60`) covers it.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 * @see https://ariakit.org/components/combobox
 *
 * @see https://mantle.ngrok.com/components/forms/combobox
 *
 * @example
 * Composition:
 * ```
 * Combobox.Root
 * ├── Combobox.Input
 * └── Combobox.Content
 *     ├── Combobox.Group
 *     │   ├── Combobox.GroupLabel
 *     │   └── Combobox.Item
 *     │       └── Combobox.ItemValue
 *     └── Combobox.Separator
 * ```
 *
 * @example
 * ```tsx
 * <Combobox.Root>
 *   <Combobox.Input />
 *   <Combobox.Content>
 *     <Combobox.Item value="Apple" />
 *     <Combobox.Item value="Banana" />
 *   </Combobox.Content>
 * </Combobox.Root>
 * ```
 */
const Combobox = {
	/**
	 * The outermost part of a combobox. It owns the ariakit store that holds the query text, the open state, and the selection.
	 *
	 * Use Combobox for a list of options where the user types to filter — large static lists,
	 * async/server-side data, or any single-select where search is helpful. For very small
	 * finite lists with no filtering, prefer Select. For multi-selection, prefer MultiSelect.
	 *
	 * `Combobox.Content` renders in place at Tailwind `z-50`, Mantle's float tier
	 * — it does not portal, so the dialog primitive's Escape guard can see it.
	 * Inside an overlay it paints with the overlay's content. Outside one, an open
	 * overlay (`z-60`) covers it.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxroot
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Item value="Apple" />
	 *     <Combobox.Item value="Banana" />
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	Root,
	/**
	 * Renders a popover that contains combobox content, e.g. Combobox.Items, Combobox.Groups, and Combobox.Separators.
	 *
	 * `Combobox.Content` renders in place at Tailwind `z-50`, Mantle's float tier
	 * — it does not portal, so the dialog primitive's Escape guard can see it.
	 * Inside an overlay it paints with the overlay's content. Outside one, an open
	 * overlay (`z-60`) covers it.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxcontent
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Item value="Apple" />
	 *     <Combobox.Item value="Banana" />
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	Content,
	/**
	 * Renders a group for Combobox.Item elements.
	 *
	 * Optionally, render a Combobox.GroupLabel as a child to label the group.
	 *
	 * You should only reach for this component when it semantically makes sense to group items together, such as when a label is needed.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxgroup
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Group>
	 *       <Combobox.GroupLabel>Fruits</Combobox.GroupLabel>
	 *       <Combobox.Item value="Apple" />
	 *       <Combobox.Item value="Banana" />
	 *     </Combobox.Group>
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	Group,
	/**
	 * Renders a label in a combobox group.
	 *
	 * This component should be wrapped with Combobox.Group so the aria-labelledby is correctly set on the group element.
	 *
	 * You should only reach for this component when it semantically makes sense to group items together, such as when a label is needed.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxgrouplabel
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Group>
	 *       <Combobox.GroupLabel>Fruits</Combobox.GroupLabel>
	 *       <Combobox.Item value="Apple" />
	 *       <Combobox.Item value="Banana" />
	 *     </Combobox.Group>
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	GroupLabel,
	/**
	 * Renders a combobox input element for filtering a list of items.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxinput
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Item value="Apple" />
	 *     <Combobox.Item value="Banana" />
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	Input,
	/**
	 * Renders a combobox item inside a Combobox.Content component.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxitem
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Item value="Apple" />
	 *     <Combobox.Item value="Banana" />
	 *     <Combobox.Item value="Orange" />
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	Item,
	/**
	 * Highlights the match between the current Combobox.Input value (userValue) and parent Combobox.Item value.
	 *
	 * Renders a span element with the combobox item value as children.
	 * The value is split into span elements.
	 * Portions of the value matching the user input will have a data-user-value attribute, while the rest will have a data-autocomplete-value attribute.
	 *
	 * Should only be used as a child of Combobox.Item.
	 * The item value is automatically set to the value of the closest Combobox.Item component's value prop.
	 * The user input value is automatically set to the combobox store's value state.
	 * Passing `value` or `userValue` overrides them, respectively.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxitemvalue
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Item value="Apple">
	 *       🍎
	 *       <Combobox.ItemValue />
	 *     </Combobox.Item>
	 *     <Combobox.Item value="Banana">
	 *       🍌
	 *       <Combobox.ItemValue />
	 *     </Combobox.Item>
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	ItemValue,
	/**
	 * Renders a separator between Combobox.Items or Combobox.Groups.
	 *
	 * @see https://mantle.ngrok.com/components/forms/combobox#comboboxseparator
	 *
	 * @example
	 * ```tsx
	 * <Combobox.Root>
	 *   <Combobox.Input />
	 *   <Combobox.Content>
	 *     <Combobox.Group>
	 *       <Combobox.Item value="Apple" />
	 *       <Combobox.Item value="Banana" />
	 *     </Combobox.Group>
	 *     <Combobox.Separator />
	 *     <Combobox.Item>
	 *       Click me!
	 *     </Combobox.Item>
	 *   </Combobox.Content>
	 * </Combobox.Root>
	 * ```
	 */
	Separator: ComboboxSeparatorComponent,
} as const;

export {
	//,
	Combobox,
};
