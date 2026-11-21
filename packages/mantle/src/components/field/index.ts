/**
 * Re-exports for the Field component.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 */

import * as FieldParts from "./field-parts.js";

/**
 * Compound component for semantic, accessible form fields. Composes a
 * `Field.Label`, control (`Input`, `Select`, etc.), `Field.Description`, and
 * validation errors (`Field.Errors` / `Field.ErrorList` + `Field.ErrorItem`)
 * with consistent spacing and ARIA wiring. Stack multiple fields with
 * `Field.Group`; use `Field.Set` + `Field.Legend` for radios / related
 * checkboxes that share one accessible name.
 *
 * @useWhen Group one form control with its label, its description, and its validation errors.
 *
 * @siblings
 * - `Label`: the control needs only a caption, with no description or errors.
 * - `Choice`: a checkbox, a radio, or a switch sits beside a title and a description.
 *
 * @see https://mantle.ngrok.com/components/forms/field
 *
 * @example
 * Composition:
 * ```
 * Field.Group
 * └── Field.Item
 *     ├── Field.LabelRow
 *     │   ├── Field.Label            (or Field.LabelText for control-less rows)
 *     │   │   └── Field.Optional
 *     │   └── Field.Help
 *     │       ├── Field.HelpTrigger
 *     │       └── Field.HelpContent
 *     ├── Field.Control
 *     │   └── (control)
 *     ├── Field.Errors             (or)
 *     ├── Field.ErrorList
 *     │   └── Field.ErrorItem
 *     └── Field.Description
 * ```
 *
 * @example
 * ```tsx
 * <Field.Group>
 *   <Field.Item name="apiKey">
 *     <Field.LabelRow>
 *       <Field.Label>
 *         API key <Field.Optional />
 *       </Field.Label>
 *       <Field.Help>
 *         <Field.HelpTrigger label="What is an API key?" />
 *         <Field.HelpContent>Copy this from the dashboard.</Field.HelpContent>
 *       </Field.Help>
 *     </Field.LabelRow>
 *     <Field.Control>
 *       <Input />
 *     </Field.Control>
 *     <Field.Errors messages={["API key is required."]} />
 *     <Field.Description>You can find this in the ngrok dashboard.</Field.Description>
 *   </Field.Item>
 * </Field.Group>
 * ```
 */
const Field = FieldParts;

export {
	//,
	Field,
};
export {
	//,
	toErrorMessages,
} from "./field-error-messages.js";
export type {
	//,
	FieldError,
} from "./field-error-messages.js";
export {
	//,
	isAriaInvalid,
	parseValidation,
	resolveValidation,
} from "./validation.js";
export type {
	//,
	AriaInvalid,
	ParsedValidation,
	Validation,
	ValidationProp,
	ValidationState,
	WithValidation,
} from "./validation.js";
