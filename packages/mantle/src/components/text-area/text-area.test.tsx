import { fireEvent, render, screen } from "@testing-library/react";
import type { DragEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { TextArea } from "./text-area.js";

describe("TextArea", () => {
	test("a callback ref fires once with the textarea across a re-render", () => {
		const refSpy = vi.fn<(node: HTMLTextAreaElement | null) => void>();
		const { rerender } = render(<TextArea ref={refSpy} value="a" onChange={() => {}} />);
		rerender(<TextArea ref={refSpy} value="a" onChange={() => {}} />);

		expect(refSpy).toHaveBeenCalledTimes(1);
		expect(refSpy).toHaveBeenLastCalledWith(screen.getByRole("textbox"));
	});

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

	test("inherits validation from Field.Item without a direct validation prop", () => {
		render(
			<Field.Item name="example" validation="warning">
				<TextArea />
			</Field.Item>,
		);

		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "warning");
	});

	// Why fireEvent: user-event has no drag API. happy-dom aliases `DragEvent` to `Event`, so
	// React routes the plain event by its type.
	test("a drag enter sets data-drag-over and a drag leave clears it", () => {
		const onDragEnter = vi.fn<(event: DragEvent<HTMLTextAreaElement>) => void>();
		const onDragLeave = vi.fn<(event: DragEvent<HTMLTextAreaElement>) => void>();
		render(<TextArea onDragEnter={onDragEnter} onDragLeave={onDragLeave} />);
		const textarea = screen.getByRole("textbox");

		fireEvent.dragEnter(textarea);
		expect(textarea).toHaveAttribute("data-drag-over", "true");
		expect(onDragEnter).toHaveBeenCalledTimes(1);
		expect(onDragEnter).toHaveBeenLastCalledWith(expect.objectContaining({ type: "dragenter" }));

		fireEvent.dragLeave(textarea);
		expect(textarea).toHaveAttribute("data-drag-over", "false");
		expect(onDragLeave).toHaveBeenCalledTimes(1);
	});

	test("a drop clears data-drag-over and focuses the textarea", () => {
		const onDropCapture = vi.fn<(event: DragEvent<HTMLTextAreaElement>) => void>();
		render(<TextArea onDropCapture={onDropCapture} />);
		const textarea = screen.getByRole("textbox");

		fireEvent.dragEnter(textarea);
		fireEvent.drop(textarea);
		expect(textarea).toHaveAttribute("data-drag-over", "false");
		expect(textarea).toHaveFocus();
		expect(onDropCapture).toHaveBeenCalledTimes(1);
	});
});
