"use client";

import type {
	ComponentProps,
	FocusEvent,
	PropsWithChildren,
	ReactNode,
	Ref,
	SelectHTMLAttributes,
} from "react";
import { createContext, isValidElement, use, useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { composeHandlers } from "../../behaviors/compose-handlers.js";
import { useStoreValue } from "../../behaviors/store.js";
import { childId, useOption } from "../../behaviors/use-listbox.js";
import { usePopup } from "../../behaviors/use-popup.js";
import { useSelect, useSelectTrigger } from "../../behaviors/use-select.js";
import type { SelectBehavior } from "../../behaviors/use-select.js";
import type { WithAsChild } from "../../types/as-child.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { cx } from "../../utils/cx/cx.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { FieldControlContext } from "../field/field-context.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { WithValidation } from "../field/validation.js";
import { Icon } from "../icon/icon.js";
import { Separator } from "../separator/separator.js";
import { Slot } from "../slot/index.js";
import { slotContent } from "../slot/slot.js";

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
		/**
		 * Whether a value is required before the owning form submits.
		 */
		required?: boolean;
		/**
		 * The `id` of the form the select belongs to, when it is not an ancestor.
		 */
		form?: string;
		/**
		 * Returns the select to `defaultValue`, or to no value, on a form reset.
		 */
		reset: () => void;
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

/**
 * The last value each native select reported to its form. An option that
 * mounts with another value dispatches a change. It holds nothing once the
 * select is gone.
 */
const committedValues = new WeakMap<HTMLSelectElement, string>();

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
 * `Select.Content` is a `popover="manual"` element in the top layer, so it paints
 * above the page and every overlay. It portals into the overlay or float that
 * holds it, such as an open `Dialog` or `Popover.Content`, else into
 * `document.body`. In a browser with no popover API, it is a fixed box at
 * Tailwind `z-50`.
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
	const contextValue = useMemo(
		() => ({
			...select,
			"aria-invalid": ariaInvalid,
			dir,
			id,
			form,
			labelFor: (item: string) => findItemLabel(children, item),
			onBlur,
			ref,
			required,
			reset: () => select.listbox.select(defaultValue ?? ""),
			validation,
		}),
		[select, ariaInvalid, children, defaultValue, dir, form, id, onBlur, ref, required, validation],
	);
	return (
		<SelectContext value={contextValue}>
			{children}
			{/* Why `required` too: the native select blocks the submit of an empty required select. */}
			{(name != null || required) && (
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
					// Why: a failed `required` check focuses this select, and the user must
					// land on the trigger.
					onFocus={() => select.triggerRef.current?.focus()}
					onChange={(event) => {
						// Why: the browser already dispatched this change.
						committedValues.set(event.currentTarget, event.target.value);
						select.listbox.select(event.target.value);
					}}
					ref={(element) => {
						if (element != null && !committedValues.has(element)) {
							committedValues.set(element, element.value);
						}
					}}
				>
					<option value="" />
					{select.value != null && (
						<option
							key={select.value}
							value={select.value}
							ref={(option) => {
								// Why a ref callback on a keyed option: it mounts in the commit that
								// gives the native select a new value. The bubbling change lets a
								// `<form onChange>` see it, as a native select does.
								const native = option?.parentElement;
								if (!(native instanceof HTMLSelectElement) || option == null) {
									return;
								}
								// Why: a native form reset selects the option marked as the default,
								// and a client render marks none.
								if (option.value === defaultValue) {
									option.setAttribute("selected", "");
								}
								const previous = committedValues.get(native);
								committedValues.set(native, option.value);
								if (previous != null && previous !== option.value) {
									native.dispatchEvent(new Event("change", { bubbles: true }));
								}
							}}
						>
							{select.value}
						</option>
					)}
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
	// Why `""` counts as no value: a cleared select shows its placeholder, as a native select does.
	const hasValue = value != null && value !== "";
	// Why the item elements first: they render on the server and carry the
	// current text while the list is closed. `ReportedLabel` covers an item
	// that a component of your own renders.
	const label = hasValue && children == null ? labelFor(value) : null;
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
			{label != null && renderItemLabel(label)}
			{hasValue && children == null && label == null && (
				<ReportedLabel listbox={listbox} value={value} />
			)}
			{!hasValue && placeholder != null && (
				<span data-slot="select-placeholder" className="contents">
					{placeholder}
				</span>
			)}
		</span>
	);
};

/** The selected item's text, in the span that `Select.Item` also renders. */
const renderItemLabel = (label: ItemLabel) => (
	<span data-slot="select-item-label" className="contents" translate={label.translate}>
		{label.label}
	</span>
);

/**
 * The label that an open item reported for `value`. Only a value whose item
 * the root cannot find renders it, so other closed selects hold no
 * subscription to the store.
 */
const ReportedLabel = ({
	listbox,
	value,
}: {
	listbox: SelectBehavior["listbox"];
	value: string;
}) => {
	const reported = useStoreValue(listbox.getStore(), (state) =>
		state.itemLabel?.value === value ? state.itemLabel : null,
	);
	return reported != null && renderItemLabel(reported);
};

/** The trigger renders its label in a span, then the caret. */
const renderTriggerContent = (label: ReactNode) => (
	<>
		{/* Why the label span: decisions/2026-08-04-translation-safe-label-wrappers.md */}
		<span data-slot="select-trigger-label" className="contents">
			{label}
		</span>
		{/* Why an inline svg: one host element in place of four parts for each closed select. */}
		<svg
			aria-hidden
			data-slot="icon svg-only"
			viewBox="0 0 256 256"
			fill="currentColor"
			className="size-4 shrink-0"
		>
			<path d="M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z" />
		</svg>
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
	const triggerRef = useComposedRefs(ref, triggerProps.ref, ctx.ref);
	// Why the trigger: a form reset returns the select to its default with or
	// without a native select, and the listener lives as long as the trigger.
	useEffect(() => {
		const node = ctx.triggerRef.current;
		const owner =
			ctx.form == null ? node?.closest("form") : node?.ownerDocument.getElementById(ctx.form);
		if (!(owner instanceof HTMLFormElement)) {
			return;
		}
		owner.addEventListener("reset", ctx.reset);
		return () => owner.removeEventListener("reset", ctx.reset);
	}, [ctx.triggerRef, ctx.form, ctx.reset]);
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
			aria-required={ctx.required || undefined}
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
			aria-activedescendant={triggerProps["aria-activedescendant"]}
		>
			{asChild ? slotContent(children, renderTriggerContent) : renderTriggerContent(children)}
		</Component>
	);
};

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
 * `Select.Content` is a `popover="manual"` element in the top layer, so it paints
 * above the page and every overlay. It portals into the overlay or float that
 * holds it, such as an open `Dialog` or `Popover.Content`, else into
 * `document.body`. In a browser with no popover API, it is a fixed box at
 * Tailwind `z-50`.
 *
 * | Data Attribute | Value                                          | Description                                                            |
 * | -------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
 * | `data-slot`    | `"select-content"`                             | On the content element.                                                |
 * | `data-slot`    | `"select-viewport"`                            | On the listbox inside it, which scrolls and fades.                     |
 * | `data-state`   | `"open"`                                       | Drives the open animation. A closed list renders nothing.              |
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
const Content = (props: SelectContentProps) =>
	useSelectContext().open && <OpenContent {...props} />;

/** The open list. A closed select mounts none of it: no popup, store, or listener. */
const OpenContent = ({
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	"aria-describedby": ariaDescribedBy,
	onScroll,
	onScrollEnd,
	className,
	children,
	"data-slot": dataSlot,
	ref,
	width = "trigger",
	...props
}: SelectContentProps) => {
	const {
		dir,
		listbox: { listboxProps },
		setOpen,
		triggerRef,
	} = useSelectContext();
	const { portalTarget, popupRef } = usePopup({
		anchorRef: triggerRef,
		ownerRef: triggerRef,
		onOutsidePress: () => setOpen(false),
	});
	const composedRef = useComposedRefs(ref, popupRef, listboxProps.ref);

	return (
		portalTarget != null &&
		createPortal(
			<div
				{...props}
				role="presentation"
				popover="manual"
				onMouseDown={composeHandlers(props.onMouseDown, listboxProps.onMouseDown)}
				ref={composedRef}
				dir={dir}
				data-slot={joinDataSlot(dataSlot, "select-content")}
				data-state="open"
				data-align="start"
				className={cx(
					"border-popover duration-200 ease-out-strong data-state-open:animate-in data-state-open:fade-in-0 data-state-open:zoom-in-95 data-side-bottom:slide-in-from-top-1 data-side-top:slide-in-from-bottom-1 motion-reduce:animate-none! pointer-events-auto fixed inset-auto z-50 m-0 text-inherit min-w-32 flex flex-col rounded-md border shadow-md",
					"bg-popover font-sans max-h-(--available-height) outline-hidden",
					width === "trigger" && "w-(--anchor-width)",
					className,
				)}
			>
				{/* Why the listbox is a viewport inside the popup: the fade masks it, so the border, the shadow, and the open animation stay whole. */}
				<div
					id={listboxProps.id}
					role="listbox"
					tabIndex={-1}
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy}
					aria-describedby={ariaDescribedBy}
					// Why: the viewport scrolls, and scroll events do not bubble.
					onScroll={onScroll}
					onScrollEnd={onScrollEnd}
					// Why: a dialog lets the list take Escape only while the controlled element is open.
					data-state="open"
					data-slot="select-viewport"
					data-float-viewport
					className="relative min-h-0 overflow-y-auto overflow-x-hidden scroll-fade-y scrollbar-none [&::-webkit-scrollbar]:hidden overscroll-y-none scroll-py-6 p-1 space-y-px"
				>
					{children}
				</div>
			</div>,
			portalTarget,
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
	onClick,
	onPointerMove,
	ref,
	textValue,
	translate,
	value,
	...props
}: SelectItemProps) => {
	const { listbox } = useSelectContext();
	const { selected, optionProps } = useOption(listbox, {
		value,
		disabled,
		textValue,
		id: childId({ asChild, children, id: props.id }),
	});
	const label =
		asChild && isValidElement<{ children?: ReactNode }>(children)
			? children.props.children
			: children;
	const reportLabel = () => {
		listbox.getStore().set({ itemLabel: { value, label, translate } });
	};
	const composedRef = useComposedRefs(ref, (node: HTMLElement | null) => {
		// Why a ref callback: the selected item hands its label to `Select.Value`
		// when the list opens, and a pick reports in its click handler, which
		// Enter and Alt+ArrowUp also run.
		if (node != null && selected) {
			reportLabel();
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
					<svg
						aria-hidden
						data-slot="icon svg-only"
						viewBox="0 0 256 256"
						fill="currentColor"
						className="size-4 shrink-0 text-accent-600"
					>
						<path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
					</svg>
				</span>
			)}
		</>
	);
	const Component = asChild ? Slot : "div";
	return (
		<Component
			{...props}
			{...optionProps}
			onClick={composeHandlers(onClick, () => {
				// Why: a tap can pick an item that no pointer move highlighted.
				reportLabel();
				optionProps.onClick();
			})}
			onPointerMove={composeHandlers(onPointerMove, optionProps.onPointerMove)}
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
