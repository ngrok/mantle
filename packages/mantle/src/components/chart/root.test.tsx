import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { CanvasBarChartRoot } from "../../test-utils/canvas-chart-roots.js";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";
import type { ChartDatumEvent } from "./types.js";

/**
 * These tests drive the wiring of the chart Root: the visibility bands, the
 * keyboard, the pointer buttons, and the x scale its parts read. A fake
 * `IntersectionObserver` reports one band at a time, with the rect a test
 * picks, because the shared stub reports every band at once. The activation
 * rect gives the plot a size, so the SVG surface paints in happy-dom. A chart
 * that no band reported activates when it takes focus or a press.
 */

/** The scroll margin each band's observer takes in `visibility.ts`. */
const BAND_MARGIN = { visible: "0px", near: "100%", far: "300%" } as const;

type Band = keyof typeof BAND_MARGIN;

/** Every observer the Root's visibility module builds in a test. */
const observers: FakeIntersectionObserver[] = [];

class FakeIntersectionObserver implements IntersectionObserver {
	readonly root = null;
	readonly rootMargin: string;
	readonly scrollMargin: string;
	readonly thresholds: readonly number[] = [0];
	readonly targets = new Set<Element>();
	#callback: IntersectionObserverCallback;

	constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
		this.#callback = callback;
		this.rootMargin = options.rootMargin ?? "0px";
		this.scrollMargin = options.scrollMargin ?? "0px";
		observers.push(this);
	}

	observe(target: Element): void {
		this.targets.add(target);
	}

	unobserve(target: Element): void {
		this.targets.delete(target);
	}

	disconnect(): void {
		this.targets.clear();
	}

	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}

	/** Deliver one entry for `target`, as the browser does when its intersection flips. */
	deliver(target: Element, change: { inView: boolean; rect: DOMRectReadOnly }): void {
		this.#callback(
			[
				{
					target,
					isIntersecting: change.inView,
					intersectionRatio: change.inView ? 1 : 0,
					boundingClientRect: change.rect,
					intersectionRect: change.rect,
					rootBounds: null,
					time: 0,
				},
			],
			this,
		);
	}
}

/** A plot inside happy-dom's 1024 x 768 viewport. */
const ON_SCREEN = DOMRectReadOnly.fromRect({ x: 0, y: 0, width: 400, height: 200 });

/** A plot inside the near band and under the viewport's bottom edge. */
const BELOW_FOLD = DOMRectReadOnly.fromRect({ x: 0, y: 1000, width: 400, height: 200 });

/** The bands whose observer holds `plot`. */
const bandsObserving = (plot: Element): Band[] => {
	const bands: Band[] = ["visible", "near", "far"];
	return bands.filter((band) =>
		observers.some(
			(observer) => observer.scrollMargin === BAND_MARGIN[band] && observer.targets.has(plot),
		),
	);
};

/** Report one band's intersection for `plot`. */
const report = (
	band: Band,
	plot: Element,
	change: { inView: boolean; rect?: DOMRectReadOnly },
): void => {
	const observer = observers.find(
		(candidate) => candidate.scrollMargin === BAND_MARGIN[band] && candidate.targets.has(plot),
	);
	if (observer == null) {
		throw new Error(`expected the ${band} band to observe the plot`);
	}
	act(() => {
		observer.deliver(plot, { inView: change.inView, rect: change.rect ?? ON_SCREEN });
	});
};

/** One 60 Hz frame, in ms. */
const FRAME_MS = 16.67;

/**
 * Put the engine's clock and its animation frames under the test's control,
 * so a test reads the first frame after a change. Call it before the render.
 */
const installFrameClock = () => {
	let now = 1000;
	let nextHandle = 1;
	const requests = new Map<number, FrameRequestCallback>();
	vi.spyOn(performance, "now").mockImplementation(() => now);
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number => {
		const handle = nextHandle;
		nextHandle += 1;
		requests.set(handle, callback);
		return handle;
	});
	vi.stubGlobal("cancelAnimationFrame", (handle: number): void => {
		requests.delete(handle);
	});
	/** Advance one frame and run the callbacks it holds. */
	const step = (): void => {
		now += FRAME_MS;
		const callbacks = [...requests.values()];
		requests.clear();
		for (const callback of callbacks) {
			callback(now);
		}
	};
	return {
		step,
		/** Run frames until no engine asks for another. */
		settle: (): void => {
			for (let frame = 0; requests.size > 0; frame += 1) {
				if (frame >= 500) {
					throw new Error("expected the engine to stop asking for frames");
				}
				step();
			}
		},
	};
};

const visitors = [
	{ month: "January", desktop: 40 },
	{ month: "February", desktop: 80 },
];

// A new tallest bar: the bar values and the value domain both have somewhere to go.
const nextVisitors = [
	{ month: "January", desktop: 70 },
	{ month: "February", desktop: 20 },
];

type Surface = "svg" | "canvas";

type ChartConfig = {
	data?: typeof visitors;
	surface?: Surface;
	axis?: boolean;
	onActiveIndexChange?: (index: number | null) => void;
	onDatumActivate?: (event: ChartDatumEvent) => void;
};

const chart = (config: ChartConfig = {}) => {
	const Root = config.surface === "canvas" ? CanvasBarChartRoot : BarChart.Root;
	return (
		<Root
			data={config.data ?? visitors}
			xKey="month"
			aria-label="Visitors by month"
			onActiveIndexChange={config.onActiveIndexChange}
			onDatumActivate={config.onDatumActivate}
		>
			<BarChart.Bar dataKey="desktop" label="Desktop" color="blue" />
			{config.axis && <BarChart.YAxis />}
		</Root>
	);
};

/** Render a chart that no band has reported yet, and return its plot. */
const renderChart = (config: Parameters<typeof chart>[0] = {}) => {
	const view = render(chart(config));
	const plot = screen.getByRole("application", { name: "Visitors by month" }).parentElement;
	if (plot == null) {
		throw new Error("expected the chart to render its plot");
	}
	return { plot, rerender: view.rerender };
};

/** The `d` of every path the SVG surface holds, in paint order. */
const paintedPaths = (plot: Element): string[] =>
	[...plot.querySelectorAll("svg path")].map((path) => path.getAttribute("d") ?? "");

/** The alpha of each tick label. The SVG surface writes no opacity for an alpha of 1. */
const labelAlphas = (plot: Element): number[] =>
	[...(plot.querySelector("svg")?.querySelectorAll("text") ?? [])].map((label) => {
		const opacity = label.style.getPropertyValue("opacity");
		return opacity === "" ? 1 : Number(opacity);
	});

beforeEach(() => {
	observers.length = 0;
	vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

describe("far band", () => {
	test.each([
		// An SVG holds no bitmap, so the far band has nothing to release.
		{ surface: "svg", bands: ["visible", "near"] },
		{ surface: "canvas", bands: ["visible", "near", "far"] },
	] as const)("a Root that paints on $surface observes the $bands bands", ({ surface, bands }) => {
		const { plot } = renderChart({ surface });
		expect(bandsObserving(plot)).toEqual(bands);
	});
});

describe("motion at activation", () => {
	test("a chart that activates below the fold paints its tick labels at full alpha", () => {
		const { plot } = renderChart({ axis: true });

		report("near", plot, { inView: true, rect: BELOW_FOLD });

		// A fade there plays for a reader who cannot see it.
		const alphas = labelAlphas(plot);
		expect(alphas.length).toBeGreaterThan(0);
		expect(Math.min(...alphas)).toBe(1);
	});

	test("a chart that activates on screen fades its tick labels in", () => {
		const { plot } = renderChart({ axis: true });

		// At page load the `near` band activates the chart before the `visible`
		// band reports it, so the activation rect is what places it on screen.
		report("near", plot, { inView: true, rect: ON_SCREEN });

		const alphas = labelAlphas(plot);
		expect(alphas.length).toBeGreaterThan(0);
		expect(Math.max(...alphas)).toBeLessThan(1);
	});
});

describe("motion after a visible report", () => {
	/** A chart on screen and at rest, with its frames under the test's control. */
	const renderOnScreen = () => {
		const frames = installFrameClock();
		const { plot, rerender } = renderChart();
		report("near", plot, { inView: true });
		report("visible", plot, { inView: true });
		frames.settle();
		return { frames, plot, rerender };
	};

	test("a chart that scrolled off screen paints new data settled on the first frame", () => {
		const { frames, plot, rerender } = renderOnScreen();
		const before = paintedPaths(plot);
		report("visible", plot, { inView: false });

		rerender(chart({ data: nextVisitors }));
		frames.step();
		const firstFrame = paintedPaths(plot);
		frames.settle();

		expect(firstFrame).not.toEqual(before);
		expect(firstFrame).toEqual(paintedPaths(plot));
	});

	test("a chart that scrolled back on screen glides to new data", () => {
		const { frames, plot, rerender } = renderOnScreen();
		report("visible", plot, { inView: false });
		report("visible", plot, { inView: true });

		rerender(chart({ data: nextVisitors }));
		frames.step();
		const firstFrame = paintedPaths(plot);
		frames.settle();

		expect(firstFrame).not.toEqual(paintedPaths(plot));
	});
});

describe("keyboard", () => {
	/**
	 * Render a chart inside an element that records each keydown it gets and
	 * whether the chart prevented it, then move focus to the chart.
	 */
	const renderFocused = async (config: ChartConfig = {}) => {
		const user = userEvent.setup();
		const keydowns: Array<{ key: string; prevented: boolean }> = [];
		render(
			<div
				role="group"
				onKeyDown={(event) => {
					keydowns.push({ key: event.key, prevented: event.defaultPrevented });
				}}
			>
				{chart(config)}
			</div>,
		);
		await user.tab();
		return { user, keydowns };
	};

	test.each(["Alt", "Control", "Meta"])(
		"%s+ArrowRight moves no datum and is not prevented",
		async (modifier) => {
			const onActiveIndexChange = vi.fn<(index: number | null) => void>();
			const { user, keydowns } = await renderFocused({ onActiveIndexChange });

			await user.keyboard(`{${modifier}>}{ArrowRight}{/${modifier}}`);

			// The chord is the browser's: history back and forward, or a page shortcut.
			expect(keydowns).toEqual([
				{ key: modifier, prevented: false },
				{ key: "ArrowRight", prevented: false },
			]);
			expect(onActiveIndexChange).toHaveBeenCalledTimes(0);
		},
	);

	test("Shift+ArrowRight steps to the first datum", async () => {
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		const { user } = await renderFocused({ onActiveIndexChange });

		await user.keyboard("{Shift>}{ArrowRight}{/Shift}");

		expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(0);
	});

	test("Escape with no active datum reaches the element around the chart and is not prevented", async () => {
		const { user, keydowns } = await renderFocused();

		await user.keyboard("{Escape}");

		// A panel around the chart closes on an Escape that nothing prevented.
		expect(keydowns).toEqual([{ key: "Escape", prevented: false }]);
	});

	test("Escape with an active datum clears the datum and is prevented", async () => {
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		const { user, keydowns } = await renderFocused({ onActiveIndexChange });

		await user.keyboard("{ArrowRight}{Escape}");

		expect(keydowns.at(-1)).toEqual({ key: "Escape", prevented: true });
		expect(onActiveIndexChange).toHaveBeenCalledTimes(2);
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(null);
	});

	test("a held Enter activates the active datum once", async () => {
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		const { user } = await renderFocused({ onDatumActivate });

		// `{Enter>3/}` sends three keydown events for one press. The last two are repeats.
		await user.keyboard("{ArrowRight}{Enter>3/}");

		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({ index: 0, datum: visitors[0] }),
		);
	});
});

describe("resolved x scale", () => {
	// An epoch number is a time only on a time scale, and only the Root knows the scale.
	const samples = [
		{ time: Date.UTC(2026, 6, 18, 10, 0), p50: 120 },
		{ time: Date.UTC(2026, 6, 18, 10, 1), p50: 132 },
	];

	const renderLatency = (onCopy?: (markdown: string) => void) =>
		render(
			<LineChart.Root data={samples} xKey="time" xScale="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" color="blue" />
				<LineChart.CopyButton onCopy={onCopy} />
			</LineChart.Root>,
		);

	test("the data table of a time-scale chart reads an epoch x as a date", async () => {
		const user = userEvent.setup();
		renderLatency();
		// Focus on the chart mounts its data table.
		await user.tab();
		const [firstRowHeader] = screen.getAllByRole("rowheader");
		expect(firstRowHeader?.querySelector("time")).toHaveAttribute(
			"datetime",
			"2026-07-18T10:00:00.000Z",
		);
	});

	test("a copy from a time-scale chart writes an epoch x as ISO 8601", async () => {
		const user = userEvent.setup();
		const onCopy = vi.fn<(markdown: string) => void>();
		renderLatency(onCopy);
		await user.click(screen.getByRole("button", { name: "Copy data as Markdown" }));
		await vi.waitFor(() => {
			expect(onCopy).toHaveBeenCalledExactlyOnceWith(
				[
					"| time | p50 |",
					"| --- | --- |",
					"| 2026-07-18T10:00:00.000Z | 120 |",
					"| 2026-07-18T10:01:00.000Z | 132 |",
				].join("\n"),
			);
		});
	});
});

describe("pointer buttons", () => {
	/** Render a chart with a sized plot, and return its overlay and its activation spy. */
	const renderPressable = () => {
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		const { plot } = renderChart({ onDatumActivate });
		// Why the report: its rect sizes the plot, and a press on a plot with no size hits no datum.
		report("near", plot, { inView: true });
		const overlay = screen.getByRole("application", { name: "Visitors by month" });
		return { overlay, onDatumActivate };
	};

	test("a press of the middle button activates no datum, and a press of the primary button activates one", () => {
		const { overlay, onDatumActivate } = renderPressable();

		fireEvent.pointerDown(overlay, { button: 1 });
		fireEvent.pointerUp(overlay, { button: 1 });
		expect(onDatumActivate).toHaveBeenCalledTimes(0);

		fireEvent.pointerDown(overlay, { button: 0 });
		fireEvent.pointerUp(overlay, { button: 0 });
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(expect.objectContaining({ index: 0 }));
	});

	test("a press that ends on another button activates no datum and ends the press", () => {
		const { overlay, onDatumActivate } = renderPressable();

		fireEvent.pointerDown(overlay, { button: 0 });
		// A chord: the secondary button goes down later and comes up last, so the
		// one pointer-up reports that button.
		fireEvent.pointerUp(overlay, { button: 2 });
		// A press the chord did not end activates on this release.
		fireEvent.pointerUp(overlay, { button: 0 });

		expect(onDatumActivate).toHaveBeenCalledTimes(0);
	});
});
