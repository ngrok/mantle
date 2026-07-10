"use client";

import { EyeIcon } from "@phosphor-icons/react/Eye";
import { EyeClosedIcon } from "@phosphor-icons/react/EyeClosed";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { flushSync } from "react-dom";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { WithValidation } from "../field/validation.js";
import { Icon } from "../icon/icon.js";
import { Input, InputCapture } from "./input.js";
import type { InputType, WithAutoComplete } from "./types.js";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "autoComplete" | "type"> &
	WithValidation &
	WithAutoComplete & {
		/**
		 * Callback for when the visibility of the password value changes.
		 */
		onValueVisibilityChange?: (visible: boolean) => void;
		/**
		 * Show/hide the password value as a controlled state.
		 * @default false
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
 * - For values that are never sensitive — use a plain {@link https://mantle.ngrok.com/components/forms/input Input}.
 * - For controls where the toggle would be confusing (e.g. masked input
 *   formatting like phone numbers).
 *
 * **Visibility state.** The toggle is uncontrolled by default. Pass
 * `showValue` to control the visibility from the outside (useful when one
 * UI control toggles multiple password fields), and `onValueVisibilityChange`
 * to be notified when the user toggles via the built-in button.
 *
 * **Accessibility.** Always pair with a {@link https://mantle.ngrok.com/components/forms/label Label}.
 * The toggle button has its own accessible name announcing the current
 * state. The input keeps `autocomplete="current-password"` /
 * `"new-password"` semantics — set `autoComplete` explicitly per flow.
 *
 * **Browser password managers.** When revealed, the input switches to
 * `type="text"` — some password managers may pause autofill in this state,
 * which is the intended security tradeoff.
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
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
	({ onValueVisibilityChange, showValue = false, ...props }, ref) => {
		const [showPassword, setShowPassword] = useState<boolean>(showValue);
		const type: PasswordInputType = showPassword ? "text" : "password";
		const EyeCon = showPassword ? EyeIcon : EyeClosedIcon;
		const iconRef = useRef<SVGSVGElement>(null);
		const animationRef = useRef<Animation | null>(null);

		useEffect(() => {
			setShowPassword(showValue);
		}, [showValue]);

		return (
			<Input data-slot="password-input" type={type} ref={ref} {...props}>
				<InputCapture />
				<button
					type="button"
					tabIndex={-1}
					className="text-body hover:text-strong ml-1 cursor-pointer bg-inherit p-0"
					onClick={() => {
						// Cancel any in-flight animation so rapid clicks are never blocked
						if (animationRef.current) {
							animationRef.current.cancel();
							animationRef.current = null;
						}

						// Flush synchronously so React commits the new icon to the DOM before we animate
						const nextShowPassword = !showPassword;
						flushSync(() => {
							setShowPassword(nextShowPassword);
						});
						onValueVisibilityChange?.(nextShowPassword);

						const icon = iconRef.current;
						if (icon && !getPrefersReducedMotion()) {
							animationRef.current = icon.animate(
								[{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
								{ duration: 200, easing: "ease-out" },
							);
							animationRef.current.onfinish = () => {
								animationRef.current = null;
							};
						}
					}}
				>
					<span className="sr-only">Turn password visibility {showPassword ? "off" : "on"}</span>
					<Icon ref={iconRef} svg={<EyeCon aria-hidden />} />
				</button>
			</Input>
		);
	},
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
export type { PasswordInputProps };
