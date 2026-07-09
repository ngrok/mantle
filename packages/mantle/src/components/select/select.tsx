"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/CaretUp";
import { CheckIcon } from "@phosphor-icons/react/Check";
import * as SelectPrimitive from "@radix-ui/react-select";
import type {
	ComponentProps,
	ComponentPropsWithoutRef,
	ComponentRef,
	FocusEvent,
	PropsWithChildren,
	ReactNode,
	Ref,
	SelectHTMLAttributes,
} from "react";
import { createContext, forwardRef, useContext } from "react";
import { composeRefs } from "../../utils/compose-refs/compose-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { Icon } from "../icon/icon.js";
import type { WithValidation } from "../input/types.js";
import { Separator } from "../separator/separator.js";

type WithAriaInvalid = Pick<SelectHTMLAttributes<HTMLSelectElement>, "aria-invalid">;
type SelectContextType = WithValidation &
	WithAriaInvalid & {
		/**
		 * Ref for the trigger button.
		 */
		ref?: Ref<HTMLButtonElement>;
		/**
		 * Event handler called when Select blurs.
		 * @note this is a no-op for now until we can guarantee that it works identically to a native select onBlur
		 */
		onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
	} & Pick<ComponentProps<"button">, "id">;

const SelectContext = createContext<SelectContextType>({});

type SelectProps = PropsWithChildren & {
	autoComplete?: string;
	defaultOpen?: boolean;
	defaultValue?: string;
	dir?: "ltr" | "rtl";
	disabled?: boolean;
	form?: string;
	id?: string;
	name?: string;
	/**
	 * Event handler called when Select blurs.
	 * @note this is a no-op for now until we can guarantee that it works identically to a native select onBlur
	 */
	onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
	/**
	 * Event handler called when the value changes.
	 * @deprecated Use `onValueChange` instead.
	 */
	onChange?: (value: string) => void;
	onOpenChange?(open: boolean): void;
	onValueChange?(value: string): void;
	open?: boolean;
	required?: boolean;
	value?: string;
} & WithValidation &
	WithAriaInvalid;

/**
 * Displays a list of options for the user to pick from—triggered by a button.
 *
 * @see https://mantle.ngrok.com/components/select#selectroot
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Root = forwardRef<HTMLButtonElement, SelectProps>(
	(
		{
			"aria-invalid": _ariaInvalid,
			children,
			id,
			validation,
			onBlur,
			onValueChange,
			onChange,
			...props
		},
		ref,
	) => {
		return (
			<SelectPrimitive.Root
				{...props}
				onValueChange={(value) => {
					onChange?.(value);
					onValueChange?.(value);
				}}
			>
				<SelectContext.Provider
					value={{ "aria-invalid": _ariaInvalid, id, validation, onBlur, ref }}
				>
					{children}
				</SelectContext.Provider>
			</SelectPrimitive.Root>
		);
	},
);
Root.displayName = "Select";

/**
 * A group of related options within a select menu. Similar to an html `<optgroup>` element.
 * Use in conjunction with Select.Label to ensure good accessibility via automatic labelling.
 *
 * @see https://mantle.ngrok.com/components/select#selectgroup
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Group = forwardRef<
	ComponentRef<typeof SelectPrimitive.Group>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Group>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Group
		ref={ref}
		data-slot="select-group"
		className={cx("space-y-px", className)}
		{...props}
	/>
));
Group.displayName = "SelectGroup";

/**
 * The part that reflects the selected value. By default the selected item's text will be rendered. if you require more control, you can instead control the select and pass your own children. It should not be styled to ensure correct positioning. An optional placeholder prop is also available for when the select has no value.
 *
 * @see https://mantle.ngrok.com/components/select#selectvalue
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Value = SelectPrimitive.Value;
Value.displayName = "SelectValue";

type SelectTriggerProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
	WithAriaInvalid &
	WithValidation;

/**
 * The button that toggles the select. The Select.Content will position itself adjacent to the trigger.
 *
 * @see https://mantle.ngrok.com/components/select#selecttrigger
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Trigger = forwardRef<ComponentRef<typeof SelectPrimitive.Trigger>, SelectTriggerProps>(
	(
		{
			"aria-invalid": ariaInValidProp,
			className,
			children,
			id: propId,
			validation: propValidation,
			...props
		},
		ref,
	) => {
		const ctx = useContext(SelectContext);
		const _ariaInvalid = ctx["aria-invalid"] ?? ariaInValidProp;
		const isInvalid = _ariaInvalid != null && _ariaInvalid !== "false";
		const _validation = ctx.validation ?? propValidation;
		const validation = isInvalid
			? "error"
			: typeof _validation === "function"
				? _validation()
				: _validation;
		const ariaInvalid = _ariaInvalid ?? validation === "error";
		const id = ctx.id ?? propId;

		return (
			<SelectPrimitive.Trigger
				aria-invalid={ariaInvalid}
				data-slot="select-trigger"
				className={cx(
					"h-9 text-sm",
					"border-form bg-form text-strong font-sans placeholder:text-placeholder hover:bg-form-hover hover:text-strong flex w-full items-center justify-between gap-1.5 rounded-md border px-3 py-2 disabled:pointer-events-none disabled:opacity-50 [&>span]:line-clamp-1 [&>span]:text-left",
					"hover:border-neutral-400",
					"focus:outline-hidden focus:ring-4 aria-expanded:ring-4",
					"focus:border-accent-600 focus:ring-focus-accent aria-expanded:border-accent-600 aria-expanded:ring-focus-accent",
					"data-validation-success:border-success-600 data-validation-success:focus:border-success-600 data-validation-success:focus:ring-focus-success data-validation-success:aria-expanded:border-success-600 data-validation-success:aria-expanded:ring-focus-success",
					"data-validation-warning:border-warning-600 data-validation-warning:focus:border-warning-600 data-validation-warning:focus:ring-focus-warning data-validation-warning:aria-expanded:border-warning-600 data-validation-warning:aria-expanded:ring-focus-warning",
					"data-validation-error:border-danger-600 data-validation-error:focus:border-danger-600 data-validation-error:focus:ring-focus-danger data-validation-error:aria-expanded:border-danger-600 data-validation-error:aria-expanded:ring-focus-danger",
					className,
				)}
				data-validation={validation || undefined}
				id={id}
				ref={composeRefs(ref, ctx.ref)}
				{...props}
			>
				{children}
				<SelectPrimitive.Icon asChild>
					<Icon svg={<CaretDownIcon weight="bold" />} className="size-4" />
				</SelectPrimitive.Icon>
			</SelectPrimitive.Trigger>
		);
	},
);
Trigger.displayName = "SelectTrigger";

/**
 * The button that scrolls the select content up.
 * @private
 */
const SelectScrollUpButton = forwardRef<
	ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollUpButton
		ref={ref}
		className={cx("flex cursor-default items-center justify-center py-1", className)}
		{...props}
	>
		<Icon svg={<CaretUpIcon weight="bold" />} className="size-4" />
	</SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

/**
 * The button that scrolls the select content down.
 * @private
 */
const SelectScrollDownButton = forwardRef<
	ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.ScrollDownButton
		ref={ref}
		className={cx("flex cursor-default items-center justify-center py-1", className)}
		{...props}
	>
		<Icon svg={<CaretDownIcon weight="bold" />} className="size-4" />
	</SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

type SelectContentProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Content> & {
	/**
	 * The width of the content. Defaults to the width of the trigger.
	 * If set to "content", the content will use the intrinsic content width; it will be the width of the longest/widest item.
	 * @default "trigger"
	 */
	width?: "trigger" | "content";
};

/**
 * The component that pops out when the select is open as a portal adjacent to the trigger button.
 * It contains a scrolling viewport of the select items.
 *
 * @see https://mantle.ngrok.com/components/select#selectcontent
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Content = forwardRef<ComponentRef<typeof SelectPrimitive.Content>, SelectContentProps>(
	({ className, children, position = "popper", width = "trigger", ...props }, ref) => (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				ref={ref}
				data-slot="select-content"
				className={cx(
					"border-popover data-side-bottom:slide-in-from-top-2 data-side-left:slide-in-from-right-2 data-side-right:slide-in-from-left-2 data-side-top:slide-in-from-bottom-2 data-state-closed:animate-out data-state-closed:fade-out-0 data-state-closed:zoom-out-95 data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95 relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border shadow-md",
					"bg-popover font-sans",
					position === "popper" &&
						"data-side-bottom:translate-y-2 data-side-left:-translate-x-2 data-side-right:translate-x-2 data-side-top:-translate-y-2 max-h-(--radix-select-content-available-height)",
					width === "trigger" && "w-(--radix-select-trigger-width)",
					className,
				)}
				position={position}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cx(
						"p-1 space-y-px",
						position === "popper" && "h-(--radix-select-trigger-height) w-full",
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	),
);
Content.displayName = "SelectContent";

/**
 * Used to render the label of a group. It won't be focusable using arrow keys.
 *
 * @see https://mantle.ngrok.com/components/select#selectlabel
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Label = forwardRef<
	ComponentRef<typeof SelectPrimitive.Label>,
	ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
	<SelectPrimitive.Label
		ref={ref}
		data-slot="select-label"
		className={cx("px-2 py-1.5 text-sm font-medium", className)}
		{...props}
	/>
));
Label.displayName = "SelectLabel";

type SelectItemProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
	icon?: ReactNode;
};

/**
 * An option within a select menu. Similar to an html `<option>` element.
 * Has a required `value` prop that will be passed to the `onChange` handler of the `Select` component when this item is selected.
 * Displays the children as the option's text.
 *
 * @see https://mantle.ngrok.com/components/select#selectitem
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Item = forwardRef<ComponentRef<typeof SelectPrimitive.Item>, SelectItemProps>(
	({ className, children, icon, ...props }, ref) => (
		<SelectPrimitive.Item
			ref={ref}
			data-slot="select-item"
			className={cx(
				"relative flex gap-2 w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-8 text-strong text-sm outline-hidden",
				"focus:bg-active-menu-item",
				"data-disabled:pointer-events-none data-disabled:opacity-50",
				"data-state-checked:bg-selected-menu-item",
				"focus:data-state-checked:bg-active-selected-menu-item",
				className,
			)}
			{...props}
		>
			{icon && <Icon svg={icon} />}
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
				<Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	),
);
Item.displayName = "SelectItem";

/**
 * Used to visually separate items or groups of items in the select content.
 *
 * @see https://mantle.ngrok.com/components/select#selectseparator
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const SelectSeparatorComponent = forwardRef<
	ComponentRef<typeof Separator>,
	ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
	<Separator
		ref={ref}
		data-slot="select-separator"
		className={cx("-mx-1 my-1 h-px w-auto", className)}
		{...props}
	/>
));
SelectSeparatorComponent.displayName = "SelectSeparator";

/**
 * Displays a list of options for the user to pick from—triggered by a button.
 *
 * @see https://mantle.ngrok.com/components/select
 *
 * @example
 * Composition:
 * ```
 * Select.Root
 * ├── Select.Trigger
 * │   └── Select.Value
 * └── Select.Content
 *     ├── Select.Group
 *     │   ├── Select.Label
 *     │   └── Select.Item
 *     └── Select.Separator
 * ```
 *
 * @example
 * ```tsx
 * <Select.Root>
 *   <Select.Trigger>
 *     <Select.Value placeholder="Select a fruit" />
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Group>
 *       <Select.Label>Fruits</Select.Label>
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *       <Select.Item value="cherry">Cherry</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group>
 *       <Select.Label>Veggies</Select.Label>
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *       <Select.Item value="cucumber">Cucumber</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select.Root>
 * ```
 */
const Select = {
	/**
	 * Displays a list of options for the user to pick from—triggered by a button.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectroot
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Root,
	/**
	 * The component that pops out when the select is open as a portal adjacent to the trigger button.
	 * It contains a scrolling viewport of the select items.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectcontent
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Content,
	/**
	 * A group of related options within a select menu. Similar to an html `<optgroup>` element.
	 * Use in conjunction with Select.Label to ensure good accessibility via automatic labelling.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectgroup
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Group,
	/**
	 * An option within a select menu. Similar to an html `<option>` element.
	 * Has a required `value` prop that will be passed to the `onChange` handler of the `Select` component when this item is selected.
	 * Displays the children as the option's text.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectitem
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Item,
	/**
	 * Used to render the label of a group. It won't be focusable using arrow keys.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectlabel
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Label,
	/**
	 * Used to visually separate items or groups of items in the select content.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectseparator
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Separator: SelectSeparatorComponent,
	/**
	 * The button that toggles the select. The Select.Content will position itself adjacent to the trigger.
	 *
	 * @see https://mantle.ngrok.com/components/select#selecttrigger
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Trigger,
	/**
	 * The part that reflects the selected value. By default the selected item's text will be rendered. if you require more control, you can instead control the select and pass your own children. It should not be styled to ensure correct positioning. An optional placeholder prop is also available for when the select has no value.
	 *
	 * @see https://mantle.ngrok.com/components/select#selectvalue
	 *
	 * @example
	 * ```tsx
	 * <Select.Root>
	 *   <Select.Trigger>
	 *     <Select.Value placeholder="Select a fruit" />
	 *   </Select.Trigger>
	 *   <Select.Content>
	 *     <Select.Group>
	 *       <Select.Label>Fruits</Select.Label>
	 *       <Select.Item value="apple">Apple</Select.Item>
	 *       <Select.Item value="banana">Banana</Select.Item>
	 *       <Select.Item value="cherry">Cherry</Select.Item>
	 *     </Select.Group>
	 *     <Select.Separator />
	 *     <Select.Group>
	 *       <Select.Label>Veggies</Select.Label>
	 *       <Select.Item value="carrot">Carrot</Select.Item>
	 *       <Select.Item value="cucumber">Cucumber</Select.Item>
	 *     </Select.Group>
	 *   </Select.Content>
	 * </Select.Root>
	 * ```
	 */
	Value,
} as const;

export {
	//,
	Select,
};
