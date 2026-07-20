import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { BarChart } from "./bar-chart.js";

const data = [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 },
];

const renderChart = (extraRootProps: Record<string, unknown> = {}) =>
	render(
		<BarChart.Root data={data} xKey="month" aria-label="Visitors by month" {...extraRootProps}>
			<BarChart.Grid />
			<BarChart.XAxis />
			<BarChart.YAxis />
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			<BarChart.Bar dataKey="mobile" label="Mobile" />
			<BarChart.Tooltip />
			<BarChart.Legend />
		</BarChart.Root>,
	);

describe("BarChart.Root", () => {
	test("renders a labelled chart image and interaction overlay", () => {
		renderChart();
		expect(screen.getByRole("application", { name: "Visitors by month" })).toBeInTheDocument();
		// The canvas is decorative pixels; the overlay is the single named element.
		expect(document.querySelector("canvas")).toHaveAttribute("aria-hidden");
	});

	test("an xKey matching no row throws instead of rendering undefined categories", () => {
		// Regression: a typo'd xKey used to coerce every category to the literal
		// string "undefined" — a plausibly-rendered chart that ships the typo.
		// Loosely-typed rows (API responses) evade the compile-time xKey check,
		// which is exactly the hole the runtime invariant backstops.
		const untypedRows: Array<Record<string, unknown>> = data;
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<BarChart.Root data={untypedRows} xKey="mnth" aria-label="Typo chart">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>,
			),
		).toThrow(/BarChart\.Root xKey "mnth" does not match any key.*month, desktop, mobile/);
		consoleError.mockRestore();
	});

	test("forwards className, ref, and data-* props to the root element", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(
			<BarChart.Root
				data={data}
				xKey="month"
				aria-label="Visitors by month"
				className="custom-class"
				data-testid="chart-root"
				ref={ref}
			>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		const root = container.querySelector('[data-slot="bar-chart"]');
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
		expect(screen.getByRole("columnheader", { name: "Desktop" })).toBeInTheDocument();
		expect(screen.getByRole("columnheader", { name: "Mobile" })).toBeInTheDocument();
		expect(screen.getByRole("rowheader", { name: "February" })).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "305" })).toBeInTheDocument();
	});

	test("the data table is bounded with a summarizing caption for large data", () => {
		const bigData = Array.from({ length: 500 }, (_, index) => ({
			month: `Category ${index}`,
			desktop: index,
		}));
		render(
			<BarChart.Root data={bigData} xKey="month" aria-label="Large chart">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(151); // header + 150 bounded rows
		expect(screen.getByText(/Showing the first 150 of 500 rows/)).toBeInTheDocument();
	});

	test("empty data renders without crashing and without a table", () => {
		render(
			<BarChart.Root data={[]} xKey="month" aria-label="Empty chart">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(screen.getByRole("application", { name: "Empty chart" })).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	test("a dataKey matching no row in non-empty data throws with the available keys", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<BarChart.Root data={data} xKey="month" aria-label="Typo chart">
					<BarChart.Bar dataKey="desktp" label="Desktop" />
				</BarChart.Root>,
			),
		).toThrow(/dataKey "desktp" does not match any key.*month, desktop, mobile/);
		consoleError.mockRestore();
	});
});

describe("BarChart parts outside Root", () => {
	test("a part rendered outside Root throws", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<BarChart.Bar dataKey="desktop" />)).toThrow(
			/BarChart\.Bar must be composed inside BarChart\.Root/,
		);
		consoleError.mockRestore();
	});
});

describe("BarChart.Legend", () => {
	test("renders series labels with color keys for multi-series charts", () => {
		const { container } = renderChart();
		const legend = container.querySelector('[data-slot="bar-chart-legend"]');
		expect(legend).toBeInTheDocument();
		expect(legend?.textContent).toContain("Desktop");
		expect(legend?.textContent).toContain("Mobile");
	});

	test("renders nothing for a single series (the title already names it)", () => {
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Desktop visitors">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		expect(container.querySelector('[data-slot="bar-chart-legend"]')).not.toBeInTheDocument();
	});

	test("supports a render-prop for custom legends", () => {
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend>
					{(series) => series.map((entry) => <span key={entry.dataKey}>custom {entry.label}</span>)}
				</BarChart.Legend>
			</BarChart.Root>,
		);
		expect(screen.getByText("custom Desktop")).toBeInTheDocument();
		expect(screen.getByText("custom Mobile")).toBeInTheDocument();
	});
});

describe("BarChart keyboard interaction", () => {
	test("arrow keys step the active datum and render the tooltip readout", async () => {
		const user = userEvent.setup();
		renderChart();
		const overlay = screen.getByRole("application");
		await user.tab();
		expect(overlay).toHaveFocus();
		await user.keyboard("{ArrowRight}");
		// The tooltip readout shows the first datum: its category and both series.
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("January");
		expect(tooltip?.textContent).toContain("Desktop");
		expect(tooltip?.textContent).toContain("186");
		await user.keyboard("{ArrowRight}");
		expect(tooltip?.textContent).toContain("February");
		await user.keyboard("{End}");
		expect(tooltip?.textContent).toContain("March");
		await user.keyboard("{Home}");
		expect(tooltip?.textContent).toContain("January");
	});

	test("keyboard stepping announces the datum politely", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status.textContent).toContain("January");
			expect(status.textContent).toContain("Desktop: 186");
		});
	});

	test("Escape clears the active datum", async () => {
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("January");
		await user.keyboard("{Escape}");
		expect(tooltip?.textContent).toBe("");
	});

	test("Enter activates the current datum with its row", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: object) => void>();
		renderChart({ onDatumActivate });
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		expect(onDatumActivate).toHaveBeenCalledWith(
			expect.objectContaining({
				index: 0,
				xValue: "January",
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

describe("BarChart.Tooltip customization", () => {
	test("valueFormat, labelFormat, and footer customize the readout", async () => {
		const user = userEvent.setup();
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip
					labelFormat={(value) => `Month: ${String(value)}`}
					valueFormat={(value) => `${value} visits`}
					footer="Click to view logs"
				/>
			</BarChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Month: January");
		expect(tooltip?.textContent).toContain("186 visits");
		expect(tooltip?.textContent).toContain("Click to view logs");
	});

	test("the render-prop children replaces the readout entirely", async () => {
		const user = userEvent.setup();
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip>
					{(snapshot) => <strong>Custom readout for {String(snapshot.xValue)}</strong>}
				</BarChart.Tooltip>
			</BarChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(screen.getByText("Custom readout for January")).toBeInTheDocument();
	});

	test("null values render as an em dash, never zero", async () => {
		const user = userEvent.setup();
		const gappy = [
			{ month: "January", desktop: 186, mobile: null },
			{ month: "February", desktop: 305, mobile: 200 },
		];
		render(
			<BarChart.Root data={gappy} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
			</BarChart.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("—");
		expect(tooltip?.textContent).not.toContain("Mobile0");
	});
});

describe("BarChart controlled activeIndex", () => {
	test("a controlled activeIndex drives the tooltip readout", () => {
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month" activeIndex={1}>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("February");
		expect(tooltip?.textContent).toContain("305");
	});

	test("an out-of-range controlled activeIndex clamps to the data instead of rendering garbage", () => {
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month" activeIndex={99}>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("March");
		expect(tooltip?.textContent).toContain("237");
	});

	test("activeIndex null renders no readout", () => {
		render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month" activeIndex={null}>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toBe("");
	});
});

describe("BarChart sticky series colors", () => {
	test("filtering a series out does not recolor the survivors", () => {
		const filterableData = [
			{ month: "January", desktop: 186, mobile: 80, tablet: 40 },
			{ month: "February", desktop: 305, mobile: 200, tablet: 60 },
		];
		const { container, rerender } = render(
			<BarChart.Root data={filterableData} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const swatchColors = () => {
			const legend = container.querySelector('[data-slot="bar-chart-legend"]');
			const items = legend == null ? [] : [...legend.querySelectorAll("span")];
			return items.map((item) => item.style.backgroundColor);
		};
		const [, mobileBefore] = swatchColors();
		expect(mobileBefore).toContain("chart-2");
		// Filter desktop out and introduce a new series: mobile must keep chart-2
		// (color follows the entity, never its position) and the newcomer claims
		// the next never-used slot.
		rerender(
			<BarChart.Root data={filterableData} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Bar dataKey="tablet" label="Tablet" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const [mobileAfter, tabletAfter] = swatchColors();
		expect(mobileAfter).toBe(mobileBefore);
		expect(tabletAfter).toContain("chart-3");
	});
});
