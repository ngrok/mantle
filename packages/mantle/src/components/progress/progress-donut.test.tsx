import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { deriveStrokeWidthPx, ProgressDonut } from "./progress-donut.js";
import type { ValueType } from "./types.js";

describe("deriveStrokeWidthPx", () => {
	test("given null/undefined, returns 4", () => {
		expect(deriveStrokeWidthPx(null)).toBe(4);
		expect(deriveStrokeWidthPx(undefined)).toBe(4);
	});

	test('given "6", returns 6', () => {
		expect(deriveStrokeWidthPx("6")).toBe(6);
	});

	test('given "0.5rem", returns 8', () => {
		expect(deriveStrokeWidthPx("0.5rem")).toBe(8);
	});

	test("given 6, returns 6", () => {
		expect(deriveStrokeWidthPx(6)).toBe(6);
	});

	test("given 16, returns 12", () => {
		expect(deriveStrokeWidthPx(16)).toBe(12);
	});

	test("clamps values below the 1px minimum up to 1", () => {
		// The value feeds `calc(50% - strokeWidth/2)`. At 0 the ring sits on the
		// viewBox edge, and a negative value pushes it outside.
		expect(deriveStrokeWidthPx(0)).toBe(1);
		expect(deriveStrokeWidthPx(-4)).toBe(1);
		expect(deriveStrokeWidthPx("0rem")).toBe(1);
	});

	test("falls back to 4 for unparseable values", () => {
		expect(deriveStrokeWidthPx(Number.NaN)).toBe(4);
		// Only bare numbers and `rem` strings parse, so a `px` string is NaN.
		expect(deriveStrokeWidthPx("16px")).toBe(4);
	});
});

describe("ProgressDonut.Root", () => {
	/** The indicator's arc. `pathLength` is 100, so its dash offset is `100 - percent`. */
	const indicatorArc = (container: HTMLElement) => {
		const circle = container.querySelector('[data-slot="progress-donut-indicator"] circle');
		if (circle == null) {
			throw new Error("expected the indicator to render a <circle>");
		}
		return circle;
	};

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
	});

	test("every part carries its data-slot", () => {
		render(
			<ProgressDonut.Root aria-label="Data transfer out" value={60}>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const donut = screen.getByRole("progressbar");
		expect(donut).toHaveAttribute("data-slot", "progress-donut");
		expect(donut.querySelector("g")).toHaveAttribute("data-slot", "progress-donut-indicator");
	});

	test.each<{
		name: string;
		props: { value?: ValueType; max?: number };
		valueNow: string;
		valueMax: string;
		dashOffset: string;
	}>([
		{ name: "no value", props: {}, valueNow: "0", valueMax: "100", dashOffset: "100" },
		{ name: "value 0", props: { value: 0 }, valueNow: "0", valueMax: "100", dashOffset: "100" },
		{ name: "value 50", props: { value: 50 }, valueNow: "50", valueMax: "100", dashOffset: "50" },
		{ name: "value 100", props: { value: 100 }, valueNow: "100", valueMax: "100", dashOffset: "0" },
		{
			name: "value 25 of max 50",
			props: { value: 25, max: 50 },
			valueNow: "25",
			valueMax: "50",
			dashOffset: "50",
		},
		{
			name: "an invalid max, which falls back to 100",
			props: { value: 50, max: 0 },
			valueNow: "50",
			valueMax: "100",
			dashOffset: "50",
		},
	])(
		"reports $name through ARIA, the data attributes, and the indicator arc",
		({ props, valueNow, valueMax, dashOffset }) => {
			const { container } = render(
				<ProgressDonut.Root aria-label="Data transfer out" {...props}>
					<ProgressDonut.Indicator />
				</ProgressDonut.Root>,
			);
			const donut = screen.getByRole("progressbar");
			expect(donut).toHaveAttribute("aria-valuemin", "0");
			expect(donut).toHaveAttribute("aria-valuemax", valueMax);
			expect(donut).toHaveAttribute("aria-valuenow", valueNow);
			expect(donut).toHaveAttribute("data-min", "0");
			expect(donut).toHaveAttribute("data-max", valueMax);
			expect(donut).toHaveAttribute("data-value", valueNow);
			expect(indicatorArc(container)).toHaveAttribute("stroke-dashoffset", dashOffset);
		},
	);

	// Anything that is not a number inside 0..max degrades to the indeterminate
	// spinner, which has no current value to report.
	test.each<{ name: string; value: ValueType }>([
		{ name: 'the literal "indeterminate"', value: "indeterminate" },
		{ name: "a value above max", value: 150 },
		{ name: "a negative value", value: -1 },
		{ name: "NaN", value: Number.NaN },
	])("omits aria-valuenow and data-value and paints the 60% tail for $name", ({ value }) => {
		const { container } = render(
			<ProgressDonut.Root aria-label="Data transfer out" value={value}>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const donut = screen.getByRole("progressbar");
		expect(donut).toHaveAttribute("aria-valuemax", "100");
		expect(donut).not.toHaveAttribute("aria-valuenow");
		expect(donut).not.toHaveAttribute("data-value");
		expect(indicatorArc(container)).toHaveAttribute("stroke-dashoffset", "40");
	});

	test("the indeterminate tail fades through a gradient stroke", () => {
		const { container } = render(
			<ProgressDonut.Root aria-label="Data transfer out" value="indeterminate">
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const gradient = container.querySelector("linearGradient");
		if (gradient == null) {
			throw new Error("expected the indeterminate indicator to render a <linearGradient>");
		}
		expect(indicatorArc(container)).toHaveAttribute("stroke", `url(#${gradient.id})`);
	});

	test("a determinate arc paints with currentColor and no gradient", () => {
		const { container } = render(
			<ProgressDonut.Root aria-label="Data transfer out" value={50}>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		expect(container.querySelector("linearGradient")).toBeNull();
		expect(indicatorArc(container)).toHaveAttribute("stroke", "currentColor");
	});

	test("a consumer indeterminateRotationSpeed replaces the default duration", () => {
		// Why a class: the duration is a tw-animate-css utility that tailwind-merge
		// does not dedupe, so the override contract is the class list itself. Two
		// durations in the DOM would leave the stylesheet order to pick one.
		render(
			<ProgressDonut.Root
				aria-label="Data transfer out"
				value="indeterminate"
				indeterminateRotationSpeed="animation-duration-[2s]"
			>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const durations = screen
			.getByRole("progressbar")
			.getAttribute("class")
			?.split(/\s+/)
			.filter((token) => token.startsWith("animation-duration-"));
		expect(durations).toEqual(["animation-duration-[2s]"]);
	});

	test("both circles carry the stroke width and a --radius inset by half of it", () => {
		// The inset keeps the ring inside the viewBox at any stroke width.
		const { container } = render(
			<ProgressDonut.Root aria-label="Data transfer out" value={40} strokeWidth="0.5rem">
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);
		const circles = container.querySelectorAll("circle");
		expect(circles).toHaveLength(2);
		for (const circle of circles) {
			expect(circle).toHaveAttribute("stroke-width", "8");
			expect(circle.style.getPropertyValue("--radius")).toBe("calc(50% - 4px)");
		}
	});
});
