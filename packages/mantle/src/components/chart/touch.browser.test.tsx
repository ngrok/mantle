"use client";

import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from "vitest";
import { cdp, commands, server } from "vitest/browser";
import * as AreaChart from "../area-chart/area-chart-parts.js";
import * as BarChart from "../bar-chart/bar-chart-parts.js";
import * as LineChart from "../line-chart/line-chart-parts.js";
import * as ScatterPlot from "../scatter-plot/scatter-plot-parts.js";

/**
 * Real-browser tests of touch on each 2D chart family. The families share one
 * Root, and these tests pin that each one shows its tooltip under a finger.
 * The hit test needs real layout, so happy-dom cannot run them.
 *
 * Why trusted touch through CDP: the browser applies `touch-action` only to
 * real input. A dispatched `PointerEvent` never pans, so it never cancels.
 */
const STYLE = `
:root {
	--color-chart-blue: #3e6ff4;
	--color-chart-neutral: #737373;
	--border-color-card-muted: #e5e5e5;
	--border-color-card: #d4d4d4;
	--text-color-muted: #717171;
	--color-neutral-500: #737373;
	--background-color-card: #ffffff;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
}
/* Browser tests load no Tailwind build; mirror the chart's structural layout so
   the overlay has a size for the hit test. */
[data-slot$="-chart"],
[data-slot="scatter-plot"] {
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
[data-slot$="-plot"] > svg,
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
	/* Mirrors right-auto bottom-auto m-0 overflow-visible open:fixed, which undo the [popover] box. */
	right: auto;
	bottom: auto;
	margin: 0;
	overflow: visible;
	/* Why: the product class is \`pointer-events-none\`. The real mouse of an earlier file can rest here; see docs/testing.md. */
	pointer-events: none;
}
[data-slot$="-tooltip"]:popover-open {
	position: fixed;
}
`;

/**
 * Why Chromium only: these tests drive trusted touch through CDP, which only
 * Chromium has. Playwright's Firefox and WebKit can tap but cannot move a
 * finger, so they cannot scrub or pan.
 */
const hasCdpTouch = server.browser === "chromium";

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	// Why the compiled CSS: the overlay's `touch-action` decides if a finger
	// scrubs or pans.
	styleElement.textContent = [STYLE, await commands.tailwindCss("./root.tsx")].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** One value for every x, so a drag along the middle of the plot crosses every point. */
const data = Array.from({ length: 12 }, (_, index) => ({ x: index, v: 50 }));

type Activate = (event: { index: number }) => void;

const families: { slot: string; chart: (onDatumActivate: Activate) => ReactNode }[] = [
	{
		slot: "bar-chart",
		chart: (onDatumActivate) => (
			<BarChart.Root
				data={data}
				xKey="x"
				animate={false}
				onDatumActivate={onDatumActivate}
				aria-label="Bars"
			>
				<BarChart.Bar dataKey="v" label="Value" color="blue" />
				<BarChart.Tooltip />
			</BarChart.Root>
		),
	},
	{
		slot: "line-chart",
		chart: (onDatumActivate) => (
			<LineChart.Root
				data={data}
				xKey="x"
				animate={false}
				onDatumActivate={onDatumActivate}
				aria-label="Line"
			>
				<LineChart.Line dataKey="v" label="Value" color="blue" />
				<LineChart.Tooltip />
			</LineChart.Root>
		),
	},
	{
		slot: "area-chart",
		chart: (onDatumActivate) => (
			<AreaChart.Root
				data={data}
				xKey="x"
				animate={false}
				onDatumActivate={onDatumActivate}
				aria-label="Area"
			>
				<AreaChart.Area dataKey="v" label="Value" color="blue" />
				<AreaChart.Tooltip />
			</AreaChart.Root>
		),
	},
	{
		slot: "scatter-plot",
		chart: (onDatumActivate) => (
			<ScatterPlot.Root
				data={data}
				xKey="x"
				animate={false}
				onDatumActivate={onDatumActivate}
				aria-label="Points"
			>
				<ScatterPlot.Point dataKey="v" label="Value" color="blue" />
				<ScatterPlot.Tooltip />
			</ScatterPlot.Root>
		),
	},
];

/** The test iframe's offset and scale in the page that CDP input addresses. */
const toPage = (x: number, y: number) => {
	const frame = window.frameElement?.getBoundingClientRect();
	const scale = frame == null ? 1 : frame.width / window.innerWidth;
	return { x: (frame?.left ?? 0) + x * scale, y: (frame?.top ?? 0) + y * scale };
};

/** Send one trusted touch event at a viewport point. A `touchEnd` lifts every finger. */
const touch = async (type: "touchStart" | "touchMove" | "touchEnd", point = { x: 0, y: 0 }) => {
	await cdp().send("Input.dispatchTouchEvent", {
		type,
		touchPoints: type === "touchEnd" ? [] : [toPage(point.x, point.y)],
	});
};

const nextFrame = () =>
	new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});

describe.runIf(hasCdpTouch).each(families)("$slot under a finger", ({ slot, chart }) => {
	const setup = () => {
		const onDatumActivate = vi.fn<Activate>();
		// Why 400 wide: the test viewport is 414 wide, and a touch off screen hits nothing.
		const { container } = render(
			<div style={{ width: 400, height: 300 }}>{chart(onDatumActivate)}</div>,
		);
		const overlay = container.querySelector('[role="application"]');
		if (!(overlay instanceof HTMLElement)) {
			throw new Error("expected the interaction overlay to render");
		}
		/** The point at a fraction of the overlay's width, at its vertical middle. */
		const at = (fraction: number) => {
			const rect = overlay.getBoundingClientRect();
			return { x: rect.left + rect.width * fraction, y: rect.top + rect.height * 0.5 };
		};
		const tooltip = () => container.querySelector(`[data-slot="${slot}-tooltip"]`);
		return { onDatumActivate, overlay, at, tooltip };
	};

	test("a drag scrubs the tooltip and activates nothing, the tooltip stays after the finger lifts, and a press outside hides it", async () => {
		const { onDatumActivate, overlay, at, tooltip } = setup();
		// Why pinch-zoom: a reader must still magnify the page over a chart.
		expect(getComputedStyle(overlay).touchAction).toBe("pan-y pinch-zoom");
		// Retry the press: the chart activates a frame after it mounts.
		let start = "";
		await waitFor(async () => {
			await touch("touchStart", at(0.1));
			start = tooltip()?.textContent ?? "";
			if (start === "") {
				await touch("touchEnd");
			}
			expect(start).not.toBe("");
		});
		onDatumActivate.mockClear();
		for (let step = 1; step <= 8; step++) {
			await touch("touchMove", at(0.1 + step * 0.1));
		}
		await waitFor(() => {
			expect(tooltip()?.textContent).not.toBe(start);
			expect(tooltip()).toHaveStyle({ opacity: "1" });
		});
		await touch("touchEnd");
		await nextFrame();
		expect(tooltip()).toHaveStyle({ opacity: "1" });
		expect(tooltip()?.textContent).not.toBe(start);
		expect(onDatumActivate).not.toHaveBeenCalled();
		const below = at(0.5);
		await touch("touchStart", { x: below.x, y: below.y + 200 });
		await touch("touchEnd");
		await waitFor(() => {
			expect(tooltip()).toHaveStyle({ opacity: "0" });
		});
	});

	test("a tap activates the datum under the finger", async () => {
		const { onDatumActivate, at } = setup();
		await waitFor(async () => {
			await touch("touchStart", at(0.5));
			await touch("touchEnd");
			expect(onDatumActivate).toHaveBeenCalledTimes(1);
			expect(onDatumActivate).toHaveBeenLastCalledWith(
				expect.objectContaining({ index: expect.any(Number) }),
			);
		});
	});
});

test.runIf(hasCdpTouch)(
	"a touch inside a chart in a shadow root does not clear its active datum",
	async () => {
		const host = document.createElement("div");
		document.body.append(host);
		onTestFinished(() => host.remove());
		const shadow = host.attachShadow({ mode: "open" });
		const container = document.createElement("div");
		shadow.append(styleElement.cloneNode(true), container);
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		render(
			<div style={{ width: 400, height: 300 }}>
				<LineChart.Root
					data={data}
					xKey="x"
					animate={false}
					onActiveIndexChange={onActiveIndexChange}
					aria-label="Line"
				>
					<LineChart.Line dataKey="v" label="Value" color="blue" />
				</LineChart.Root>
			</div>,
			{ container },
		);
		const overlay = container.querySelector('[role="application"]');
		if (!(overlay instanceof HTMLElement)) {
			throw new Error("expected the interaction overlay to render");
		}
		const rect = overlay.getBoundingClientRect();
		const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		await waitFor(async () => {
			await touch("touchStart", center);
			await touch("touchEnd");
			expect(onActiveIndexChange).toHaveBeenLastCalledWith(expect.any(Number));
		});
		onActiveIndexChange.mockClear();
		await touch("touchStart", center);
		await touch("touchEnd");
		expect(onActiveIndexChange).not.toHaveBeenCalledWith(null);
	},
);
