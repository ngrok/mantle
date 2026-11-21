"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { CheckIcon } from "@phosphor-icons/react/Check";
import type {
	ComponentProps,
	FocusEvent,
	PropsWithChildren,
	ReactNode,
	Ref,
	SelectHTMLAttributes,
} from "react";
import { cloneElement, createContext, isValidElement, use, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { enterModal } from "../../behaviors/enter-modal.js";
import { useStoreValue } from "../../behaviors/store.js";
import { useOption } from "../../behaviors/use-listbox.js";
import { usePopup } from "../../behaviors/use-popup.js";
import { useSelect, useSelectTrigger } from "../../behaviors/use-select.js";
import type { SelectBehavior } from "../../behaviors/use-select.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { useLayerContainer } from "../../utils/layer-container/layer-container.js";
import { FieldControlContext } from "../field/field-context.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { WithValidation } from "../field/validation.js";
import { Icon } from "../icon/icon.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";

type WithAriaInvalid = Pick<SelectHTMLAttributes<HTMLSelectElement>, "aria-invalid">;

type SelectContextType = SelectBehavior &
	WithValidation &
	WithAriaInvalid & {
		dir?: "ltr" | "rtl";
		/**
		 * Ref for the trigger button.
		 */
		ref?: Ref<HTMLButtonElement>;
		/**
		 * Event handler called when the trigger button blurs.
		 */
		onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
		/**
		 * Finds the label of the `Select.Item` with `value` among the root's
		 * children, before the items mount.
		 */
		labelFor: (value: string) => ItemLabel | null;
	} & Pick<ComponentProps<"button">, "id">;

/** The label that `Select.Value` shows for the selected item. */
type ItemLabel = { value: string; label: ReactNode; translate?: "yes" | "no" };

type ItemElementProps = {
	asChild?: boolean;
	children?: ReactNode;
	translate?: "yes" | "no";
	value?: unknown;
};

/**
 * Walks an element tree for the `Select.Item` with `value` and returns its
 * label. It reads the elements that the caller wrote, so it works on the
 * server, and it misses an item that a component of your own renders. It
 * stops at the first match.
 */
const isNodeList = (node: ReactNode): node is readonly ReactNode[] => Array.isArray(node);

const findItemLabel = (node: ReactNode, value: string): ItemLabel | null => {
	if (isNodeList(node)) {
		for (const child of node) {
			const found = findItemLabel(child, value);
			if (found != null) {
				return found;
			}
		}
		return null;
	}
	if (!isValidElement<ItemElementProps>(node)) {
		return null;
	}
	const { asChild, children, translate } = node.props;
	if (node.type === Item && node.props.value === value) {
		const label =
			asChild && isValidElement<{ children?: ReactNode }>(children)
				? children.props.children
				: children;
		return { value, label, translate };
	}
	return findItemLabel(children, value);
};

const SelectContext = createContext<SelectContextType | null>(null);

const useSelectContext = (): SelectContextType => {
	const context = use(SelectContext);
	if (context == null) {
		throw new Error("Select parts must be rendered inside Select.Root.");
	}
	return context;
};

/** Hides the native select that carries the value to the form, but keeps it in validation. */
const visuallyHidden = {
	position: "absolute",
	border: 0,
	width: 1,
	height: 1,
	padding: 0,
	margin: -1,
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap",
} as const;

type SelectProps = PropsWithChildren & {
	/**
	 * The `autocomplete` attribute of the hidden native select.
	 */
	autoComplete?: string;
	/**
	 * Whether the list is open on first render. Use for an uncontrolled open state.
	 * @default false
	 */
	defaultOpen?: boolean;
	/**
	 * The value on first render. Use for an uncontrolled value.
	 */
	defaultValue?: string;
	/**
	 * The reading direction of the list.
	 */
	dir?: "ltr" | "rtl";
	/**
	 * Whether the whole select is inert. The trigger stamps `data-disabled`.
	 * @default false
	 */
	disabled?: boolean;
	/**
	 * The `id` of the form the hidden native select belongs to, when it sits
	 * outside that form.
	 */
	form?: string;
	/**
	 * The `id` of the trigger button. `Field.Control` sets it for you.
	 */
	id?: string;
	/**
	 * The name of the hidden native select, submitted with its owning form.
	 */
	name?: string;
	/**
	 * Event handler called when the trigger button blurs. Runs after any
	 * `onBlur` passed on `Select.Trigger`.
	 */
	onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
	/**
	 * Event handler called when the value changes.
	 * @deprecated Use `onValueChange` instead.
	 */
	onChange?: (value: string) => void;
	/**
	 * Event handler called when the open state changes.
	 */
	onOpenChange?(open: boolean): void;
	/**
	 * Event handler called when the value changes.
	 */
	onValueChange?(value: string): void;
	/**
	 * The controlled open state. Pair with `onOpenChange`.
	 */
	open?: boolean;
	/**
	 * Ref for the trigger button.
	 */
	ref?: Ref<HTMLButtonElement>;
	/**
	 * Whether a value is required before the owning form submits.
	 * @default false
	 */
	required?: boolean;
	/**
	 * The controlled value. Pair with `onValueChange`.
	 */
	value?: string;
} & WithValidation &
	WithAriaInvalid;
/**
 * Displays a list of options for the user to pick from, triggered by a button.
 *
 * Use Select for a small, finite list of options (~2-15) where the user picks exactly one
 * and search/filtering is unnecessary. For larger lists or async/searchable data, use
 * Combobox. For picking multiple options, use MultiSelect.
 *
 * Pass `validation` here when the entire select has an explicit state. That
 * root state is forwarded to `Select.Trigger` and takes precedence over the
 * ambient `validation` from `Field.Item`. Note: rendered `Field.Errors` /
 * `Field.ErrorList` set `aria-invalid="true"` on the trigger via
 * `Field.Control`'s wiring, which still forces the trigger into the error
 * state; suppress the inferred error by passing `validation` on `Field.Item`
 * if a non-error `Select.Root` state needs to win in that case.
 *
 * `Select.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectroot
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
const Root = ({
	"aria-invalid": ariaInvalid,
	autoComplete,
	children,
	defaultOpen,
	defaultValue,
	dir,
	disabled,
	form,
	id,
	name,
	onBlur,
	// oxlint-disable-next-line typescript/no-deprecated -- Why: Root still honors the deprecated `onChange` alias until a breaking release removes it.
	onChange,
	// oxlint-disable-next-line typescript/unbound-method -- Why: the prop types use method syntax, and the callback never reads `this`.
	onOpenChange,
	// oxlint-disable-next-line typescript/unbound-method -- Why: the prop types use method syntax, and the callback never reads `this`.
	onValueChange,
	open,
	ref,
	required,
	validation,
	value,
}: SelectProps) => {
	const select = useSelect({
		value,
		defaultValue,
		onValueChange: (next) => {
			onChange?.(next);
			onValueChange?.(next);
		},
		open,
		defaultOpen,
		onOpenChange,
		disabled,
	});
	const resetToDefault = () => {
		if (defaultValue != null) {
			select.listbox.select(defaultValue);
		}
	};
	const contextValue = useMemo(
		() => ({
			...select,
			"aria-invalid": ariaInvalid,
			dir,
			id,
			labelFor: (item: string) => findItemLabel(children, item),
			onBlur,
			ref,
			validation,
		}),
		[select, ariaInvalid, children, dir, id, onBlur, ref, validation],
	);
	return (
		<SelectContext value={contextValue}>
			{children}
			{name != null && (
				<select
					aria-hidden
					tabIndex={-1}
					style={visuallyHidden}
					name={name}
					form={form}
					autoComplete={autoComplete}
					required={required}
					disabled={disabled}
					value={select.value ?? ""}
					onChange={(event) => {
						select.listbox.select(event.target.value);
					}}
					ref={(element) => {
						// Why a ref callback: a form reset returns an uncontrolled select to
						// `defaultValue`, and the listener lives as long as the element.
						const owner = element?.form;
						if (owner == null) {
							return;
						}
						owner.addEventListener("reset", resetToDefault);
						return () => owner.removeEventListener("reset", resetToDefault);
					}}
				>
					<option value="" />
					{select.value != null && <option value={select.value}>{select.value}</option>}
				</select>
			)}
		</SelectContext>
	);
};

/**
 * A group of related options within a select menu. Similar to an html `<optgroup>` element.
 * Pair it with `Select.Label`, which gives the group its accessible name.
 *
 * | Data Attribute | Value            | Description           |
 * | -------------- | ---------------- | --------------------- |
 * | `data-slot`    | `"select-group"` | On the group element. |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectgroup
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
const Group = ({
	asChild = false,
	children,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const labelId = useId();
	const Component = asChild ? Slot : "div";
	return (
		<GroupLabelContext value={labelId}>
			<Component
				role="group"
				aria-labelledby={labelId}
				ref={ref}
				data-slot={joinDataSlot(dataSlot, "select-group")}
				className={cx("space-y-px", className)}
				{...props}
			>
				{children}
			</Component>
		</GroupLabelContext>
	);
};

const GroupLabelContext = createContext<string | undefined>(undefined);

type SelectValueProps = Omit<ComponentProps<"span">, "placeholder"> &
	WithAsChild &
	WithDataSlot & {
		/**
		 * The content to show while the select has no value.
		 */
		placeholder?: ReactNode;
	};

/**
 * The part that reflects the selected value. Renders the selected item's text
 * by default. For more control, control the select and pass your own children.
 * Pass `placeholder` for the text to show when the select has no value.
 *
 * **Structure.** `placeholder` renders inside a
 * `<span data-slot="select-placeholder">`, your own `children` inside a
 * `<span data-slot="select-value-label">`, and the selected item's text arrives
 * inside the `select-item-label` span that `Select.Item` renders. Each span is
 * `display: contents`, so it lays out nothing of its own. React removes one of
 * those spans whenever the value changes, and an element removal cannot throw:
 * a browser translation engine reparents text nodes, and a removal aimed at a
 * reparented text node does.
 *
 * **Server render.** Before the items mount, the value reads the selected
 * item's text from the `Select.Item` elements under `Select.Root`, so the
 * server markup shows it. When a component of your own renders the item,
 * pass the text as `children`.
 *
 * **`asChild`.** The value's props merge onto your single child, which renders
 * as-is: no label span and no placeholder.
 *
 * | Data Attribute | Value                  | Description                                                                   |
 * | -------------- | ---------------------- | ----------------------------------------------------------------------------- |
 * | `data-slot`    | `"select-value"`       | On the value element.                                                         |
 * | `data-slot`    | `"select-placeholder"` | On the `<span>` wrapping `placeholder`. Present only while there is no value. |
 * | `data-slot`    | `"select-value-label"` | On the `<span>` wrapping your `children`. Absent under `asChild`.             |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectvalue
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
const Value = ({
	asChild = false,
	children,
	"data-slot": dataSlot,
	placeholder,
	ref,
	...props
}: SelectValueProps) => {
	const { labelFor, listbox, value } = useSelectContext();
	const selectedLabel = useStoreValue(listbox.store, (state) => state.selectedLabel);
	// Why `""` counts as no value: a cleared select shows its placeholder, as a native select does.
	const hasValue = value != null && value !== "";
	// Why the fallback: on the server and before the items mount, no item has
	// reported its label yet, so the value reads it from the item elements.
	let label = selectedLabel?.value === value ? selectedLabel : null;
	if (label == null && hasValue && children == null) {
		label = labelFor(value);
	}
	if (asChild) {
		return (
			<Slot ref={ref} data-slot={joinDataSlot(dataSlot, "select-value")} {...props}>
				{children}
			</Slot>
		);
	}
	return (
		<span ref={ref} data-slot={joinDataSlot(dataSlot, "select-value")} {...props}>
			{/* Why the spans: decisions/2026-08-04-translation-safe-label-wrappers.md */}
			{hasValue && children != null && (
				<span data-slot="select-value-label" className="contents">
					{children}
				</span>
			)}
			{hasValue && children == null && label != null && (
				<span data-slot="select-item-label" className="contents" translate={label.translate}>
					{label.label}
				</span>
			)}
			{!hasValue && placeholder != null && (
				<span data-slot="select-placeholder" className="contents">
					{placeholder}
				</span>
			)}
		</span>
	);
};

/** The trigger renders its label in a span, then the caret. */
const renderTriggerContent = (label: ReactNode) => (
	<>
		{/* Why the label span: decisions/2026-08-04-translation-safe-label-wrappers.md */}
		<span data-slot="select-trigger-label" className="contents">
			{label}
		</span>
		<Icon svg={<CaretDownIcon weight="bold" />} className="size-4" aria-hidden />
	</>
);

type SelectTriggerProps = ComponentProps<"button"> &
	WithAriaInvalid &
	WithAsChild &
	WithDataSlot &
	WithValidation;

/**
 * The button that toggles the select. The Select.Content will position itself adjacent to the trigger.
 * When composing with `Field.Item`, wrap `Select.Root` in `Field.Control`:
 * the generated `id`, `name`, and `aria-invalid` flow onto `Select.Root` (so
 * the hidden form input gets the field name), and the trigger reads
 * `aria-describedby` / `aria-errormessage` from `FieldControlContext`.
 *
 * **Structure.** `children` render inside a
 * `<span data-slot="select-trigger-label">`. The caret is a permanent element
 * sibling, so without the span a bare text child is never a lone child: a
 * browser translation engine reparents that text node, and the removal React
 * runs when the child changes shape or goes away throws. The span is
 * `display: contents`, so `Select.Value` stays a flex item of the trigger and
 * keeps its `gap`. A `[&>span]` class of your own now reaches the wrapper, not
 * `Select.Value`. Match the part's own variant instead:
 * `[&>[data-slot=select-trigger-label]>span]:line-clamp-none`.
 *
 * **`asChild`.** Your single child becomes the trigger element. The label
 * span and the caret move inside it, so the guarantee above holds on both paths.
 *
 * | Data Attribute     | Value                                   | Description                                                          |
 * | ------------------ | --------------------------------------- | -------------------------------------------------------------------- |
 * | `data-slot`        | `"select-trigger"`                      | On the trigger button.                                               |
 * | `data-slot`        | `"select-trigger-label"`                | On the `<span>` wrapping `children`.                                 |
 * | `data-state`       | `"open"` \| `"closed"`                  | Whether the list is open.                                            |
 * | `data-placeholder` | present when there is no value          | Presence-only. Style the placeholder text with `data-placeholder:`.  |
 * | `data-disabled`    | present when disabled                   | Presence-only. The `disabled` prop on `Select.Root`.                 |
 * | `data-validation`  | `"success"` \| `"warning"` \| `"error"` | The resolved `validation` state. Omitted when there is none.         |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selecttrigger
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
const Trigger = ({
	"aria-invalid": ariaInValidProp,
	asChild = false,
	className,
	children,
	"data-slot": dataSlot,
	id: propId,
	onBlur,
	onClick,
	onKeyDown,
	ref,
	validation: propValidation,
	...props
}: SelectTriggerProps) => {
	const ctx = useSelectContext();
	const fieldControl = use(FieldControlContext);
	const triggerProps = useSelectTrigger(ctx);
	const triggerRef = useComposedRefs(ref, ctx.ref, triggerProps.ref);
	const fieldValidation = useFieldValidation();
	const rawAriaInvalid = fieldControl
		? fieldControl["aria-invalid"]
		: (ctx["aria-invalid"] ?? ariaInValidProp);
	// Explicit Select props win over ambient Field validation. This lets
	// Field.Control override Field.Item while preserving Select.Root as the
	// highest-precedence select-level state.
	const rawValidation = ctx.validation ?? propValidation ?? fieldValidation;
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": rawAriaInvalid,
		validation: rawValidation,
	});
	const id = fieldControl ? fieldControl.id : (ctx.id ?? propId);
	const Component = asChild ? Slot : "button";

	return (
		<Component
			{...triggerProps}
			data-slot={joinDataSlot(dataSlot, "select-trigger")}
			data-placeholder={ctx.value == null || ctx.value === "" ? "" : undefined}
			className={cx(
				"h-9 text-sm",
				"border-form bg-form text-strong font-sans placeholder:text-placeholder hover:bg-form-hover hover:text-strong flex w-full items-center justify-between gap-1.5 rounded-md border px-3 py-2 disabled:pointer-events-none disabled:opacity-50",
				// Why slot-scoped: the label span is itself a `<span>`, so a bare `[&>span]`
				// would reach the wrapper. `line-clamp` sets `display`, which would undo
				// the wrapper's `contents` and give it a box.
				"[&>[data-slot=select-trigger-label]>span]:line-clamp-1 [&>[data-slot=select-trigger-label]>span]:text-left",
				"hover:border-neutral-400",
				"focus:focus-ring aria-expanded:focus-ring",
				"focus:border-accent-600 aria-expanded:border-accent-600",
				"data-validation-success:border-success-600 data-validation-success:focus:border-success-600 data-validation-success:focus:ring-focus-success data-validation-success:aria-expanded:border-success-600 data-validation-success:aria-expanded:ring-focus-success",
				"data-validation-warning:border-warning-600 data-validation-warning:focus:border-warning-600 data-validation-warning:focus:ring-focus-warning data-validation-warning:aria-expanded:border-warning-600 data-validation-warning:aria-expanded:ring-focus-warning",
				"data-validation-error:border-danger-600 data-validation-error:focus:border-danger-600 data-validation-error:focus:ring-focus-danger data-validation-error:aria-expanded:border-danger-600 data-validation-error:aria-expanded:ring-focus-danger motion-safe:data-validation-error:animate-shake",
				className,
			)}
			data-validation={validation || undefined}
			id={id}
			ref={triggerRef}
			{...props}
			onClick={composeHandlers(onClick, triggerProps.onClick)}
			onKeyDown={composeHandlers(onKeyDown, triggerProps.onKeyDown)}
			onBlur={(event: FocusEvent<HTMLButtonElement>) => {
				onBlur?.(event);
				ctx.onBlur?.(event);
				triggerProps.onBlur();
			}}
			{...(fieldControl
				? {
						"aria-describedby": fieldControl["aria-describedby"],
						"aria-errormessage": fieldControl["aria-errormessage"],
					}
				: undefined)}
			aria-invalid={ariaInvalid}
		>
			{asChild ? slotContent(children, renderTriggerContent) : renderTriggerContent(children)}
		</Component>
	);
};

/**
 * Under `asChild`, moves the part's own content inside the consumer's element:
 * `render` gets the element's children and returns what the element renders.
 * `Slot` then merges the part's props onto that element.
 */
const slotContent = (children: ReactNode, render: (inner: ReactNode) => ReactNode): ReactNode =>
	isValidElement<{ children?: ReactNode }>(children)
		? cloneElement(children, undefined, render(children.props.children))
		: children;

type SelectContentProps = Omit<ComponentProps<"div">, "dir"> &
	WithDataSlot & {
		/**
		 * The width of the content. Defaults to the width of the trigger.
		 * If set to "content", the content takes its intrinsic width: the width of the widest item.
		 * @default "trigger"
		 */
		width?: "trigger" | "content";
	};

/**
 * The component that pops out when the select is open as a portal adjacent to the trigger button.
 * It contains a scrolling list of the select items, and opens below the
 * trigger, or above it when the space below is too small.
 *
 * `Select.Content` renders at Tailwind `z-50`, Mantle's float tier. When
 * composed inside an open `Dialog`, `AlertDialog`, or `Sheet`, it portals into
 * that overlay's positioner and paints above the overlay that owns it. Outside
 * every overlay, it portals to `document.body`, below the overlay tier
 * (`z-60`). When sibling floats share a container, the most recently mounted
 * float paints on top.
 *
 * | Data Attribute | Value                                          | Description                                                            |
 * | -------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
 * | `data-slot`    | `"select-content"`                             | On the content element.                                                |
 * | `data-state`   | `"open"` \| `"closed"`                         | Drives the open and close animations.                                  |
 * | `data-side`    | `"top"` \| `"bottom"`                           | The side of the trigger the list opened on.                            |
 * | `data-align`   | `"start"`                                      | The alignment against the trigger.                                     |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectcontent
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
const Content = ({
	className,
	children,
	"data-slot": dataSlot,
	ref,
	width = "trigger",
	...props
}: SelectContentProps) => {
	const { dir, listbox, open, triggerRef } = useSelectContext();
	const { host, popupRef } = usePopup({
		open,
		anchorRef: triggerRef,
		container: useLayerContainer(),
		modal: enterModal,
	});
	const composedRef = useComposedRefs(ref, listbox.ref, popupRef);

	return (
		host != null &&
		createPortal(
			<div
				{...props}
				{...listbox.listboxProps}
				ref={composedRef}
				dir={dir}
				data-slot={joinDataSlot(dataSlot, "select-content")}
				data-state={open ? "open" : "closed"}
				data-align="start"
				className={cx(
					"border-popover duration-200 ease-out-strong data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95 data-side-bottom:slide-in-from-top-1 data-side-top:slide-in-from-bottom-1 motion-reduce:animate-none! relative z-50 max-h-96 min-w-32 overflow-y-auto rounded-md border shadow-md",
					"bg-popover font-sans p-1 space-y-px max-h-(--available-height) outline-hidden",
					width === "trigger" && "w-(--anchor-width)",
					className,
				)}
			>
				{children}
			</div>,
			host,
		)
	);
};

/**
 * Used to render the label of a group. It won't be focusable using arrow keys.
 *
 * | Data Attribute | Value            | Description                 |
 * | -------------- | ---------------- | --------------------------- |
 * | `data-slot`    | `"select-label"` | On the group label element. |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectlabel
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
const Label = ({
	asChild = false,
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<"div"> & WithAsChild & WithDataSlot) => {
	const Component = asChild ? Slot : "div";
	return (
		<Component
			id={use(GroupLabelContext)}
			ref={ref}
			data-slot={joinDataSlot(dataSlot, "select-label")}
			className={cx("px-2 py-1.5 text-sm font-medium", className)}
			{...props}
		/>
	);
};

type SelectItemProps = Omit<ComponentProps<"div">, "children"> &
	WithAsChild &
	WithDataSlot & {
		children?: ReactNode;
		/**
		 * Whether the option is inert.
		 */
		disabled?: boolean;
		/**
		 * An optional icon to display before the item text.
		 */
		icon?: ReactNode;
		/**
		 * The text that typeahead matches. Defaults to the item's text content.
		 */
		textValue?: string;
		/**
		 * The value the select takes when the user picks this item.
		 */
		value: string;
	};

/**
 * An option within a select menu. Similar to an html `<option>` element.
 * Has a required `value` prop. When a user selects this item, `Select.Root`
 * passes that value to its `onValueChange` handler.
 * Displays the children as the option's text. Pass `icon` to render an icon
 * before the text.
 *
 * **Structure.** `children` render inside a `<span data-slot="select-item-label">`.
 * `Select.Value` renders a copy of that span while the item is selected and
 * removes it when the selection changes. The span exists so the node React
 * removes is an element: a browser translation engine reparents text nodes,
 * and a removal aimed at one throws. The span is `display: contents`, so it
 * lays out nothing of its own in the list or in the trigger. To style it as a
 * box, set a display of your own on it first.
 *
 * **Untranslatable labels.** When the label is an ID, a path, a filename, or a
 * key, set `translate="no"` on the item. The attribute also rides on the label
 * span, so the copy the trigger shows stays untranslated too.
 *
 * **`asChild`.** Your single child becomes the option element. The label
 * span and the indicator move inside it, so the guarantee above holds on both paths.
 *
 * | Data Attribute     | Value                        | Description                                                          |
 * | ------------------ | ---------------------------- | -------------------------------------------------------------------- |
 * | `data-slot`        | `"select-item"`              | On the option element.                                               |
 * | `data-slot`        | `"select-item-label"`        | On the `<span>` wrapping `children`, in the list and in the trigger. |
 * | `data-state`       | `"checked"` \| `"unchecked"` | Whether this item is the selected value.                             |
 * | `data-highlighted` | present when highlighted     | Presence-only. The item under the pointer or the keyboard focus.     |
 * | `data-disabled`    | present when disabled        | Presence-only. The `disabled` prop.                                  |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectitem
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
const Item = ({
	asChild = false,
	className,
	children,
	"data-slot": dataSlot,
	disabled,
	icon,
	ref,
	textValue,
	translate,
	value,
	...props
}: SelectItemProps) => {
	const { listbox } = useSelectContext();
	const { selected, optionProps } = useOption(listbox, { value, disabled, textValue });
	const label =
		asChild && isValidElement<{ children?: ReactNode }>(children)
			? children.props.children
			: children;
	const composedRef = useComposedRefs(ref, (node: HTMLElement | null) => {
		// Why a ref callback: the selected item hands its label to `Select.Value`
		// in the commit that mounts or selects it.
		if (node != null && selected) {
			listbox.store.set({ selectedLabel: { value, label, translate } });
		}
	});
	const renderContent = (inner: ReactNode) => (
		<>
			{icon && <Icon svg={icon} />}
			<span data-slot="select-item-label" className="contents" translate={translate}>
				{inner}
			</span>
			{selected && (
				<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
					<Icon svg={<CheckIcon weight="bold" />} className="size-4 text-accent-600" />
				</span>
			)}
		</>
	);
	const Component = asChild ? Slot : "div";
	return (
		<Component
			{...props}
			{...optionProps}
			ref={composedRef}
			data-slot={joinDataSlot(dataSlot, "select-item")}
			translate={translate}
			className={cx(
				"relative flex gap-2 w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-2 pr-8 text-strong text-sm outline-hidden",
				"data-highlighted:bg-active-menu-item",
				"data-disabled:pointer-events-none data-disabled:opacity-50",
				"data-state-checked:bg-selected-menu-item",
				"data-highlighted:data-state-checked:bg-active-selected-menu-item",
				className,
			)}
		>
			{asChild ? slotContent(children, renderContent) : renderContent(children)}
		</Component>
	);
};

/**
 * Used to visually separate items or groups of items in the select content.
 *
 * | Data Attribute | Value                | Description               |
 * | -------------- | -------------------- | ------------------------- |
 * | `data-slot`    | `"select-separator separator"` | On the separator element, joined ahead of `Separator`'s own slot. |
 *
 * @see https://mantle.ngrok.com/components/forms/select#selectseparator
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
const SelectSeparatorComponent = ({
	className,
	"data-slot": dataSlot,
	ref,
	...props
}: ComponentProps<typeof Separator> & WithDataSlot) => (
	<Separator
		ref={ref}
		data-slot={joinDataSlot(dataSlot, "select-separator")}
		className={cx("-mx-1 my-1 h-px w-auto", className)}
		{...props}
	/>
);

export {
	//,
	Root,
	Content,
	Group,
	Item,
	Label,
	SelectSeparatorComponent,
	Trigger,
	Value,
};
