import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { Select } from "./select.js";

describe("Select", () => {
	test('given validation={false}, renders a Select.Trigger with aria-invalid="false" and not have data-validation', () => {
		render(
			<Select.Root validation={false}>
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a Select.Trigger with aria-invalid="false" and data-validation="success"', () => {
		render(
			<Select.Root validation="success">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a Select.Trigger with aria-invalid="false" and data-validation="warning"', () => {
		render(
			<Select.Root validation="warning">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root validation="error">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="success">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="warning">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders a Select.Trigger with aria-invalid="true" and data-validation="error"', () => {
		render(
			<Select.Root aria-invalid="true" validation="error">
				<Select.Trigger />
			</Select.Root>,
		);
		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test("Field.Item validation={false} suppresses inferred error state on the trigger", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root>
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).not.toHaveAttribute("data-validation");
	});

	test("Select.Trigger validation wins over Field.Item validation", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root>
					<Field.Control>
						<Select.Trigger validation="warning" />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "warning");
	});

	test("Select.Root validation wins over Field.Item validation", () => {
		render(
			<Field.Item name="example" validation={false}>
				<Select.Root validation="error">
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});

	test("Field.Control wrapping Select.Root applies field ARIA wiring to the trigger", () => {
		// The user-friendly form puts Field.Control above Select.Root, not
		// around Select.Trigger. cloneElement onto Select.Root reaches the
		// trigger via SelectContext for id / aria-invalid, and the trigger
		// reads FieldControlContext for aria-describedby / aria-errormessage
		// (which Select.Root does not forward).
		render(
			<Field.Item name="example">
				<Field.Control>
					<Select.Root>
						<Select.Trigger
							aria-describedby="ignored-description"
							aria-errormessage="ignored-error"
							data-testid="trigger"
							id="ignored-trigger"
						>
							<Select.Value placeholder="Pick" />
						</Select.Trigger>
					</Select.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Pick a fruit.</Field.Description>
			</Field.Item>,
		);

		const trigger = screen.getByTestId("trigger");
		const errors = screen.getByTestId("errors");
		const description = screen.getByTestId("desc");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger.getAttribute("aria-describedby")).toContain(errors.id);
		expect(trigger.getAttribute("aria-describedby")).toContain(description.id);
		expect(trigger.getAttribute("aria-describedby")).not.toContain("ignored-description");
		expect(trigger).toHaveAttribute("aria-errormessage", errors.id);
		expect(trigger).not.toHaveAttribute("id", "ignored-trigger");
	});

	test("Field.Control outside Field.Item does not override Select props", () => {
		render(
			<Field.Control>
				<Select.Root validation="error">
					<Select.Trigger data-testid="trigger" id="fruit">
						<Select.Value placeholder="Pick" />
					</Select.Trigger>
				</Select.Root>
			</Field.Control>,
		);

		const trigger = screen.getByTestId("trigger");
		expect(trigger).toHaveAttribute("aria-invalid", "true");
		expect(trigger).toHaveAttribute("data-validation", "error");
		expect(trigger).toHaveAttribute("id", "fruit");
	});

	test("rendered Field errors force the trigger into error state even when Select.Root says otherwise", () => {
		// Field.Control wires aria-invalid="true" onto the trigger when the
		// Field has rendered errors, and an explicit invalid aria value always
		// resolves to "error" in parseValidation — so a "warning" claim from
		// Select.Root is overridden in this case. Consumers who need the
		// non-error Select.Root state to win must suppress the inferred error
		// via `validation` on Field.Item or Field.Control.
		render(
			<Field.Item name="example">
				<Select.Root validation="warning">
					<Field.Control>
						<Select.Trigger />
					</Field.Control>
				</Select.Root>
				<Field.Errors messages={["Pick a value."]} />
			</Field.Item>,
		);

		expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("combobox")).toHaveAttribute("data-validation", "error");
	});
});
