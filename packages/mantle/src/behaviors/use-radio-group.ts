"use client";

import { useId } from "react";
import { useControllableState } from "./use-controllable-state.js";

type UseRadioGroupOptions = {
	/** The form field name. Without one, the group takes a generated name. */
	name?: string;
	/** The checked value. Pair it with `onValueChange`. */
	value?: string;
	/** The checked value on first render, for an uncontrolled group. */
	defaultValue?: string;
	/** The event handler called with the value of the radio that the user checks. */
	onValueChange?: (value: string) => void;
	/** Whether every radio is disabled. */
	disabled?: boolean;
};

/**
 * The single-select state of a group of native `<input type="radio">`
 * elements. The browser owns the one Tab stop, Space, form submission, and
 * form reset, so the hook holds only the value and returns the props of each
 * radio. It has no store, no key handlers, and no effects.
 *
 * @example
 * ```tsx
 * const group = useRadioGroup({ name: "plan", defaultValue: "free" });
 * <input {...group.getRadioProps({ value: "free" })} />
 * <input {...group.getRadioProps({ value: "pro" })} />
 * ```
 */
function useRadioGroup({
	name,
	value,
	defaultValue,
	onValueChange,
	disabled = false,
}: UseRadioGroupOptions) {
	const generatedName = useId();
	const [current, setValue] = useControllableState<string | undefined>({
		value,
		defaultValue,
		// Why: `undefined` only clears an uncontrolled group, which the user cannot do.
		onChange: (next) => {
			if (next !== undefined) {
				onValueChange?.(next);
			}
		},
	});
	// Why a generated name: radios move together under the arrow keys only when they share a name.
	const groupName = name || generatedName;
	return {
		name: groupName,
		value: current,
		/** Sets the value. `undefined` clears an uncontrolled group. */
		setValue,
		/** The props of the native radio for `value`. */
		getRadioProps: ({
			value: radioValue,
			disabled: radioDisabled = false,
		}: {
			value: string;
			disabled?: boolean;
		}) => ({
			type: "radio" as const,
			name: groupName,
			value: radioValue,
			checked: current === radioValue,
			disabled: disabled || radioDisabled,
			onChange: () => setValue(radioValue),
		}),
	};
}

export {
	//,
	useRadioGroup,
};

export type {
	//,
	UseRadioGroupOptions,
};
