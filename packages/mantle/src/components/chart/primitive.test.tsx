import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { createRef, useState } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { createIntersectionObserverStub } from "../../test-utils/mock-intersection-observer.js";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";
import { datumValue } from "./datum.js";
import { ChartStore } from "./store.js";
import { ValueTween } from "./tween.js";
import type { HoverSnapshot, SeriesMeta } from "./types.js";

// Why a spied module: `datumValue` is the single read point for chart rows. The
// engine reads them once at ingest, so after mount every call comes from a
// data-table render.
vi.mock("./datum.js", { spy: true });

const data = [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 },
];

describe("Tooltip registration", () => {
	const formatVisits = (value: number) => `${value} visits`;
	// A fresh element per call: `rerender` with the same element object bails
	// out before Root renders, which hides a re-registration.
	const chart = (tooltipProps: ComponentProps<typeof BarChart.Tooltip>) => (
		<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			<BarChart.Tooltip {...tooltipProps} />
		</BarChart.Root>
	);

	test("a re-render with unchanged props registers the tooltip once", () => {
		const registerTooltip = vi.spyOn(ChartStore.prototype, "registerTooltip");
		const { rerender } = render(chart({}));
		expect(registerTooltip).toHaveBeenCalledTimes(1);
		rerender(chart({}));
		rerender(chart({}));
		// Every registration republishes to the legend, tooltip, announcer, and
		// data table and repaints the canvas, so an unchanged part must stay quiet.
		expect(registerTooltip).toHaveBeenCalledTimes(1);
	});

	test("a changed formatter re-registers and the readout uses it", async () => {
		const user = userEvent.setup();
		const registerTooltip = vi.spyOn(ChartStore.prototype, "registerTooltip");
		const { rerender } = render(chart({}));
		rerender(chart({ valueFormat: formatVisits }));
		expect(registerTooltip).toHaveBeenCalledTimes(2);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("186 visits");
	});

	test("a changed div prop re-registers and reaches the tooltip element", async () => {
		const user = userEvent.setup();
		const registerTooltip = vi.spyOn(ChartStore.prototype, "registerTooltip");
		const { container, rerender } = render(chart({ id: "readout-before" }));
		// The surface mounts on the first keyboard step.
		await user.tab();
		await user.keyboard("{ArrowRight}");
		rerender(chart({ id: "readout-after" }));
		// Same keys, one different value: the shallow compare must read values.
		expect(registerTooltip).toHaveBeenCalledTimes(2);
		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip).toHaveAttribute("id", "readout-after");
	});

	test("a div prop added or removed on re-render re-registers and reaches the tooltip element", async () => {
		const user = userEvent.setup();
		const registerTooltip = vi.spyOn(ChartStore.prototype, "registerTooltip");
		const { container, rerender } = render(chart({}));
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip).not.toHaveAttribute("id");
		rerender(chart({ id: "readout" }));
		// The shallow compare walks the previous object's keys, so only the key
		// count sees a key the new object adds.
		expect(registerTooltip).toHaveBeenCalledTimes(2);
		expect(tooltip).toHaveAttribute("id", "readout");
		rerender(chart({}));
		expect(registerTooltip).toHaveBeenCalledTimes(3);
		expect(tooltip).not.toHaveAttribute("id");
	});
});

describe("hover subscriptions", () => {
	const rows = Array.from({ length: 20 }, (_, index) => ({
		month: `Month ${index}`,
		desktop: index * 10,
		mobile: index * 5,
		tablet: index * 2,
	}));

	test("a hover publish does not re-render the data table", async () => {
		const user = userEvent.setup();
		render(
			<BarChart.Root data={rows} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Bar dataKey="tablet" label="Tablet" />
			</BarChart.Root>,
		);
		// Focus mounts the table, which reads every cell through the spy.
		await user.tab();
		expect(screen.getAllByRole("row")).toHaveLength(21);
		const rowReads = vi.mocked(datumValue);
		// Why this guard: if the module mock stops applying, the zero below is
		// vacuous.
		expect(rowReads).toHaveBeenCalledWith(rows[19], "tablet");
		rowReads.mockClear();
		// Two distinct publishes. A zero-width plot widens the arrow stride to the
		// whole set, so `Home` is the deterministic second index.
		await user.keyboard("{ArrowRight}{Home}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Month 0");
		// The table only reads `series`, which a hover publish carries by
		// reference; a re-render reads every row again (20 rows x 4 cells).
		expect(rowReads).toHaveBeenCalledTimes(0);
	});

	test("a hover publish does not re-render the legend", async () => {
		const user = userEvent.setup();
		const legendItems = vi.fn<(series: SeriesMeta[]) => ReactNode>((series) =>
			series.map((entry) => <span key={entry.dataKey}>{entry.label}</span>),
		);
		const { container } = render(
			<BarChart.Root data={rows} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend>{legendItems}</BarChart.Legend>
			</BarChart.Root>,
		);
		const legend = container.querySelector('[data-slot="bar-chart-legend"]');
		expect(legend?.textContent).toBe("DesktopMobile");
		legendItems.mockClear();
		await user.tab();
		await user.keyboard("{ArrowRight}{Home}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Month 0");
		expect(legendItems).toHaveBeenCalledTimes(0);
	});
});

describe("Tooltip consumer ref", () => {
	const latency = [
		{ time: new Date("2026-07-18T10:00:00Z"), p50: 120 },
		{ time: new Date("2026-07-18T10:01:00Z"), p50: 132 },
	];

	test("an object ref holds the tooltip element and resets to null on unmount", async () => {
		const user = userEvent.setup();
		const ref = createRef<HTMLDivElement>();
		const { container, unmount } = render(
			<LineChart.Root data={latency} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Tooltip ref={ref} />
			</LineChart.Root>,
		);
		// The surface mounts on the first keyboard step.
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = container.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip).toBeInTheDocument();
		expect(ref.current).toBe(tooltip);
		unmount();
		expect(ref.current).toBeNull();
	});

	test("a callback ref receives the element once and its cleanup runs once on unmount", async () => {
		const user = userEvent.setup();
		const cleanup = vi.fn<() => void>();
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);
		const { container, unmount } = render(
			<LineChart.Root data={latency} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Tooltip ref={callbackRef} />
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = container.querySelector('[data-slot="line-chart-tooltip"]');
		expect(callbackRef).toHaveBeenCalledTimes(1);
		expect(callbackRef).toHaveBeenLastCalledWith(tooltip);
		expect(cleanup).toHaveBeenCalledTimes(0);
		unmount();
		// React 19 ref-cleanup semantics: the cleanup runs, and the ref is never
		// called again with `null`.
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(callbackRef).toHaveBeenCalledTimes(1);
	});
});

test("a CopyButton consumer onClick that prevents default cancels the copy", async () => {
	const user = userEvent.setup();
	const onCopy = vi.fn<(value: string) => void>();
	const onClick = vi.fn<(event: MouseEvent<HTMLButtonElement>) => void>((event) => {
		event.preventDefault();
	});
	const { container } = render(
		<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			<BarChart.CopyButton onClick={onClick} onCopy={onCopy} />
		</BarChart.Root>,
	);
	const button = screen.getByRole("button", { name: "Copy data as Markdown" });
	// Why the slot: the keyboard announcer is a second `role="status"` span. The
	// copy button's region is the chart's only `LiveRegion`.
	const status = container.querySelector('[data-slot="live-region"]');
	expect(status).toHaveAttribute("role", "status");
	await user.click(button);
	expect(onClick).toHaveBeenCalledTimes(1);
	expect(onClick).toHaveBeenLastCalledWith(expect.objectContaining({ defaultPrevented: true }));
	expect(onCopy).toHaveBeenCalledTimes(0);
	expect(status).toBeEmptyDOMElement();
});

describe("Tooltip and Legend after browser translation", () => {
	// The natural minimal custom readout: a fragment whose children are bare text.
	const readout = (hover: HoverSnapshot) => (
		<>
			{hover.xValue}: {hover.points[0]?.value}
		</>
	);

	test("clearing the point cursor removes a translated custom readout", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip>{readout}</BarChart.Tooltip>
			</BarChart.Root>,
		);

		await user.tab();
		await user.keyboard("{ArrowRight}");

		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.querySelector('[data-slot="bar-chart-tooltip-label"]')).toHaveTextContent(
			"January: 186",
		);

		translateTextNodes(container);
		// Guards the step below: a helper that silently no-ops would leave the
		// last assertion green whether or not the label div does its job.
		expect(tooltip).toHaveTextContent("[January-es]");

		// Escape clears the point cursor, the engine publishes `hover: null`, and
		// React removes the label div instead of the readout's own text nodes.
		await user.keyboard("{Escape}");
		expect(tooltip).toBeEmptyDOMElement();
	});

	test("the default readout renders no label slot", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip />
			</BarChart.Root>,
		);

		await user.tab();
		await user.keyboard("{ArrowRight}");

		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip).toHaveTextContent("January");
		expect(tooltip?.querySelector('[data-slot="bar-chart-tooltip-label"]')).not.toBeInTheDocument();
	});

	test("a custom legend renders inside a label slot", () => {
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend>{(series) => series.map((item) => item.label).join(", ")}</BarChart.Legend>
			</BarChart.Root>,
		);

		const label = container.querySelector('[data-slot="bar-chart-legend-label"]');
		expect(label).toHaveTextContent("Desktop, Mobile");
		expect(label?.parentElement).toHaveAttribute("data-slot", "bar-chart-legend");
	});

	test("the default legend renders no label slot", () => {
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend />
			</BarChart.Root>,
		);

		expect(container.querySelector('[data-slot="bar-chart-legend"]')).toHaveTextContent("Desktop");
		expect(container.querySelector('[data-slot="bar-chart-legend-label"]')).not.toBeInTheDocument();
	});

	test("dropping a translated custom legend for the default one removes the label div", () => {
		// A fragment of bare text is the natural minimal custom legend. It is also
		// the shape that throws: a fragment owns no host node, so React removes
		// each text node on its own rather than resetting one parent's text.
		function Chart({ custom }: { custom: boolean }) {
			return (
				<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
					<BarChart.Bar dataKey="mobile" label="Mobile" />
					{custom ? (
						<BarChart.Legend>
							{(series) => (
								<>
									{series[0]?.label} and {series[1]?.label}
								</>
							)}
						</BarChart.Legend>
					) : (
						<BarChart.Legend />
					)}
				</BarChart.Root>
			);
		}
		const { container, rerender } = render(<Chart custom />);

		const legend = container.querySelector('[data-slot="bar-chart-legend"]');
		translateTextNodes(container);
		// Guards the step below: a helper that silently no-ops would leave the last
		// assertion green whether or not the label div does its job.
		expect(legend).toHaveTextContent("[Desktop-es]");

		// The custom readout goes away and the default rows mount. React removes
		// the label div instead of the readout's own reparented text nodes.
		rerender(<Chart custom={false} />);

		expect(container.querySelector('[data-slot="bar-chart-legend-label"]')).not.toBeInTheDocument();
		expect(legend).toHaveTextContent("Desktop");
		expect(legend?.querySelector("font")).toBeNull();
	});
});

describe("server render", () => {
	const latency = [
		{ time: new Date("2026-07-18T10:00:00Z"), p50: 120 },
		{ time: new Date("2026-07-18T10:01:00Z"), p50: 132 },
	];
	const chart = (
		<LineChart.Root data={latency} xKey="time" aria-label="Request latency">
			<LineChart.Line dataKey="p50" label="p50" />
		</LineChart.Root>
	);

	test("the server markup is dormant, with a plain count and no table or formatted date", () => {
		const html = renderToString(chart);
		expect(html).toContain('data-state="dormant"');
		// Parts register in layout effects, so the server lists no series: the
		// series span between the sentence and the instructions is empty.
		expect(html).toContain(
			"<span>Line chart with 2 data points.</span><span></span><span> Use the left and right arrow keys",
		);
		expect(html).toContain('role="status"');
		// The canvas and the hover layers are engine-owned and arrive at activation.
		expect(html).not.toContain("<canvas");
		expect(html).not.toContain("line-chart-tooltip");
		const markup = document.createElement("div");
		markup.innerHTML = html;
		const overlay = markup.querySelector('[role="application"]');
		const description = markup.querySelector('[data-slot="line-chart-description"]');
		expect(description?.id).toBe(overlay?.getAttribute("aria-describedby"));
		// The table waits for engagement, and `Intl` output waits for hydration.
		expect(html).not.toContain("<table");
		expect(html).not.toContain("Jul 18");
	});

	test("hydrating the server markup reports no mismatch and then describes the range", async () => {
		const container = document.createElement("div");
		container.innerHTML = renderToString(chart);
		document.body.append(container);
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onRecoverableError = vi.fn<(error: unknown) => void>();

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(container, chart, { onRecoverableError });
		});

		expect(onRecoverableError).toHaveBeenCalledTimes(0);
		expect(consoleError).toHaveBeenCalledTimes(0);
		expect(
			await screen.findByRole("application", { description: /from Jul 18/ }),
		).toBeInTheDocument();

		act(() => {
			root?.unmount();
		});
		container.remove();
	});
});

describe("activation outside React", () => {
	test("a dormant chart is a shell: no canvas, no hover layers, no tooltip surface", () => {
		// A stub that never reports intersection keeps the chart dormant.
		const stub = createIntersectionObserverStub({ intersecting: false });
		vi.stubGlobal("IntersectionObserver", stub.Observer);
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(screen.getByRole("application", { name: "Visitors by month" })).toBeInTheDocument();
		for (const slot of ["canvas", "crosshair", "hover-band", "markers", "tooltip"]) {
			expect(container.querySelector(`[data-slot="bar-chart-${slot}"]`)).toBeNull();
		}
		const plot = container.querySelector('[data-slot="bar-chart-plot"]');
		if (!(plot instanceof HTMLElement)) {
			throw new Error("expected the plot to render");
		}
		act(() => {
			stub.enter(plot);
		});
		for (const slot of ["canvas", "crosshair", "hover-band", "markers"]) {
			expect(container.querySelector(`[data-slot="bar-chart-${slot}"]`)).toBeInTheDocument();
		}
		// The canvas sits under the overlay and the layers above it.
		expect(plot.firstElementChild).toHaveAttribute("data-slot", "bar-chart-canvas");
		expect(plot.lastElementChild).toHaveAttribute("data-slot", "bar-chart-markers");
	});

	test("a dormant chart still throws a dataKey typo in its mount commit", () => {
		const stub = createIntersectionObserverStub({ intersecting: false });
		vi.stubGlobal("IntersectionObserver", stub.Observer);
		expect(() =>
			render(
				<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
					<BarChart.Bar dataKey="visits" label="Visits" />
				</BarChart.Root>,
			),
		).toThrow(
			'BarChart.Bar dataKey "visits" does not match any key in the provided data. Available keys: month, desktop, mobile.',
		);
	});

	test("a dormant chart with no plottable row renders empty instead of throwing on a series key", () => {
		const stub = createIntersectionObserverStub({ intersecting: false });
		vi.stubGlobal("IntersectionObserver", stub.Observer);
		// The engine reads series columns from the rows with a finite x alone, and
		// this row has none, so it plots nothing and checks no series key.
		render(
			<LineChart.Root data={[{ t: null }]} xKey="t" xScale="time" aria-label="Latency">
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		expect(screen.getByRole("application", { name: "Latency" })).toHaveAccessibleDescription(
			/^Line chart with no data\./,
		);
	});

	test("a dormant chart throws a series key that only a dropped row carries", () => {
		const stub = createIntersectionObserverStub({ intersecting: false });
		vi.stubGlobal("IntersectionObserver", stub.Observer);
		// The engine would throw this in the observer task that activates the
		// chart, outside every error boundary.
		expect(() =>
			render(
				<LineChart.Root
					data={[
						{ t: null, p50: 1 },
						{ t: new Date("2026-07-18T10:00:00Z"), p99: 2 },
					]}
					xKey="t"
					xScale="time"
					aria-label="Latency"
				>
					<LineChart.Line dataKey="p50" label="p50" />
				</LineChart.Root>,
			),
		).toThrow('LineChart.Line dataKey "p50" does not match any key in the provided data.');
	});

	test("a chart that leaves the near band before its slice runs never activates", async () => {
		const stub = createIntersectionObserverStub({ intersecting: false });
		vi.stubGlobal("IntersectionObserver", stub.Observer);
		// Why a stepped clock: every activation then overspends the slice budget,
		// so each band's delivery runs one chart and the rest wait for a later
		// flush, the window in which a chart can scroll away.
		let clock = 0;
		vi.spyOn(performance, "now").mockImplementation(() => (clock += 5));
		const names = ["First", "Second", "Third", "Fourth", "Fifth"];
		const { container } = render(
			<>
				{names.map((name) => (
					<BarChart.Root key={name} data={data} xKey="month" aria-label={name}>
						<BarChart.Bar dataKey="desktop" label="Desktop" />
					</BarChart.Root>
				))}
			</>,
		);
		const plots = [...container.querySelectorAll('[data-slot="bar-chart-plot"]')];
		const fourth = plots[3];
		const fifth = plots[4];
		if (plots.length !== 5 || fourth == null || fifth == null) {
			throw new Error("expected five plots");
		}
		act(() => {
			stub.enter(...plots);
		});
		// Three bands flushed one chart each; the last two are still queued.
		expect(plots[0]?.querySelector("canvas")).toBeInTheDocument();
		expect(fourth.querySelector("canvas")).toBeNull();
		act(() => {
			stub.leave(fourth);
		});
		// The fifth chart's canvas proves the queue ran on after the exit.
		await waitFor(() => expect(fifth.querySelector("canvas")).toBeInTheDocument());
		expect(fourth.querySelector("canvas")).toBeNull();
	});

	test("focus paints a chart beyond the far band, and blur releases its canvas", async () => {
		const stub = createIntersectionObserverStub({ intersecting: false });
		vi.stubGlobal("IntersectionObserver", stub.Observer);
		const user = userEvent.setup();
		const { container } = render(
			<>
				<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
				<button type="button">After</button>
			</>,
		);
		expect(container.querySelector("canvas")).toBeNull();
		await user.tab();
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected focus to activate the chart");
		}
		// happy-dom paints nothing, so the test stands in for the paint: a bitmap
		// the blur must drop, because the observer never reported the chart near.
		canvas.width = 800;
		canvas.height = 400;
		await user.tab();
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
		expect(canvas.width).toBe(0);
	});

	test("blur keeps the canvas of a chart inside the far band", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<>
				<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
				<button type="button">After</button>
			</>,
		);
		const canvas = container.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			throw new Error("expected the chart to activate at mount");
		}
		await user.tab();
		canvas.width = 800;
		canvas.height = 400;
		await user.tab();
		expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
		expect(canvas.width).toBe(800);
	});

	test("unmounting removes the engine-owned layers with the Root", () => {
		const { container, unmount } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(container.querySelector("canvas")).toBeInTheDocument();
		unmount();
		expect(document.querySelector("canvas")).toBeNull();
	});
});

describe("tooltip surface latch", () => {
	test("a Root that turns decorative unmounts its tooltip surface", async () => {
		const user = userEvent.setup();
		const { container, rerender } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip />
			</BarChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBeInTheDocument();
		rerender(
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip />
			</BarChart.Root>,
		);
		// The latch stays set, so only the decorative contract can drop the surface.
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBeNull();
	});

	test("the surface mounts on the first keyboard step, positions through the engine, and stays after Escape", async () => {
		const user = userEvent.setup();
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBeNull();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip).toBeInTheDocument();
		expect(tooltip).toHaveTextContent("186");
		// The engine took the surface over: it reveals it with an inline opacity.
		expect(tooltip).toHaveStyle({ opacity: "1" });
		await user.keyboard("{Escape}");
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBe(tooltip);
		expect(tooltip).toHaveStyle({ opacity: "0" });
	});
});

describe("static mode", () => {
	const sparkline = (extra?: ReactNode) => (
		<BarChart.Root data={data} xKey="month" mode="static" aria-label="Visitors by month">
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			{extra}
		</BarChart.Root>
	);

	test("the plot is a named image, described without the keyboard sentence, with no Tab stop", () => {
		const { container } = render(sparkline());
		const image = screen.getByRole("img", { name: "Visitors by month" });
		expect(image).toHaveAttribute("data-slot", "bar-chart-plot");
		expect(image).toHaveAccessibleDescription(
			"Bar chart with 3 categories from January to March. Series: Desktop.",
		);
		expect(screen.queryByRole("application")).toBeNull();
		expect(container.querySelector("[tabindex]")).toBeNull();
		expect(container.querySelector('[data-slot="bar-chart"]')).not.toHaveAttribute("data-state");
	});

	test("a static chart keeps its palette", () => {
		// Two series: a single-series chart renders no legend to read a swatch from.
		const { container } = render(
			sparkline(
				<>
					<BarChart.Bar dataKey="mobile" label="Mobile" />
					<BarChart.Legend />
				</>,
			),
		);
		const swatches = [
			...container.querySelectorAll<HTMLElement>(
				'[data-slot="bar-chart-legend"] span[data-texture]',
			),
		];
		expect(swatches.map((swatch) => swatch.style.backgroundColor)).toEqual([
			"var(--color-chart-1)",
			"var(--color-chart-2)",
		]);
	});

	test("focus on a composed part engages no table, and a Tooltip part mounts no surface", async () => {
		const user = userEvent.setup();
		const { container } = render(
			sparkline(
				<>
					<BarChart.Tooltip />
					<BarChart.CopyButton />
				</>,
			),
		);
		await user.tab();
		expect(screen.getByRole("button")).toHaveFocus();
		expect(screen.queryByRole("table")).toBeNull();
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBeNull();
	});

	test("a static chart plays no reveal unless `animate` asks for one", () => {
		const retarget = vi.spyOn(ValueTween.prototype, "retarget");
		const reveals = () =>
			retarget.mock.calls.filter(
				([target, options]) =>
					Array.isArray(target) && target[0] === 1 && (options?.duration ?? 0) > 0,
			).length;
		const { unmount } = render(sparkline());
		expect(reveals()).toBe(0);
		unmount();
		render(
			<BarChart.Root data={data} xKey="month" mode="static" animate aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(reveals()).toBe(1);
	});
});

describe("description series sentence", () => {
	const Toggle = ({ children }: { children: ReactNode }) => {
		const [shown, setShown] = useState(false);
		return (
			<>
				<button type="button" onClick={() => setShown(true)}>
					Show mobile
				</button>
				{shown && children}
			</>
		);
	};

	test("the overlay's accessible description names the series and the keys, and the span stays in the reading order", () => {
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
			</BarChart.Root>,
		);
		const overlay = screen.getByRole("application", { name: "Visitors by month" });
		expect(overlay).toHaveAccessibleDescription(
			/^Bar chart with 3 categories from January to March\. Series: Desktop, Mobile\. Use the left and right arrow keys/,
		);
		// Browse mode reads the description as page content, so it is never `hidden`.
		const description = document.querySelector('[data-slot="bar-chart-description"]');
		expect(description).not.toHaveAttribute("hidden");
	});

	test("a series part that registers from a child's state updates the description without a Root render", async () => {
		const user = userEvent.setup();
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<Toggle>
					<BarChart.Bar dataKey="mobile" label="Mobile" />
				</Toggle>
			</BarChart.Root>,
		);
		const overlay = screen.getByRole("application", { name: "Visitors by month" });
		expect(overlay).toHaveAccessibleDescription(/Series: Desktop\. Use/);
		await user.click(screen.getByRole("button", { name: "Show mobile" }));
		expect(overlay).toHaveAccessibleDescription(/Series: Desktop, Mobile\. Use/);
	});

	test("a Root that turns interactive after a decorative render describes its series", () => {
		const { rerender } = render(
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		rerender(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		// The description span mounts with the overlay, so the writer binds to it
		// here and not to the span the decorative render never had.
		expect(
			screen.getByRole("application", { name: "Visitors by month" }),
		).toHaveAccessibleDescription(/Series: Desktop\. Use/);
	});
});
