"use client";

import { EyeIcon } from "@phosphor-icons/react/Eye";
import { EyeClosedIcon } from "@phosphor-icons/react/EyeClosed";
import { forwardRef, useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { flushSync } from "react-dom";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import { Icon } from "../icon/icon.js";
import { Input, InputCapture } from "./input.js";
import type { InputType, WithAutoComplete, WithValidation } from "./types.js";

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
 * A specialized input component for password entry with a toggle button to show/hide the password value.
 * Provides enhanced security UX by allowing users to verify their input while maintaining privacy.
 *
 * @see https://mantle.ngrok.com/components/input
 *
 * @example
 * ```tsx
 * <PasswordInput
 *   placeholder="Enter your password"
 *   showValue={false}
 *   onValueVisibilityChange={(visible) => console.log('Password visible:', visible)}
 * />
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
