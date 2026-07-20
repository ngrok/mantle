"use client";

import { render, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AreaChart } from "../area-chart/index.js";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";
import { ScatterChart } from "../scatter-chart/index.js";

/**
 * Real-browser hover-marker geometry tests: the active-point dots are DOM
 * overlay elements the engine positions from real plot layout, which
 * happy-dom cannot provide (degenerate geometry collapses every y to the
 * same pixel).
 *
 * Regression suite for the stacked-area bug where dots rendered at each
 * series' RAW value near the plot bottom instead of on the painted (stacked)
 * band edges.
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
[data-slot="area-chart"],
[data-slot="bar-chart"],
[data-slot="line-chart"],
[data-slot="scatter-chart"] {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
}
[data-slot$="-plot"] {
	position: relative;
	flex: 1;
	min-height: 0;
	width: 100%;
}
[data-slot$="-plot"] > canvas,
[data-slot$="-plot"] > [tabindex] {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
[data-slot$="-tooltip"] {
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

/** The engine-managed active-point dots, in series composition order. */
const activeDots = (container: HTMLElement): HTMLElement[] =>
	[...container.querySelectorAll('[data-slot="chart-active-point"]')].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	);

/** Parse `translate3d(Xpx, Ypx, 0)` into plot-space coordinates. */
const dotPosition = (dot: HTMLElement): { x: number; y: number } => {
	const match = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(dot.style.transform);
	if (match?.[1] == null || match[2] == null) {
		throw new Error(`expected a positioned dot, got transform "${dot.style.transform}"`);
	}
	return { x: Number(match[1]), y: Number(match[2]) };
};

/**
 * Wait for the first paint, then drive the keyboard point cursor with `key`
 * and retry `assertGeometry` until the overlay reflects settled layout. The
 * first key event can race the first layout commit and the engine re-syncs
 * dots on later frames, so both the dispatch (Home/End are idempotent per
 * position) and the geometry assertions must live inside the retry loop —
 * reading positions once after a visibility check reads pre-layout values.
 */
const assertDatumGeometry = async (
	container: HTMLElement,
	key: "Home" | "End",
	assertGeometry: () => void,
) => {
	const canvas = mustBe(container.querySelector("canvas"), HTMLCanvasElement, "the chart canvas");
	const overlay = mustBe(container.querySelector('[role="application"]'), HTMLElement, "overlay");
	await waitFor(() => {
		expect(canvas.width).toBeGreaterThan(0);
	});
	overlay.focus();
	await waitFor(() => {
		overlay.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
		const visibleDots = activeDots(container).filter((dot) => dot.style.opacity === "1");
		expect(visibleDots.length).toBeGreaterThan(0);
		assertGeometry();
	});
};

// One row is enough to pin geometry; values are far apart so ordering
// assertions cannot flip on sub-pixel differences. At the first datum:
// http=100, tcp=40, tls=20 → stacked band edges 100 / 140 / 160.
const protocolData = [
	{ day: "Mon", http: 100, tcp: 40, tls: 20 },
	{ day: "Tue", http: 120, tcp: 50, tls: 25 },
	{ day: "Wed", http: 90, tcp: 45, tls: 30 },
];

describe("hover marker geometry", () => {
	test("stacked area dots sit on the stacked band edges, not at raw values", async () => {
		// Regression: dots used each series' raw value, so tcp/tls rendered near
		// the plot bottom, detached from their painted bands.
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<AreaChart.Root data={protocolData} xKey="day" stacked animate={false} aria-label="Traffic">
					<AreaChart.Area dataKey="http" label="HTTP" />
					<AreaChart.Area dataKey="tcp" label="TCP" />
					<AreaChart.Area dataKey="tls" label="TLS" />
				</AreaChart.Root>
			</div>,
		);
		await assertDatumGeometry(container, "Home", () => {
			const [http, tcp, tls] = activeDots(container).map(dotPosition);
			if (http == null || tcp == null || tls == null) {
				throw new Error("expected one dot per series");
			}
			// Screen y grows downward: stacked edges 160 (tls) > 140 (tcp) > 100
			// (http) must paint top-to-bottom as tls, tcp, http.
			expect(tls.y).toBeLessThan(tcp.y);
			expect(tcp.y).toBeLessThan(http.y);
			// All three share the crosshair x.
			expect(tcp.x).toBeCloseTo(http.x, 1);
			expect(tls.x).toBeCloseTo(http.x, 1);
		});
	});

	test("unstacked area dots sit at raw value heights", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<AreaChart.Root data={protocolData} xKey="day" animate={false} aria-label="Traffic">
					<AreaChart.Area dataKey="http" label="HTTP" />
					<AreaChart.Area dataKey="tcp" label="TCP" />
					<AreaChart.Area dataKey="tls" label="TLS" />
				</AreaChart.Root>
			</div>,
		);
		await assertDatumGeometry(container, "Home", () => {
			const [http, tcp, tls] = activeDots(container).map(dotPosition);
			if (http == null || tcp == null || tls == null) {
				throw new Error("expected one dot per series");
			}
			// Overlapping (unstacked) areas: raw 100 > 40 > 20 top-to-bottom.
			expect(http.y).toBeLessThan(tcp.y);
			expect(tcp.y).toBeLessThan(tls.y);
		});
	});

	test("line dots sit at each series' value height", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<LineChart.Root
					data={[
						{ t: 1, p50: 10, p99: 90 },
						{ t: 2, p50: 12, p99: 95 },
					]}
					xKey="t"
					animate={false}
					aria-label="Latency"
				>
					<LineChart.Line dataKey="p50" label="p50" />
					<LineChart.Line dataKey="p99" label="p99" />
				</LineChart.Root>
			</div>,
		);
		await assertDatumGeometry(container, "Home", () => {
			const [p50, p99] = activeDots(container).map(dotPosition);
			if (p50 == null || p99 == null) {
				throw new Error("expected one dot per series");
			}
			expect(p99.y).toBeLessThan(p50.y);
		});
	});

	test("hover dots wear each series' configured shape", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<LineChart.Root
					data={[
						{ t: 1, p50: 10, p99: 90 },
						{ t: 2, p50: 12, p99: 95 },
					]}
					xKey="t"
					animate={false}
					aria-label="Latency"
				>
					<LineChart.Line dataKey="p50" label="p50" shape="triangle" />
					<LineChart.Line dataKey="p99" label="p99" shape="diamond" />
				</LineChart.Root>
			</div>,
		);
		await assertDatumGeometry(container, "Home", () => {
			const [p50, p99] = activeDots(container);
			if (p50 == null || p99 == null) {
				throw new Error("expected one dot per series");
			}
			expect(p50.getAttribute("data-shape")).toBe("triangle");
			expect(p99.getAttribute("data-shape")).toBe("diamond");
			// The glyph is cut with a clip-path on the fill layer.
			const fill = p50.lastElementChild;
			if (!(fill instanceof HTMLElement)) {
				throw new Error("expected the dot's fill layer");
			}
			expect(fill.style.clipPath).toContain("polygon");
		});
	});

	test("the scatter hover dot mirrors the active series' shape", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<ScatterChart.Root
					data={[
						{ x: 1, y: 10 },
						{ x: 2, y: 90 },
					]}
					xKey="x"
					animate={false}
					aria-label="Correlation"
				>
					<ScatterChart.Point dataKey="y" label="y" shape="square" />
				</ScatterChart.Root>
			</div>,
		);
		await assertDatumGeometry(container, "Home", () => {
			const [dot] = activeDots(container);
			if (dot == null) {
				throw new Error("expected the active-point dot");
			}
			expect(dot.getAttribute("data-shape")).toBe("square");
		});
	});

	test("bar charts never render dots — the category band is the hover affordance", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<BarChart.Root
					data={[
						{ month: "Jan", desktop: 186 },
						{ month: "Feb", desktop: 305 },
					]}
					xKey="month"
					animate={false}
					aria-label="Visitors"
				>
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</div>,
		);
		const canvas = mustBe(container.querySelector("canvas"), HTMLCanvasElement, "the chart canvas");
		const overlay = mustBe(container.querySelector('[role="application"]'), HTMLElement, "overlay");
		await waitFor(() => {
			expect(canvas.width).toBeGreaterThan(0);
		});
		overlay.focus();
		await waitFor(() => {
			overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
			const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
			expect(tooltip?.textContent).toContain("186");
		});
		expect(activeDots(container)).toHaveLength(0);
	});

	test("the scatter dot tracks the active point's projected position", async () => {
		const { container } = render(
			<div style={{ width: 600, height: 300 }}>
				<ScatterChart.Root
					data={[
						{ x: 1, y: 10 },
						{ x: 2, y: 90 },
					]}
					xKey="x"
					animate={false}
					aria-label="Correlation"
				>
					<ScatterChart.Point dataKey="y" label="y" />
				</ScatterChart.Root>
			</div>,
		);
		let first: { x: number; y: number } | null = null;
		await assertDatumGeometry(container, "Home", () => {
			const tooltip = container.querySelector('[data-slot="scatter-chart-tooltip"]');
			expect(tooltip?.textContent).toContain("10");
			const [dot] = activeDots(container).map(dotPosition);
			if (dot == null) {
				throw new Error("expected the active-point dot");
			}
			// Only trust the position once layout has settled: the low point (1, 10)
			// must map into the 300px wrapper's lower half, not the pre-layout
			// margin position near the top.
			expect(dot.y).toBeGreaterThan(150);
			first = dot;
		});
		await assertDatumGeometry(container, "End", () => {
			const tooltip = container.querySelector('[data-slot="scatter-chart-tooltip"]');
			expect(tooltip?.textContent).toContain("90");
			const [last] = activeDots(container).map(dotPosition);
			if (first == null || last == null) {
				throw new Error("expected the active-point dot");
			}
			// (2, 90) sits to the right of and above (1, 10) in screen space.
			expect(last.x).toBeGreaterThan(first.x);
			expect(last.y).toBeLessThan(first.y);
		});
	});
});
