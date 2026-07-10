import { describe, expect, test } from "vitest";
import { resolveFieldControlAriaProps, type FieldItemContextValue } from "./field-context.js";

/**
 * Options for a minimal `Field.Item` context fixture.
 */
type CreateFieldItemContextOptions = {
	/**
	 * Whether a non-empty `Field.Errors` / `Field.ErrorList` is mounted in the
	 * fixture context.
	 */
	hasErrors?: boolean;
	/**
	 * Validation state exposed by the fixture context.
	 */
	validation?: FieldItemContextValue["validation"];
};

/**
 * Creates a minimal `Field.Item` context value for ARIA resolver tests.
 */
const createFieldItemContext = ({ hasErrors = false, validation }: CreateFieldItemContextOptions) =>
	({
		controlId: "control",
		descriptionId: "description",
		errorId: "error",
		hasErrors,
		name: "field",
		registerError: () => () => {},
		validation,
	}) satisfies FieldItemContextValue;

describe("field context helpers", () => {
	describe("resolveFieldControlAriaProps", () => {
		test("emits both slot IDs in aria-describedby when the resolved validation state is valid", () => {
			const result = resolveFieldControlAriaProps({
				context: createFieldItemContext({ hasErrors: true }),
			});

			expect(result).toEqual({
				ariaProps: {
					"aria-describedby": "description error",
					"aria-errormessage": undefined,
					"aria-invalid": undefined,
					id: "control",
					name: "field",
				},
				validation: undefined,
			});
		});

		test("wires aria-errormessage when validation resolves invalid", () => {
			const result = resolveFieldControlAriaProps({
				context: createFieldItemContext({
					hasErrors: true,
					validation: "error",
				}),
			});

			expect(result).toEqual({
				ariaProps: {
					"aria-describedby": "description error",
					"aria-errormessage": "error",
					"aria-invalid": true,
					id: "control",
					name: "field",
				},
				validation: "error",
			});
		});

		test("emits both slot IDs even when description is not mounted (dangling IDREFs are ignored by AT)", () => {
			const result = resolveFieldControlAriaProps({
				context: createFieldItemContext({
					hasErrors: true,
					validation: "error",
				}),
			});

			expect(result.ariaProps["aria-describedby"]).toBe("description error");
		});

		test("still wires aria-errormessage when validation is invalid but no errors are mounted", () => {
			const result = resolveFieldControlAriaProps({
				context: createFieldItemContext({ validation: "error" }),
			});

			expect(result.ariaProps).toEqual({
				"aria-describedby": "description error",
				"aria-errormessage": "error",
				"aria-invalid": true,
				id: "control",
				name: "field",
			});
		});

		test("ignores child-side aria-invalid — Field.Item is the single source of truth", () => {
			// The resolver no longer accepts a child-side aria-invalid override.
			// Context validation alone drives aria-invalid / aria-errormessage.
			const result = resolveFieldControlAriaProps({
				context: createFieldItemContext({ hasErrors: true }),
			});

			expect(result).toEqual({
				ariaProps: {
					"aria-describedby": "description error",
					"aria-errormessage": undefined,
					"aria-invalid": undefined,
					id: "control",
					name: "field",
				},
				validation: undefined,
			});
		});

		test("omits aria-describedby entirely when not inside a Field.Item", () => {
			const result = resolveFieldControlAriaProps({ context: null });

			expect(result.ariaProps).toEqual({});
		});
	});
});
