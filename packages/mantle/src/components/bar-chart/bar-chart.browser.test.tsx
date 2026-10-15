"use client";

import { render, waitFor } from "@testing-library/react";
import { findChartCanvas } from "../../test-utils/find-chart-canvas.js";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { MockInstance } from "vitest";
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
let fillTextSpy: MockInstance;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

// Installed per test rather than once, because `restoreMocks` tears every spy down between tests.
// It calls through to the real implementation, so painting is unchanged — the spy only records
// which strings hit the canvas.
beforeEach(() => {
	fillTextSpy = vi.spyOn(CanvasRenderingContext2D.prototype, "fillText");
});

afterAll(() => {
	styleElement.remove();
	document.documentElement.removeAttribute("data-test-theme");
});

const paintedLabels = (): string[] => fillTextSpy.mock.calls.map((call) => String(call[0]));

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

/** chart-1 (#3e6ff4) ink: blue-dominant and opaque. */
const isChart1Ink = (red: number, green: number, blue: number, alpha: number): boolean =>
	alpha > 200 && blue > 200 && blue > red + 80;

/** chart-2 (#008138) ink: green-dominant and opaque. */
const isChart2Ink = (red: number, green: number, blue: number, alpha: number): boolean =>
	alpha > 200 && green > 100 && green > red + 60 && green > blue + 40;

/**
 * The center of gravity of one series' painted marks, in CSS pixels relative to
 * the plot. Self-locating: the test never has to reconstruct the engine's axis
 * padding or band math to know where a bar sits.
 */
const inkCenter = (
	canvas: HTMLCanvasElement,
	predicate: (red: number, green: number, blue: number, alpha: number) => boolean,
): { x: number; y: number; count: number } => {
	const context = canvas.getContext("2d");
	const cssWidth = canvas.getBoundingClientRect().width;
	if (context == null || canvas.width === 0 || cssWidth === 0) {
		return { x: Number.NaN, y: Number.NaN, count: 0 };
	}
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	let count = 0;
	let sumX = 0;
	let sumY = 0;
	for (let offset = 0; offset < image.data.length; offset += 4) {
		const red = image.data[offset] ?? 0;
		const green = image.data[offset + 1] ?? 0;
		const blue = image.data[offset + 2] ?? 0;
		const alpha = image.data[offset + 3] ?? 0;
		if (predicate(red, green, blue, alpha)) {
			const pixel = offset / 4;
			count += 1;
			sumX += pixel % canvas.width;
			sumY += Math.floor(pixel / canvas.width);
		}
	}
	const devicePerCss = canvas.width / cssWidth;
	return {
		x: count === 0 ? Number.NaN : sumX / count / devicePerCss,
		y: count === 0 ? Number.NaN : sumY / count / devicePerCss,
		count,
	};
};

/** A full press+release at a point inside the interaction overlay. */
const pressAt = (overlay: HTMLElement, cssX: number, cssY: number): void => {
	const rect = overlay.getBoundingClientRect();
	const clientX = rect.left + cssX;
	const clientY = rect.top + cssY;
	overlay.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX, clientY }));
	overlay.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX, clientY }));
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
		const canvas = await findChartCanvas(container);
		// A `<canvas>` starts with an intrinsic 300x150 store, so `width > 0` holds
		// before the engine sizes anything. The store must match the CSS box at the
		// ratio the environment reports (Playwright runs at 1), which catches an
		// unsized store or a hardcoded 2x.
		await expect
			.poll(() => canvas.width)
			.toBe(Math.round(canvas.getBoundingClientRect().width * window.devicePixelRatio));
		expect(canvas.height).toBe(
			Math.round(canvas.getBoundingClientRect().height * window.devicePixelRatio),
		);
		// chart-1 (#3e6ff4) is blue-dominant; bars should cover a large area.
		await waitFor(() => {
			expect(countPixels(canvas, isChart1Ink)).toBeGreaterThan(1000);
		});
	});

	test("re-resolves colors and repaints when the theme attributes change", async () => {
		const { container } = renderChart();
		const canvas = await findChartCanvas(container);
		await waitFor(() => {
			expect(countPixels(canvas, isChart1Ink)).toBeGreaterThan(1000);
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
		const canvas = await findChartCanvas(container);
		const overlay = mustBe(
			container.querySelector('[role="application"]'),
			HTMLElement,
			"the overlay",
		);
		const band = mustBe(
			container.querySelector('[data-slot="bar-chart-hover-band"]'),
			HTMLElement,
			"the hover band",
		);
		await waitFor(() => {
			expect(countPixels(canvas, isChart1Ink)).toBeGreaterThan(1000);
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
			// Why inside waitFor: the engine writes the band opacity on the next animation frame.
			expect(band.style.opacity).toBe("1");
		});
		// Why: hover syncs the DOM overlays only, so the bars painted before the pointer moved must still be there.
		expect(
			countPixels(
				canvas,
				(red, green, blue, alpha) => alpha > 200 && blue > 200 && blue > red + 80,
			),
		).toBeGreaterThan(1000);
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
		findChartCanvas(
			mustBe(
				container.querySelectorAll('[data-slot="bar-chart"]')[index] ?? null,
				HTMLElement,
				`the ${what} chart root`,
			),
		);

	test("a --color-chart-N override on the Root repaints only that chart", async () => {
		// The contract colors.ts states: the resolution probe is appended INSIDE the
		// chart root, so a custom property scoped to one root wins for that chart and
		// leaves its siblings alone. A consumer writes this as Tailwind's
		// `[--color-chart-1:#e11d48]`; without a Tailwind build the injected
		// `.scoped-chart-1` rule stands in for it.
		const { container } = renderPair();
		const overridden = await canvasAt(container, 0, "overridden");
		const untouched = await canvasAt(container, 1, "default");
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

describe("BarChart yDomain", () => {
	test("an explicit yDomain caps the value axis above the data", async () => {
		render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={data}
					xKey="month"
					yDomain={[0, 1000]}
					animate={false}
					aria-label="Visitors by month"
				>
					<BarChart.YAxis />
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</div>,
		);
		// The data tops out at 305, so a painted 1,000 tick can only come from the
		// override surviving the automatic (nice) domain.
		await waitFor(() => {
			expect(paintedLabels()).toContain("1,000");
		});
	});
});

describe("BarChart pointer activation", () => {
	test("pressing one bar of a grouped band activates that series' dataKey", async () => {
		const onDatumActivate = vi.fn<(event: { index: number; dataKey: string | null }) => void>();
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={[{ month: "January", desktop: 186, mobile: 80 }]}
					xKey="month"
					animate={false}
					aria-label="Visitors by month"
					onDatumActivate={onDatumActivate}
				>
					<BarChart.Bar dataKey="desktop" label="Desktop" />
					<BarChart.Bar dataKey="mobile" label="Mobile" />
				</BarChart.Root>
			</div>,
		);
		const canvas = await findChartCanvas(container);
		const overlay = mustBe(
			container.querySelector('[role="application"]'),
			HTMLElement,
			"the overlay",
		);
		await waitFor(() => {
			expect(inkCenter(canvas, isChart1Ink).count).toBeGreaterThan(500);
			expect(inkCenter(canvas, isChart2Ink).count).toBeGreaterThan(500);
		});
		const desktopBar = inkCenter(canvas, isChart1Ink);
		const mobileBar = inkCenter(canvas, isChart2Ink);
		// Grouped bars sit side by side in the band, in composition order.
		expect(mobileBar.x).toBeGreaterThan(desktopBar.x);

		pressAt(overlay, mobileBar.x, mobileBar.y);
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, dataKey: "mobile" }),
		);

		pressAt(overlay, desktopBar.x, desktopBar.y);
		expect(onDatumActivate).toHaveBeenCalledTimes(2);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, dataKey: "desktop" }),
		);
	});
});

describe("BarChart decimated keyboard stride", () => {
	test("arrow keys widen their stride on a decimated series without jumping to the end", async () => {
		// Far more rows than device columns, so the engine decimates and one
		// ArrowRight advances a whole column of rows. It must never advance the
		// whole series, or the keyboard cursor is useless on dense data.
		const rows = Array.from({ length: 5000 }, (_, index) => ({
			month: `Minute ${index}`,
			desktop: (index % 97) + 1,
		}));
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={rows}
					xKey="month"
					animate={false}
					aria-label="Visitors by minute"
					onActiveIndexChange={onActiveIndexChange}
				>
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</div>,
		);
		const canvas = await findChartCanvas(container);
		const overlay = mustBe(
			container.querySelector('[role="application"]'),
			HTMLElement,
			"the overlay",
		);
		await waitFor(() => {
			expect(countPixels(canvas, isChart1Ink)).toBeGreaterThan(1000);
		});
		overlay.focus();
		const arrowRight = (): void => {
			overlay.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
		};
		arrowRight();
		const [firstLanding] = onActiveIndexChange.mock.calls.at(-1) ?? [];
		// The stride widened past a single row but stayed a small fraction of the
		// series; the degenerate `stride = rowCount` would land on 4999.
		expect(firstLanding).toBeGreaterThan(0);
		expect(firstLanding).toBeLessThan(100);
		arrowRight();
		const [secondLanding] = onActiveIndexChange.mock.calls.at(-1) ?? [];
		expect(secondLanding).toBe((firstLanding ?? 0) * 2 + 1);
		// End still reaches the true last row, decimation or not.
		overlay.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(4999);
	});
});
