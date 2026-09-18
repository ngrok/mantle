import { describe, expect, test } from "vitest";
import { resolveFieldControlAriaProps, type FieldItemContextValue } from "./field-context.js";

/**
 * Options for a minimal `Field.Item` context fixture.
 */
type CreateFieldItemContextOptions = {
	/**
	 * Validation state exposed by the fixture context.
	 */
	validation?: FieldItemContextValue["validation"];
};

/**
 * Creates a minimal `Field.Item` context value for ARIA resolver tests.
 */
const createFieldItemContext = ({ validation }: CreateFieldItemContextOptions) =>
	({
		controlId: "control",
		descriptionId: "description",
		errorId: "error",
		name: "field",
		registerError: () => () => {},
		validation,
	}) satisfies FieldItemContextValue;

describe("field context helpers", () => {
	describe("resolveFieldControlAriaProps", () => {
		test("emits both slot IDs in aria-describedby when the resolved validation state is valid", () => {
			const result = resolveFieldControlAriaProps({
				context: createFieldItemContext({}),
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
				context: createFieldItemContext({ validation: "error" }),
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

		test("omits aria-describedby entirely when not inside a Field.Item", () => {
			const result = resolveFieldControlAriaProps({ context: null });

			expect(result.ariaProps).toEqual({});
		});
	});
});
