import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { TextArea } from "./text-area.js";

describe("TextArea", () => {
	test('given validation={false}, renders a textarea with aria-invalid="false" and not have data-validation', () => {
		render(<TextArea validation={false} />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a textarea with aria-invalid="false" and data-validation="success"', () => {
		render(<TextArea validation="success" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a textarea with aria-invalid="false" and data-validation="warning"', () => {
		render(<TextArea validation="warning" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a textarea with aria-invalid="true" and data-validation="error"', () => {
		render(<TextArea validation="error" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a textarea with aria-invalid="true" and data-validation="error"', () => {
		render(<TextArea aria-invalid="true" validation="success" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders a textarea with aria-invalid="true" and data-validation="error"', () => {
		render(<TextArea aria-invalid="true" validation="warning" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders a textarea with aria-invalid="true" and data-validation="error"', () => {
		render(<TextArea aria-invalid="true" validation="error" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test("inherits validation from Field.Item without a direct validation prop", () => {
		render(
			<Field.Item name="example" validation="warning">
				<TextArea />
			</Field.Item>,
		);

		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "warning");
	});

	test("inherits Field.Item validation through Field.Control", () => {
		render(
			<Field.Item name="example" validation="error">
				<Field.Control>
					<TextArea />
				</Field.Control>
			</Field.Item>,
		);

		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});
});
