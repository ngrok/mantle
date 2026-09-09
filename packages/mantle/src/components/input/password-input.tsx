"use client";

import { EyeIcon } from "@phosphor-icons/react/Eye";
import { EyeClosedIcon } from "@phosphor-icons/react/EyeClosed";
import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { flushSync } from "react-dom";
import { getPrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import type { WithValidation } from "../field/validation.js";
import { Icon } from "../icon/icon.js";
import { Input, InputCapture } from "./input.js";
import type { InputType, WithAutoComplete } from "./types.js";

type PasswordInputProps = Omit<ComponentProps<"input">, "autoComplete" | "type"> &
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
 * | `data-slot` | `"password-input-toggle"` | The visibility toggle button. |
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
const PasswordInput = ({
	disabled,
	id: idProp,
	onValueVisibilityChange,
	ref,
	showValue = false,
	...props
}: PasswordInputProps) => {
	const generatedId = useId();
	const id = idProp ?? generatedId;
	const [showPassword, setShowPassword] = useState<boolean>(showValue);
	const type: PasswordInputType = showPassword ? "text" : "password";
	const EyeCon = showPassword ? EyeIcon : EyeClosedIcon;
	const iconRef = useRef<SVGSVGElement>(null);
	const animationRef = useRef<Animation | null>(null);

	useEffect(() => {
		setShowPassword(showValue);
	}, [showValue]);

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
						// Why: `cancel()` rejects `finished` with an AbortError, and nothing
						// awaits it, so a rapid second click would surface an unhandled
						// rejection.
						animationRef.current.finished.catch(() => {});
					}
				}}
			>
				<Icon ref={iconRef} svg={<EyeCon aria-hidden />} />
			</button>
		</Input>
	);
};

export { PasswordInput };
export type { PasswordInputProps };
