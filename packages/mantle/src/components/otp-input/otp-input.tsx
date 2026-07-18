"use client";

import { MinusIcon } from "@phosphor-icons/react/Minus";
import { OTPInput, OTPInputContext } from "input-otp";
import type { ComponentProps, ReactNode } from "react";
import { useContext } from "react";
import type { WithAsChild } from "../../types/as-child.js";
import { $cssProperties } from "../../types/index.js";
import { cx } from "../../utils/cx/cx.js";
import { FieldControlContext } from "../field/field-context.js";
import { parseValidation, useFieldValidation } from "../field/validation.js";
import type { Validation, WithValidation } from "../field/validation.js";
import { Slot as AsChildSlot } from "../slot/index.js";

type OtpState = "idle" | "caret" | "range" | "all";

/**
 * The color token name (`danger` / `success` / `warning`) that backs each
 * validation value. The `Validation` vocabulary (`"error"` / `"success"` /
 * `"warning"`) doesn't exactly match the color-token vocabulary — the
 * `error` validation maps to the `danger` color hue.
 */
type ValidationHue = "danger" | "success" | "warning";

const validationHues = {
	error: "danger",
	success: "success",
	warning: "warning",
} as const satisfies Record<Exclude<Validation, false>, ValidationHue>;

const validationBorderColor = <T extends ValidationHue = ValidationHue>(hue: T) =>
	`var(--color-${hue}-600)`;

const validationRingColor = <T extends ValidationHue = ValidationHue>(hue: T) =>
	`var(--ring-color-focus-${hue})`;

/**
 * Map the count of active slots to a discrete `data-otp-state` value used by
 * descendant CSS selectors. Split out from the rendering component so the
 * decision tree reads as a flat `if`/`else` chain rather than a nested
 * ternary.
 */
const computeOtpState = ({
	totalActive,
	total,
}: {
	totalActive: number;
	total: number;
}): OtpState => {
	if (totalActive === 0) {
		return "idle";
	}
	if (totalActive === 1) {
		return "caret";
	}
	if (totalActive === total) {
		return "all";
	}
	return "range";
};

/**
 * Bridge component that lives inside `<OTPInput>` (so it can read
 * `OTPInputContext`) and exposes the current selection state as a DOM data
 * attribute. Descendant `OtpInput.Group` / `OtpInput.Slot` parts read this
 * via Tailwind's `group-data-*` selector, so all conditional styling lives
 * in CSS — no React context.
 *
 * `data-otp-state` is one of:
 * - `"idle"` — no slot active (input not focused)
 * - `"caret"` — exactly one slot active (typing caret)
 * - `"range"` — multiple but not all slots active (partial selection)
 * - `"all"` — every slot active (cmd+a / select-all)
 */
const MantleOtpBridge = ({
	children,
	validation,
}: {
	children: ReactNode;
	validation?: Validation;
}) => {
	const inputOtpContext = useContext(OTPInputContext);
	const total = inputOtpContext.slots.length;
	const totalActive = inputOtpContext.slots.reduce(
		(count, slot) => count + (slot.isActive ? 1 : 0),
		0,
	);
	const otpState = computeOtpState({ totalActive, total });

	// Map the validation hue to two CSS custom properties — descendant
	// slot/group classes reference these vars instead of having one
	// branch per validation value. When no validation is set, the vars
	// are left undefined and the validation utilities (gated on
	// `group-data-validation`) don't apply.
	const hue = validation ? validationHues[validation] : undefined;
	const validationStyle = hue
		? $cssProperties({
				"--otp-validation-border": validationBorderColor(hue),
				"--otp-validation-ring": validationRingColor(hue),
			})
		: undefined;

	// `display: contents` keeps this element in the DOM tree (so `group/`
	// ancestor selectors resolve) without producing a layout box.
	return (
		<div
			className="group/otp contents"
			data-otp-state={otpState}
			data-validation={validation || undefined}
			style={validationStyle}
		>
			{children}
		</div>
	);
};

// Drop the `render` / `children?: never` branch of input-otp's discriminated
// union — `OtpInput.Root` always wraps its children in `MantleOtpBridge`,
// so consumers compose with `OtpInput.Group` / `OtpInput.Slot` children
// rather than a render prop.
type OtpInputRootProps = Omit<ComponentProps<typeof OTPInput>, "render" | "children"> &
	WithValidation & {
		children?: ReactNode;
	};

/**
 * The root of the OTP input. Renders an accessible single hidden input that
 * captures keystrokes, paste events, and autofill, and exposes per-slot state
 * (active, char, fake caret) to descendant `OtpInput.Slot` parts via context.
 *
 * Wraps the `input-otp` library by Guilherme Rodz.
 *
 * Pass `validation="error"` (or `"success"` / `"warning"`) to recolor each
 * group's outer borders and the active focus ring with the matching validation hue.
 * `validation="error"` also sets `aria-invalid` on the underlying input so
 * assistive tech announces the failure state.
 *
 * When composing with `Field.Item`, wrap `OtpInput.Root` in `Field.Control`.
 * `Field.Control` flows the generated `id`, `aria-invalid`, `aria-describedby`,
 * and `aria-errormessage` through to the underlying focusable input via
 * `FieldControlContext`.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
// `OtpInput.Root` does not support `asChild`: the underlying `OTPInput`
// owns its hidden `<input>` and its render contract — swapping the element
// would break input-otp's internal focus and selection management.
const Root = ({
	"aria-invalid": ariaInvalid,
	children,
	className,
	containerClassName,
	ref,
	validation: _validation,
	...props
}: OtpInputRootProps) => {
	const fieldValidation = useFieldValidation();
	const fieldControl = useContext(FieldControlContext);
	const { ariaInvalid: resolvedAriaInvalid, validation } = parseValidation({
		"aria-invalid": ariaInvalid,
		defaultAriaInvalid: false,
		validation: _validation ?? fieldValidation,
	});

	return (
		<OTPInput
			ref={ref}
			aria-invalid={resolvedAriaInvalid}
			data-slot="otp-input"
			containerClassName={cx("flex items-center gap-2 has-disabled:opacity-50", containerClassName)}
			className={cx("disabled:cursor-not-allowed", className)}
			{...props}
			{...(fieldControl
				? {
						"aria-describedby": fieldControl["aria-describedby"],
						"aria-errormessage": fieldControl["aria-errormessage"],
						id: fieldControl.id,
						name: fieldControl.name,
					}
				: undefined)}
		>
			<MantleOtpBridge validation={validation}>{children}</MantleOtpBridge>
		</OTPInput>
	);
};
Root.displayName = "OtpInput";

type OtpInputGroupProps = ComponentProps<"div"> & WithAsChild;

/**
 * Groups one or more `OtpInput.Slot` parts into a visually-connected segment.
 * Slots inside a group share rounded corners on the outer edges and join with
 * shared borders between adjacent slots.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
const Group = ({ asChild, children, className, ref, ...props }: OtpInputGroupProps) => {
	const Comp = asChild ? AsChildSlot : "div";

	return (
		<Comp
			ref={ref}
			data-slot="otp-input-group"
			className={cx(
				"relative flex items-center rounded-md",
				// A "range" selection within this group means two or more
				// slots are simultaneously active. CSS `:has()` with the
				// general sibling combinator catches that without us
				// having to count: if any active slot is preceded by
				// another active slot at the same nesting level, the
				// group has at least 2 actives → draw the ring.
				"has-[[data-active]~[data-active]]:ring-focus-accent has-[[data-active]~[data-active]]:ring-4",
				// Validation override for the group-level range/all ring.
				// `--otp-validation-ring` is set on the bridge based on
				// the validation value, so a single class covers
				// error/success/warning instead of one per hue.
				"group-data-validation/otp:has-[[data-active]~[data-active]]:ring-(--otp-validation-ring)",
				className,
			)}
			{...props}
		>
			{children}
		</Comp>
	);
};
Group.displayName = "OtpInputGroup";

type OtpInputSlotProps = ComponentProps<"div"> & {
	/**
	 * The zero-based index of the character slot to render. Must be a valid
	 * index within the parent `OtpInput.Root`'s `maxLength`.
	 */
	index: number;
};

/**
 * Renders a single character slot for the OTP input. Reads its display state
 * (the typed character, active/focused state, and fake caret position) from
 * the nearest `OtpInput.Root` via context — so this part must always be
 * rendered inside an `OtpInput.Root`.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
// `OtpInput.Slot` does not support `asChild`: the slot reads context-driven
// state (char, fake caret, active) from `OTPInputContext` and renders that
// state into a fixed visual structure. Letting consumers swap the element
// would lose the caret overlay and the active-ring focus styling.
const OtpInputSlotImpl = ({ className, index, ref, ...props }: OtpInputSlotProps) => {
	const context = useContext(OTPInputContext);
	const slot = context.slots[index];
	const char = slot?.char ?? null;
	const hasFakeCaret = slot?.hasFakeCaret ?? false;
	const isActive = slot?.isActive ?? false;

	return (
		<div
			ref={ref}
			data-slot="otp-input-slot"
			data-active={isActive ? "" : undefined}
			className={cx(
				"border-form bg-form text-strong relative flex h-10 w-10 items-center justify-center border-y border-r text-sm shadow-sm outline-hidden transition-all duration-150 ease-out",
				"first:rounded-l-md first:border-l last:rounded-r-md",
				// When this slot is immediately followed by the caret
				// slot, hide our `border-r` so the active slot's
				// `border-l` is the only line at the boundary — without
				// this, the two adjacent 1px borders read as a doubled
				// edge. We use an arbitrary `&:has(+ ...)` variant
				// because Tailwind's `has-[...]` shorthand doesn't
				// parse the nested bracketed attribute selector here.
				"[&:has(+[data-active])]:group-data-[otp-state=caret]/otp:border-r-transparent",
				// Per-slot ring renders only in `caret` state (single
				// active slot). When more than one slot is active, the
				// surrounding `OtpInput.Group` draws a single ring
				// around the whole group — see Group's `:has()` rule.
				// We also recolor the slot's own borders to accent and
				// fill in `border-l` (groups normally only render
				// `border-l` on `:first-child`), so the slot reads as
				// one cohesive highlighted box rather than a ring with
				// a gray box inside.
				"data-active:group-data-[otp-state=caret]/otp:border-accent-600",
				"data-active:group-data-[otp-state=caret]/otp:border-l",
				"data-active:group-data-[otp-state=caret]/otp:ring-focus-accent",
				"data-active:group-data-[otp-state=caret]/otp:z-20",
				"data-active:group-data-[otp-state=caret]/otp:ring-4",
				// Select-all: tint *every* border on the slot accent.
				// Tinting only the outside edges leaves the internal
				// vertical divider (gray `border-r`) meeting the
				// accent top/bottom borders at the corner, producing a
				// visible 1px miter spike. Coloring all borders the
				// same accent-600 hue makes the corner blend
				// seamlessly while still keeping the slot grid
				// readable at full opacity.
				"group-data-[otp-state=all]/otp:border-accent-600",
				// Validation overrides. Only the *outer* edges of the
				// group are tinted (top + bottom on every slot, left on
				// the first slot, right on the last slot) so adjacent
				// slots still join with a neutral divider — matching how
				// `Input` tints the container border, not the internal
				// elements. The all-state and caret-active overrides
				// still recolor every border so a fully-active slot or
				// select-all reads as a solid tinted box. The bridge
				// sets `--otp-validation-{border,ring}` per validation
				// value, so a single set of classes covers
				// error/success/warning.
				"group-data-validation/otp:border-y-(--otp-validation-border)",
				"group-data-validation/otp:first:border-l-(--otp-validation-border)",
				"group-data-validation/otp:last:border-r-(--otp-validation-border)",
				"group-data-validation/otp:data-active:group-data-[otp-state=caret]/otp:border-(--otp-validation-border)",
				"group-data-validation/otp:data-active:group-data-[otp-state=caret]/otp:ring-(--otp-validation-ring)",
				"group-data-validation/otp:group-data-[otp-state=all]/otp:border-(--otp-validation-border)",
				className,
			)}
			{...props}
		>
			{char}
			{hasFakeCaret && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="bg-strong h-4 w-px animate-pulse" />
				</div>
			)}
		</div>
	);
};
OtpInputSlotImpl.displayName = "OtpInputSlot";

type OtpInputSeparatorProps = ComponentProps<"div"> &
	WithAsChild & {
		/**
		 * If `true`, the separator will be rendered with `role="separator"` so
		 * assistive tech announces it as a divider between OTP groups.
		 * If `false`, the separator is purely decorative and is removed from
		 * the accessibility tree — preferred inside an OTP control where the
		 * minus icon is just visual chrome between slot groups.
		 *
		 * @default false
		 */
		semantic?: boolean;
	};

/**
 * A visual separator between two `OtpInput.Group` segments. Renders a minus
 * icon by default; pass `children` to override the visual.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
const Separator = ({
	asChild,
	children,
	className,
	ref,
	semantic = false,
	...props
}: OtpInputSeparatorProps) => {
	const Comp = asChild ? AsChildSlot : "div";
	const semanticProps = semantic ? { role: "separator" } : { "aria-hidden": true, role: "none" };

	return (
		<Comp
			ref={ref}
			data-slot="otp-input-separator"
			className={cx("text-separator flex items-center", className)}
			{...semanticProps}
			{...props}
		>
			{children ?? <MinusIcon weight="bold" />}
		</Comp>
	);
};
Separator.displayName = "OtpInputSeparator";

/**
 * Compound component for capturing one-time passcodes (OTP). Combines a
 * single hidden input (handling paste, autofill, and IME) with a row of
 * styled character slots.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * Composition:
 * ```
 * OtpInput.Root
 * ├── OtpInput.Group
 * │   └── OtpInput.Slot
 * ├── OtpInput.Separator
 * └── OtpInput.Group
 *     └── OtpInput.Slot
 * ```
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
const OtpInput = {
	/**
	 * The root of the OTP input. Wraps the hidden input that captures
	 * keystrokes, paste, and autofill, and provides per-slot state to
	 * descendant `OtpInput.Slot` parts.
	 *
	 * @see https://mantle.ngrok.com/components/forms/otp-input
	 *
	 * @example
	 * ```tsx
	 * <OtpInput.Root maxLength={6}>
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={0} />
	 *     <OtpInput.Slot index={1} />
	 *     <OtpInput.Slot index={2} />
	 *   </OtpInput.Group>
	 *   <OtpInput.Separator />
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={3} />
	 *     <OtpInput.Slot index={4} />
	 *     <OtpInput.Slot index={5} />
	 *   </OtpInput.Group>
	 * </OtpInput.Root>
	 * ```
	 */
	Root,
	/**
	 * Groups one or more `OtpInput.Slot` parts into a visually-connected
	 * segment with shared rounded corners and joined borders.
	 *
	 * @see https://mantle.ngrok.com/components/forms/otp-input
	 *
	 * @example
	 * ```tsx
	 * <OtpInput.Root maxLength={6}>
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={0} />
	 *     <OtpInput.Slot index={1} />
	 *     <OtpInput.Slot index={2} />
	 *   </OtpInput.Group>
	 *   <OtpInput.Separator />
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={3} />
	 *     <OtpInput.Slot index={4} />
	 *     <OtpInput.Slot index={5} />
	 *   </OtpInput.Group>
	 * </OtpInput.Root>
	 * ```
	 */
	Group,
	/**
	 * A single character slot. Must be rendered inside an `OtpInput.Root`.
	 * Reads its character, active state, and fake caret position from the
	 * root via context.
	 *
	 * @see https://mantle.ngrok.com/components/forms/otp-input
	 *
	 * @example
	 * ```tsx
	 * <OtpInput.Root maxLength={6}>
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={0} />
	 *     <OtpInput.Slot index={1} />
	 *     <OtpInput.Slot index={2} />
	 *   </OtpInput.Group>
	 *   <OtpInput.Separator />
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={3} />
	 *     <OtpInput.Slot index={4} />
	 *     <OtpInput.Slot index={5} />
	 *   </OtpInput.Group>
	 * </OtpInput.Root>
	 * ```
	 */
	Slot: OtpInputSlotImpl,
	/**
	 * A visual separator between two `OtpInput.Group` segments. Renders a
	 * minus icon by default; pass `children` to override.
	 *
	 * @see https://mantle.ngrok.com/components/forms/otp-input
	 *
	 * @example
	 * ```tsx
	 * <OtpInput.Root maxLength={6}>
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={0} />
	 *     <OtpInput.Slot index={1} />
	 *     <OtpInput.Slot index={2} />
	 *   </OtpInput.Group>
	 *   <OtpInput.Separator />
	 *   <OtpInput.Group>
	 *     <OtpInput.Slot index={3} />
	 *     <OtpInput.Slot index={4} />
	 *     <OtpInput.Slot index={5} />
	 *   </OtpInput.Group>
	 * </OtpInput.Root>
	 * ```
	 */
	Separator,
} as const;

export {
	//,
	OtpInput,
};

export {
	//,
	REGEXP_ONLY_CHARS,
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
} from "input-otp";
