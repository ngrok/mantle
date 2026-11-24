"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, use, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { composeHandlers, disabledItemGuard } from "../../behaviors/compose-handlers.js";
import { useCombobox, useComboboxInput } from "../../behaviors/use-combobox.js";
import type { UseComboboxProps } from "../../behaviors/use-combobox.js";
import { childId, useOption } from "../../behaviors/use-listbox.js";
import { usePopup } from "../../behaviors/use-popup.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { observeScrollEdges } from "../../utils/scroll-edges.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { hasPopoverApi } from "../../utils/float/use-float.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { WithValidation } from "../field/validation.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";
import { OptionSlot } from "../slot/option-slot.js";
import type { OptionRender } from "../slot/option-slot.js";

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

type ComboboxContextValue = ReturnType<typeof useCombobox> &
	Pick<ComboboxProps, "name" | "form" | "disabled">;

const useComboboxContext = (): ComboboxContextValue => {
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
	/**
	 * The name the picked value submits under with its form. The text in
	 * `Combobox.Input` does not submit.
	 */
	name?: string;
	/** The `id` of the form the picked value submits with, when it is not an ancestor. */
	form?: string;
	/** Whether a pick is required before the form submits. */
	required?: boolean;
	/** Whether the combobox is disabled. Its input takes no input, and the pick does not submit. */
	disabled?: boolean;
};

/**
 * The outermost part of a combobox. It holds the query text, the open state, and the selection.
 *
 * Use Combobox for a list of options where the user types to filter: large static lists,
 * async/server-side data, or any single-select where search is helpful. For very small
 * finite lists with no filtering, prefer Select. For multi-selection, prefer MultiSelect.
 *
 * `Combobox.Content` is a `popover="manual"` element in the top layer, so it paints
 * above the page and every overlay. It portals into the overlay or float that
 * holds it, such as an open `Dialog` or `Popover.Content`, else into
 * `document.body`. In a browser with no popover API, it is a fixed box at
 * Tailwind `z-50`.
 *
 * The list opens on each keystroke. While it is open, Enter in `Combobox.Input`
 * never submits a parent form. If you render `Combobox.Content` conditionally, control `open`
 * and `onOpenChange` with the same condition, so the open state matches what the user sees.
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
const Root = ({ children, name, form, required, disabled, ...props }: ComboboxProps) => {
	const combobox = useCombobox(props);
	const contextValue = useMemo(
		() => ({ ...combobox, name, form, disabled }),
		[combobox, name, form, disabled],
	);
	return (
		<ComboboxContext value={contextValue}>
			{children}
			{/* Why not type="hidden": a hidden input skips `required`. */}
			{(name != null || required) && (
				<input
					aria-hidden
					tabIndex={-1}
					className="sr-only"
					name={name}
					form={form}
					required={required}
					disabled={disabled}
					value={combobox.value ?? ""}
					onChange={(event) => combobox.setValue(event.target.value)}
					// Why: a failed `required` check focuses this input, and the user
					// must land on the visible one.
					onFocus={() => combobox.inputRef.current?.focus()}
				/>
			)}
		</ComboboxContext>
	);
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
 *   <Combobox.Root inputValue={name} onInputValueChange={setName}>
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
	const composedRef = useComposedRefs(ref, inputProps.ref, (input: HTMLInputElement | null) => {
		// Why a ref callback: a form reset returns the pick and the text to their
		// defaults, and the listener lives as long as the input. Root's `form`
		// names the form the pick belongs to.
		const owner =
			combobox.form == null ? input?.form : input?.ownerDocument.getElementById(combobox.form);
		if (!(owner instanceof HTMLFormElement)) {
			return;
		}
		owner.addEventListener("reset", combobox.reset);
		return () => owner.removeEventListener("reset", combobox.reset);
	});
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	return (
		<input
			{...props}
			{...inputProps}
			// Why: with a Root `name`, the pick submits under it, and the typed text must not.
			name={combobox.name == null ? props.name : undefined}
			disabled={props.disabled ?? combobox.disabled}
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
				"data-[validation=success]:border-success-600 data-[validation=success]:focus:border-success-600 data-[validation=success]:focus:ring-focus-success data-[validation=success]:aria-expanded:border-success-600 data-[validation=success]:aria-expanded:ring-focus-success",
				"data-[validation=warning]:border-warning-600 data-[validation=warning]:focus:border-warning-600 data-[validation=warning]:focus:ring-focus-warning data-[validation=warning]:aria-expanded:border-warning-600 data-[validation=warning]:aria-expanded:ring-focus-warning",
				"data-[validation=error]:border-danger-600 data-[validation=error]:focus:border-danger-600 data-[validation=error]:focus:ring-focus-danger data-[validation=error]:aria-expanded:border-danger-600 data-[validation=error]:aria-expanded:ring-focus-danger motion-safe:data-[validation=error]:animate-shake",
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
 * `Combobox.Content` is a `popover="manual"` element in the top layer, so it paints
 * above the page and every overlay. It portals into the overlay or float that
 * holds it, such as an open `Dialog` or `Popover.Content`, else into
 * `document.body`. In a browser with no popover API, it is a fixed box at
 * Tailwind `z-50`.
 *
 * It opens below the input, or above it when the space below is too small.
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
const Content = (props: ComboboxContentProps) =>
	useComboboxContext().open && <OpenContent {...props} />;

/** The open list. A closed combobox mounts none of it: no popup, store, or listener. */
const OpenContent = ({
	"data-slot": dataSlot,
	asChild = false,
	children,
	className,
	ref,
	sameWidth = true,
	...props
}: ComboboxContentProps) => {
	const { inputRef, listbox } = useComboboxContext();
	const { portalTarget, popupRef } = usePopup({ anchorRef: inputRef, ownerRef: inputRef });
	const listRef = useComposedRefs(listbox.listboxProps.ref, observeScrollEdges);
	const composedRef = useComposedRefs(ref, popupRef, listRef);
	const Component = asChild ? Slot : "div";
	return (
		portalTarget != null &&
		createPortal(
			<Component
				{...props}
				{...listbox.listboxProps}
				{...disabledItemGuard(props)}
				popover={hasPopoverApi ? "manual" : undefined}
				onMouseDown={composeHandlers(props.onMouseDown, listbox.listboxProps.onMouseDown)}
				ref={composedRef}
				data-slot={joinDataSlot(dataSlot, "combobox-content")}
				data-open=""
				className={cx(
					"border-popover bg-popover pointer-events-auto fixed inset-auto z-50 m-0 text-inherit max-h-(--available-height) min-w-32 overflow-y-auto overflow-x-hidden scrollbar-none [&::-webkit-scrollbar]:hidden overscroll-y-none scroll-cue-y before:-top-1 after:-bottom-1 scroll-py-6 rounded-md border shadow-md p-1 between:mbe-px font-sans outline-hidden",
					sameWidth && "w-(--anchor-width)",
					className,
				)}
			>
				{children}
			</Component>,
			portalTarget,
		)
	);
};

type ComboboxItemProps = Omit<ComponentProps<"div">, "children" | "value"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The item's content, which defaults to its `value`. A function renders the
		 * item as the element it returns, with the item's props and `{ highlighted }`:
		 * spread `props` on that element.
		 */
		children?: ReactNode | OptionRender;
		/**
		 * Whether the item is inert.
		 * A disabled item runs no click handler, and an `asChild` link does not navigate.
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
 * **Function child.** `(props, { highlighted }) => element` renders the item as
 * the element it returns. Spread `props` on it.
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
	onClick,
	onPointerMove,
	ref,
	value,
	...props
}: ComboboxItemProps) => {
	const { listbox } = useComboboxContext();
	const { selected, optionProps } = useOption(listbox, {
		value: value ?? "",
		disabled: disabled || value == null,
		id: childId({ asChild, children, id: props.id }),
	});
	const elementProps = {
		...props,
		...optionProps,
		onClick: composeHandlers(onClick, optionProps.onClick),
		onPointerMove: composeHandlers(onPointerMove, optionProps.onPointerMove),
		// Why: in the APG combobox pattern, the highlighted option is the selected
		// one, and the open list writes the attribute with the highlight.
		"aria-selected": undefined,
		// Why `data-selected`: `aria-selected` follows the highlight, so the picked option needs its own attribute.
		"data-selected": selected ? "" : undefined,
		ref,
		"data-slot": joinDataSlot(dataSlot, "combobox-item"),
		className: cx(
			"cursor-pointer rounded-md px-2 py-1.5 text-strong text-sm flex min-w-0 gap-2 items-center [&>svg]:size-5 [&_svg]:shrink-0",
			"data-highlighted:bg-active-menu-item",
			"aria-disabled:cursor-default aria-disabled:opacity-50",
			className,
		),
	};
	const Component = asChild ? Slot : "div";
	return (
		<ItemValueContext value={value}>
			{typeof children === "function" ? (
				<OptionSlot {...elementProps} listbox={listbox} render={children} />
			) : (
				<Component {...elementProps}>{children ?? value}</Component>
			)}
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
				className={cx("between:mbe-px", className)}
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
				"[&>[data-user-value]]:font-medium flex-1 shrink-0 text-strong font-normal",
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
