import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Calendar } from "./calendar.js";

describe("Calendar", () => {
	test('stamps data-slot="calendar" on the root and renders a month grid', () => {
		const { container } = render(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} />);
		const root = container.querySelector('[data-slot="calendar"]');
		expect(root).not.toBeNull();
		expect(root).toContainElement(screen.getByRole("grid"));
	});

	test("hides outside days by default and shows them when asked", () => {
		// May 2024 has 31 days and starts on a Wednesday, so a full-week grid
		// carries days from April and June.
		const { rerender } = render(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} />);
		expect(within(screen.getByRole("grid")).getAllByRole("button")).toHaveLength(31);

		rerender(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} showOutsideDays />);
		expect(within(screen.getByRole("grid")).getAllByRole("button").length).toBeGreaterThan(31);
	});

	test("className and classNames.root both land on the root", () => {
		const { container } = render(
			<Calendar
				mode="single"
				defaultMonth={new Date(2024, 4, 1)}
				className="consumer-root"
				classNames={{ root: "consumer-classnames-root" }}
			/>,
		);
		const root = container.querySelector('[data-slot="calendar"]');
		expect(root).toHaveClass("consumer-root");
		expect(root).toHaveClass("consumer-classnames-root");
	});

	test("the previous and next month buttons have accessible names", () => {
		render(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} />);
		expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /next month/i })).toBeInTheDocument();
	});
});
