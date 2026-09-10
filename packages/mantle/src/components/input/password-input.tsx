"use client";

import { EyeIcon } from "@phosphor-icons/react/Eye";
import { EyeClosedIcon } from "@phosphor-icons/react/EyeClosed";
import { useId, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { WithValidation } from "../field/validation.js";
import { Icon } from "../icon/icon.js";
import { Input, InputCapture } from "./input.js";
import type { InputType, WithAutoComplete } from "./types.js";

/**
 * The props for the `PasswordInput` component.
 */
type PasswordInputProps = Omit<ComponentProps<"input">, "autoComplete" | "type"> &
	WithValidation &
	WithAutoComplete & {
		/**
		 * Called with the next visibility when the user clicks the toggle. In
		 * controlled mode, write the value back into `showValue`.
		 */
		onValueVisibilityChange?: (visible: boolean) => void;
		/**
		 * The controlled visibility of the value. When set, the input follows this
		 * prop; a click on the toggle only calls `onValueVisibilityChange` with the
		 * next value. When omitted, the toggle owns the visibility and starts hidden.
		 */
		showValue?: boolean;
	};

type PasswordInputType = Extract<InputType, "text" | "password">;

/**
 * An input optimized for password and other sensitive-value entry. Renders a
 * native `<input type="password">` with a built-in trailing button that
 * toggles between hidden (`••••`) and revealed (`text`) display.
 *
 * **When to use**
 * - Password fields on login, signup, and reset flows.
 * - One-time tokens, recovery codes, or secrets the user needs to type
 *   accurately and may want to verify visually before submitting.
 *
 * **When not to use**
 * - For values that are never sensitive: use a plain {@link https://mantle.ngrok.com/components/forms/input Input}.
 * - For controls where the toggle would be confusing (e.g. masked input
 *   formatting like phone numbers).
 *
 * **Visibility state.** The toggle is uncontrolled by default. Pass
 * `showValue` to control the visibility from the outside, for example when
 * one control reveals several password fields. Pass `onValueVisibilityChange`
 * to receive the next visibility when the user clicks the built-in toggle.
 * The eye icon animates on every visibility change, from the built-in toggle
 * or from `showValue`, unless the user prefers reduced motion.
 *
 * **Accessibility.** Always pair with a {@link https://mantle.ngrok.com/components/forms/label Label}.
 * The toggle is a focusable `aria-pressed` button named "Show value". Its
 * name does not change with state, and it does not contain the word
 * "password", so a label query for the input matches one element. Its
 * `aria-controls` points at the input's `id`: the `id` you pass, else a
 * generated one. When `disabled` is set, the toggle is disabled too, so Tab
 * skips the component. The input keeps `autocomplete="current-password"` /
 * `"new-password"` semantics. Set `autoComplete` explicitly per flow.
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"password-input"` | The chrome around the input. |
 * | `data-slot` | `"input-capture"` | The `<input>` element. |
 * | `data-slot` | `"password-input-toggle"` | The visibility toggle button. |
 * | `data-disabled` | present when disabled | On the chrome. Style with `data-disabled:`. |
 * | `data-validation` | `"error"` \| `"success"` \| `"warning"` | On the chrome and the `<input>`. Omitted when unset. |
 *
 * **Browser password managers.** When revealed, the input switches to
 * `type="text"`. Some password managers may pause autofill in this state,
 * which is the intended security trade-off.
 *
 * @see https://mantle.ngrok.com/components/forms/password-input
 *
 * @example
 * ```tsx
 * import { PasswordInput } from "@ngrok/mantle/input";
 * import { Label } from "@ngrok/mantle/label";
 * import { useState } from "react";
 *
 * // Basic — uncontrolled visibility.
 * <Label className="grid gap-1">
 *   <span>Password</span>
 *   <PasswordInput name="password" autoComplete="current-password" />
 * </Label>
 *
 * // Validation state.
 * <PasswordInput validation="error" />
 *
 * // Controlled visibility — one toggle reveals multiple fields.
 * function PasswordPair() {
 *   const [show, setShow] = useState(false);
 *   return (
 *     <>
 *       <PasswordInput showValue={show} onValueVisibilityChange={setShow} />
 *       <PasswordInput showValue={show} onValueVisibilityChange={setShow} />
 *     </>
 *   );
 * }
 * ```
 */
const PasswordInput = ({
	disabled,
	id: idProp,
	onValueVisibilityChange,
	ref,
	showValue,
	...props
}: PasswordInputProps) => {
	const generatedId = useId();
	const id = idProp ?? generatedId;
	const isControlled = showValue != null;
	const [internalShowValue, setInternalShowValue] = useState(false);
	const showPassword = isControlled ? showValue : internalShowValue;
	const type: PasswordInputType = showPassword ? "text" : "password";
	const EyeCon = showPassword ? EyeIcon : EyeClosedIcon;
	const iconRef = useRef<SVGSVGElement>(null);
	const animatedShowPassword = useRef(showPassword);

	// Why an effect and not the click handler: the visibility can change from
	// outside through `showValue`, and the icon must animate the same way for
	// both. A layout effect runs after the commit that swaps the icon, so it
	// animates the `<svg>` now in the DOM, before paint.
	useIsomorphicLayoutEffect(() => {
		if (animatedShowPassword.current === showPassword) {
			return;
		}
		animatedShowPassword.current = showPassword;

		const icon = iconRef.current;
		if (icon == null || getPrefersReducedMotion()) {
			return;
		}

		// Why no cancel: every visibility change swaps `EyeIcon` for
		// `EyeClosedIcon`, so the previous animation runs on a detached `<svg>`
		// and cannot block or stack with this one.
		icon.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], {
			duration: 200,
			easing: "ease-out",
		});
	}, [showPassword]);

	return (
		<Input data-slot="password-input" disabled={disabled} id={id} type={type} ref={ref} {...props}>
			<InputCapture />
			<button
				type="button"
				// Why: a disabled input must not reveal its value, and a disabled
				// button leaves the tab order, so Tab skips the whole component.
				disabled={disabled}
				data-slot="password-input-toggle"
				// Why aria-label and not hidden text: voice-control tools treat DOM
				// text as a visible label, so they skip a button that hides one.
				// Why a fixed name: `aria-pressed` carries the state, and a name
				// without "password" keeps a substring label query on the input
				// from matching the toggle too.
				aria-label="Show value"
				aria-pressed={showPassword}
				aria-controls={id}
				className="text-body hover:text-strong focus-visible:ring-focus-accent ml-1 cursor-pointer rounded-xs bg-inherit p-0 focus-visible:ring-2 focus-visible:outline-hidden"
				onClick={() => {
					const nextShowPassword = !showPassword;
					if (!isControlled) {
						setInternalShowValue(nextShowPassword);
					}
					onValueVisibilityChange?.(nextShowPassword);
				}}
			>
				<Icon ref={iconRef} svg={<EyeCon aria-hidden />} />
			</button>
		</Input>
	);
};

export { PasswordInput };
export type { PasswordInputProps };
