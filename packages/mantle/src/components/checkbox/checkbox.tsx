"use client";

import clsx from "clsx";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ComponentRef } from "react";
import { composeRefs } from "../../utils/compose-refs/index.js";
import type { WithValidation } from "../input/index.js";

type CheckedState = boolean | "indeterminate";

const isIndeterminate = (checked: CheckedState | undefined): checked is "indeterminate" =>
	checked === "indeterminate";

type Props = Omit<ComponentPropsWithoutRef<"input">, "type" | "checked" | "defaultChecked"> &
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
 * @see https://mantle.ngrok.com/components/checkbox
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
const Checkbox = forwardRef<ComponentRef<"input">, Props>(
	(
		{
			"aria-invalid": _ariaInvalid,
			className,
			checked: _checked,
			defaultChecked: _defaultChecked,
			defaultValue = "on",
			onClick,
			readOnly,
			validation: _validation,
			...props
		},
		ref,
	) => {
		const innerRef = useRef<ComponentRef<"input">>(null);
		const [defaultChecked] = useState(_defaultChecked);
		const isInvalid = _ariaInvalid != null && _ariaInvalid !== "false";
		const validation = isInvalid
			? "error"
			: typeof _validation === "function"
				? _validation()
				: _validation;
		const ariaInvalid = _ariaInvalid ?? validation === "error";

		useEffect(() => {
			if (innerRef.current) {
				innerRef.current.indeterminate = isIndeterminate(_checked);
			}
		}, [_checked]);

		useEffect(() => {
			if (innerRef.current) {
				innerRef.current.indeterminate = isIndeterminate(defaultChecked);
			}
		}, [defaultChecked]);

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
				checked={isIndeterminate(_checked) ? undefined : _checked}
				data-validation={validation || undefined}
				defaultChecked={isIndeterminate(defaultChecked) ? undefined : defaultChecked}
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
	},
);
Checkbox.displayName = "Checkbox";

export {
	//,
	Checkbox,
};
