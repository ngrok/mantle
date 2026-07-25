import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { Checkbox, selectAllChecked } from "./checkbox.js";

describe("Checkbox", () => {
	test('given validation={false}, renders a checkbox with aria-invalid="false" and not have data-validation', () => {
		render(<Checkbox validation={false} />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders a checkbox with aria-invalid="false" and data-validation="success"', () => {
		render(<Checkbox validation="success" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders a checkbox with aria-invalid="false" and data-validation="warning"', () => {
		render(<Checkbox validation="warning" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox validation="error" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox aria-invalid="true" validation="success" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox aria-invalid="true" validation="warning" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders a checkbox with aria-invalid="true" and data-validation="error"', () => {
		render(<Checkbox aria-invalid="true" validation="error" />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test("inherits validation from Field.Item without a direct validation prop", () => {
		render(
			<Field.Item name="example" validation="warning">
				<Checkbox />
			</Field.Item>,
		);

		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "warning");
	});

	test("inherits Field.Item validation through Field.Control", () => {
		render(
			<Field.Item name="example" validation="error">
				<Field.Control>
					<Checkbox />
				</Field.Control>
			</Field.Item>,
		);

		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("checkbox")).toHaveAttribute("data-validation", "error");
	});

	test('given checked="indeterminate", reports aria-checked="mixed"', () => {
		// The native `indeterminate` DOM property is asserted in the browser test —
		// happy-dom doesn't implement it. Here we cover the accessible signal.
		render(<Checkbox checked="indeterminate" onChange={() => {}} />);
		expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
	});

	test("toggling a controlled checkbox through indeterminate does not warn about controlled/uncontrolled (regression)", () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		// A controlled "select all" checkbox cycles unchecked → indeterminate → checked.
		// The indeterminate frame must keep `checked` a boolean so React never sees the
		// input flip from controlled to uncontrolled.
		const { rerender } = render(<Checkbox checked={false} onChange={() => {}} />);
		rerender(<Checkbox checked="indeterminate" onChange={() => {}} />);
		rerender(<Checkbox checked={true} onChange={() => {}} />);

		const messages = errorSpy.mock.calls.map((args) => args.map(String).join(" "));
		expect(messages.some((message) => message.includes("uncontrolled"))).toBe(false);
	});

	describe("readOnly", () => {
		// The native `readOnly` attribute is a no-op for checkbox toggling, so
		// Checkbox hand-writes the guard in its `onClick`. These tests drive the
		// click because the guard is the entire behavior.
		test("a click on a readOnly checkbox leaves it checked and never reaches the caller's onClick", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn<(event: MouseEvent<HTMLInputElement>) => void>();
			render(<Checkbox aria-label="Terms" defaultChecked readOnly onClick={onClick} />);

			const checkbox = screen.getByRole<HTMLInputElement>("checkbox");
			await user.click(checkbox);

			expect(checkbox.checked).toBe(true);
			expect(onClick).not.toHaveBeenCalled();
		});

		test("a click on a readOnly unchecked checkbox leaves it unchecked", async () => {
			const user = userEvent.setup();
			render(<Checkbox aria-label="Terms" readOnly />);

			const checkbox = screen.getByRole<HTMLInputElement>("checkbox");
			await user.click(checkbox);

			expect(checkbox.checked).toBe(false);
		});

		test("without readOnly, a click toggles the checkbox and forwards the event to onClick", async () => {
			const user = userEvent.setup();
			const onClick = vi.fn<(event: MouseEvent<HTMLInputElement>) => void>();
			render(<Checkbox aria-label="Terms" onClick={onClick} />);

			const checkbox = screen.getByRole<HTMLInputElement>("checkbox");
			await user.click(checkbox);

			expect(checkbox.checked).toBe(true);
			expect(onClick).toHaveBeenCalledTimes(1);
			expect(onClick.mock.lastCall?.[0].target).toBe(checkbox);
		});
	});
});

describe("selectAllChecked", () => {
	test("returns true when all items are selected", () => {
		expect(selectAllChecked({ allSelected: true, someSelected: false })).toBe(true);
	});

	test('returns "indeterminate" when some but not all items are selected', () => {
		expect(selectAllChecked({ allSelected: false, someSelected: true })).toBe("indeterminate");
	});

	test("returns false when no items are selected", () => {
		expect(selectAllChecked({ allSelected: false, someSelected: false })).toBe(false);
	});

	test("prioritizes all-selected over some-selected", () => {
		expect(selectAllChecked({ allSelected: true, someSelected: true })).toBe(true);
	});
});
