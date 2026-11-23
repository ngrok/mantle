"use client";

import { useRef, useState } from "react";
import type { ComponentProps, ComponentRef } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { useComposedRefs } from "../../utils/compose-refs/index.js";
import { clsx } from "../../utils/cx/clsx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { WithValidation } from "../field/validation.js";

/**
 * The tri-state checked value of a {@link Checkbox}: `true` (checked),
 * `false` (unchecked), or `"indeterminate"` (partially checked).
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox
 *
 * @example
 * ```tsx
 * const checked: CheckedState = "indeterminate";
 * <Checkbox checked={checked} onCheckedChange={setChecked} />
 * ```
 */
type CheckedState = boolean | "indeterminate";

const isIndeterminate = (checked: CheckedState | undefined): checked is "indeterminate" =>
	checked === "indeterminate";

type Props = Omit<ComponentProps<"input">, "type" | "checked" | "defaultChecked"> &
	WithValidation & {
		/**
		 * The controlled checked state of the checkbox. Pair it with `onCheckedChange`.
		 */
		checked?: CheckedState;
		/**
		 * The checked state of the checkbox when it is initially rendered. Use when you do not need to control its checked state.
		 */
		defaultChecked?: CheckedState;
		/**
		 * Runs with the new checked state when the user checks or unchecks the box.
		 * An indeterminate box becomes checked. The native `onChange` event still runs first.
		 */
		onCheckedChange?: (checked: boolean) => void;
	} & WithDataSlot;

/**
 * A form control that allows the user to toggle between checked and not checked.
 * Supports indeterminate state.
 *
 * Pair it with a [`Label`](/components/forms/label) for a single-line caption, or
 * compose it inside [`Choice`](/components/forms/choice) for a titled, multi-line
 * label with a supplementary description.
 *
 * @useWhen Turn one or more independent options on or off in a form, with an indeterminate state
 * for a partial selection.
 *
 * @siblings
 * - `Switch`: one setting turns on or off and needs no indeterminate state.
 * - `RadioGroup`: the user picks exactly one option from a set.
 * - `Choice`: the checkbox needs a title and a description beside it.
 *
 * @see https://mantle.ngrok.com/components/forms/checkbox
 *
 * @example
 * ```tsx
 * <form>
 *   <Label htmlFor="terms" className="flex items-center gap-2">
 *     <Checkbox name="terms" id="terms" />
 *     Accept terms and conditions
 *   </Label>
 * </form>
 * ```
 */
const Checkbox = ({
	"data-slot": dataSlot,
	"aria-invalid": _ariaInvalid,
	className,
	checked: _checked,
	defaultChecked: _defaultChecked,
	defaultValue = "on",
	onChange,
	onCheckedChange,
	onClick,
	readOnly,
	ref,
	validation: _validation,
	...props
}: Props) => {
	const innerRef = useRef<ComponentRef<"input">>(null);
	const composedRef = useComposedRefs(innerRef, ref);
	const [defaultChecked] = useState(_defaultChecked);
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	// `indeterminate` is a DOM-only property with no HTML attribute, so the effect
	// below sets it from the effective checked state: the controlled `checked` when
	// present, else the stable initial `defaultChecked`. One effect keyed on that
	// value avoids two competing effects that clobber each other on mount, which
	// once dropped the indeterminate visual for a controlled `checked="indeterminate"`.
	// Why a layout effect: the committed input is unchecked until this write. A
	// passive effect can run after the browser paints that frame.
	const effectiveChecked = _checked != null ? _checked : defaultChecked;
	useIsomorphicLayoutEffect(() => {
		if (innerRef.current) {
			innerRef.current.indeterminate = isIndeterminate(effectiveChecked);
		}
	}, [effectiveChecked]);

	// React warns (and the linter flags) when both `checked` and `defaultChecked` are
	// passed on the same input. Pick exactly one based on whether the consumer is in
	// controlled mode (`_checked != null`). The `useIsomorphicLayoutEffect` above
	// applies the indeterminate visual on both paths. In controlled mode the input
	// still gets a boolean `checked` (indeterminate reads as unchecked), never
	// `undefined`. Passing `checked: undefined` for the indeterminate frame flips
	// the input controlled → uncontrolled and trips React's "changing a controlled
	// input to be uncontrolled" warning.
	const checkedProp =
		_checked != null
			? { checked: isIndeterminate(_checked) ? false : _checked }
			: { defaultChecked: isIndeterminate(defaultChecked) ? undefined : defaultChecked };

	return (
		<input
			aria-checked={isIndeterminate(_checked) ? "mixed" : _checked}
			aria-invalid={ariaInvalid}
			// Why: the native `readonly` attribute is inert on a checkbox, so the
			// click guard below is what blocks the toggle. Assistive technology
			// needs the state announced, or the toggle fails in silence.
			aria-readonly={readOnly || undefined}
			data-slot={joinDataSlot(dataSlot, "checkbox")}
			className={clsx(
				"border-form bg-form shrink-0 cursor-pointer select-none appearance-none rounded border disabled:cursor-default disabled:opacity-50",
				"bg-center bg-no-repeat focus:outline-hidden",
				"focus-visible:border-accent-600 focus-visible:focus-ring",
				"checked:border-accent-600 checked:bg-accent-600 checked:bg-checked-icon",
				"indeterminate:border-accent-600 indeterminate:bg-accent-600 indeterminate:bg-indeterminate-icon",
				"data-[validation=success]:border-success-600 data-[validation=success]:checked:bg-success-600 data-[validation=success]:indeterminate:bg-success-600 focus-visible:data-[validation=success]:border-success-600 focus-visible:data-[validation=success]:ring-focus-success",
				"data-[validation=warning]:border-warning-600 data-[validation=warning]:checked:bg-warning-600 data-[validation=warning]:indeterminate:bg-warning-600 focus-visible:data-[validation=warning]:border-warning-600 focus-visible:data-[validation=warning]:ring-focus-warning",
				"data-[validation=error]:border-danger-600 data-[validation=error]:checked:bg-danger-600 data-[validation=error]:indeterminate:bg-danger-600 focus-visible:data-[validation=error]:border-danger-600 focus-visible:data-[validation=error]:ring-focus-danger",
				"where:block where:size-4 where:p-0",
				className,
			)}
			{...checkedProp}
			data-validation={validation || undefined}
			defaultValue={defaultValue}
			onChange={
				onChange == null && onCheckedChange == null
					? undefined
					: (event) => {
							onChange?.(event);
							// Why: React fires `change` on a read-only box before the browser undoes the toggle.
							if (!readOnly) {
								onCheckedChange?.(event.currentTarget.checked);
							}
						}
			}
			onClick={(event) => {
				if (readOnly) {
					event.preventDefault();
					return;
				}
				onClick?.(event);
			}}
			readOnly={readOnly}
			ref={composedRef}
			type="checkbox"
			{...props}
		/>
	);
};

export {
	//,
	Checkbox,
};

export type {
	//,
	CheckedState,
};
