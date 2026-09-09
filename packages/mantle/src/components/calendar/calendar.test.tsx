import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
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

	// Why an exact match: `DayPicker` joins `classNames.day` with the classes of
	// the active modifiers only, and this cell has none. An exact match proves
	// the consumer key replaced the mode-derived default instead of joining it.
	test("a consumer classNames.day replaces the range-mode default", () => {
		const { container } = render(
			<Calendar
				mode="range"
				today={new Date(2024, 4, 1)}
				defaultMonth={new Date(2024, 4, 1)}
				classNames={{ day: "consumer-day" }}
			/>,
		);
		const cell = container.querySelector('[data-day="2024-05-15"]');
		expect(cell).toHaveAttribute("class", "consumer-day");
	});

	test("the previous and next month buttons have accessible names", () => {
		render(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} />);
		expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /next month/i })).toBeInTheDocument();
	});

	test("an identical rerender keeps the navigation carets mounted", () => {
		const { rerender } = render(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} />);
		const caret = screen.getByRole("button", { name: /previous month/i }).querySelector("svg");
		expect(caret).not.toBeNull();

		rerender(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} />);
		expect(screen.getByRole("button", { name: /previous month/i }).querySelector("svg")).toBe(
			caret,
		);
	});

	test("an identical rerender does not rebuild the month grid", () => {
		// Why `getWeek`: `DayPicker` calls it only inside the memo that builds the
		// month grid, so a flat call count proves that memo hit. The index counts
		// Sunday-start weeks from the epoch, which keeps the rendered grid coherent.
		const dayMs = 24 * 60 * 60 * 1000;
		const getWeek = vi.fn<(date: Date) => number>((date) =>
			Math.floor((date.getTime() + 4 * dayMs) / (7 * dayMs)),
		);
		const dateLib = { getWeek };
		const { rerender } = render(
			<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} dateLib={dateLib} />,
		);
		const callsAfterMount = getWeek.mock.calls.length;
		expect(callsAfterMount).toBeGreaterThan(0);

		rerender(<Calendar mode="single" defaultMonth={new Date(2024, 4, 1)} dateLib={dateLib} />);
		expect(getWeek).toHaveBeenCalledTimes(callsAfterMount);
	});

	test("the server render marks the passed `today` instead of reading the clock", () => {
		const html = renderToString(
			<Calendar mode="single" today={new Date(2024, 4, 15)} defaultMonth={new Date(2024, 4, 1)} />,
		);
		const container = document.createElement("div");
		container.innerHTML = html;

		const todayCell = container.querySelector('[data-day="2024-05-15"]');
		expect(todayCell).toHaveAttribute("data-today");
		expect(container.querySelector('[data-day="2024-05-15"] button')).toHaveAttribute(
			"aria-label",
			expect.stringMatching(/^Today, /),
		);
	});
});
