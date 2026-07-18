"use client";

import { cloneElement, createContext, isValidElement, useContext, useId, useMemo } from "react";
import type { ComponentProps, ReactNode } from "react";
import invariant from "tiny-invariant";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import { FieldControlContext } from "../field/field-context.js";
import { Label } from "../label/label.js";
import { Slot } from "../slot/index.js";

/**
 * Association + identity props `Choice.Indicator` injects onto the control it
 * wraps, so the control, `Choice.Label`'s `htmlFor`, and the description
 * association all resolve from one shared id without the caller threading ids.
 */
type ChoiceControlProps = {
	id: string;
	name: string | undefined;
	disabled: boolean;
	"aria-describedby": string | undefined;
	"aria-invalid": ComponentProps<"input">["aria-invalid"];
	"aria-errormessage": string | undefined;
};

/**
 * Shared identity between the parts of a `Choice`. `Root` owns the control's
 * `id` (used by `Label`'s `htmlFor`) and the description's `id` (referenced by
 * the control's `aria-describedby`), and pre-computes the props `Indicator`
 * injects onto the control.
 */
type ChoiceContextValue = {
	/** DOM id of the control; `Choice.Label` consumes it as its `htmlFor` target. */
	controlId: string;
	/** DOM id of the description slot; the control's `aria-describedby` points here. */
	descriptionId: string;
	/** Whether the choice is disabled, so `Label` / `Title` / `Description` dim in step. */
	disabled: boolean;
	/** Props `Choice.Indicator` injects onto its control child. */
	controlProps: ChoiceControlProps;
};

const ChoiceContext = createContext<ChoiceContextValue | null>(null);

/**
 * Read the nearest {@link ChoiceContext}. Throws when a part is rendered outside
 * `Choice.Root` so misuse fails loudly rather than silently dropping the
 * label/description association.
 */
function useChoiceContext(part: string): ChoiceContextValue {
	const context = useContext(ChoiceContext);
	invariant(context, `Choice.${part} must be rendered inside Choice.Root.`);
	return context;
}

/**
 * Props for `Choice.Root`. Extends `<div>` props (minus `id`, narrowed below)
 * with the disabled / id / name controls. Inside a `Field.Control`, the field's
 * `id` / `name` / `aria-*` take precedence over these.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
type ChoiceRootProps = Omit<ComponentProps<"div">, "id"> & {
	/** Marks the choice disabled — dims the text and is injected onto the control. */
	disabled?: boolean;
	/**
	 * Explicit control id. Defaults to a generated id, or — when composed inside a
	 * `Field.Control` — the field's id, so `Field.Label` and `Choice.Label` resolve
	 * to the same control.
	 */
	id?: string;
	/** Form value name for the control. Inherited from `Field` when composed within one. */
	name?: string;
	/** `Choice.Indicator`, a `Choice.Content` (with `Label` / `Title` + `Description`). */
	children: ReactNode;
};

/**
 * Root of a `Choice`: the indicator-left / content-right layout for pairing a
 * checkbox or radio with a titled, multi-line label. Owns the control's `id` and the
 * description's `id`, and — when rendered inside a `Field.Control` — reads the
 * field's `id` / `name` / `aria-*` from `FieldControlContext` and merges them
 * into the props `Indicator` injects onto the control (the field's
 * `aria-describedby` is concatenated with this `Choice`'s own description id).
 * Outside a `Field` it falls back to its own generated ids, so the two compose
 * but neither requires the other.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Root = ({
	"aria-describedby": ariaDescribedBy,
	"aria-errormessage": ariaErrorMessage,
	"aria-invalid": ariaInvalid,
	children,
	className,
	disabled = false,
	id,
	name,
	ref,
	...props
}: ChoiceRootProps) => {
	const fieldControl = useContext(FieldControlContext);
	// Read the field values as primitives. `Field.Control` rebuilds its context
	// object every render, so depending on the object would defeat the memo
	// below — depend on these stable strings instead.
	const fieldId = fieldControl?.id;
	const fieldName = fieldControl?.name;
	const fieldDescribedBy = fieldControl?.["aria-describedby"];
	const fieldAriaInvalid = fieldControl?.["aria-invalid"];
	const fieldErrorMessage = fieldControl?.["aria-errormessage"];
	const generatedId = useId();
	const descriptionId = useId();
	const controlId = fieldId ?? id ?? generatedId;
	// Reference our own description slot and append any inherited describedby
	// (a Field.Control's description/error ids, or a caller-supplied one). Inside
	// a Field the value can arrive via both context and a cloned prop, so prefer
	// one (`??`, not both) to avoid listing the same id twice. Per WAI-ARIA an
	// unresolved IDREF is ignored, so the description id is harmless when no
	// Description is rendered.
	const inheritedDescribedBy = fieldDescribedBy ?? ariaDescribedBy;
	const describedBy = [inheritedDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined;

	const context = useMemo<ChoiceContextValue>(
		() => ({
			controlId,
			descriptionId,
			disabled,
			controlProps: {
				id: controlId,
				name: fieldName ?? name,
				disabled,
				"aria-describedby": describedBy,
				"aria-invalid": fieldAriaInvalid ?? ariaInvalid,
				"aria-errormessage": fieldErrorMessage ?? ariaErrorMessage,
			},
		}),
		[
			controlId,
			descriptionId,
			disabled,
			describedBy,
			fieldName,
			name,
			fieldAriaInvalid,
			ariaInvalid,
			fieldErrorMessage,
			ariaErrorMessage,
		],
	);

	return (
		<ChoiceContext.Provider value={context}>
			{/* items-start so the indicator aligns to the first line when the title wraps. */}
			<div
				ref={ref}
				data-slot="choice"
				className={cx("flex w-full items-start gap-2", className)}
				{...props}
			>
				{children}
			</div>
		</ChoiceContext.Provider>
	);
};
Root.displayName = "Choice";

type ChoiceIndicatorProps = ComponentProps<"span">;

/**
 * The left control slot of a `Choice` — drop the control here (a `Checkbox`, a
 * radio indicator, a `Switch`, …). Its single element child is cloned with the
 * shared `id` / `name` / `aria-*` / `disabled` from `Root`, so a control placed
 * here is wired to `Choice.Label` and the description without the caller
 * threading ids. A non-element child (or none) is rendered untouched.
 *
 * The slot is one line tall (`h-lh`) using the same `text-sm` line box as the
 * title, and centers its child — so the control sits centered on the title's
 * first line and stays put when the title wraps.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Indicator = ({ children, className, ref, ...props }: ChoiceIndicatorProps) => {
	const { controlProps } = useChoiceContext("Indicator");
	// Inject the association props onto the control. `id` and `aria-describedby`
	// are owned by Choice and always win. `disabled` / `name` / `aria-invalid` /
	// `aria-errormessage`, though, may have been set on the control itself — only
	// override those when Choice (or a Field) actually provides a value, so a
	// `<Checkbox disabled name="x" />` placed here isn't silently reset.
	const control: ReactNode = isValidElement<Record<string, unknown>>(children)
		? cloneElement(children, {
				...controlProps,
				disabled: controlProps.disabled || children.props.disabled === true,
				name: controlProps.name ?? children.props.name,
				"aria-invalid": controlProps["aria-invalid"] ?? children.props["aria-invalid"],
				"aria-errormessage":
					controlProps["aria-errormessage"] ?? children.props["aria-errormessage"],
			})
		: children;

	return (
		<span
			ref={ref}
			data-slot="choice-indicator"
			// `h-lh` resolves to this element's own line-height, so it must share the
			// title's `text-sm` line box (14px / 20px) — otherwise the slot would size
			// to the inherited line-height and the control could not center on the
			// title's first line. `items-center` then centers the control in that
			// one-line box; `items-start` on Root keeps it on the first line when the
			// title wraps.
			className={cx("flex h-lh shrink-0 items-center text-sm", className)}
			{...props}
		>
			{control}
		</span>
	);
};
Indicator.displayName = "ChoiceIndicator";

type ChoiceContentProps = ComponentProps<"div"> & WithAsChild;

/**
 * The right column of a `Choice` — stacks a `Choice.Label` / `Choice.Title` over
 * an optional `Choice.Description`. `min-w-0` so long titles truncate instead of
 * pushing the row wide.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Content = ({ asChild, className, ref, ...props }: ChoiceContentProps) => {
	const Comp = asChild ? Slot : "div";

	return (
		<Comp
			ref={ref}
			data-slot="choice-content"
			className={cx("flex min-w-0 flex-1 flex-col gap-0.5", className)}
			{...props}
		/>
	);
};
Content.displayName = "ChoiceContent";

/**
 * Props for `Choice.Label`. The mantle `Label` props, minus `htmlFor` and
 * `disabled` — those are owned by `Choice.Root` (the control id and the choice's
 * disabled state) and are not part of the public surface, so consumer props can
 * never override the label-to-control wiring.
 */
type ChoiceLabelProps = Omit<ComponentProps<typeof Label>, "htmlFor" | "disabled">;

/**
 * The emphasized title of a `Choice`, rendered as a real `<label>` wired to the
 * control by `htmlFor`, so clicking it toggles the control and it supplies the
 * control's accessible name. Use this when the `Choice` owns the labeling (a
 * standalone checkbox, a raw `<form>`, React-state-only).
 *
 * It is the mantle {@link Label} (not a re-implementation), so it keeps every
 * base-label behavior — cursor, the double-click text-selection guard, and the
 * auto `font-medium` — and mirrors how `Field.Label` reuses `Label`. When an
 * ancestor already owns the labeling and click target (a fully-clickable list
 * row or a Headless radio item), use `Choice.Title` instead — a label-less `<p>`
 * (it accepts `asChild`) — so labels never nest or compete.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const ChoiceLabel = ({ className, ref, ...props }: ChoiceLabelProps) => {
	const { controlId, disabled } = useChoiceContext("Label");

	// Reuse the real `Label` rather than re-implementing it, so the title keeps
	// all of `Label`'s styling and behavior. `htmlFor` / `disabled` come from
	// `Choice.Root` and are applied after `{...props}` so the wiring always wins.
	return (
		<Label
			ref={ref}
			data-slot="choice-label"
			className={cx(disabled && "opacity-50", className)}
			{...props}
			htmlFor={controlId}
			disabled={disabled}
		/>
	);
};

/**
 * The emphasized title of a `Choice`, label-styled but **not** a `<label>` —
 * renders a `<p>`. Mirrors `Field.LabelText`. Use this when something else owns
 * the control's labeling and click target: a fully-clickable list row or a
 * Headless radio item. It avoids nesting two `<label>`s or splitting
 * the click target. Pass `asChild` to supply your own element. For a standalone
 * control — or inside a `Field` — where the title can be the label, use
 * `Choice.Label`.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root id="onboarding-key">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Title>Onboarding Key</Choice.Title>
 *     <Choice.Description>ng-3FaThZL***8xiA</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Title = ({ asChild, className, ref, ...props }: ComponentProps<"p"> & WithAsChild) => {
	const { disabled } = useChoiceContext("Title");
	const Comp = asChild ? Slot : "p";

	return (
		<Comp
			ref={ref}
			data-slot="choice-title"
			className={cx(
				"text-strong text-sm font-medium font-sans",
				disabled && "opacity-50",
				className,
			)}
			{...props}
		/>
	);
};
Title.displayName = "ChoiceTitle";

/**
 * The de-emphasized supplementary line of a `Choice`, in the muted body color
 * and wired to the control via `aria-describedby` (never a second label).
 * Renders a `<p>`; pass `asChild` to supply your own element.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Description = ({ asChild, className, ref, ...props }: ComponentProps<"p"> & WithAsChild) => {
	const { descriptionId, disabled } = useChoiceContext("Description");
	const Comp = asChild ? Slot : "p";

	return (
		<Comp
			ref={ref}
			id={descriptionId}
			data-slot="choice-description"
			className={cx("text-body text-sm leading-4", disabled && "opacity-50", className)}
			{...props}
		/>
	);
};
Description.displayName = "ChoiceDescription";

/**
 * A reusable indicator-left / content-right layout for a single choice: a
 * control (checkbox, radio, switch) beside an emphasized title and an optional
 * de-emphasized description. Use it to pair a checkbox or radio with a rich,
 * titled label, or reach for it directly to build your own choice-like rows.
 *
 * It is a pure layout + association primitive: it owns the control's `id` and
 * the description's `id` and wires them together, but does **not** own the
 * control's value — drop your own control into `Choice.Indicator`. Pick
 * `Choice.Label` (a real `<label>`) when the `Choice` owns the labeling, or
 * `Choice.Title` (label-less text) when an ancestor (a clickable row or a
 * Headless radio item) already does.
 *
 * **Use it for choice-like layouts** — a checkbox or radio input that needs an
 * associated label and an optional supplementary description. It is not a
 * general-purpose layout primitive; for laying out non-control content, reach
 * for a plain flex/grid or `MediaObject` instead.
 *
 * **Field interop.** Inside a `Field.Control`, `Choice.Root` reads the field's
 * `id` / `name` / `aria-*` and merges its description into the control's
 * `aria-describedby`. Outside a `Field` it uses its own generated ids — the two
 * are aware of each other but neither is required.
 *
 * @see https://mantle.ngrok.com/components/forms/choice
 *
 * @example
 * Composition:
 * ```
 * Choice.Root
 * ├── Choice.Indicator
 * └── Choice.Content
 *     ├── Choice.Label        (or Choice.Title — pick one)
 *     └── Choice.Description
 * ```
 *
 * @example
 * ```tsx
 * <Choice.Root name="notify">
 *   <Choice.Indicator>
 *     <Checkbox />
 *   </Choice.Indicator>
 *   <Choice.Content>
 *     <Choice.Label>Email</Choice.Label>
 *     <Choice.Description>Get notified by email.</Choice.Description>
 *   </Choice.Content>
 * </Choice.Root>
 * ```
 */
const Choice: {
	Root: typeof Root;
	Indicator: typeof Indicator;
	Content: typeof Content;
	Label: typeof ChoiceLabel;
	Title: typeof Title;
	Description: typeof Description;
} = {
	/**
	 * Root: the layout + id/association owner. Reads `FieldControlContext` when
	 * present so a `Field`'s id/name/aria flow onto the control.
	 *
	 * @see https://mantle.ngrok.com/components/forms/choice
	 *
	 * @example
	 * ```tsx
	 * <Choice.Root name="notify">
	 *   <Choice.Indicator>
	 *     <Checkbox />
	 *   </Choice.Indicator>
	 *   <Choice.Content>
	 *     <Choice.Label>Email</Choice.Label>
	 *     <Choice.Description>Get notified by email.</Choice.Description>
	 *   </Choice.Content>
	 * </Choice.Root>
	 * ```
	 */
	Root,
	/**
	 * Indicator: the left control slot. Clones its element child with the shared
	 * id/aria/name so the control is wired without threading ids.
	 *
	 * @see https://mantle.ngrok.com/components/forms/choice
	 *
	 * @example
	 * ```tsx
	 * <Choice.Root name="notify">
	 *   <Choice.Indicator>
	 *     <Checkbox />
	 *   </Choice.Indicator>
	 *   <Choice.Content>
	 *     <Choice.Label>Email</Choice.Label>
	 *     <Choice.Description>Get notified by email.</Choice.Description>
	 *   </Choice.Content>
	 * </Choice.Root>
	 * ```
	 */
	Indicator,
	/**
	 * Content: the right column that stacks the title over the description.
	 *
	 * @see https://mantle.ngrok.com/components/forms/choice
	 *
	 * @example
	 * ```tsx
	 * <Choice.Root name="notify">
	 *   <Choice.Indicator>
	 *     <Checkbox />
	 *   </Choice.Indicator>
	 *   <Choice.Content>
	 *     <Choice.Label>Email</Choice.Label>
	 *     <Choice.Description>Get notified by email.</Choice.Description>
	 *   </Choice.Content>
	 * </Choice.Root>
	 * ```
	 */
	Content,
	/**
	 * Label: the title as a real `<label htmlFor>`. Use when the `Choice` owns
	 * labeling (standalone control); otherwise use `Choice.Title`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/choice
	 *
	 * @example
	 * ```tsx
	 * <Choice.Root name="notify">
	 *   <Choice.Indicator>
	 *     <Checkbox />
	 *   </Choice.Indicator>
	 *   <Choice.Content>
	 *     <Choice.Label>Email</Choice.Label>
	 *     <Choice.Description>Get notified by email.</Choice.Description>
	 *   </Choice.Content>
	 * </Choice.Root>
	 * ```
	 */
	Label: ChoiceLabel,
	/**
	 * Title: the title as label-less text (`<p>`). Use when an ancestor (a
	 * clickable row or a Headless radio item) owns labeling.
	 *
	 * @see https://mantle.ngrok.com/components/forms/choice
	 *
	 * @example
	 * ```tsx
	 * <Choice.Root id="onboarding-key">
	 *   <Choice.Indicator>
	 *     <Checkbox />
	 *   </Choice.Indicator>
	 *   <Choice.Content>
	 *     <Choice.Title>Onboarding Key</Choice.Title>
	 *     <Choice.Description>ng-3FaThZL***8xiA</Choice.Description>
	 *   </Choice.Content>
	 * </Choice.Root>
	 * ```
	 */
	Title,
	/**
	 * Description: the supplementary line, wired via `aria-describedby`.
	 *
	 * @see https://mantle.ngrok.com/components/forms/choice
	 *
	 * @example
	 * ```tsx
	 * <Choice.Root name="notify">
	 *   <Choice.Indicator>
	 *     <Checkbox />
	 *   </Choice.Indicator>
	 *   <Choice.Content>
	 *     <Choice.Label>Email</Choice.Label>
	 *     <Choice.Description>Get notified by email.</Choice.Description>
	 *   </Choice.Content>
	 * </Choice.Root>
	 * ```
	 */
	Description,
} as const;

export {
	//,
	Choice,
};

export type {
	//,
	ChoiceRootProps,
};
