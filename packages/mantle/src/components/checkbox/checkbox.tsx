"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ComponentRef } from "react";
import { composeRefs } from "../../utils/compose-refs/index.js";
import { clsx } from "../../utils/cx/clsx.js";
import { parseValidation, useFieldValidation } from "../field/validation.js";
import type { WithValidation } from "../field/validation.js";

type CheckedState = boolean | "indeterminate";

const isIndeterminate = (checked: CheckedState | undefined): checked is "indeterminate" =>
	checked === "indeterminate";

type Props = Omit<ComponentProps<"input">, "type" | "checked" | "defaultChecked"> &
	WithValidation & {
		/**
		 * The controlled checked state of the checkbox. Must be used in conjunction with onChange.
		 */
		checked?: CheckedState;
		/**
		 * The checked state of the checkbox when it is initially rendered. Use when you do not need to control its checked state.
		 */
		defaultChecked?: CheckedState;
	};

/**
 * A form control that allows the user to toggle between checked and not checked.
 * Supports indeterminate state.
 *
 * Pair it with a [`Label`](/components/forms/label) for a single-line caption, or
 * compose it inside [`Choice`](/components/forms/choice) for a titled, multi-line
 * label with a supplementary description.
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
	"aria-invalid": _ariaInvalid,
	className,
	checked: _checked,
	defaultChecked: _defaultChecked,
	defaultValue = "on",
	onClick,
	readOnly,
	ref,
	validation: _validation,
	...props
}: Props) => {
	const innerRef = useRef<ComponentRef<"input">>(null);
	const [defaultChecked] = useState(_defaultChecked);
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	// `indeterminate` is a DOM-only property (it has no HTML attribute), so set it
	// imperatively from the *effective* checked state — the controlled `checked`
	// when present, otherwise the (stable) initial `defaultChecked`. A single effect
	// keyed on that value avoids two competing effects clobbering each other on
	// mount, which previously dropped the indeterminate visual for a controlled
	// `checked="indeterminate"`.
	const effectiveChecked = _checked != null ? _checked : defaultChecked;
	useEffect(() => {
		if (innerRef.current) {
			innerRef.current.indeterminate = isIndeterminate(effectiveChecked);
		}
	}, [effectiveChecked]);

	// React warns (and the linter flags) when both `checked` and `defaultChecked` are
	// passed on the same input. Pick exactly one based on whether the consumer is in
	// controlled mode (`_checked != null`). The indeterminate *visual* is applied
	// to the DOM node imperatively via the `useEffect`s above on both paths — so in
	// controlled mode we still pass a boolean `checked` (treating indeterminate as
	// unchecked) and never let it become `undefined`. Passing `checked: undefined` for
	// the indeterminate frame flips the input controlled → uncontrolled and trips
	// React's "changing a controlled input to be uncontrolled" warning.
	const checkedProp =
		_checked != null
			? { checked: isIndeterminate(_checked) ? false : _checked }
			: { defaultChecked: isIndeterminate(defaultChecked) ? undefined : defaultChecked };

	return (
		<input
			aria-checked={isIndeterminate(_checked) ? "mixed" : _checked}
			aria-invalid={ariaInvalid}
			data-slot="checkbox"
			className={clsx(
				"border-form bg-form shrink-0 cursor-pointer select-none appearance-none rounded border disabled:cursor-default disabled:opacity-50",
				"bg-center bg-no-repeat focus:outline-hidden",
				"focus-visible:border-accent-600 focus-visible:ring-focus-accent focus-visible:outline-hidden focus-visible:ring-4",
				"checked:border-accent-600 checked:bg-accent-600 checked:bg-checked-icon",
				"indeterminate:border-accent-600 indeterminate:bg-accent-600 indeterminate:bg-indeterminate-icon",
				"data-validation-success:border-success-600 data-validation-success:checked:bg-success-600 data-validation-success:indeterminate:bg-success-600 focus-visible:data-validation-success:border-success-600 focus-visible:data-validation-success:ring-focus-success",
				"data-validation-warning:border-warning-600 data-validation-warning:checked:bg-warning-600 data-validation-warning:indeterminate:bg-warning-600 focus-visible:data-validation-warning:border-warning-600 focus-visible:data-validation-warning:ring-focus-warning",
				"data-validation-error:border-danger-600 data-validation-error:checked:bg-danger-600 data-validation-error:indeterminate:bg-danger-600 focus-visible:data-validation-error:border-danger-600 focus-visible:data-validation-error:ring-focus-danger",
				"where:block where:size-4 where:p-0",
				className,
			)}
			{...checkedProp}
			data-validation={validation || undefined}
			defaultValue={defaultValue}
			onClick={(event) => {
				if (readOnly) {
					event.preventDefault();
					return;
				}
				onClick?.(event);
			}}
			readOnly={readOnly}
			ref={composeRefs(innerRef, ref)}
			type="checkbox"
			{...props}
		/>
	);
};

/**
 * Resolve the tri-state `checked` value for a "select all" checkbox from the
 * current selection counts: `true` when everything is selected,
 * `"indeterminate"` when only some is, and `false` when nothing is. The result
 * is a {@link CheckedState}, ready to pass straight to `<Checkbox checked={…} />`.
 *
 * `allSelected` is checked first, so it wins even if a caller also reports
 * `someSelected` for the all-selected case.
 *
 * @example
 * ```tsx
 * // Driving a TanStack Table "select all" header checkbox:
 * <Checkbox
 *   aria-label="Select all rows"
 *   checked={selectAllChecked({
 *     allSelected: table.getIsAllRowsSelected(),
 *     someSelected: table.getIsSomeRowsSelected(),
 *   })}
 *   onChange={(event) => table.toggleAllRowsSelected(event.target.checked)}
 * />
 * ```
 */
function selectAllChecked({
	allSelected,
	someSelected,
}: {
	/** Whether every selectable item is currently selected. */
	allSelected: boolean;
	/** Whether some (but not necessarily all) items are selected. */
	someSelected: boolean;
}): CheckedState {
	if (allSelected) {
		return true;
	}
	if (someSelected) {
		return "indeterminate";
	}
	return false;
}

export {
	//,
	Checkbox,
	selectAllChecked,
};

export type {
	//,
	CheckedState,
};
