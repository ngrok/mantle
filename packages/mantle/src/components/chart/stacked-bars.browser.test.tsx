"use client";

import { render, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BarChart } from "../bar-chart/index.js";

/**
 * Real-browser geometry tests for stacked `BarChart` segments: which segment
 * wears the rounded cap, where the 2px surface gap is carved, how wide the
 * hover band is drawn, and which segment a pointer resolves to. All four read
 * the painted canvas or a positioned overlay, so they need real layout and a
 * real 2d context.
 *
 * Regression suite for sparse stacks — series that are zero on most columns,
 * which is the shape a "usage by access key" chart produces. Those columns used
 * to render square-topped and floating 2px off the baseline, because the cap
 * and the gap were decided per series instead of per column.
 */
const STYLE = `
:root {
	--color-chart-1: #3e6ff4;
	--color-chart-2: #008138;
	--color-chart-3: #f6339a;
	--color-chart-other: #737373;
	--border-color-card-muted: #e5e5e5;
	/* The zero baseline reads this token. A color no other chrome wears makes
	   the baseline row findable in the pixel data. */
	--border-color-card: #ff0000;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
	--background-color-popover: #ffffff;
	--border-color-popover: #d4d4d4;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
/* Browser tests load no Tailwind build; mirror the chart's structural layout so
   the plot geometry is realistic. */
[data-slot="bar-chart"] {
	position: relative;
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
});

type Rgb = readonly [number, number, number];

const CHART_1: Rgb = [62, 111, 244];
const CHART_2: Rgb = [0, 129, 56];
const BASELINE: Rgb = [255, 0, 0];

/** The painted canvas, with the device-pixel ratio it was sized at. */
type Painted = {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	/** Device pixels per CSS pixel. */
	scale: number;
};

const canvasOf = (container: HTMLElement): HTMLCanvasElement => {
	const canvas = container.querySelector("canvas");
	if (!(canvas instanceof HTMLCanvasElement)) {
		throw new Error("expected the chart canvas to render");
	}
	return canvas;
};

const readCanvas = (canvas: HTMLCanvasElement): Painted => {
	const context = canvas.getContext("2d");
	if (context == null || canvas.width === 0) {
		throw new Error("expected a painted canvas");
	}
	const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
	return {
		data,
		width: canvas.width,
		height: canvas.height,
		scale: canvas.width / canvas.getBoundingClientRect().width,
	};
};

/**
 * Whether the pixel at `offset` is opaque and within `tolerance` of `color`.
 * The threshold excludes antialiased edge pixels, so a measured edge is the
 * fill's own edge rather than its fringe.
 */
const isColor = (painted: Painted, offset: number, color: Rgb, tolerance = 20): boolean =>
	(painted.data[offset + 3] ?? 0) > 200 &&
	Math.abs((painted.data[offset] ?? 0) - color[0]) <= tolerance &&
	Math.abs((painted.data[offset + 1] ?? 0) - color[1]) <= tolerance &&
	Math.abs((painted.data[offset + 2] ?? 0) - color[2]) <= tolerance;

/** How many pixels of `color` row `y` carries between `from` and `to`. */
const rowRunLength = (painted: Painted, y: number, color: Rgb, from = 0, to = painted.width) => {
	let count = 0;
	for (let x = from; x < to; x++) {
		if (isColor(painted, (y * painted.width + x) * 4, color)) {
			count += 1;
		}
	}
	return count;
};

/** How many pixels of `color` column `x` carries between `from` and `to`. */
const columnRunLength = (
	painted: Painted,
	x: number,
	color: Rgb,
	from = 0,
	to = painted.height,
) => {
	let count = 0;
	for (let y = from; y < to; y++) {
		if (isColor(painted, (y * painted.width + x) * 4, color)) {
			count += 1;
		}
	}
	return count;
};

type Span = { start: number; end: number };

/** The contiguous column runs that carry any pixel of `color` — one per bar. */
const columnRunsOf = (painted: Painted, color: Rgb): Span[] => {
	const runs: Span[] = [];
	let open: Span | null = null;
	for (let x = 0; x < painted.width; x++) {
		if (columnRunLength(painted, x, color) > 0) {
			open = open == null ? { start: x, end: x } : { start: open.start, end: x };
			continue;
		}
		if (open != null) {
			runs.push(open);
			open = null;
		}
	}
	if (open != null) {
		runs.push(open);
	}
	return runs;
};

/** The contiguous row runs that carry any pixel of `color` — one per bar when horizontal. */
const rowRunsOf = (painted: Painted, color: Rgb): Span[] => {
	const runs: Span[] = [];
	let open: Span | null = null;
	for (let y = 0; y < painted.height; y++) {
		if (rowRunLength(painted, y, color) > 0) {
			open = open == null ? { start: y, end: y } : { start: open.start, end: y };
			continue;
		}
		if (open != null) {
			runs.push(open);
			open = null;
		}
	}
	if (open != null) {
		runs.push(open);
	}
	return runs;
};

/** The first and last row of `color` inside the column span `bar`. */
const verticalExtent = (painted: Painted, color: Rgb, bar: Span): Span => {
	let start = painted.height;
	let end = -1;
	for (let y = 0; y < painted.height; y++) {
		if (rowRunLength(painted, y, color, bar.start, bar.end + 1) === 0) {
			continue;
		}
		start = Math.min(start, y);
		end = Math.max(end, y);
	}
	return { start, end };
};

/** The first and last column of `color` inside the row span `bar`. */
const horizontalExtent = (painted: Painted, color: Rgb, bar: Span): Span => {
	let start = painted.width;
	let end = -1;
	for (let x = 0; x < painted.width; x++) {
		if (columnRunLength(painted, x, color, bar.start, bar.end + 1) === 0) {
			continue;
		}
		start = Math.min(start, x);
		end = Math.max(end, x);
	}
	return { start, end };
};

/**
 * Two columns of equal total, each carrying its value on a different series.
 * The last-registered series ("second") is zero on the first column, which is
 * exactly the case a per-series cap flag renders square.
 */
const sparseStack = [
	{ day: "Mon", first: 100, second: 0 },
	{ day: "Tue", first: 0, second: 100 },
];

describe("stacked bar caps and baselines", () => {
	test("every column's topmost painted segment wears the rounded cap", async () => {
		// Both series paint chart-1, so the scan measures silhouette alone: the two
		// bars are pixel-identical apart from which series drew them.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={sparseStack}
					xKey="day"
					stacked
					animate={false}
					aria-label="Sparse stack"
				>
					<BarChart.Bar dataKey="first" label="First" color="chart-1" />
					<BarChart.Bar dataKey="second" label="Second" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const painted = readCanvas(canvas);
			const bars = columnRunsOf(painted, CHART_1);
			expect(bars).toHaveLength(2);
			for (const bar of bars) {
				const extent = verticalExtent(painted, CHART_1, bar);
				const capWidth = rowRunLength(painted, extent.start, CHART_1, bar.start, bar.end + 1);
				// 5 CSS px below the top clears the 4px corner radius entirely.
				const bodyRow = extent.start + Math.round(5 * painted.scale);
				const bodyWidth = rowRunLength(painted, bodyRow, CHART_1, bar.start, bar.end + 1);
				expect(bodyWidth).toBeGreaterThan(0);
				expect(capWidth).toBeLessThan(bodyWidth * 0.9);
			}
		});
	});

	test("a column whose lower series are all zero stays welded to the zero baseline", async () => {
		// "Tue" paints only the second-registered series, whose stacked lower
		// boundary is still 0. Carving the surface gap there lifts the whole column
		// off the axis and shows the grid through the seam.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={sparseStack}
					xKey="day"
					stacked
					animate={false}
					aria-label="Sparse stack baseline"
				>
					<BarChart.Bar dataKey="first" label="First" color="chart-1" />
					<BarChart.Bar dataKey="second" label="Second" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const painted = readCanvas(canvas);
			const bars = columnRunsOf(painted, CHART_1);
			expect(bars).toHaveLength(2);
			const [monday, tuesday] = bars;
			if (monday == null || tuesday == null) {
				throw new Error("expected both bars to paint");
			}
			const mondayBottom = verticalExtent(painted, CHART_1, monday).end;
			const tuesdayBottom = verticalExtent(painted, CHART_1, tuesday).end;
			expect(Math.abs(mondayBottom - tuesdayBottom)).toBeLessThanOrEqual(1);
		});
	});

	test("segments that do touch keep the surface gap between them", async () => {
		// The weld above must not cost the gap where it belongs: two painted
		// segments in one column stay visibly separated.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={[{ day: "Mon", first: 100, second: 100 }]}
					xKey="day"
					stacked
					animate={false}
					aria-label="Dense stack"
				>
					<BarChart.Bar dataKey="first" label="First" color="chart-1" />
					<BarChart.Bar dataKey="second" label="Second" color="chart-2" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const painted = readCanvas(canvas);
			const lower = columnRunsOf(painted, CHART_1)[0];
			const upper = columnRunsOf(painted, CHART_2)[0];
			if (lower == null || upper == null) {
				throw new Error("expected both segments to paint");
			}
			const lowerTop = verticalExtent(painted, CHART_1, lower).start;
			const upperBottom = verticalExtent(painted, CHART_2, upper).end;
			// The gap is 2 CSS px, carved out of the outer segment's baseline side.
			expect(lowerTop - upperBottom).toBeGreaterThanOrEqual(painted.scale);
		});
	});

	test("horizontal bars round the data end and weld to the baseline per row", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={sparseStack}
					xKey="day"
					stacked
					orientation="horizontal"
					animate={false}
					aria-label="Horizontal sparse stack"
				>
					<BarChart.Bar dataKey="first" label="First" color="chart-1" />
					<BarChart.Bar dataKey="second" label="Second" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const painted = readCanvas(canvas);
			const bars = rowRunsOf(painted, CHART_1);
			expect(bars).toHaveLength(2);
			const lefts: number[] = [];
			for (const bar of bars) {
				const extent = horizontalExtent(painted, CHART_1, bar);
				lefts.push(extent.start);
				const capHeight = columnRunLength(painted, extent.end, CHART_1, bar.start, bar.end + 1);
				const bodyColumn = extent.end - Math.round(5 * painted.scale);
				const bodyHeight = columnRunLength(painted, bodyColumn, CHART_1, bar.start, bar.end + 1);
				expect(bodyHeight).toBeGreaterThan(0);
				expect(capHeight).toBeLessThan(bodyHeight * 0.9);
			}
			const [first, second] = lefts;
			if (first == null || second == null) {
				throw new Error("expected both rows to paint");
			}
			expect(Math.abs(first - second)).toBeLessThanOrEqual(1);
		});
	});

	test("an all-zero bar chart keeps its zero baseline at the axis minimum", async () => {
		// Nicing a flat domain pads it to [-1, 1], which would float the baseline
		// through the middle of a chart whose minimum is documented as fixed at 0.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={[
						{ day: "Mon", value: 0 },
						{ day: "Tue", value: 0 },
					]}
					xKey="day"
					animate={false}
					aria-label="No usage yet"
				>
					<BarChart.Bar dataKey="value" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			const painted = readCanvas(canvas);
			let baselineRow = -1;
			for (let y = 0; y < painted.height; y++) {
				if (rowRunLength(painted, y, BASELINE) > painted.width / 2) {
					baselineRow = y;
				}
			}
			expect(baselineRow).toBeGreaterThan(0);
			expect(baselineRow / painted.height).toBeGreaterThan(0.75);
		});
	});
});

/**
 * The hover band overlay. The three overlay layers carry no `data-slot` yet, so
 * pick the band by what distinguishes it behaviorally: among them, the engine
 * writes an inline `width` only on the band.
 */
const hoverBandOf = (container: HTMLElement): HTMLElement => {
	const layers = container.querySelectorAll('[data-slot="bar-chart-plot"] > [aria-hidden]');
	for (const layer of layers) {
		if (layer instanceof HTMLElement && layer.style.width !== "") {
			return layer;
		}
	}
	throw new Error("expected the hover band to be positioned");
};

const overlayOf = (container: HTMLElement): HTMLElement => {
	const overlay = container.querySelector('[role="application"]');
	if (!(overlay instanceof HTMLElement)) {
		throw new Error("expected the interaction overlay to render");
	}
	return overlay;
};

/**
 * Press the pointer at one plot coordinate. The engine reads `offsetX`/`offsetY`
 * off the native event, and userEvent's pointer API cannot address a point
 * inside the plot, so these tests dispatch the real events themselves — the
 * same approach `bar-chart.browser.test.tsx` takes for hover.
 */
const pressAt = (overlay: HTMLElement, clientX: number, clientY: number): void => {
	for (const type of ["pointermove", "pointerdown", "pointerup"]) {
		overlay.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, clientY }));
	}
};

const denseDays = Array.from({ length: 60 }, (_, index) => ({
	day: `Day ${index + 1}`,
	value: 10 + (index % 7),
}));

describe("hover band geometry", () => {
	test("the band covers one category, so adjacent categories never share it", async () => {
		// 60 categories in a 600px box put the step near 9px. A band with a 24px
		// floor washes over a third of each neighbor.
		const user = userEvent.setup();
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root data={denseDays} xKey="day" animate={false} aria-label="Dense days">
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="value" label="Value" color="chart-1" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const overlay = overlayOf(container);
		overlay.focus();

		// The engine positions the overlay on an animation frame, so each step
		// settles before the next reads it.
		await user.keyboard("{Home}");
		await waitFor(() => {
			expect(hoverBandOf(container).getBoundingClientRect().width).toBeGreaterThan(0);
		});
		const first = hoverBandOf(container).getBoundingClientRect();

		await user.keyboard("{ArrowRight}");
		await waitFor(() => {
			expect(hoverBandOf(container).getBoundingClientRect().left).not.toBe(first.left);
		});
		const second = hoverBandOf(container).getBoundingClientRect();

		expect(second.width).toBeCloseTo(first.width, 1);
		// The two bands abut exactly: the hit regions tile the plot.
		expect(second.left).toBeCloseTo(first.right, 1);

		await user.keyboard("{End}");
		await waitFor(() => {
			expect(hoverBandOf(container).getBoundingClientRect().left).not.toBe(second.left);
		});
		const last = hoverBandOf(container).getBoundingClientRect();
		expect(last.right).toBeLessThanOrEqual(overlay.getBoundingClientRect().right + 0.5);
	});
});

const threeEqualSegments = [{ day: "Mon", bottom: 1, middle: 1, top: 1 }];

describe("stacked segment hit resolution", () => {
	test("clicking anywhere inside a segment activates that segment's series", async () => {
		// The mark is the filled span, so the segment under the pointer names the
		// series. Resolving by nearest cumulative boundary instead hands the half
		// of every segment nearer the baseline to the series below it.
		const activated: Array<string | null> = [];
		const { container } = render(
			<div style={{ width: 600, height: 400 }}>
				<BarChart.Root
					data={threeEqualSegments}
					xKey="day"
					stacked
					animate={false}
					aria-label="Three segments"
					onDatumActivate={(event) => activated.push(event.dataKey)}
				>
					<BarChart.Bar dataKey="bottom" label="Bottom" color="chart-1" />
					<BarChart.Bar dataKey="middle" label="Middle" color="chart-2" />
					<BarChart.Bar dataKey="top" label="Top" color="chart-3" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
			expect(columnRunsOf(readCanvas(canvas), CHART_2)).toHaveLength(1);
		});

		// Calibrate against the paint: read the middle segment's own pixel extent
		// rather than recomputing the engine's plot insets in the test.
		const painted = readCanvas(canvas);
		const bar = columnRunsOf(painted, CHART_2)[0];
		if (bar == null) {
			throw new Error("expected the middle segment to paint");
		}
		const extent = verticalExtent(painted, CHART_2, bar);
		const overlay = overlayOf(container);
		const overlayRect = overlay.getBoundingClientRect();
		const clientX = overlayRect.left + (bar.start + bar.end) / 2 / painted.scale;
		const clientYAt = (deviceY: number) => overlayRect.top + deviceY / painted.scale;
		const height = extent.end - extent.start;

		// Near the data end, the middle of the segment, and near the baseline end:
		// every one of them is the middle series.
		for (const fraction of [0.2, 0.5, 0.8]) {
			pressAt(overlay, clientX, clientYAt(extent.start + height * fraction));
		}

		expect(activated).toEqual(["middle", "middle", "middle"]);
	});
});

const tooltipOf = (container: HTMLElement): HTMLElement => {
	const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
	if (!(tooltip instanceof HTMLElement)) {
		throw new Error("expected the tooltip to render");
	}
	return tooltip;
};

describe("tooltip placement", () => {
	test("a readout taller than the plot starts at the top of the plot box", async () => {
		// The clamp is against the plot wrapper, not the inset plot rect: clamping
		// against the inset silently degrades to "pin below the padding, then spill
		// the whole overflow past the bottom".
		const series = Array.from({ length: 12 }, (_, index) => `key${index}`);
		const row: Record<string, string | number> = { day: "Mon" };
		for (const key of series) {
			row[key] = 5;
		}
		const { container } = render(
			<div style={{ width: 600, height: 160 }}>
				<BarChart.Root data={[row]} xKey="day" stacked animate={false} aria-label="Many series">
					{series.map((key) => (
						<BarChart.Bar key={key} dataKey={key} label={key} />
					))}
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const overlay = overlayOf(container);
		overlay.focus();
		await userEvent.setup().keyboard("{Home}");
		const tooltip = tooltipOf(container);
		const plotBox = overlay.getBoundingClientRect();

		// The engine repositions once its size observer measures the readout, so
		// poll the settled placement rather than the first frame's.
		await waitFor(() => {
			expect(tooltip.getBoundingClientRect().height).toBeGreaterThan(plotBox.height);
			expect(tooltip.getBoundingClientRect().top).toBeCloseTo(plotBox.top, 1);
		});
	});

	test("a readout that fits stays inside the plot box", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={threeEqualSegments}
					xKey="day"
					stacked
					animate={false}
					aria-label="Three segments"
				>
					<BarChart.Bar dataKey="bottom" label="Bottom" color="chart-1" />
					<BarChart.Bar dataKey="middle" label="Middle" color="chart-2" />
					<BarChart.Bar dataKey="top" label="Top" color="chart-3" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		const overlay = overlayOf(container);
		overlay.focus();
		await userEvent.setup().keyboard("{Home}");
		const tooltip = tooltipOf(container);
		const plotBox = overlay.getBoundingClientRect();

		await waitFor(() => {
			expect(tooltip.getBoundingClientRect().height).toBeGreaterThan(0);
		});
		const tooltipBox = tooltip.getBoundingClientRect();
		expect(tooltipBox.height).toBeLessThan(plotBox.height);
		expect(tooltipBox.top).toBeGreaterThanOrEqual(plotBox.top - 0.5);
		expect(tooltipBox.bottom).toBeLessThanOrEqual(plotBox.bottom + 0.5);
	});
});
