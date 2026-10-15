import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { Label } from "./label.js";

describe("Label", () => {
	test("renders a native label with data-slot", () => {
		render(<Label>Email</Label>);
		const label = screen.getByText("Email");
		// Why tagName: the JSDoc promises a <label>, so the element is the contract.
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("data-slot", "label");
	});

	// A `<label>` has no role that supports `aria-disabled`, so the disabled
	// style hangs off `data-disabled` instead.
	test("disabled stamps data-disabled and never aria-disabled", () => {
		render(<Label disabled>Email</Label>);
		const label = screen.getByText("Email");
		expect(label).toHaveAttribute("data-disabled", "true");
		expect(label).not.toHaveAttribute("aria-disabled");
	});

	test("an aria-disabled prop maps onto data-disabled", () => {
		render(<Label aria-disabled="true">Email</Label>);
		const label = screen.getByText("Email");
		expect(label).toHaveAttribute("data-disabled", "true");
		expect(label).not.toHaveAttribute("aria-disabled");
	});

	test('aria-disabled="false" stamps nothing', () => {
		render(<Label aria-disabled="false">Email</Label>);
		const label = screen.getByText("Email");
		expect(label).not.toHaveAttribute("data-disabled");
		expect(label).not.toHaveAttribute("aria-disabled");
	});

	describe("mousedown", () => {
		// `fireEvent` returns false when a handler called `preventDefault`.
		test("suppresses text selection on a double click but leaves a single click alone", () => {
			render(<Label>Email</Label>);
			const label = screen.getByText("Email");

			// A single mousedown is what focuses the associated control.
			expect(fireEvent.mouseDown(label, { detail: 1 })).toBe(true);
			// A second mousedown would select the caption text.
			expect(fireEvent.mouseDown(label, { detail: 2 })).toBe(false);
		});

		test("runs the consumer's onMouseDown for a mousedown on the label body", () => {
			const handleMouseDown = vi.fn<(event: MouseEvent<HTMLLabelElement>) => void>();
			render(
				<Label onMouseDown={handleMouseDown}>
					<span>Email</span>
				</Label>,
			);

			fireEvent.mouseDown(screen.getByText("Email"), { detail: 1 });

			expect(handleMouseDown).toHaveBeenCalledTimes(1);
			expect(handleMouseDown.mock.calls[0]?.[0].detail).toBe(1);
		});

		test("a consumer preventDefault on a single click stands", () => {
			render(
				<Label onMouseDown={(event) => event.preventDefault()}>
					<span>Email</span>
				</Label>,
			);

			expect(fireEvent.mouseDown(screen.getByText("Email"), { detail: 1 })).toBe(false);
		});

		test.each([
			{ control: "input", render: () => <input aria-label="Email address" /> },
			{ control: "textarea", render: () => <textarea aria-label="Email address" /> },
			{
				control: "select",
				render: () => (
					<select aria-label="Email address">
						<option>a</option>
					</select>
				),
			},
			{
				control: "button",
				render: () => (
					<button type="button">
						<span>Reveal</span>
					</button>
				),
			},
		])(
			"ignores a mousedown that starts inside a wrapped <$control>",
			({ control, render: renderControl }) => {
				const handleMouseDown = vi.fn<(event: MouseEvent<HTMLLabelElement>) => void>();
				render(
					<Label onMouseDown={handleMouseDown}>
						<span>Email</span>
						{renderControl()}
					</Label>,
				);
				// The button case starts on a nested span, so `closest` must climb to the control.
				const target =
					control === "button"
						? screen.getByText("Reveal")
						: screen.getByLabelText("Email address");

				// A double click inside the control keeps native word selection.
				expect(fireEvent.mouseDown(target, { detail: 2 })).toBe(true);
				expect(handleMouseDown).toHaveBeenCalledTimes(0);
			},
		);
	});
});
