import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { BarChart } from "../bar-chart/index.js";
import type { ChartDatumEvent } from "./area-chart.js";
import { AreaChart } from "./area-chart.js";

const firstRow = { date: new Date(2026, 6, 15), http: 420, tcp: 140 };
const secondRow = { date: new Date(2026, 6, 16), http: 510, tcp: 165 };
const thirdRow = { date: new Date(2026, 6, 17), http: 470, tcp: 150 };
const data = [firstRow, secondRow, thirdRow];

// Mirrors the chart's default x-value formatting for time scales — daily data
// at local midnight renders date-only with the year — so label assertions
// hold in any locale or timezone.
const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
});
const labelFor = (date: Date) => dateOnlyFormatter.format(date);

const renderChart = (extraRootProps: Record<string, unknown> = {}) =>
	render(
		<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol" {...extraRootProps}>
			<AreaChart.Grid />
			<AreaChart.XAxis />
			<AreaChart.YAxis />
			<AreaChart.Area dataKey="http" label="HTTP" />
			<AreaChart.Area dataKey="tcp" label="TCP" />
			<AreaChart.ReferenceLine y={600} label="Capacity" />
			<AreaChart.Tooltip />
			<AreaChart.Legend />
		</AreaChart.Root>,
	);

describe("AreaChart.Root", () => {
	test("renders a labelled chart image and interaction overlay", () => {
		renderChart();
		// The canvas is decorative pixels; the overlay is the single named element.
		expect(document.querySelector("canvas")).toHaveAttribute("aria-hidden");
		expect(screen.getByRole("application", { name: "Traffic by protocol" })).toBeInTheDocument();
	});

	test("forwards className, ref, and data-* props to the root element", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(
			<AreaChart.Root
				data={data}
				xKey="date"
				aria-label="Traffic by protocol"
				className="custom-class"
				data-testid="chart-root"
				ref={ref}
			>
				<AreaChart.Area dataKey="http" label="HTTP" />
			</AreaChart.Root>,
		);
		const root = container.querySelector('[data-slot="area-chart"]');
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
		expect(screen.getByRole("columnheader", { name: "HTTP" })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "TCP" })).toBeInTheDocument();
		expect(screen.getByRole("rowheader", { name: labelFor(secondRow.date) })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "510" })).toBeInTheDocument();
	});

	test("the data table is bounded with a summarizing caption for large data", () => {
		const bigData = Array.from({ length: 500 }, (_, index) => ({
			date: new Date(2026, 0, 1 + index),
			http: index,
		}));
		render(
			<AreaChart.Root data={bigData} xKey="date" aria-label="Large chart">
				<AreaChart.Area dataKey="http" label="HTTP" />
			</AreaChart.Root>,
		);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(151); // header + 150 bounded rows
		expect(screen.getByText(/Showing the first 150 of 500 rows/)).toBeInTheDocument();
	});

	test("empty data renders without crashing and without a table", () => {
		render(
			<AreaChart.Root data={[]} xKey="date" aria-label="Empty chart">
				<AreaChart.Area dataKey="http" label="HTTP" />
			</AreaChart.Root>,
		);
		expect(screen.getByRole("application", { name: "Empty chart" })).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	test("a dataKey matching no row in non-empty data throws with the available keys", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<AreaChart.Root data={data} xKey="date" aria-label="Typo chart">
					<AreaChart.Area dataKey="htp" label="HTTP" />
				</AreaChart.Root>,
			),
		).toThrow(/AreaChart\.Area dataKey "htp" does not match any key.*date, http, tcp/);
		consoleError.mockRestore();
	});
});

describe("AreaChart parts outside Root", () => {
	test("a part rendered outside Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<AreaChart.Area dataKey="http" />)).toThrow(
			/AreaChart\.Area must be composed inside AreaChart\.Root/,
		);
		consoleError.mockRestore();
	});
});

describe("AreaChart cross-family composition", () => {
	test("a BarChart.Bar composed inside AreaChart.Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol">
					<BarChart.Bar dataKey="http" label="HTTP" />
				</AreaChart.Root>,
			),
		).toThrow(/BarChart\.Bar cannot be composed inside AreaChart\.Root/);
		consoleError.mockRestore();
	});
});

describe("AreaChart.Legend", () => {
	test("renders series labels with color keys for multi-series charts", () => {
		const { container } = renderChart();
		const legend = container.querySelector('[data-slot="area-chart-legend"]');
		expect(legend).toBeInTheDocument();
		expect(legend?.textContent).toContain("HTTP");
		expect(legend?.textContent).toContain("TCP");
	});

	test("renders nothing for a single series (the title already names it)", () => {
		const { container } = render(
			<AreaChart.Root data={data} xKey="date" aria-label="HTTP traffic">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Legend />
			</AreaChart.Root>,
		);
		expect(container.querySelector('[data-slot="area-chart-legend"]')).not.toBeInTheDocument();
	});

	test("legend keys wear each series' glyph", () => {
		// Regression: area keys were plain filled squares, so `shape` — the
		// redundant encoding alongside color — never reached the legend.
		const { container } = render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Area dataKey="tcp" label="TCP" shape="diamond" />
				<AreaChart.Legend />
			</AreaChart.Root>,
		);
		const legend = container.querySelector('[data-slot="area-chart-legend"]');
		const swatches = legend == null ? [] : [...legend.querySelectorAll("span[data-shape]")];
		expect(swatches.map((swatch) => swatch.getAttribute("data-shape"))).toEqual([
			"circle",
			"diamond",
		]);
	});

	test("supports a render-prop for custom legends", () => {
		render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Area dataKey="tcp" label="TCP" />
				<AreaChart.Legend>
					{(series) => series.map((entry) => <span key={entry.dataKey}>custom {entry.label}</span>)}
				</AreaChart.Legend>
			</AreaChart.Root>,
		);
		expect(screen.getByText("custom HTTP")).toBeInTheDocument();
		expect(screen.getByText("custom TCP")).toBeInTheDocument();
	});
});

describe("AreaChart keyboard interaction", () => {
	test("arrow keys step the active datum and render the tooltip readout", async () => {
		const user = userEvent.setup();
		renderChart();
		const overlay = screen.getByRole("application");
		await user.tab();
		expect(overlay).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		// The tooltip readout shows the first datum: its date and both series.
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		expect(tooltip?.textContent).toContain(labelFor(firstRow.date));
		expect(tooltip?.textContent).toContain("HTTP");
		expect(tooltip?.textContent).toContain("420");
		await user.keyboard("{ArrowRight}");
		expect(tooltip?.textContent).toContain(labelFor(secondRow.date));
		await user.keyboard("{End}");
		expect(tooltip?.textContent).toContain(labelFor(thirdRow.date));
		await user.keyboard("{Home}");
		expect(tooltip?.textContent).toContain(labelFor(firstRow.date));
	});

	test("keyboard stepping announces the datum politely", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status.textContent).toContain(labelFor(firstRow.date));
			expect(status.textContent).toContain("HTTP: 420");
		});
	});

	test("Escape clears the active datum", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		expect(tooltip?.textContent).toContain(labelFor(firstRow.date));
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
				xValue: firstRow.date,
				datum: firstRow,
				dataKey: null,
			}),
		);
	});

	test("Enter on a stacked chart still activates with the full original datum", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		renderChart({ stacked: true, onDatumActivate });
		await user.tab();
		await user.keyboard("{Home}{Enter}");
		expect(onDatumActivate).toHaveBeenCalledWith(
			expect.objectContaining({
				index: 0,
				datum: firstRow,
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

describe("AreaChart stacked tooltip order", () => {
	test("stacked charts list the top-of-stack series first in the tooltip", async () => {
		const user = userEvent.setup();
		render(
			<AreaChart.Root data={data} xKey="date" stacked aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Area dataKey="tcp" label="TCP" />
				<AreaChart.Tooltip />
			</AreaChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		const text = tooltip?.textContent ?? "";
		expect(text).toContain("TCP");
		expect(text).toContain("HTTP");
		// TCP is composed second, so it sits on top of the stack and reads first.
		expect(text.indexOf("TCP")).toBeLessThan(text.indexOf("HTTP"));
	});

	test("unstacked charts preserve composition order in the tooltip", async () => {
		const user = userEvent.setup();
		render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Area dataKey="tcp" label="TCP" />
				<AreaChart.Tooltip />
			</AreaChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		const text = tooltip?.textContent ?? "";
		expect(text).toContain("HTTP");
		expect(text).toContain("TCP");
		expect(text.indexOf("HTTP")).toBeLessThan(text.indexOf("TCP"));
	});
});

describe("AreaChart.Tooltip customization", () => {
	test("valueFormat, labelFormat, and footer customize the readout", async () => {
		const user = userEvent.setup();
		render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Tooltip
					labelFormat={(value) =>
						value instanceof Date ? `Day ${value.getDate()}` : String(value)
					}
					valueFormat={(value) => `${value} requests`}
					footer="Click to view logs"
				/>
			</AreaChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Day 15");
		expect(tooltip?.textContent).toContain("420 requests");
		expect(tooltip?.textContent).toContain("Click to view logs");
	});

	test("the render-prop children replaces the readout entirely", async () => {
		const user = userEvent.setup();
		render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Tooltip>
					{(snapshot) => <strong>Custom readout for row {snapshot.index}</strong>}
				</AreaChart.Tooltip>
			</AreaChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("Custom readout for row 0")).toBeInTheDocument();
	});

	test("null values render as an em dash, never zero", async () => {
		const user = userEvent.setup();
		const gappy = [
			{ date: new Date(2026, 6, 15), http: 420, tcp: null },
			{ date: new Date(2026, 6, 16), http: 510, tcp: 165 },
		];
		render(
			<AreaChart.Root data={gappy} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Area dataKey="tcp" label="TCP" />
			</AreaChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("—");
		expect(tooltip?.textContent).not.toContain("TCP0");
	});
});

describe("AreaChart controlled activeIndex", () => {
	test("a controlled activeIndex drives the tooltip readout", () => {
		render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol" activeIndex={1}>
				<AreaChart.Area dataKey="http" label="HTTP" />
			</AreaChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		expect(tooltip?.textContent).toContain(labelFor(secondRow.date));
		expect(tooltip?.textContent).toContain("510");
	});

	test("activeIndex null renders no readout", () => {
		render(
			<AreaChart.Root data={data} xKey="date" aria-label="Traffic by protocol" activeIndex={null}>
				<AreaChart.Area dataKey="http" label="HTTP" />
			</AreaChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="area-chart-tooltip"]');
		expect(tooltip?.textContent).toBe("");
	});
});

describe("AreaChart sticky series colors", () => {
	test("filtering a series out does not recolor the survivors", () => {
		const filterableData = [
			{ date: new Date(2026, 6, 15), http: 420, tcp: 140, udp: 40 },
			{ date: new Date(2026, 6, 16), http: 510, tcp: 165, udp: 60 },
		];
		const { container, rerender } = render(
			<AreaChart.Root data={filterableData} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="http" label="HTTP" />
				<AreaChart.Area dataKey="tcp" label="TCP" />
				<AreaChart.Legend />
			</AreaChart.Root>,
		);
		const swatchColors = () => {
			const legend = container.querySelector('[data-slot="area-chart-legend"]');
			const items = legend == null ? [] : [...legend.querySelectorAll("span")];
			return items.map((item) => item.style.backgroundColor);
		};
		const [, tcpBefore] = swatchColors();
		expect(tcpBefore).toContain("chart-2");
		// Filter http out and introduce a new series: tcp must keep chart-2
		// (color follows the entity, never its position) and the newcomer claims
		// the next never-used slot.
		rerender(
			<AreaChart.Root data={filterableData} xKey="date" aria-label="Traffic by protocol">
				<AreaChart.Area dataKey="tcp" label="TCP" />
				<AreaChart.Area dataKey="udp" label="UDP" />
				<AreaChart.Legend />
			</AreaChart.Root>,
		);
		const [tcpAfter, udpAfter] = swatchColors();
		expect(tcpAfter).toBe(tcpBefore);
		expect(udpAfter).toContain("chart-3");
	});
});
