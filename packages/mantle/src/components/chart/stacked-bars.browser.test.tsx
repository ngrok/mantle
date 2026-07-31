"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AreaChart } from "../area-chart/index.js";
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
 *
 * The zero-anchored value axis rides along here because it surfaces on the same
 * "no usage yet" card, and `AreaChart` shares the anchor with `BarChart`.
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
[data-slot="bar-chart"],
[data-slot="area-chart"] {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot="bar-chart-plot"],
[data-slot="area-chart-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot="bar-chart-plot"] > canvas,
[data-slot="bar-chart-plot"] > [tabindex],
[data-slot="area-chart-plot"] > canvas,
[data-slot="area-chart-plot"] > [tabindex] {
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
const CHART_3: Rgb = [246, 51, 154];
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
 * Wait until the engine has measured the whole plot, not a partial first frame.
 * The backing store is sized in device pixels, so it reaches at least the CSS
 * width once the real measurement lands — where a partial frame leaves a canvas
 * a few pixels wide, a band layout with a near-zero step, and a hover that
 * resolves every x to the same category.
 */
const waitForPlot = async (canvas: HTMLCanvasElement): Promise<void> => {
	await waitFor(() => {
		const cssWidth = canvas.getBoundingClientRect().width;
		expect(cssWidth).toBeGreaterThan(0);
		expect(canvas.width).toBeGreaterThanOrEqual(cssWidth);
	});
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
 * The row carrying the zero-baseline rule. The chart draws it across the plot
 * in a color no other chrome wears, so the widest run of that color names it.
 */
const baselineRowOf = (painted: Painted): number => {
	let row = -1;
	for (let y = 0; y < painted.height; y++) {
		if (rowRunLength(painted, y, BASELINE) > painted.width / 2) {
			row = y;
		}
	}
	return row;
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

/** One column of three equal segments, each on its own series. */
const threeEqualSegments = [{ day: "Mon", bottom: 1, middle: 1, top: 1 }];

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
		await waitForPlot(canvas);
		await waitFor(() => {
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
		await waitForPlot(canvas);
		await waitFor(() => {
			const painted = readCanvas(canvas);
			const bars = columnRunsOf(painted, CHART_1);
			expect(bars).toHaveLength(2);
			// Measure against the painted axis, not against the sibling column: a
			// carve that lifts both columns equally leaves them agreeing with each
			// other while both float off the baseline.
			const baselineRow = baselineRowOf(painted);
			expect(baselineRow).toBeGreaterThan(0);
			for (const bar of bars) {
				const bottom = verticalExtent(painted, CHART_1, bar).end;
				expect(Math.abs(bottom - baselineRow)).toBeLessThanOrEqual(painted.scale);
			}
		});
	});

	test("a segment below the top of its column never wears the cap", async () => {
		// Three equal segments in one column: only the top one is the data end, so
		// rounding every segment would render the column as a stack of pills.
		const { container } = render(
			<div style={{ width: 600, height: 400 }}>
				<BarChart.Root
					data={threeEqualSegments}
					xKey="day"
					stacked
					animate={false}
					aria-label="Three segments capping"
				>
					<BarChart.Bar dataKey="bottom" label="Bottom" color="chart-1" />
					<BarChart.Bar dataKey="middle" label="Middle" color="chart-2" />
					<BarChart.Bar dataKey="top" label="Top" color="chart-3" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitForPlot(canvas);
		await waitFor(() => {
			const painted = readCanvas(canvas);
			const middle = columnRunsOf(painted, CHART_2)[0];
			const top = columnRunsOf(painted, CHART_3)[0];
			if (middle == null || top == null) {
				throw new Error("expected the middle and top segments to paint");
			}
			const middleExtent = verticalExtent(painted, CHART_2, middle);
			const topExtent = verticalExtent(painted, CHART_3, top);
			const bodyOffset = Math.round(5 * painted.scale);
			// The top segment narrows at its own top row; the middle segment, which
			// is interior, keeps its full width there.
			const topCap = rowRunLength(painted, topExtent.start, CHART_3, top.start, top.end + 1);
			const topBody = rowRunLength(
				painted,
				topExtent.start + bodyOffset,
				CHART_3,
				top.start,
				top.end + 1,
			);
			const middleCap = rowRunLength(
				painted,
				middleExtent.start,
				CHART_2,
				middle.start,
				middle.end + 1,
			);
			const middleBody = rowRunLength(
				painted,
				middleExtent.start + bodyOffset,
				CHART_2,
				middle.start,
				middle.end + 1,
			);
			expect(topBody).toBeGreaterThan(0);
			expect(topCap).toBeLessThan(topBody * 0.9);
			expect(middleBody).toBeGreaterThan(0);
			expect(middleCap).toBe(middleBody);
		});
	});

	test("a diverging column caps both piles at the end facing away from zero", async () => {
		// The negative pile grows downward, so its cap belongs on its bottom row.
		// Reading the segment's boundaries in array order, or looking a negative
		// segment up in the positive pile, puts it on the edge facing zero instead.
		const { container } = render(
			<div style={{ width: 600, height: 400 }}>
				<BarChart.Root
					data={[{ day: "Mon", up: 40, down: -40 }]}
					xKey="day"
					stacked
					animate={false}
					aria-label="Diverging stack"
				>
					<BarChart.Bar dataKey="up" label="Up" color="chart-1" />
					<BarChart.Bar dataKey="down" label="Down" color="chart-2" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitForPlot(canvas);
		await waitFor(() => {
			const painted = readCanvas(canvas);
			const up = columnRunsOf(painted, CHART_1)[0];
			const down = columnRunsOf(painted, CHART_2)[0];
			if (up == null || down == null) {
				throw new Error("expected both piles to paint");
			}
			const upExtent = verticalExtent(painted, CHART_1, up);
			const downExtent = verticalExtent(painted, CHART_2, down);
			const bodyOffset = Math.round(5 * painted.scale);
			const upCap = rowRunLength(painted, upExtent.start, CHART_1, up.start, up.end + 1);
			const upBody = rowRunLength(
				painted,
				upExtent.start + bodyOffset,
				CHART_1,
				up.start,
				up.end + 1,
			);
			const downCap = rowRunLength(painted, downExtent.end, CHART_2, down.start, down.end + 1);
			const downBody = rowRunLength(
				painted,
				downExtent.end - bodyOffset,
				CHART_2,
				down.start,
				down.end + 1,
			);
			expect(upBody).toBeGreaterThan(0);
			expect(upCap).toBeLessThan(upBody * 0.9);
			expect(downBody).toBeGreaterThan(0);
			expect(downCap).toBeLessThan(downBody * 0.9);
			// The negative pile really is below the axis.
			expect(downExtent.start).toBeGreaterThan(upExtent.end);
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
		await waitForPlot(canvas);
		await waitFor(() => {
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
		await waitForPlot(canvas);
		await waitFor(() => {
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
		await waitForPlot(canvas);
		await waitFor(() => {
			const painted = readCanvas(canvas);
			const baselineRow = baselineRowOf(painted);
			expect(baselineRow).toBeGreaterThan(0);
			expect(baselineRow / painted.height).toBeGreaterThan(0.75);
		});
	});

	test("an all-zero area chart keeps its baseline at the axis minimum too", async () => {
		// `AreaChart` fills from the same zero baseline and documents the same fixed
		// minimum, so the anchor covers both kinds. Left to `niceDomain`, the flat
		// domain pads to [-1, 1] and the collapsed area floats to mid-plot.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<AreaChart.Root
					data={[
						{ day: "Mon", value: 0 },
						{ day: "Tue", value: 0 },
					]}
					xKey="day"
					animate={false}
					aria-label="No usage yet, area"
				>
					<AreaChart.Area dataKey="value" label="Value" color="chart-1" />
				</AreaChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitForPlot(canvas);
		await waitFor(() => {
			const painted = readCanvas(canvas);
			// The collapsed area paints as its stroked edge, so the row carrying the
			// longest run of the series color is the baseline it sits on.
			let seriesRow = -1;
			let longest = 0;
			for (let y = 0; y < painted.height; y++) {
				const run = rowRunLength(painted, y, CHART_1);
				if (run > longest) {
					longest = run;
					seriesRow = y;
				}
			}
			expect(longest).toBeGreaterThan(painted.width / 4);
			expect(seriesRow / painted.height).toBeGreaterThan(0.75);
		});
	});
});

/**
 * The hover band overlay, addressed by its public slot. The engine writes the
 * band's `width` as an inline style, so an empty one means it has not painted
 * yet — that makes this a usable poll condition as well as a query.
 */
const hoverBandOf = (container: HTMLElement): HTMLElement => {
	const band = container.querySelector('[data-slot="bar-chart-hover-band"]');
	if (!(band instanceof HTMLElement)) {
		throw new Error("expected the hover band to render");
	}
	if (band.style.width === "") {
		throw new Error("expected the hover band to be positioned");
	}
	return band;
};

const overlayOf = (container: HTMLElement): HTMLElement => {
	const overlay = container.querySelector('[role="application"]');
	if (!(overlay instanceof HTMLElement)) {
		throw new Error("expected the interaction overlay to render");
	}
	return overlay;
};

/**
 * Move the pointer to one plot coordinate. The engine reads `offsetX`/`offsetY`
 * off the native event, and userEvent's pointer API cannot address a point
 * inside the plot, so these tests dispatch the real events themselves — the
 * same approach `bar-chart.browser.test.tsx` takes. Keyboard stepping reaches
 * the same code, but headless CI never focuses the window, so the key would
 * land nowhere.
 */
const hoverAt = (overlay: HTMLElement, clientX: number, clientY: number): void => {
	overlay.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX, clientY }));
};

/** Press the pointer at one plot coordinate. */
const pressAt = (overlay: HTMLElement, clientX: number, clientY: number): void => {
	hoverAt(overlay, clientX, clientY);
	for (const type of ["pointerdown", "pointerup"]) {
		overlay.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX, clientY }));
	}
};

/** One band's geometry, measured from the plot's left edge rather than the viewport. */
type BandBox = {
	left: number;
	width: number;
	right: number;
	plotWidth: number;
};

const denseDays = Array.from({ length: 60 }, (_, index) => ({
	day: `Day ${index + 1}`,
	value: 10 + (index % 7),
}));

describe("hover band geometry", () => {
	test("the band covers one category, so adjacent categories never share it", async () => {
		// 60 categories in a 600px box put the step near 9px. A band with a 24px
		// floor washes over a third of each neighbor.
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
		await waitForPlot(canvas);
		const overlay = overlayOf(container);

		/** The band, measured against the plot's own left edge. */
		const measureBand = (): BandBox => {
			const plot = overlay.getBoundingClientRect();
			const band = hoverBandOf(container).getBoundingClientRect();
			return {
				left: band.left - plot.left,
				width: band.width,
				right: band.right - plot.left,
				plotWidth: plot.width,
			};
		};

		/**
		 * Hover one plot-relative x until the band lands somewhere new. Both the
		 * dispatch and the measurement re-read the plot box, because sibling test
		 * containers move it, and re-dispatching inside `waitFor` covers the first
		 * pointer event racing the first layout commit — the same reason
		 * `bar-chart.browser.test.tsx` re-dispatches. Hover at a fixed position is
		 * idempotent, so repeating it changes nothing.
		 */
		const hoverUntilBandMoves = async (
			offsetX: (plotWidth: number) => number,
			previousLeft: number | null,
		): Promise<BandBox> => {
			await waitFor(() => {
				const plot = overlay.getBoundingClientRect();
				expect(plot.width).toBeGreaterThan(0);
				hoverAt(overlay, plot.left + offsetX(plot.width), plot.top + plot.height / 2);
				expect(measureBand().left).not.toBe(previousLeft);
			});
			return measureBand();
		};

		const first = await hoverUntilBandMoves((plotWidth) => plotWidth / 2, null);
		// One pixel past the band belongs to the next category, so the band that
		// answers must be the neighbor — abutting, never overlapping.
		const second = await hoverUntilBandMoves(() => first.right + 1, first.left);

		expect(second.width).toBeCloseTo(first.width, 1);
		expect(second.left).toBeCloseTo(first.right, 1);

		const last = await hoverUntilBandMoves((plotWidth) => plotWidth - 1, second.left);
		expect(last.right).toBeLessThanOrEqual(last.plotWidth + 0.5);
	});
});

describe("stacked segment hit resolution", () => {
	test("pressing anywhere inside a segment activates that segment's series", async () => {
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
		await waitForPlot(canvas);
		await waitFor(() => {
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
		const height = extent.end - extent.start;

		/** Press at a fraction of the middle segment's own painted height. */
		const pressWithinSegment = (fraction: number): void => {
			const plot = overlay.getBoundingClientRect();
			pressAt(
				overlay,
				plot.left + (bar.start + bar.end) / 2 / painted.scale,
				plot.top + (extent.start + height * fraction) / painted.scale,
			);
		};

		// Warm up the pointer: the first event can race the first layout commit,
		// and a press with no active index activates nothing at all.
		await waitFor(() => {
			pressWithinSegment(0.5);
			expect(activated).not.toHaveLength(0);
		});
		activated.length = 0;

		// Near the data end, the middle of the segment, and near the baseline end:
		// every one of them is the middle series.
		for (const fraction of [0.2, 0.5, 0.8]) {
			pressWithinSegment(fraction);
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
		// A readout that cannot fit the plot rect falls back to the wrapper's top
		// edge. Clamping it against the inset rect instead pins it below the top
		// padding and spills the whole overflow past the bottom.
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
		await waitForPlot(canvas);
		const overlay = overlayOf(container);
		const tooltip = tooltipOf(container);

		// Re-hover inside the poll: the first pointer event can race the first
		// layout commit, and the engine repositions again once its size observer
		// measures the readout. React renders the rows during the event itself
		// while the engine positions on an animation frame, so wait for the
		// transform — without it the readout still sits at its unpositioned
		// origin, which is the very place this test expects to find it.
		await waitFor(() => {
			const plot = overlay.getBoundingClientRect();
			hoverAt(overlay, plot.left + plot.width / 2, plot.top + plot.height / 2);
			expect(tooltip.style.transform).not.toBe("");
			const readout = tooltip.getBoundingClientRect();
			expect(readout.height).toBeGreaterThan(plot.height);
			expect(readout.top).toBeCloseTo(plot.top, 1);
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
		await waitForPlot(canvas);
		const overlay = overlayOf(container);
		const tooltip = tooltipOf(container);

		await waitFor(() => {
			const plot = overlay.getBoundingClientRect();
			hoverAt(overlay, plot.left + plot.width / 2, plot.top + plot.height / 2);
			expect(tooltip.style.transform).not.toBe("");
			expect(tooltip.getBoundingClientRect().height).toBeGreaterThan(0);
		});
		const plot = overlay.getBoundingClientRect();
		const readout = tooltip.getBoundingClientRect();
		expect(readout.height).toBeLessThan(plot.height);
		expect(readout.top).toBeGreaterThanOrEqual(plot.top - 0.5);
		expect(readout.bottom).toBeLessThanOrEqual(plot.bottom + 0.5);
	});

	test("a readout that fits keeps clear of the x-axis tick labels", async () => {
		// The engine reserves the bottom of the wrapper for the tick labels, so a
		// clamp that reaches the wrapper's own bottom edge covers them. Hovering
		// low is what exposes it — a centered hover never engages the clamp.
		const xAxisBand = 24;
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={threeEqualSegments}
					xKey="day"
					stacked
					animate={false}
					aria-label="Three segments with an axis"
				>
					<BarChart.XAxis />
					<BarChart.YAxis />
					<BarChart.Bar dataKey="bottom" label="Bottom" color="chart-1" />
					<BarChart.Bar dataKey="middle" label="Middle" color="chart-2" />
					<BarChart.Bar dataKey="top" label="Top" color="chart-3" />
				</BarChart.Root>
			</div>,
		);
		const canvas = canvasOf(container);
		await waitForPlot(canvas);
		const overlay = overlayOf(container);
		const tooltip = tooltipOf(container);

		// Re-hover inside the poll, as the sibling test above does: the engine
		// positions the readout on an animation frame, so a single event dispatched
		// before the first layout commit leaves the transform empty and nothing
		// fires again. Hovering one fixed point is idempotent. Wait for the
		// transform first — an unpositioned readout still sits at its `top: 0`
		// origin, which satisfies a bottom-edge assertion for free.
		await waitFor(() => {
			const plot = overlay.getBoundingClientRect();
			hoverAt(overlay, plot.left + plot.width / 2, plot.bottom - xAxisBand - 2);
			expect(tooltip.style.transform).not.toBe("");
			const readout = tooltip.getBoundingClientRect();
			expect(readout.height).toBeGreaterThan(0);
			expect(readout.height).toBeLessThan(plot.height - xAxisBand);
			expect(readout.bottom).toBeLessThanOrEqual(plot.bottom - xAxisBand + 0.5);
		});
	});
});
