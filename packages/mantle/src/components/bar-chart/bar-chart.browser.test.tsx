"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "./bar-chart.js";

/**
 * Real-browser canvas tests: the paint pipeline (device-pixel sizing via
 * ResizeObserver, token-resolved fills, hover overlay geometry) needs real
 * layout and a real 2d context, which happy-dom lacks.
 *
 * Chart tokens are inlined instead of importing the full mantle stylesheet so
 * the test stays hermetic (mirrors label.browser.test.tsx). The values are
 * fixtures in the shipped hue families, not copies of today's literals. These
 * tests measure which channel dominates a painted pixel. `chart/tokens.test.ts`
 * pins the shipped palette.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #008138;
	--color-chart-3: #f6339a;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #d4d4d4;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
	--background-color-popover: #ffffff;
	--border-color-popover: #d4d4d4;
}
:root[data-test-theme="flipped"] {
	--color-chart-1: #ff0000;
}
/* What Tailwind compiles the arbitrary-property class [--color-chart-1:#e11d48]
   to. Browser tests load no Tailwind build, so the override a consumer writes on
   BarChart.Root is spelled out here instead. */
.scoped-chart-1 {
	--color-chart-1: #e11d48;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	margin: -1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border-width: 0;
}
/* Browser tests load no Tailwind build; mirror the chart's structural layout
   classes so the plot geometry is realistic. */
[data-slot="bar-chart"] {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot="bar-chart-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot="bar-chart-plot"] > canvas,
[data-slot="bar-chart-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
[data-slot="bar-chart-tooltip"] {
	position: absolute;
	left: 0;
	top: 0;
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
	document.documentElement.removeAttribute("data-test-theme");
});

const data = [
	{ month: "January", desktop: 186 },
	{ month: "February", desktop: 305 },
	{ month: "March", desktop: 237 },
];

/**
 * Narrow a queried element to the expected type, failing the test loudly when
 * the chart did not render its structure.
 */
const mustBe = <T extends Element>(
	element: Element | null,
	constructor: new () => T,
	what: string,
): T => {
	if (element instanceof constructor) {
		return element;
	}
	throw new Error(`expected ${what} to render`);
};

/**
 * Count pixels in the painted canvas whose dominant channel matches the
 * predicate. Reading back through a second getContext("2d") returns the same
 * live context the engine paints with.
 */
const countPixels = (
	canvas: HTMLCanvasElement,
	predicate: (red: number, green: number, blue: number, alpha: number) => boolean,
): number => {
	const context = canvas.getContext("2d");
	if (context == null || canvas.width === 0 || canvas.height === 0) {
		return 0;
	}
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	let count = 0;
	for (let offset = 0; offset < image.data.length; offset += 4) {
		const red = image.data[offset] ?? 0;
		const green = image.data[offset + 1] ?? 0;
		const blue = image.data[offset + 2] ?? 0;
		const alpha = image.data[offset + 3] ?? 0;
		if (predicate(red, green, blue, alpha)) {
			count += 1;
		}
	}
	return count;
};

const renderChart = () =>
	render(
		<div style={{ width: 600, height: 300 }}>
			<BarChart.Root data={data} xKey="month" animate={false} aria-label="Visitors by month">
				<BarChart.Grid />
				<BarChart.XAxis />
				<BarChart.YAxis />
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip />
			</BarChart.Root>
		</div>,
	);

describe("BarChart canvas painting", () => {
	test("paints token-colored bars at device-pixel resolution", async () => {
		const { container } = renderChart();
		const canvas = mustBe(container.querySelector("canvas"), HTMLCanvasElement, "the chart canvas");
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		// chart-1 (#3e6ff4) is blue-dominant; bars should cover a large area.
		await waitFor(() => {
			const bluePixels = countPixels(
				canvas,
				(red, green, blue, alpha) => alpha > 200 && blue > 200 && blue > red + 80,
			);
			expect(bluePixels).toBeGreaterThan(1000);
		});
	});

	test("re-resolves colors and repaints when the theme attributes change", async () => {
		const { container } = renderChart();
		const canvas = mustBe(container.querySelector("canvas"), HTMLCanvasElement, "the chart canvas");
		await waitFor(() => {
			expect(
				countPixels(
					canvas,
					(red, green, blue, alpha) => alpha > 200 && blue > 200 && blue > red + 80,
				),
			).toBeGreaterThan(1000);
		});
		// Flip a theme attribute the engine observes; --color-chart-1 becomes red.
		document.documentElement.setAttribute("data-test-theme", "flipped");
		document.documentElement.setAttribute("data-applied-theme", "light");
		try {
			await waitFor(() => {
				const redPixels = countPixels(
					canvas,
					(red, green, blue, alpha) => alpha > 200 && red > 200 && red > blue + 80,
				);
				expect(redPixels).toBeGreaterThan(1000);
			});
		} finally {
			document.documentElement.removeAttribute("data-test-theme");
			document.documentElement.removeAttribute("data-applied-theme");
		}
	});

	test("pointer hover shows the band overlay and tooltip without clearing the canvas", async () => {
		const { container } = renderChart();
		const canvas = mustBe(container.querySelector("canvas"), HTMLCanvasElement, "the chart canvas");
		const overlay = mustBe(
			container.querySelector('[role="application"]'),
			HTMLElement,
			"the overlay",
		);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		// Re-dispatch inside waitFor: the first pointer event can race the first
		// layout commit, and hover is idempotent per position anyway.
		await waitFor(() => {
			const rect = overlay.getBoundingClientRect();
			overlay.dispatchEvent(
				new PointerEvent("pointermove", {
					bubbles: true,
					clientX: rect.left + rect.width * 0.5,
					clientY: rect.top + rect.height * 0.5,
				}),
			);
			const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
			expect(tooltip?.textContent).toContain("February");
			expect(tooltip?.textContent).toContain("305");
		});
		const band = container.querySelector('[data-slot="bar-chart"] [aria-hidden]');
		expect(band).toBeInstanceOf(HTMLElement);
	});
});

describe("overriding a chart color token", () => {
	/** Two charts side by side, only the first carrying the token override. */
	const renderPair = () =>
		render(
			<>
				<div style={{ width: 600, height: 300 }}>
					<BarChart.Root
						data={data}
						xKey="month"
						animate={false}
						aria-label="Overridden"
						className="scoped-chart-1"
					>
						<BarChart.Bar dataKey="desktop" label="Desktop" />
					</BarChart.Root>
				</div>
				<div style={{ width: 600, height: 300 }}>
					<BarChart.Root data={data} xKey="month" animate={false} aria-label="Default">
						<BarChart.Bar dataKey="desktop" label="Desktop" />
					</BarChart.Root>
				</div>
			</>,
		);

	/** The canvas of the nth rendered chart, in document order. */
	const canvasAt = (container: HTMLElement, index: number, what: string) =>
		mustBe(
			container.querySelectorAll('[data-slot="bar-chart"]')[index]?.querySelector("canvas") ?? null,
			HTMLCanvasElement,
			`the ${what} chart canvas`,
		);

	test("a --color-chart-N override on the Root repaints only that chart", async () => {
		// The contract colors.ts states: the resolution probe is appended INSIDE the
		// chart root, so a custom property scoped to one root wins for that chart and
		// leaves its siblings alone. A consumer writes this as Tailwind's
		// `[--color-chart-1:#e11d48]`; without a Tailwind build the injected
		// `.scoped-chart-1` rule stands in for it.
		const { container } = renderPair();
		const overridden = canvasAt(container, 0, "overridden");
		const untouched = canvasAt(container, 1, "default");
		await waitFor(() => {
			expect(overridden.width).toBeGreaterThan(0);
			expect(untouched.width).toBeGreaterThan(0);
		});
		const isRed = (red: number, green: number, blue: number, alpha: number) =>
			alpha > 200 && red > 150 && red > blue + 60;
		const isBlue = (red: number, green: number, blue: number, alpha: number) =>
			alpha > 200 && blue > 200 && blue > red + 80;
		await waitFor(() => {
			// The override paints #e11d48, so red dominates and no default blue is left.
			expect(countPixels(overridden, isRed)).toBeGreaterThan(1000);
			expect(countPixels(overridden, isBlue)).toBe(0);
			// The sibling never saw the override and still paints the token default.
			expect(countPixels(untouched, isBlue)).toBeGreaterThan(1000);
			expect(countPixels(untouched, isRed)).toBe(0);
		});
	});
});
