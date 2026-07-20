import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import type { ChartDatumEvent } from "./scatter-plot.js";
import { ScatterPlot } from "./scatter-plot.js";

// Scatter rows are individual points: most rows populate only one of the two
// series, which is the shape the scatter snapshot filtering exists for. Keep
// the set under 4 rows — happy-dom never delivers a plot size, and a zero-width
// plot decimates 4+ rows, which widens the keyboard stride to the whole set.
const data = [
	{ latency: 12, regionA: 840, regionB: null },
	{ latency: 28, regionA: null, regionB: 590 },
	{ latency: 45, regionA: 340, regionB: null },
];

const data3d = [
	{ latency: 12, regionA: 840, regionB: 720, depth: 4 },
	{ latency: 28, regionA: 610, regionB: 590, depth: 7 },
	{ latency: 45, regionA: 340, regionB: 410, depth: 11 },
];

const renderChart = (extraRootProps: Record<string, unknown> = {}) =>
	render(
		<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region" {...extraRootProps}>
			<ScatterPlot.Grid />
			<ScatterPlot.XAxis />
			<ScatterPlot.YAxis />
			<ScatterPlot.Point dataKey="regionA" label="Region A" />
			<ScatterPlot.Point dataKey="regionB" label="Region B" />
			<ScatterPlot.Tooltip />
			<ScatterPlot.Legend />
		</ScatterPlot.Root>,
	);

const render3dChart = () =>
	render(
		<ScatterPlot.Root
			data={data3d}
			xKey="latency"
			zKey="depth"
			aria-label="Latency by region and depth"
		>
			<ScatterPlot.Point dataKey="regionA" label="Region A" />
			<ScatterPlot.Point dataKey="regionB" label="Region B" />
			<ScatterPlot.Tooltip />
		</ScatterPlot.Root>,
	);

describe("ScatterPlot.Root", () => {
	test("renders a labelled interaction overlay and an aria-hidden canvas", () => {
		renderChart();
		expect(screen.getByRole("application", { name: "Latency by region" })).toBeInTheDocument();
		// The canvas is decorative pixels; the overlay is the single named element.
		expect(document.querySelector("canvas")).toHaveAttribute("aria-hidden");
	});

	test("forwards className, ref, and data-* props to the root element", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(
			<ScatterPlot.Root
				data={data}
				xKey="latency"
				aria-label="Latency by region"
				className="custom-class"
				data-testid="chart-root"
				ref={ref}
			>
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
			</ScatterPlot.Root>,
		);
		const root = container.querySelector('[data-slot="scatter-plot"]');
		expect(root).toBeInTheDocument();
		expect(ref.current).toBe(root);
		expect(root?.className).toContain("custom-class");
		expect(root?.className).toContain("flex");
		expect(root?.getAttribute("data-testid")).toBe("chart-root");
	});

	test("renders the sr-only data table twin with a row per datum and em dashes for gaps", () => {
		renderChart();
		const table = screen.getByRole("table");
		expect(table).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Region A" })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Region B" })).toBeInTheDocument();
		expect(screen.getByRole("rowheader", { name: "28" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "590" })).toBeInTheDocument();
		// Each row populates exactly one of the two series; the other cell is a gap.
		expect(screen.getAllByRole("cell", { name: "—" })).toHaveLength(3);
	});

	test("the data table is bounded with a summarizing caption for large data", () => {
		const bigData = Array.from({ length: 500 }, (_, index) => ({
			latency: index,
			regionA: index * 2,
		}));
		render(
			<ScatterPlot.Root data={bigData} xKey="latency" aria-label="Large chart">
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
			</ScatterPlot.Root>,
		);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(151); // header + 150 bounded rows
		expect(screen.getByText(/Showing the first 150 of 500 rows/)).toBeInTheDocument();
	});

	test("empty data renders without crashing and without a table", () => {
		render(
			<ScatterPlot.Root data={[]} xKey="latency" aria-label="Empty chart">
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
			</ScatterPlot.Root>,
		);
		expect(screen.getByRole("application", { name: "Empty chart" })).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	test("a dataKey matching no row in non-empty data throws with the available keys", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<ScatterPlot.Root data={data} xKey="latency" aria-label="Typo chart">
					<ScatterPlot.Point dataKey="regionsA" label="Region A" />
				</ScatterPlot.Root>,
			),
		).toThrow(
			/ScatterPlot\.Point dataKey "regionsA" does not match any key.*latency, regionA, regionB/,
		);
		consoleError.mockRestore();
	});

	test("a leading null x row does not misclassify the scale or crash", () => {
		// Regression: scale detection read only data[0], so one null x in the
		// first row classified a numeric series as categorical and tripped the
		// scatter continuous-axis invariant.
		render(
			<ScatterPlot.Root
				data={[{ latency: null, regionA: 100 }, ...data]}
				xKey="latency"
				aria-label="Gappy scatter"
			>
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
			</ScatterPlot.Root>,
		);
		expect(screen.getByRole("application", { name: "Gappy scatter" })).toBeInTheDocument();
	});
});

describe("ScatterPlot parts outside Root", () => {
	test("a part rendered outside Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<ScatterPlot.Point dataKey="regionA" />)).toThrow(
			/ScatterPlot\.Point must be composed inside ScatterPlot\.Root/,
		);
		consoleError.mockRestore();
	});
});

describe("ScatterPlot cross-family composition", () => {
	test("a BarChart.Bar composed inside ScatterPlot.Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<ScatterPlot.Root data={data} xKey="latency" aria-label="Cross-family chart">
					<BarChart.Bar dataKey="regionA" label="Region A" />
				</ScatterPlot.Root>,
			),
		).toThrow(/BarChart\.Bar cannot be composed inside ScatterPlot\.Root/);
		consoleError.mockRestore();
	});
});

describe("ScatterPlot.Legend", () => {
	test("renders series labels with color keys for multi-series charts", () => {
		const { container } = renderChart();
		const legend = container.querySelector('[data-slot="scatter-plot-legend"]');
		expect(legend).toBeInTheDocument();
		expect(legend?.textContent).toContain("Region A");
		expect(legend?.textContent).toContain("Region B");
	});

	test("renders nothing for a single series (the title already names it)", () => {
		const { container } = render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Region A latency">
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Legend />
			</ScatterPlot.Root>,
		);
		expect(container.querySelector('[data-slot="scatter-plot-legend"]')).not.toBeInTheDocument();
	});

	test("legend keys mirror each series' configured point shape", () => {
		const { container } = render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region">
				<ScatterPlot.Point dataKey="regionA" label="Region A" shape="triangle" />
				<ScatterPlot.Point dataKey="regionB" label="Region B" />
				<ScatterPlot.Legend />
			</ScatterPlot.Root>,
		);
		const legend = container.querySelector('[data-slot="scatter-plot-legend"]');
		const swatches = legend == null ? [] : [...legend.querySelectorAll("span[data-shape]")];
		expect(swatches.map((swatch) => swatch.getAttribute("data-shape"))).toEqual([
			"triangle",
			"circle",
		]);
	});

	test("supports a render-prop for custom legends", () => {
		render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region">
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Point dataKey="regionB" label="Region B" />
				<ScatterPlot.Legend>
					{(series) => series.map((entry) => <span key={entry.dataKey}>custom {entry.label}</span>)}
				</ScatterPlot.Legend>
			</ScatterPlot.Root>,
		);
		expect(screen.getByText("custom Region A")).toBeInTheDocument();
		expect(screen.getByText("custom Region B")).toBeInTheDocument();
	});
});

describe("ScatterPlot keyboard interaction", () => {
	test("arrow keys step the active datum and render the tooltip readout", async () => {
		const user = userEvent.setup();
		renderChart();
		const overlay = screen.getByRole("application");
		await user.tab();
		expect(overlay).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		// The tooltip readout shows the first datum: its x value and its point.
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toContain("12");
		expect(tooltip?.textContent).toContain("Region A");
		expect(tooltip?.textContent).toContain("840");
		await user.keyboard("{ArrowRight}");
		expect(tooltip?.textContent).toContain("590");
		await user.keyboard("{End}");
		expect(tooltip?.textContent).toContain("340");
		await user.keyboard("{Home}");
		expect(tooltip?.textContent).toContain("840");
	});

	test("a sparse row reads only its populated series — never an em-dash row", async () => {
		// Scatter rows are individual points, so keyboard snapshots filter to the
		// row's populated series (unlike bar/line, which read every series and
		// render gaps as em dashes).
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toContain("Region A");
		expect(tooltip?.textContent).toContain("840");
		expect(tooltip?.textContent).not.toContain("Region B");
		expect(tooltip?.textContent).not.toContain("—");
	});

	test("keyboard stepping announces only the populated series politely", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status.textContent).toContain("12");
			expect(status.textContent).toContain("Region A: 840");
		});
		expect(status.textContent).not.toContain("Region B");
	});

	test("Escape clears the active datum", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toContain("840");
		await user.keyboard("{Escape}");
		expect(tooltip?.textContent).toBe("");
	});

	test("Enter activates the current datum with its full row and a null dataKey", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		renderChart({ onDatumActivate });
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		// dataKey names the hit point's series for pointer activation only;
		// keyboard stepping is series-less, so the payload carries null.
		expect(onDatumActivate).toHaveBeenCalledWith(
			expect.objectContaining({
				index: 0,
				xValue: 12,
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

describe("ScatterPlot.Tooltip customization", () => {
	test("valueFormat, labelFormat, and footer customize the readout", async () => {
		const user = userEvent.setup();
		render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region">
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Tooltip
					labelFormat={(value) => `Latency: ${String(value)}ms`}
					valueFormat={(value) => `${value} rps`}
					footer="Click to view logs"
				/>
			</ScatterPlot.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toContain("Latency: 12ms");
		expect(tooltip?.textContent).toContain("840 rps");
		expect(tooltip?.textContent).toContain("Click to view logs");
	});

	test("the render-prop children replaces the readout entirely", async () => {
		const user = userEvent.setup();
		render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region">
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Tooltip>
					{(snapshot) => <strong>Custom readout for {String(snapshot.xValue)}</strong>}
				</ScatterPlot.Tooltip>
			</ScatterPlot.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("Custom readout for 12")).toBeInTheDocument();
	});
});

describe("ScatterPlot controlled activeIndex", () => {
	test("a controlled activeIndex drives the tooltip readout with the row's populated series", () => {
		render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region" activeIndex={1}>
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Point dataKey="regionB" label="Region B" />
			</ScatterPlot.Root>,
		);
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toContain("28");
		expect(tooltip?.textContent).toContain("Region B");
		expect(tooltip?.textContent).toContain("590");
		expect(tooltip?.textContent).not.toContain("Region A");
	});

	test("an out-of-range controlled activeIndex clamps to the data instead of rendering garbage", () => {
		render(
			<ScatterPlot.Root data={data} xKey="latency" aria-label="Latency by region" activeIndex={99}>
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Point dataKey="regionB" label="Region B" />
			</ScatterPlot.Root>,
		);
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toContain("45");
		expect(tooltip?.textContent).toContain("340");
	});

	test("activeIndex null renders no readout", () => {
		render(
			<ScatterPlot.Root
				data={data}
				xKey="latency"
				aria-label="Latency by region"
				activeIndex={null}
			>
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
			</ScatterPlot.Root>,
		);
		const tooltip = document.querySelector('[data-slot="scatter-plot-tooltip"]');
		expect(tooltip?.textContent).toBe("");
	});
});

describe("ScatterPlot sticky series colors", () => {
	test("filtering a series out does not recolor the survivors", () => {
		const filterableData = [
			{ latency: 12, alpha: 840, beta: 720, gamma: 500 },
			{ latency: 28, alpha: 610, beta: 590, gamma: 480 },
		];
		const { container, rerender } = render(
			<ScatterPlot.Root data={filterableData} xKey="latency" aria-label="Latency by region">
				<ScatterPlot.Point dataKey="alpha" label="Alpha" />
				<ScatterPlot.Point dataKey="beta" label="Beta" />
				<ScatterPlot.Legend />
			</ScatterPlot.Root>,
		);
		const swatchColors = () => {
			const legend = container.querySelector('[data-slot="scatter-plot-legend"]');
			const items = legend == null ? [] : [...legend.querySelectorAll("span")];
			return items.map((item) => item.style.backgroundColor);
		};
		const [, betaBefore] = swatchColors();
		expect(betaBefore).toContain("chart-2");
		// Filter alpha out and introduce a new series: beta must keep chart-2
		// (color follows the entity, never its position) and the newcomer claims
		// the next never-used slot.
		rerender(
			<ScatterPlot.Root data={filterableData} xKey="latency" aria-label="Latency by region">
				<ScatterPlot.Point dataKey="beta" label="Beta" />
				<ScatterPlot.Point dataKey="gamma" label="Gamma" />
				<ScatterPlot.Legend />
			</ScatterPlot.Root>,
		);
		const [betaAfter, gammaAfter] = swatchColors();
		expect(betaAfter).toBe(betaBefore);
		expect(gammaAfter).toContain("chart-3");
	});
});

describe("ScatterPlot 3D depth (zKey)", () => {
	test("keyboard stepping announces the depth value", async () => {
		const user = userEvent.setup();
		render3dChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status.textContent).toContain("Region A: 840");
			expect(status.textContent).toContain("z: 4");
		});
	});

	test("the hover snapshot carries the depth value for custom readouts", async () => {
		const user = userEvent.setup();
		render(
			<ScatterPlot.Root
				data={data3d}
				xKey="latency"
				zKey="depth"
				aria-label="Latency by region and depth"
			>
				<ScatterPlot.Point dataKey="regionA" label="Region A" />
				<ScatterPlot.Tooltip>
					{(snapshot) => <strong>depth {String(snapshot.zValue)}</strong>}
				</ScatterPlot.Tooltip>
			</ScatterPlot.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("depth 4")).toBeInTheDocument();
	});

	test("the sr-only data table grows a depth column with the z values", () => {
		render3dChart();
		expect(screen.getByRole("columnheader", { name: "depth" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "4" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "7" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "11" })).toBeInTheDocument();
	});
});
