/**
 * (Not a Boolean attribute!) The autocomplete attribute takes as its value a space-separated string that describes what,
 * if any, type of autocomplete functionality the input should provide. A typical implementation of autocomplete recalls
 * previous values entered in the same input field, but more complex forms of autocomplete can exist. For instance, a
 * browser could integrate with a device's contacts list to autocomplete email addresses in an email input field.
 *
 * The autocomplete attribute is valid on hidden, text, search, url, tel, email, date, month, week, time, datetime-local,
 * number, range, color, and password. This attribute has no effect on input types that do not return numeric or text
 * data, being valid for all input types except checkbox, radio, file, or any of the button types.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values
 */
export type AutoComplete =
	| "off"
	| "on"
	| "name"
	| "honorific-prefix"
	| "given-name"
	| "additional-name"
	| "family-name"
	| "honorific-suffix"
	| "nickname"
	| "email"
	| "username"
	| "new-password"
	| "current-password"
	| "one-time-code"
	| "organization-title"
	| "organization"
	| "street-address"
	| "address-line1"
	| "address-line2"
	| "address-line3"
	| "address-level4"
	| "address-level3"
	| "address-level2"
	| "address-level1"
	| "country"
	| "country-name"
	| "postal-code"
	| "cc-name"
	| "cc-given-name"
	| "cc-additional-name"
	| "cc-family-name"
	| "cc-number"
	| "cc-exp"
	| "cc-exp-month"
	| "cc-exp-year"
	| "cc-csc"
	| "cc-type"
	| "transaction-currency"
	| "transaction-amount"
	| "language"
	| "bday"
	| "bday-day"
	| "bday-month"
	| "bday-year"
	| "sex"
	| "tel"
	| "tel-country-code"
	| "tel-national"
	| "tel-area-code"
	| "tel-local"
	| "tel-extension"
	| "impp"
	| "url"
	| "photo";

export type WithAutoComplete = {
	/**
	 * (Not a Boolean attribute!) The autocomplete attribute takes as its value a space-separated string that describes what,
	 * if any, type of autocomplete functionality the input should provide. A typical implementation of autocomplete recalls
	 * previous values entered in the same input field, but more complex forms of autocomplete can exist. For instance, a
	 * browser could integrate with a device's contacts list to autocomplete email addresses in an email input field.
	 *
	 * The autocomplete attribute is valid on hidden, text, search, url, tel, email, date, month, week, time, datetime-local,
	 * number, range, color, and password. This attribute has no effect on input types that do not return numeric or text
	 * data, being valid for all input types except checkbox, radio, file, or any of the button types.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete#values
	 */
	autoComplete?: AutoComplete;
};

/**
 * A string specifying the type of control to render. For example, to create a checkbox, a value of `"checkbox"` is used.
 * If omitted (or an unknown value is specified), the input type `"text"` is used, creating a plaintext input field.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
 */
export type InputType =
	| "button"
	| "checkbox"
	| "color"
	| "date"
	| "datetime-local"
	| "email"
	| "file"
	| "hidden"
	| "image"
	| "month"
	| "number"
	| "password"
	| "radio"
	| "range"
	| "reset"
	| "search"
	| "submit"
	| "tel"
	| "text"
	| "time"
	| "url"
	| "week";

export type WithInputType = {
	/**
	 * A string specifying the type of control to render. For example, to create a checkbox, a value of `"checkbox"` is used.
	 * If omitted (or an unknown value is specified), the input type `"text"` is used, creating a plaintext input field.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types
	 */
	type?: InputType;
};

export type { Validation, WithValidation } from "../field/validation.js";
