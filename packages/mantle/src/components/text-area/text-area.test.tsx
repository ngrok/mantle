import { fireEvent, render, screen } from "@testing-library/react";
import type { DragEvent } from "react";
import { describe, expect, test, vi } from "vitest";
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

	describe("drag and drop", () => {
		test("tracks the drag-over state through enter, leave, and drop", () => {
			render(<TextArea aria-label="Feedback" />);

			const textArea = screen.getByRole("textbox", { name: "Feedback" });
			expect(textArea).toHaveAttribute("data-drag-over", "false");

			fireEvent.dragEnter(textArea);
			expect(textArea).toHaveAttribute("data-drag-over", "true");

			fireEvent.dragLeave(textArea);
			expect(textArea).toHaveAttribute("data-drag-over", "false");

			fireEvent.dragEnter(textArea);
			expect(textArea).toHaveAttribute("data-drag-over", "true");

			fireEvent.drop(textArea);
			expect(textArea).toHaveAttribute("data-drag-over", "false");
		});

		test("focuses the textarea on drop so the pasted text is editable right away", () => {
			render(<TextArea aria-label="Feedback" />);

			const textArea = screen.getByRole("textbox", { name: "Feedback" });
			expect(textArea).not.toHaveFocus();

			fireEvent.drop(textArea);

			expect(textArea).toHaveFocus();
		});

		test("chains the caller's drag handlers instead of replacing them", () => {
			const handleDragEnter = vi.fn<(event: DragEvent<HTMLTextAreaElement>) => void>();
			const handleDragLeave = vi.fn<(event: DragEvent<HTMLTextAreaElement>) => void>();
			const handleDropCapture = vi.fn<(event: DragEvent<HTMLTextAreaElement>) => void>();

			render(
				<TextArea
					aria-label="Feedback"
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDropCapture={handleDropCapture}
				/>,
			);

			const textArea = screen.getByRole("textbox", { name: "Feedback" });

			fireEvent.dragEnter(textArea);
			fireEvent.dragLeave(textArea);
			fireEvent.drop(textArea);

			expect(handleDragEnter).toHaveBeenCalledTimes(1);
			expect(handleDragEnter.mock.calls[0]?.[0].type).toBe("dragenter");
			expect(handleDragLeave).toHaveBeenCalledTimes(1);
			expect(handleDragLeave.mock.calls[0]?.[0].type).toBe("dragleave");
			expect(handleDropCapture).toHaveBeenCalledTimes(1);
			expect(handleDropCapture.mock.calls[0]?.[0].type).toBe("drop");
		});
	});
});
