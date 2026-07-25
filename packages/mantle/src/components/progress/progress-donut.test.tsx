import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ProgressDonut, deriveStrokeWidthPx } from "./progress-donut.js";
import type { ValueType } from "./types.js";

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

	// The lower clamp matters as much as the upper one: the value feeds
	// `calc(50% - strokeWidth/2)`, so 0 draws an invisible ring at exactly 50%
	// radius and a negative value overflows the 0 0 32 32 viewBox.
	test("clamps values below the 1px minimum up to 1", () => {
		expect(deriveStrokeWidthPx(0)).toBe(1);
		expect(deriveStrokeWidthPx(-4)).toBe(1);
		expect(deriveStrokeWidthPx("0rem")).toBe(1);
	});

	test("falls back to 4 for unparseable values", () => {
		expect(deriveStrokeWidthPx(Number.NaN)).toBe(4);
		// Only bare numbers and `rem` strings are parsed, so a `px` string is NaN.
		expect(deriveStrokeWidthPx("16px")).toBe(4);
	});
});

describe("ProgressDonut", () => {
	const indicatorCircleIn = (container: HTMLElement) => {
		const circle = container.querySelector('[data-slot="progress-donut-indicator"] circle');
		if (circle == null) {
			throw new Error("expected the indicator to render a <circle>");
		}
		return circle;
	};

	// `strokeDashoffset` is the arc: `pathLength` is normalized to 100, so the
	// offset is `100 - percentage` and is the only thing that paints progress.
	const determinateCases: ReadonlyArray<{
		name: string;
		props: { value?: ValueType; max?: number };
		valueNow: string;
		valueMax: string;
		dashOffset: string;
	}> = [
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
			name: "an invalid max falling back to 100",
			props: { value: 50, max: 0 },
			valueNow: "50",
			valueMax: "100",
			dashOffset: "50",
		},
	];

	test.each(determinateCases)(
		"reports progress for $name via ARIA, data attributes, and the indicator arc",
		({ props, valueNow, valueMax, dashOffset }) => {
			const { container } = render(
				<ProgressDonut.Root {...props}>
					<ProgressDonut.Indicator />
				</ProgressDonut.Root>,
			);

			const progressbar = screen.getByRole("progressbar");
			expect(progressbar).toHaveAttribute("aria-valuemin", "0");
			expect(progressbar).toHaveAttribute("aria-valuemax", valueMax);
			expect(progressbar).toHaveAttribute("aria-valuenow", valueNow);
			expect(progressbar).toHaveAttribute("data-min", "0");
			expect(progressbar).toHaveAttribute("data-max", valueMax);
			expect(progressbar).toHaveAttribute("data-value", valueNow);
			expect(indicatorCircleIn(container)).toHaveAttribute("stroke-dashoffset", dashOffset);
		},
	);

	// Anything that isn't a number within 0..max degrades to the indeterminate
	// spinner, which has no current value to report.
	const indeterminateCases: ReadonlyArray<{ name: string; value: ValueType }> = [
		{ name: 'the literal "indeterminate"', value: "indeterminate" },
		{ name: "a value above max", value: 150 },
		{ name: "a negative value", value: -1 },
		{ name: "NaN", value: Number.NaN },
	];

	test.each(indeterminateCases)(
		"drops the current value from ARIA and paints the 60% tail for $name",
		({ value }) => {
			const { container } = render(
				<ProgressDonut.Root value={value}>
					<ProgressDonut.Indicator />
				</ProgressDonut.Root>,
			);

			const progressbar = screen.getByRole("progressbar");
			expect(progressbar).toHaveAttribute("aria-valuemax", "100");
			expect(progressbar).not.toHaveAttribute("aria-valuenow");
			expect(progressbar).not.toHaveAttribute("data-value");
			// The indeterminate tail is a fixed 60% of the circumference.
			expect(indicatorCircleIn(container)).toHaveAttribute("stroke-dashoffset", "40");
		},
	);

	test("fades the indeterminate tail with a gradient stroke instead of currentColor", () => {
		const { container } = render(
			<ProgressDonut.Root value="indeterminate">
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);

		const gradient = container.querySelector("linearGradient");
		if (gradient == null) {
			throw new Error("expected the indeterminate indicator to render a <linearGradient>");
		}
		expect(indicatorCircleIn(container)).toHaveAttribute("stroke", `url(#${gradient.id})`);
	});

	test("paints a determinate indicator with currentColor and no gradient", () => {
		const { container } = render(
			<ProgressDonut.Root value={50}>
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);

		expect(container.querySelector("linearGradient")).toBeNull();
		expect(indicatorCircleIn(container)).toHaveAttribute("stroke", "currentColor");
	});

	// Regression test: tw-animate-css utilities aren't deduped by tailwind-merge, so
	// emitting the `[15s]` default alongside a consumer's override left both classes
	// in the DOM and whichever Tailwind emitted last won.
	test("a consumer indeterminateRotationSpeed replaces the default duration entirely", () => {
		render(
			<ProgressDonut.Root
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

	test("scales both rings to the stroke width, insetting the radius by half of it", () => {
		const { container } = render(
			<ProgressDonut.Root value={50} strokeWidth="0.5rem">
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);

		const circles = container.querySelectorAll("circle");
		expect(circles).toHaveLength(2);
		for (const circle of circles) {
			expect(circle).toHaveAttribute("stroke-width", "8");
			if (!(circle instanceof SVGElement)) {
				throw new Error("expected an SVG <circle>");
			}
			// The radius is inset by half the stroke so the ring stays inside the viewBox.
			expect(circle.style.getPropertyValue("--radius")).toBe("calc(50% - 4px)");
		}
	});

	test("forwards arbitrary svg props to the progressbar element", () => {
		render(
			<ProgressDonut.Root value={50} aria-label="Upload progress" id="upload">
				<ProgressDonut.Indicator />
			</ProgressDonut.Root>,
		);

		const progressbar = screen.getByRole("progressbar", { name: "Upload progress" });
		expect(progressbar).toHaveAttribute("id", "upload");
		expect(progressbar).toHaveAttribute("data-slot", "progress-donut");
	});
});
