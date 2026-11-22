"use client";

import { useRef } from "react";
import type { ComponentProps } from "react";
import { useControllableState } from "../../behaviors/use-controllable-state.js";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import { parseBooleanish } from "../../types/booleanish.js";
import { clsx } from "../../utils/cx/clsx.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import { parseValidation } from "../field/validation.js";
import { useFieldValidation } from "../field/validation-context.js";
import type { WithValidation } from "../field/validation.js";

type SwitchProps = Omit<ComponentProps<"button">, "value"> &
	WithValidation & {
		/**
		 * The controlled checked state. Pair with `onCheckedChange`.
		 */
		checked?: boolean;
		/**
		 * The checked state on first render. Use for an uncontrolled switch.
		 * @default false
		 */
		defaultChecked?: boolean;
		/**
		 * The `id` of the form the hidden checkbox belongs to, when the switch sits
		 * outside that form.
		 */
		form?: string;
		/**
		 * The name of a hidden checkbox that submits the value with its form. With
		 * no `name` and no `required`, the switch renders no hidden checkbox.
		 */
		name?: string;
		/**
		 * Event handler called when the checked state changes.
		 */
		onCheckedChange?: (checked: boolean) => void;
		/**
		 * Makes the switch immutable, meaning the user can not edit the control.
		 */
		readOnly?: boolean;
		/**
		 * Whether the form needs the switch on before it submits.
		 * @default false
		 */
		required?: boolean;
		/**
		 * The value the hidden checkbox submits while the switch is on.
		 * @default "on"
		 */
		value?: string;
	} & WithDataSlot;

/**
 * A form control that toggles one setting on or off. Unlike `Checkbox`, it has no
 * indeterminate state.
 *
 * Pair it with a [`Label`](/components/forms/label) for a single-line caption, or
 * compose it inside [`Choice`](/components/forms/choice) for a titled, multi-line
 * label with a supplementary description.
 *
 * @useWhen Turn one setting on or off, such as a feature toggle in a settings list.
 *
 * @siblings
 * - `Checkbox`: the option needs an indeterminate state.
 * - `Choice`: the switch needs a title and a description beside it.
 * - `ThemeSwitcher`: the setting is the light or dark theme.
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
	"data-slot": dataSlot,
	"aria-invalid": _ariaInvalid,
	"aria-readonly": _ariaReadOnly,
	checked: checkedProp,
	className,
	defaultChecked = false,
	disabled,
	form,
	name,
	onCheckedChange,
	onClick,
	readOnly: _readOnly,
	ref,
	required,
	validation: _validation,
	value = "on",
	...props
}: SwitchProps) => {
	const readOnly = parseBooleanish(_readOnly ?? _ariaReadOnly);
	const [checked, setChecked] = useControllableState({
		value: checkedProp,
		defaultValue: defaultChecked,
		onChange: onCheckedChange,
	});
	const fieldValidation = useFieldValidation();
	const { ariaInvalid, validation } = parseValidation({
		"aria-invalid": _ariaInvalid,
		validation: _validation ?? fieldValidation,
	});
	const state = checked ? "checked" : "unchecked";
	const checkboxRef = useRef<HTMLInputElement | null>(null);
	const resetToDefault = () => setChecked(defaultChecked);
	const composedRef = useComposedRefs(ref, (button: HTMLButtonElement | null) => {
		// Why a ref callback on the button: a form reset returns an uncontrolled switch to
		// `defaultChecked`, with or without a hidden checkbox, and the listener lives as
		// long as the button.
		const owner = button?.form;
		if (owner == null) {
			return;
		}
		owner.addEventListener("reset", resetToDefault);
		return () => owner.removeEventListener("reset", resetToDefault);
	});

	return (
		<>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-invalid={ariaInvalid}
				aria-readonly={readOnly}
				aria-required={required}
				data-disabled={disabled ? "" : undefined}
				data-slot={joinDataSlot(dataSlot, "switch")}
				data-state={state}
				data-validation={validation || undefined}
				disabled={disabled}
				form={form}
				value={value}
				className={cx(
					"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full outline-hidden",
					"disabled:cursor-default disabled:opacity-50",
					"focus-visible:border-accent-600 focus-visible:focus-ring",
					"data-state-checked:bg-accent-600 data-state-unchecked:bg-gray-400",
					"data-validation-success:data-state-checked:bg-success-600 focus-visible:data-validation-success:ring-focus-success",
					"data-validation-warning:data-state-checked:bg-warning-600 focus-visible:data-validation-warning:ring-focus-warning",
					"data-validation-error:data-state-checked:bg-danger-600 focus-visible:data-validation-error:ring-focus-danger",
					className,
				)}
				onClick={(event) => {
					if (readOnly) {
						// Why no stopPropagation: the click still reaches an ancestor row handler.
						event.preventDefault();
						return;
					}
					onClick?.(event);
					if (event.defaultPrevented) {
						return;
					}
					const checkbox = checkboxRef.current;
					if (checkbox == null || event.isPropagationStopped()) {
						setChecked(!checked);
						return;
					}
					// Why: the checkbox's click bubbles in place of this one, so an
					// ancestor sees one click for each toggle, as with Radix.
					event.stopPropagation();
					// Why a click on the checkbox: React derives a checkbox's change from
					// its click, so a `<form onChange>` sees the toggle, and the checkbox's
					// own onChange sets the state. The prototype's setter skips React's value
					// tracker, so React sees the click as a change.
					Reflect.set(HTMLInputElement.prototype, "checked", !checked, checkbox);
					checkbox.dispatchEvent(new Event("click", { bubbles: true }));
				}}
				ref={composedRef}
				{...props}
			>
				<span
					data-state={state}
					data-disabled={disabled ? "" : undefined}
					className={clsx(
						"pointer-events-none block size-4 rounded-full bg-[#fff] shadow-md ring-0 transition-transform duration-200 ease-out-strong motion-reduce:transition-none",
						"data-state-checked:translate-x-4.5 data-state-unchecked:translate-x-0.5",
					)}
				/>
			</button>
			{/* Why `required` too: the checkbox blocks the submit of an unchecked required switch. */}
			{(name != null || required) && (
				<input
					ref={checkboxRef}
					type="checkbox"
					aria-hidden
					tabIndex={-1}
					className="pointer-events-none absolute m-0 size-px opacity-0"
					name={name}
					value={value}
					form={form}
					required={required}
					disabled={disabled}
					checked={checked}
					// Why onChange and not readOnly: a read-only control skips constraint
					// validation, so `required` would never block the submit.
					onChange={(event) => setChecked(event.target.checked)}
				/>
			)}
		</>
	);
};

export {
	//
	Switch,
};
