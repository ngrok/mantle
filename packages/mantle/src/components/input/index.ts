/**
 * Re-exports for the Input component family.
 *
 * @see https://mantle.ngrok.com/components/forms/input
 * @see https://mantle.ngrok.com/components/forms/password-input
 */

export {
	//,
	Input,
	InputCapture,
} from "./input.js";
export { PasswordInput } from "./password-input.js";
export { isInput } from "./is-input.js";

export type {
	//,
	InputProps,
	InputCaptureProps,
} from "./input.js";
export type {
	//,
	AutoComplete,
	InputType,
	Validation,
	WithAutoComplete,
	WithInputType,
	WithValidation,
} from "./types.js";
export type { PasswordInputProps } from "./password-input.js";
