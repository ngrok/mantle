import { Root as SwitchPrimitiveRoot, Thumb as SwitchPrimitiveThumb } from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { parseBooleanish } from "../../types/booleanish.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import { parseValidation, useFieldValidation } from "../field/validation.js";
import type { WithValidation } from "../field/validation.js";

type SwitchProps = ComponentProps<typeof SwitchPrimitiveRoot> &
	WithValidation & {
		/**
		 * Makes the switch immutable, meaning the user can not edit the control.
		 */
		readOnly?: boolean;
	};

/**
 * A form control that allows the user to toggle between checked and not checked.
 *
 * Pair it with a [`Label`](/components/forms/label) for a single-line caption, or
 * compose it inside [`Choice`](/components/forms/choice) for a titled, multi-line
 * label with a supplementary description.
 *
 * @see https://mantle.ngrok.com/components/forms/switch
 *
 * @example
 * ```tsx
 * <form>
 *   <Label htmlFor="airplane-mode" className="flex items-center gap-2">
 *     Airplane Mode
 *     <Switch name="airplane-mode" id="airplane-mode" />
 *   </Label>
 * </form>
 * ```
 */
const Switch = ({
	"aria-invalid": _ariaInvalid,
	"aria-readonly": _ariaReadOnly,
	className,
	readOnly: _readOnly,
	onClick,
	ref,
	validation: _validation,
	...props
}: SwitchProps) => {
	const readOnly = parseBooleanish(_readOnly ?? _ariaReadOnly);
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});

	return (
		<SwitchPrimitiveRoot
			aria-invalid={ariaInvalid}
			aria-readonly={readOnly}
			data-slot="switch"
			data-validation={validation || undefined}
			className={cx(
				"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full outline-hidden",
				"disabled:cursor-default disabled:opacity-50",
				"focus-visible:border-accent-600 focus-visible:ring-focus-accent focus-visible:outline-hidden focus-visible:ring-4",
				"data-state-checked:bg-accent-600 data-state-unchecked:bg-gray-400",
				"data-validation-success:data-state-checked:bg-success-600 focus-visible:data-validation-success:ring-focus-success",
				"data-validation-warning:data-state-checked:bg-warning-600 focus-visible:data-validation-warning:ring-focus-warning",
				"data-validation-error:data-state-checked:bg-danger-600 focus-visible:data-validation-error:ring-focus-danger",
				className,
			)}
			onClick={(event) => {
				if (readOnly) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}
				onClick?.(event);
			}}
			ref={ref}
			{...props}
		>
			<SwitchPrimitiveThumb
				className={clsx(
					"pointer-events-none block size-4 rounded-full bg-[#fff] shadow-md ring-0 transition-transform",
					"data-state-checked:translate-x-4.5 data-state-unchecked:translate-x-0.5",
				)}
			/>
		</SwitchPrimitiveRoot>
	);
};

export {
	//
	Switch,
};
