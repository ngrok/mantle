"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, use, useId } from "react";
import { createPortal } from "react-dom";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { useCombobox, useComboboxInput } from "../../behaviors/use-combobox.js";
import type { ComboboxBehavior, UseComboboxProps } from "../../behaviors/use-combobox.js";
import { useOption } from "../../behaviors/use-listbox.js";
import { usePopup } from "../../behaviors/use-popup.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { useLayerContainer } from "../../utils/layer-container/layer-container.js";
import { parseValidation, useFieldValidation } from "../field/validation.js";
import type { WithValidation } from "../field/validation.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";

const ComboboxContext = createContext<ComboboxBehavior | null>(null);

const useComboboxContext = (): ComboboxBehavior => {
	const context = use(ComboboxContext);
	if (context == null) {
		throw new Error("Combobox parts must be rendered inside Combobox.Root.");
	}
	return context;
};

/** The value of the closest `Combobox.Item`, for `Combobox.ItemValue`. */
const ItemValueContext = createContext<string | undefined>(undefined);

/** The `id` of the closest `Combobox.Group`'s label. */
const GroupLabelContext = createContext<string | undefined>(undefined);

type ComboboxProps = UseComboboxProps & {
	children?: ReactNode;
};

/**
 * The outermost part of a combobox. It holds the query text, the open state, and the selection.
 *
 * Use Combobox for a list of options where the user types to filter: large static lists,
 * async/server-side data, or any single-select where search is helpful. For very small
 * finite lists with no filtering, prefer Select. For multi-selection, prefer MultiSelect.
 *
 * `Combobox.Content` renders at Tailwind `z-50`, Mantle's float tier. Inside an
 * open `Dialog`, `AlertDialog`, or `Sheet`, it portals into that overlay's
 * positioner and paints above the overlay that owns it. Outside every overlay,
 * it portals to `document.body`, below the overlay tier (`z-60`).
 *
 * The list opens on each keystroke. While it is open, Enter in `Combobox.Input`
 * never submits a parent form. If you render `Combobox.Content` conditionally, control `open`
 * and `setOpen` with the same condition, so the open state matches what the user sees.
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
	const combobox = useCombobox(props);
	return <ComboboxContext value={combobox}>{children}</ComboboxContext>;
};

type ComboboxInputProps = Omit<ComponentProps<"input">, "value" | "defaultValue" | "autoComplete"> &
	WithValidation &
	WithDataSlot & {
		/**
		 * Whether the first option gets the highlight as the text changes, so Enter
		 * picks it. `"always"` also highlights it when the list opens.
		 * @default "always"
		 */
		autoSelect?: boolean | "always";
	};

/**
 * Renders a combobox input element for filtering a list of items.
 *
 * When the combobox is open, Enter selects the active option or does nothing. It
 * never submits a parent form. `autoSelect` defaults to `"always"`, so the first
 * matching option is active and Enter replaces the typed text with it. For free-text
 * entry with suggestions, set `autoSelect={false}` and submit in `onKeyDown` when
 * `aria-activedescendant` is not set.
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
 *
 * @example
 * Free-text entry: Enter submits the typed text unless the user moved to a suggestion or an input method is still composing text.
 * ```tsx
 * <form onSubmit={handleSubmit}>
 *   <Combobox.Root inputValue={name} setInputValue={setName}>
 *     <Combobox.Input
 *       autoSelect={false}
 *       onKeyDown={(event) => {
 *         const hasActiveOption = event.currentTarget.getAttribute("aria-activedescendant") != null;
 *         if (event.key === "Enter" && !event.nativeEvent.isComposing && !hasActiveOption) {
 *           event.preventDefault();
 *           event.currentTarget.form?.requestSubmit();
 *         }
 *       }}
 *     />
 *     <Combobox.Content>
 *       <Combobox.Item value="GitHub" />
 *       <Combobox.Item value="Stripe" />
 *     </Combobox.Content>
 *   </Combobox.Root>
 * </form>
 * ```
 */
const Input = ({
	"aria-invalid": _ariaInvalid,
	autoSelect = "always",
	className,
	"data-slot": dataSlot,
	onBlur,
	onChange,
	onClick,
	onKeyDown,
	ref,
	validation: _validation,
	...props
}: ComboboxInputProps) => {
	const combobox = useComboboxContext();
	const inputProps = useComboboxInput(combobox, { autoSelect });
	const composedRef = useComposedRefs(ref, inputProps.ref);
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	return (
		<input
			{...props}
			{...inputProps}
			aria-invalid={ariaInvalid}
			data-slot={joinDataSlot(dataSlot, "combobox-input")}
			className={cx(
				"pointer-coarse:text-base h-9 text-sm",
				"bg-form relative block w-full rounded-md border px-3 py-2 border-form text-strong font-sans",
				"placeholder:text-placeholder",
				"aria-disabled:opacity-50 disabled:opacity-50",
				"hover:border-neutral-400",
				"focus:focus-ring aria-expanded:focus-ring",
				"focus:border-accent-600 aria-expanded:border-accent-600",
				"data-validation-success:border-success-600 data-validation-success:focus:border-success-600 data-validation-success:focus:ring-focus-success data-validation-success:aria-expanded:border-success-600 data-validation-success:aria-expanded:ring-focus-success",
				"data-validation-warning:border-warning-600 data-validation-warning:focus:border-warning-600 data-validation-warning:focus:ring-focus-warning data-validation-warning:aria-expanded:border-warning-600 data-validation-warning:aria-expanded:ring-focus-warning",
				"data-validation-error:border-danger-600 data-validation-error:focus:border-danger-600 data-validation-error:focus:ring-focus-danger data-validation-error:aria-expanded:border-danger-600 data-validation-error:aria-expanded:ring-focus-danger motion-safe:data-validation-error:animate-shake",
				"autofill:shadow-(--color-blue-50) autofill:bg-blue-50 autofill:[-webkit-text-fill-color:var(--text-color-strong)]", // Autofill styling on the input itself and any children with autofill styling
				className,
			)}
			data-validation={validation || undefined}
			ref={composedRef}
			onBlur={composeHandlers(onBlur, inputProps.onBlur)}
			onChange={composeHandlers(onChange, inputProps.onChange)}
			onClick={composeHandlers(onClick, inputProps.onClick)}
			onKeyDown={composeHandlers(onKeyDown, inputProps.onKeyDown)}
		/>
	);
};

type ComboboxContentProps = ComponentProps<"div"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the popover is as wide as the input. When `false`, it takes the
		 * width of its widest item.
		 * @default true
		 */
		sameWidth?: boolean;
	};

/**
 * Renders a popover that contains combobox content, e.g. Combobox.Items, Combobox.Groups, and Combobox.Separators.
 *
 * `Combobox.Content` renders at Tailwind `z-50`, Mantle's float tier. Inside an
 * open `Dialog`, `AlertDialog`, or `Sheet`, it portals into that overlay's
 * positioner and paints above the overlay that owns it. Outside every overlay,
 * it portals to `document.body`, below the overlay tier (`z-60`). It opens below
 * the input, or above it when the space below is too small.
 *
 * The popover has `role="listbox"`, so its children must be `Combobox.Item`,
 * `Combobox.Group`, or `Combobox.Separator`. Render an empty-state or "create" row as a
 * `Combobox.Item`: arrow keys skip any other element, and assistive technology
 * does not expect it in a listbox. Give an empty-state row `disabled`, so Enter or a
 * click cannot pick its text. Keep a "create" row enabled.
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
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	sameWidth = true,
	...props
}: ComboboxContentProps) => {
	const { inputRef, listbox, open } = useComboboxContext();
	const { host, popupRef } = usePopup({
		open,
		anchorRef: inputRef,
		container: useLayerContainer(),
	});
	const composedRef = useComposedRefs(ref, listbox.ref, popupRef);
	const Component = asChild ? Slot : "div";
	// Why `open`: a closed list renders no options, so a page of closed
	// pickers holds no option elements in memory.
	return (
		host != null &&
		open &&
		createPortal(
			<Component
				{...props}
				{...listbox.listboxProps}
				ref={composedRef}
				data-slot={joinDataSlot(dataSlot, "combobox-content")}
				data-state="open"
				className={cx(
					"border-popover bg-popover relative z-50 max-h-96 max-h-(--available-height) min-w-32 scrollbar overflow-y-auto overflow-x-hidden rounded-md border shadow-md p-1 space-y-px font-sans outline-hidden",
					sameWidth && "w-(--anchor-width)",
					className,
				)}
			>
				{children}
			</Component>,
			host,
		)
	);
};

type ComboboxItemProps = Omit<ComponentProps<"div">, "value"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * Whether the item is inert.
		 */
		disabled?: boolean;
		/**
		 * The value that picking the item writes into the input. An item with no
		 * value is static text that the keyboard skips.
		 */
		value?: string;
	};

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
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	disabled,
	ref,
	value,
	...props
}: ComboboxItemProps) => {
	const { listbox } = useComboboxContext();
	const { optionProps } = useOption(listbox, {
		value: value ?? "",
		disabled: disabled || value == null,
	});
	const Component = asChild ? Slot : "div";
	return (
		<ItemValueContext value={value}>
			<Component
				{...props}
				{...optionProps}
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "combobox-item")}
				className={cx(
					"cursor-pointer rounded-md px-2 py-1.5 text-strong text-sm flex min-w-0 gap-2 items-center [&>svg]:size-5 [&_svg]:shrink-0",
					"data-highlighted:bg-active-menu-item",
					"aria-disabled:opacity-50",
					className,
				)}
			>
				{children ?? value}
			</Component>
		</ItemValueContext>
	);
};

type ComboboxGroupProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

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
const Group = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	...props
}: ComboboxGroupProps) => {
	const labelId = useId();
	const Component = asChild ? Slot : "div";
	return (
		<GroupLabelContext value={labelId}>
			<Component
				role="group"
				aria-labelledby={labelId}
				data-slot={joinDataSlot(dataSlot, "combobox-group")}
				className={cx("space-y-px", className)}
				ref={ref}
				{...props}
			>
				{children}
			</Component>
		</GroupLabelContext>
	);
};

type ComboboxGroupLabelProps = ComponentProps<"div"> & WithAsChild & WithDataSlot;

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
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	...props
}: ComboboxGroupLabelProps) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			id={use(GroupLabelContext)}
			data-slot={joinDataSlot(dataSlot, "combobox-group-label")}
			className={cx("text-muted px-2 py-1 text-xs font-medium", className)}
			ref={ref}
			{...props}
		>
			{children}
		</Component>
	);
};

type ComboboxItemValueProps = Omit<ComponentProps<"span">, "children"> &
	WithDataSlot & {
		/**
		 * The text to split. Defaults to the closest `Combobox.Item`'s value.
		 */
		value?: string;
		/**
		 * The text to find in `value`. Defaults to the text of `Combobox.Input`.
		 */
		userValue?: string;
	};

/**
 * Highlights the match between the current Combobox.Input value (userValue) and parent Combobox.Item value.
 *
 * Renders a span element with the combobox item value as children.
 * The value is split into span elements.
 * Portions of the value matching the user input will have a data-user-value attribute, while the rest will have a data-autocomplete-value attribute.
 *
 * Should only be used as a child of Combobox.Item.
 * The item value is automatically set to the value of the closest Combobox.Item component's value prop.
 * The user input value is automatically set to the text of `Combobox.Input`.
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
const ItemValue = ({
	"data-slot": dataSlot,
	className,
	ref,
	userValue: userValueProp,
	value: valueProp,
	...props
}: ComboboxItemValueProps) => {
	const contextItemValue = use(ItemValueContext);
	const { inputValue } = useComboboxContext();
	const itemValue = valueProp ?? contextItemValue ?? "";
	const userValue = userValueProp ?? inputValue;
	const start = userValue === "" ? -1 : itemValue.toLowerCase().indexOf(userValue.toLowerCase());
	const end = start + userValue.length;
	return (
		<span
			data-slot={joinDataSlot(dataSlot, "combobox-item-value")}
			className={cx(
				"*:data-user-value:font-medium flex-1 shrink-0 text-strong font-normal",
				className,
			)}
			ref={ref}
			{...props}
		>
			{start === -1 ? (
				<span data-autocomplete-value="">{itemValue}</span>
			) : (
				<>
					{/* Why a span for each slice: docs/browser-translation.md */}
					{start > 0 && <span data-autocomplete-value="">{itemValue.slice(0, start)}</span>}
					<span data-user-value="">{itemValue.slice(start, end)}</span>
					{end < itemValue.length && <span data-autocomplete-value="">{itemValue.slice(end)}</span>}
				</>
			)}
		</span>
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
	"data-slot": dataSlot,
	className,
	ref,
	...props
}: ComponentProps<typeof Separator> & WithDataSlot) => (
	<Separator
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "combobox-separator")}
		className={cx("-mx-1.25 my-1 w-auto", className)}
		{...props}
	/>
);

export {
	//,
	Root,
	Content,
	Group,
	GroupLabel,
	Input,
	Item,
	ItemValue,
	ComboboxSeparatorComponent,
};
