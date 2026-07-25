import { fireEvent, render, screen } from "@testing-library/react";
import type { MouseEvent } from "react";
import { describe, expect, test, vi } from "vitest";
import { Label } from "./label.js";

describe("Label", () => {
	test("renders a native label with data-slot=label", () => {
		render(
			<>
				<Label htmlFor="email">Email</Label>
				<input id="email" />
			</>,
		);

		const label = screen.getByText("Email");
		expect(label.tagName).toBe("LABEL");
		expect(label).toHaveAttribute("data-slot", "label");
		expect(screen.getByLabelText("Email")).toBe(screen.getByRole("textbox"));
	});

	test("suppresses text selection on double click but leaves single clicks alone", () => {
		render(<Label>Email</Label>);

		const label = screen.getByText("Email");
		// `fireEvent` returns false when a handler called preventDefault.
		// A single click must keep its native behavior — mousedown is what
		// focuses the associated control.
		expect(fireEvent.mouseDown(label, { detail: 1 })).toBe(true);
		// A double click would otherwise select the caption text.
		expect(fireEvent.mouseDown(label, { detail: 2 })).toBe(false);
	});

	test("invokes the caller's onMouseDown for mousedowns on the label body", () => {
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

	test("ignores mousedowns that originate on a nested form control", () => {
		const handleMouseDown = vi.fn<(event: MouseEvent<HTMLLabelElement>) => void>();
		render(
			<Label onMouseDown={handleMouseDown}>
				<span>Email</span>
				<input aria-label="Email address" />
			</Label>,
		);

		// Double clicking inside the control must keep native word selection.
		expect(fireEvent.mouseDown(screen.getByRole("textbox"), { detail: 2 })).toBe(true);
		expect(handleMouseDown).not.toHaveBeenCalled();
	});

	test("ignores mousedowns nested anywhere inside a control, not just on it", () => {
		const handleMouseDown = vi.fn<(event: MouseEvent<HTMLLabelElement>) => void>();
		render(
			<Label onMouseDown={handleMouseDown}>
				<span>Password</span>
				<button type="button">
					<span>Reveal</span>
				</button>
			</Label>,
		);

		expect(fireEvent.mouseDown(screen.getByText("Reveal"), { detail: 2 })).toBe(true);
		expect(handleMouseDown).not.toHaveBeenCalled();
	});
});
