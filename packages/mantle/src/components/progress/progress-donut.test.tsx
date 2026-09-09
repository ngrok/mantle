import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { deriveStrokeWidthPx, ProgressDonut } from "./progress-donut.js";

describe("deriveStrokeWidthPx", () => {
	test("given null/undefined, returns 4", () => {
		expect(deriveStrokeWidthPx(null)).toBe(4);
		expect(deriveStrokeWidthPx(undefined)).toBe(4);
	});

	test('given "6", returns 6', () => {
		expect(deriveStrokeWidthPx("6")).toBe(6);
	});

	test('given "16", returns 12', () => {
		expect(deriveStrokeWidthPx("16")).toBe(12);
	});

	test('given "0.25rem", returns 4', () => {
		expect(deriveStrokeWidthPx("0.25rem")).toBe(4);
	});

	test('given "0.5rem", returns 8', () => {
		expect(deriveStrokeWidthPx("0.5rem")).toBe(8);
	});

	test('given "1rem", returns 12', () => {
		expect(deriveStrokeWidthPx("1rem")).toBe(12);
	});

	test('given "0.375rem", returns 6', () => {
		expect(deriveStrokeWidthPx("0.375rem")).toBe(6);
	});

	test("given 6, returns 6", () => {
		expect(deriveStrokeWidthPx(6)).toBe(6);
	});

	test("given 8, returns 8", () => {
		expect(deriveStrokeWidthPx(8)).toBe(8);
	});

	test("given 16, returns 12", () => {
		expect(deriveStrokeWidthPx(16)).toBe(12);
	});
});

describe("ProgressDonut.Root", () => {
	test("renders a named progressbar with its value range", () => {
		render(
			<ProgressDonut.Root aria-label="Data transfer out" value={60}>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const donut = screen.getByRole("progressbar", { name: "Data transfer out" });
		expect(donut).toHaveAttribute("aria-valuemin", "0");
		expect(donut).toHaveAttribute("aria-valuemax", "100");
		expect(donut).toHaveAttribute("aria-valuenow", "60");
		expect(donut).toHaveAttribute("data-value", "60");
		expect(donut).toHaveAttribute("data-slot", "progress-donut");
	});

	test("the track circle carries --radius derived from strokeWidth", () => {
		render(
			<ProgressDonut.Root aria-label="Data transfer out" value={40} strokeWidth={4}>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const track = screen.getByRole("progressbar").querySelector("circle");
		expect(track).not.toBeNull();
		expect(track?.style.getPropertyValue("--radius")).toBe("calc(50% - 2px)");
	});

	test("omits aria-valuenow and data-value while indeterminate", () => {
		render(<ProgressDonut.Root aria-label="Data transfer out" value="indeterminate" />);
		const donut = screen.getByRole("progressbar");
		expect(donut).not.toHaveAttribute("aria-valuenow");
		expect(donut).not.toHaveAttribute("data-value");
	});

	test("a value outside 0..max renders as indeterminate", () => {
		render(<ProgressDonut.Root aria-label="Data transfer out" value={150} />);
		expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
	});
});
