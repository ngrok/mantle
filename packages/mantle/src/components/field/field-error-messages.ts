import { normalizeErrorMessages } from "./error-helpers.js";

/**
 * Shapes commonly found in `field.state.meta.errors` from TanStack React Form
 * across its built-in validators (Standard Schema / Zod issues, raw strings,
 * thrown `Error` instances) plus the falsy slots Standard Schema can produce.
 */
type FieldError = { readonly message?: string | undefined } | string | null | undefined | false;

/**
 * Reduce a TanStack React Form field's `meta.errors` array (or any array of
 * mixed string / `{ message }` / nullish error entries) to a clean `string[]`
 * for passing directly to `Field.Errors`' `messages` prop.
 *
 * Handles the shapes TanStack form yields for Zod, Standard Schema, and
 * thrown `Error` validators: items may be strings, objects with `.message`,
 * `undefined`, `null`, or `false`. Empty / whitespace-only messages are
 * dropped and duplicate messages are collapsed so callers don't have to filter
 * again.
 *
 * @example
 * ```tsx
 * <Field.Item>
 *   <Field.Label htmlFor={field.name}>Email</Field.Label>
 *   <Field.Control>
 *     <Input id={field.name} value={field.state.value} />
 *   </Field.Control>
 *   <Field.Errors messages={toErrorMessages(field.state.meta.errors)} />
 * </Field.Item>
 * ```
 */
const toErrorMessages = (errors: readonly FieldError[] | null | undefined): string[] =>
	normalizeErrorMessages(
		errors?.map((error) => (typeof error === "string" || !error ? error : error.message)),
	);

export {
	//,
	toErrorMessages,
};

export type {
	//,
	FieldError,
};
