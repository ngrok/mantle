import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import type { ChartDatumEvent } from "./line-chart.js";
import { LineChart } from "./line-chart.js";

const data = [
	{ time: new Date("2026-07-18T10:00:00Z"), p50: 120, p99: 480 },
	{ time: new Date("2026-07-18T10:01:00Z"), p50: 132, p99: 510 },
	{ time: new Date("2026-07-18T10:02:00Z"), p50: 101, p99: 460 },
];

const renderChart = (extraRootProps: Record<string, unknown> = {}) =>
	render(
		<LineChart.Root data={data} xKey="time" aria-label="Request latency" {...extraRootProps}>
			<LineChart.Grid />
			<LineChart.XAxis />
			<LineChart.YAxis />
			<LineChart.Line dataKey="p50" label="p50" />
			<LineChart.Line dataKey="p99" label="p99" />
			<LineChart.ReferenceLine y={500} label="SLO" />
			<LineChart.Tooltip />
			<LineChart.Legend />
		</LineChart.Root>,
	);

describe("LineChart.Root", () => {
	test("renders a labelled chart image and interaction overlay", () => {
		renderChart();
		// The canvas is decorative pixels; the overlay is the single named element.
		expect(document.querySelector("canvas")).toHaveAttribute("aria-hidden");
		expect(screen.getByRole("application", { name: "Request latency" })).toBeInTheDocument();
	});

	test("forwards className, ref, and data-* props to the root element", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(
			<LineChart.Root
				data={data}
				xKey="time"
				aria-label="Request latency"
				className="custom-class"
				data-testid="chart-root"
				ref={ref}
			>
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		const root = container.querySelector('[data-slot="line-chart"]');
		expect(root).toBeInTheDocument();
		expect(ref.current).toBe(root);
		expect(root?.className).toContain("custom-class");
		expect(root?.className).toContain("flex");
		expect(root?.getAttribute("data-testid")).toBe("chart-root");
	});

	test("renders the sr-only data table twin with a row per datum", () => {
		renderChart();
		const table = screen.getByRole("table");
		expect(table).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "p50" })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "p99" })).toBeInTheDocument();
		// Row headers are the default-formatted dates. The test scripts pin TZ=UTC
		// and LC_ALL=en_US.UTF-8, so "Jul" is deterministic here.
		const rowHeaders = screen.getAllByRole("rowheader");
		expect(rowHeaders).toHaveLength(3);
		for (const rowHeader of rowHeaders) {
			expect(rowHeader.textContent).toContain("Jul");
		}
		expect(screen.getByRole("cell", { name: "132" })).toBeInTheDocument();
	});

	test("the data table is bounded with a summarizing caption for large data", () => {
		const bigData = Array.from({ length: 500 }, (_, index) => ({
			time: new Date(Date.UTC(2026, 6, 1) + index * 60_000),
			p50: index,
		}));
		render(
			<LineChart.Root data={bigData} xKey="time" aria-label="Large chart">
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(151); // header + 150 bounded rows
		expect(screen.getByText(/Showing the first 150 of 500 rows/)).toBeInTheDocument();
	});

	test("empty data renders without crashing and without a table", () => {
		render(
			<LineChart.Root data={[]} xKey="time" aria-label="Empty chart">
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		expect(screen.getByRole("application", { name: "Empty chart" })).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	test("a dataKey matching no row in non-empty data throws with the available keys", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<LineChart.Root data={data} xKey="time" aria-label="Typo chart">
					<LineChart.Line dataKey="p95" label="p95" />
				</LineChart.Root>,
			),
		).toThrow(/LineChart\.Line dataKey "p95" does not match any key.*time, p50, p99/);
		consoleError.mockRestore();
	});
});

describe("LineChart parts outside Root", () => {
	test("a part rendered outside Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<LineChart.Line dataKey="p50" />)).toThrow(
			/LineChart\.Line must be composed inside LineChart\.Root/,
		);
		consoleError.mockRestore();
	});
});

describe("LineChart cross-family composition", () => {
	test("a BarChart.Bar composed inside LineChart.Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<LineChart.Root data={data} xKey="time" aria-label="Cross-family chart">
					<BarChart.Bar dataKey="p50" label="p50" />
				</LineChart.Root>,
			),
		).toThrow(/BarChart\.Bar cannot be composed inside LineChart\.Root/);
		consoleError.mockRestore();
	});
});

describe("LineChart.Legend", () => {
	test("renders series labels with color keys for multi-series charts", () => {
		const { container } = renderChart();
		const legend = container.querySelector('[data-slot="line-chart-legend"]');
		expect(legend).toBeInTheDocument();
		expect(legend?.textContent).toContain("p50");
		expect(legend?.textContent).toContain("p99");
	});

	test("renders nothing for a single series (the title already names it)", () => {
		const { container } = render(
			<LineChart.Root data={data} xKey="time" aria-label="p50 latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Legend />
			</LineChart.Root>,
		);
		expect(container.querySelector('[data-slot="line-chart-legend"]')).not.toBeInTheDocument();
	});

	test("supports a render-prop for custom legends", () => {
		render(
			<LineChart.Root data={data} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Line dataKey="p99" label="p99" />
				<LineChart.Legend>
					{(series) => series.map((entry) => <span key={entry.dataKey}>custom {entry.label}</span>)}
				</LineChart.Legend>
			</LineChart.Root>,
		);
		expect(screen.getByText("custom p50")).toBeInTheDocument();
		expect(screen.getByText("custom p99")).toBeInTheDocument();
	});
});

describe("LineChart keyboard interaction", () => {
	test("arrow keys step the active datum and render the tooltip readout with the formatted date", async () => {
		const user = userEvent.setup();
		renderChart();
		const overlay = screen.getByRole("application");
		await user.tab();
		expect(overlay).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		// The tooltip readout shows the first datum: the default-formatted date
		// label (short month, e.g. "Jul") and both series.
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Jul");
		expect(tooltip?.textContent).toContain("p50");
		expect(tooltip?.textContent).toContain("120");
		await user.keyboard("{ArrowRight}");
		expect(tooltip?.textContent).toContain("132");
		await user.keyboard("{End}");
		expect(tooltip?.textContent).toContain("101");
		await user.keyboard("{Home}");
		expect(tooltip?.textContent).toContain("120");
	});

	test("keyboard stepping announces the datum politely", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status.textContent).toContain("Jul");
			expect(status.textContent).toContain("p50: 120");
		});
	});

	test("unsorted time rows are sorted at ingest so ArrowRight lands on the earliest timestamp", async () => {
		const user = userEvent.setup();
		const unsorted = [
			{ time: new Date("2026-07-18T10:02:00Z"), p50: 333 },
			{ time: new Date("2026-07-18T10:00:00Z"), p50: 111 },
			{ time: new Date("2026-07-18T10:01:00Z"), p50: 222 },
		];
		render(
			<LineChart.Root data={unsorted} xKey="time" aria-label="Unsorted latency">
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		// The engine's contract is the sorted view: index 0 is the earliest
		// timestamp's row (111), not the first row passed (333).
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("111");
		expect(tooltip?.textContent).not.toContain("333");
		await user.keyboard("{ArrowRight}");
		expect(tooltip?.textContent).toContain("222");
	});

	test("Escape clears the active datum", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("120");
		await user.keyboard("{Escape}");
		expect(tooltip?.textContent).toBe("");
	});

	test("Enter activates the current datum with its row", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		renderChart({ onDatumActivate });
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		expect(onDatumActivate).toHaveBeenCalledWith(
			expect.objectContaining({
				index: 0,
				xValue: new Date("2026-07-18T10:00:00Z"),
				datum: data[0],
				dataKey: null,
			}),
		);
	});

	test("onActiveIndexChange reports keyboard movement", async () => {
		const user = userEvent.setup();
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		renderChart({ onActiveIndexChange });
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(onActiveIndexChange).toHaveBeenCalledWith(0);
		await user.keyboard("{ArrowRight}");
		expect(onActiveIndexChange).toHaveBeenCalledWith(1);
	});
});

describe("LineChart.Tooltip customization", () => {
	test("valueFormat, labelFormat, and footer customize the readout", async () => {
		const user = userEvent.setup();
		render(
			<LineChart.Root data={data} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Tooltip
					labelFormat={(value) =>
						value instanceof Date ? `Time: ${value.toISOString()}` : String(value)
					}
					valueFormat={(value) => `${value}ms`}
					footer="Click to view logs"
				/>
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Time: 2026-07-18T10:00:00.000Z");
		expect(tooltip?.textContent).toContain("120ms");
		expect(tooltip?.textContent).toContain("Click to view logs");
	});

	test("the render-prop children replaces the readout entirely", async () => {
		const user = userEvent.setup();
		render(
			<LineChart.Root data={data} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Tooltip>
					{(snapshot) => <strong>{`Custom readout for index ${snapshot.index}`}</strong>}
				</LineChart.Tooltip>
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("Custom readout for index 0")).toBeInTheDocument();
	});

	test("null values render as an em dash, never zero", async () => {
		const user = userEvent.setup();
		const gappy = [
			{ time: new Date("2026-07-18T10:00:00Z"), p50: 120, p99: null },
			{ time: new Date("2026-07-18T10:01:00Z"), p50: 132, p99: 510 },
		];
		render(
			<LineChart.Root data={gappy} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Line dataKey="p99" label="p99" />
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("—");
		expect(tooltip?.textContent).not.toContain("p990");
	});

	test("connectNulls with a mid-series gap does not crash and reads the gap as an em dash", async () => {
		const user = userEvent.setup();
		const gappy = [
			{ time: new Date("2026-07-18T10:00:00Z"), p50: 120 },
			{ time: new Date("2026-07-18T10:01:00Z"), p50: null },
			{ time: new Date("2026-07-18T10:02:00Z"), p50: 140 },
		];
		render(
			<LineChart.Root data={gappy} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" connectNulls />
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("—");
		expect(tooltip?.textContent).not.toContain("p500");
	});
});

describe("LineChart controlled activeIndex", () => {
	test("a controlled activeIndex drives the tooltip readout", () => {
		render(
			<LineChart.Root data={data} xKey="time" aria-label="Request latency" activeIndex={1}>
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Jul");
		expect(tooltip?.textContent).toContain("132");
	});

	test("activeIndex null renders no readout", () => {
		render(
			<LineChart.Root data={data} xKey="time" aria-label="Request latency" activeIndex={null}>
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toBe("");
	});
});

describe("LineChart sticky series colors", () => {
	test("filtering a series out does not recolor the survivors", () => {
		const filterableData = [
			{ time: new Date("2026-07-18T10:00:00Z"), p50: 120, p99: 480, p95: 300 },
			{ time: new Date("2026-07-18T10:01:00Z"), p50: 132, p99: 510, p95: 320 },
		];
		const { container, rerender } = render(
			<LineChart.Root data={filterableData} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Line dataKey="p99" label="p99" />
				<LineChart.Legend />
			</LineChart.Root>,
		);
		const swatchColors = () => {
			const legend = container.querySelector('[data-slot="line-chart-legend"]');
			const items = legend == null ? [] : [...legend.querySelectorAll("span")];
			return items.map((item) => item.style.backgroundColor);
		};
		const [, p99Before] = swatchColors();
		expect(p99Before).toContain("chart-2");
		// Filter p50 out and introduce a new series: p99 must keep chart-2 (color
		// follows the entity, never its position) and the newcomer claims the next
		// never-used slot.
		rerender(
			<LineChart.Root data={filterableData} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p99" label="p99" />
				<LineChart.Line dataKey="p95" label="p95" />
				<LineChart.Legend />
			</LineChart.Root>,
		);
		const [p99After, p95After] = swatchColors();
		expect(p99After).toBe(p99Before);
		expect(p95After).toContain("chart-3");
	});
});

describe("LineChart invalid x values", () => {
	test("rows with unparseable timestamps are dropped without blanking the chart or crashing the tooltip", async () => {
		// Regression: a NaN epoch used to poison the x domain into NaN (blank
		// chart) and crash Intl date formatting in the tooltip on hover.
		const user = userEvent.setup();
		const gappyRows = [
			{ time: new Date("2026-07-18T10:00:00Z"), p50: 111 },
			{ time: null, p50: 999 },
			{ time: new Date("2026-07-18T10:01:00Z"), p50: 222 },
		];
		render(
			<LineChart.Root data={gappyRows} xKey="time" xScale="time" aria-label="Latency">
				<LineChart.Line dataKey="p50" label="p50" />
			</LineChart.Root>,
		);
		await user.tab();
		await user.keyboard("{Home}");
		const tooltip = document.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("111");
		await user.keyboard("{End}");
		expect(tooltip?.textContent).toContain("222");
		// The invalid row is unreachable by stepping — only two positions exist.
		await user.keyboard("{Home}{ArrowRight}");
		expect(tooltip?.textContent).toContain("222");
	});
});
