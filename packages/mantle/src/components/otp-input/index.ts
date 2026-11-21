/**
 * Re-exports for the OtpInput component.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 */

import * as OtpInputParts from "./otp-input-parts.js";

export {
	//,
	REGEXP_ONLY_CHARS,
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
} from "./otp-input.js";

/**
 * Compound component for capturing one-time passcodes (OTP). Combines a
 * single hidden input (handling paste, autofill, and IME) with a row of
 * styled character slots.
 *
 * @useWhen Enter a one-time passcode, such as a two-factor code, with one box for each character.
 *
 * @siblings
 * - `Input`: the value is free-form text.
 * - `PasswordInput`: the value is a password or another long-lived secret.
 *
 * @see https://mantle.ngrok.com/components/forms/otp-input
 *
 * @example
 * Composition:
 * ```
 * OtpInput.Root
 * ├── OtpInput.Group
 * │   └── OtpInput.Slot
 * ├── OtpInput.Separator
 * └── OtpInput.Group
 *     └── OtpInput.Slot
 * ```
 *
 * @example
 * ```tsx
 * <OtpInput.Root maxLength={6}>
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={0} />
 *     <OtpInput.Slot index={1} />
 *     <OtpInput.Slot index={2} />
 *   </OtpInput.Group>
 *   <OtpInput.Separator />
 *   <OtpInput.Group>
 *     <OtpInput.Slot index={3} />
 *     <OtpInput.Slot index={4} />
 *     <OtpInput.Slot index={5} />
 *   </OtpInput.Group>
 * </OtpInput.Root>
 * ```
 */
const OtpInput = OtpInputParts;

export {
	//,
	OtpInput,
};
