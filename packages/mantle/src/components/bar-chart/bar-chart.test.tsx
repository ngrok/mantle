import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import invariant from "tiny-invariant";
import { describe, expect, test, vi } from "vitest";
import { engageChart } from "../../test-utils/engage-chart.js";
import { BarChart } from "./bar-chart.js";

// Keep the shared fixture under 4 rows: happy-dom never delivers a plot size,
// and a zero-width plot decimates 4+ rows, which widens the keyboard arrow
// stride to the whole set (a single ArrowRight would jump to the last datum).
// The paging fixture below opts into that regime deliberately.
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

	test("the keyboard instructions name every key the overlay handles", () => {
		renderChart();
		const overlay = screen.getByRole("application", { name: "Visitors by month" });
		expect(overlay).toHaveAccessibleDescription(
			/left and right arrow keys.*Page Up and Page Down.*Home and End.*Enter or Space.*Escape/s,
		);
	});

	test("the data table caption reads the aria-labelledby element's text", async () => {
		render(
			<>
				<h2 id="visitors-title">Visitors by month</h2>
				<BarChart.Root data={data} xKey="month" aria-labelledby="visitors-title">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</>,
		);
		// The reference also names the overlay, so the heading is not duplicated.
		expect(screen.getByRole("application", { name: "Visitors by month" })).toBeInTheDocument();
		engageChart();
		await vi.waitFor(() => {
			expect(
				screen.getByRole("table", { name: "Visitors by month — chart data." }),
			).toBeInTheDocument();
		});
	});

	test("an xKey matching no row throws instead of rendering undefined categories", () => {
		// Regression: a typo'd xKey used to coerce every category to the literal
		// string "undefined" — a plausibly-rendered chart that ships the typo.
		// Loosely-typed rows (API responses) evade the compile-time xKey check,
		// which is exactly the hole the runtime invariant backstops.
		const untypedRows: Array<Record<string, unknown>> = data;
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<BarChart.Root data={untypedRows} xKey="mnth" aria-label="Typo chart">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>,
			),
		).toThrow(/BarChart\.Root xKey "mnth" does not match any key.*month, desktop, mobile/);
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
		expect(root).toHaveClass("custom-class");
		expect(root?.getAttribute("data-testid")).toBe("chart-root");
	});

	test("renders the sr-only data table twin with a row per datum", () => {
		renderChart();
		engageChart();
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
		engageChart();
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
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<BarChart.Root data={data} xKey="month" aria-label="Typo chart">
					<BarChart.Bar dataKey="desktp" label="Desktop" />
				</BarChart.Root>,
			),
		).toThrow(/dataKey "desktp" does not match any key.*month, desktop, mobile/);
	});
});

describe("BarChart data slots", () => {
	// Every row is public API: a rename breaks consumer CSS and the browser
	// tests' own selectors, and nothing else in the suite would notice.
	test.each([
		["bar-chart", "DIV"],
		["bar-chart-plot", "DIV"],
		["bar-chart-canvas", "CANVAS"],
		["bar-chart-crosshair", "DIV"],
		["bar-chart-hover-band", "DIV"],
		["bar-chart-markers", "DIV"],
		["bar-chart-tooltip", "DIV"],
		["bar-chart-legend", "DIV"],
		["bar-chart-description", "SPAN"],
		["bar-chart-data-table", "DIV"],
	])("%s lands on a %s", async (slot, tagName) => {
		const user = userEvent.setup();
		const { container } = renderChart();
		engageChart();
		// The tooltip surface mounts on the first hover or keyboard step.
		await user.keyboard("{ArrowRight}");
		const element = container.querySelector(`[data-slot="${slot}"]`);
		expect(element).toBeInTheDocument();
		expect(element?.tagName).toBe(tagName);
	});

	test("the three hover layers sit inside the plot and stay hidden from assistive tech", () => {
		const { container } = renderChart();
		const plot = container.querySelector('[data-slot="bar-chart-plot"]');
		for (const slot of ["bar-chart-crosshair", "bar-chart-hover-band", "bar-chart-markers"]) {
			const layer = container.querySelector(`[data-slot="${slot}"]`);
			expect(plot?.contains(layer ?? null)).toBe(true);
			expect(layer).toHaveAttribute("aria-hidden", "true");
		}
	});

	test("a decorative chart inserts the canvas alone", () => {
		// Without an overlay nothing ever hovers, so the hover layers would be
		// dead DOM; the canvas still paints the placeholder.
		const { container } = render(
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(container.querySelector('[data-slot="bar-chart-canvas"]')).toBeInTheDocument();
		expect(container.querySelector('[data-slot="bar-chart-hover-band"]')).toBeNull();
		expect(container.querySelector('[data-slot="bar-chart-markers"]')).toBeNull();
		expect(container.querySelector('[role="application"]')).not.toBeInTheDocument();
	});
});

describe("BarChart series paint order", () => {
	/** The data table's series columns, in the order the store paints them. */
	const seriesColumns = () =>
		screen
			.getAllByRole("columnheader")
			.map((header) => header.textContent)
			.filter((text) => text === "Desktop" || text === "Mobile" || text === "Tablet");

	test("reordering the Bar parts does not reorder the series", () => {
		const { rerender } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
			</BarChart.Root>,
		);
		engageChart();
		expect(seriesColumns()).toEqual(["Desktop", "Mobile"]);
		rerender(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		// The position sticks to the dataKey, which is what keeps a series from
		// jumping when only its label or color changes.
		expect(seriesColumns()).toEqual(["Desktop", "Mobile"]);
	});

	test("a series that mounts later paints last, whatever its position in the JSX", () => {
		const withTablet = [
			{ month: "January", desktop: 186, mobile: 80, tablet: 40 },
			{ month: "February", desktop: 305, mobile: 200, tablet: 60 },
		];
		const { rerender } = render(
			<BarChart.Root data={withTablet} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		engageChart();
		rerender(
			<BarChart.Root data={withTablet} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="tablet" label="Tablet" />
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(seriesColumns()).toEqual(["Desktop", "Tablet"]);
	});
});

test("a BarChart part rendered outside Root throws", () => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	expect(() => render(<BarChart.Bar dataKey="desktop" />)).toThrow(
		/BarChart\.Bar must be composed inside BarChart\.Root/,
	);
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

	test("ArrowLeft enters at the last datum and clamps at the first", async () => {
		const user = userEvent.setup();
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		renderChart({ onActiveIndexChange });
		await user.tab();
		// Stepping backwards into an unpositioned cursor enters from the end — the
		// mirror of ArrowRight entering at the first datum.
		await user.keyboard("{ArrowLeft}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("March");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
		await user.keyboard("{ArrowLeft}");
		expect(tooltip?.textContent).toContain("February");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(1);
		// The cursor clamps at the first datum: it never wraps or goes negative.
		await user.keyboard("{ArrowLeft}{ArrowLeft}");
		expect(tooltip?.textContent).toContain("January");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(0);
		expect(onActiveIndexChange).toHaveBeenCalledTimes(3);
	});

	test("the tooltip surface is revealed while a datum is active and hidden again on Escape", async () => {
		// React renders the readout's text, but the engine writes its visibility
		// as an inline opacity on every commit. Without this assertion the whole
		// hover UI could ship invisible while every textContent check stays green.
		const user = userEvent.setup();
		renderChart();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		// The surface mounts on the first activation and reveals on the engine's
		// next animation frame.
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		invariant(tooltip instanceof HTMLElement, "the tooltip surface renders");
		await vi.waitFor(() => {
			expect(tooltip.style.opacity).toBe("1");
		});
		await user.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(tooltip.style.opacity).toBe("0");
		});
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
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				index: 0,
				xValue: "January",
				datum: data[0],
				dataKey: null,
			}),
		);
	});

	test("Space activates the current datum with the same payload as Enter", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: object) => void>();
		renderChart({ onDatumActivate });
		await user.tab();
		await user.keyboard("{ArrowRight}");
		await user.keyboard(" ");
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				index: 0,
				xValue: "January",
				datum: data[0],
				dataKey: null,
			}),
		);
	});

	test("onActiveIndexChange reports keyboard movement once per step", async () => {
		const user = userEvent.setup();
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		renderChart({ onActiveIndexChange });
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(0);
		await user.keyboard("{ArrowRight}");
		expect(onActiveIndexChange).toHaveBeenCalledTimes(2);
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(1);
	});
});

describe("BarChart paging keys", () => {
	// PageUp and PageDown step by a tenth of the series, so the stride is only
	// visible on a fixture of at least 10 rows. The page stride comes from the
	// row count alone, so happy-dom's zero-width plot does not widen it.
	const weeks = Array.from({ length: 20 }, (_, index) => ({
		week: `Week ${index}`,
		visits: index * 10,
	}));

	const renderWeeks = (onActiveIndexChange: (index: number | null) => void) =>
		render(
			<BarChart.Root
				data={weeks}
				xKey="week"
				aria-label="Visitors by week"
				onActiveIndexChange={onActiveIndexChange}
			>
				<BarChart.Bar dataKey="visits" label="Visits" />
				<BarChart.Tooltip />
			</BarChart.Root>,
		);

	test("PageUp and PageDown move a tenth of the series at a time", async () => {
		const user = userEvent.setup();
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		renderWeeks(onActiveIndexChange);
		await user.tab();
		await user.keyboard("{PageUp}");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Week 2");
		await user.keyboard("{PageUp}");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(4);
		expect(tooltip?.textContent).toContain("Week 4");
		await user.keyboard("{PageDown}");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
		expect(tooltip?.textContent).toContain("Week 2");
		expect(onActiveIndexChange).toHaveBeenCalledTimes(3);
	});

	test("PageDown with no active datum enters a page in from the end", async () => {
		const user = userEvent.setup();
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		renderWeeks(onActiveIndexChange);
		await user.tab();
		await user.keyboard("{PageDown}");
		// The last row (19) minus the page stride (2).
		expect(onActiveIndexChange).toHaveBeenCalledTimes(1);
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(17);
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("Week 17");
	});
});

describe("BarChart pending", () => {
	test("pending holds the previous render instead of swapping in a skeleton", async () => {
		// The dimming is a plain opacity utility with no data attribute behind it,
		// so the assertable contract is that the canvas, the data-table twin, and
		// keyboard inspection all stay while fresh data loads.
		const user = userEvent.setup();
		const { container, rerender } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip />
			</BarChart.Root>,
		);
		rerender(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month" pending>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Tooltip />
			</BarChart.Root>,
		);
		expect(container.querySelector("canvas")).toBeInTheDocument();
		await user.tab();
		expect(screen.getByRole("cell", { name: "305" })).toBeInTheDocument();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toContain("January");
		expect(tooltip?.textContent).toContain("186");
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
		// The surface mounts on the first active datum, so none means no surface.
		expect(document.querySelector('[data-slot="bar-chart-tooltip"]')).toBeNull();
	});
});

test("legend keys wear the series' texture as a redundant encoding", () => {
	// Why no gradient assertion: happy-dom's CSS parser drops repeating-linear-gradient
	// values, so texture.browser.test.tsx owns the stripe itself.
	const { container } = render(
		<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			<BarChart.Bar dataKey="mobile" label="Mobile" texture="hatch" />
			<BarChart.Legend />
		</BarChart.Root>,
	);
	const swatches = [
		...container.querySelectorAll<HTMLElement>('[data-slot="bar-chart-legend"] span[data-texture]'),
	];
	expect(swatches.map((swatch) => swatch.getAttribute("data-texture"))).toEqual(["solid", "hatch"]);
	expect(swatches[1]?.style.backgroundColor).toContain("chart-2");
});

describe("BarChart decorative mode", () => {
	const renderDecorative = () =>
		render(
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Grid />
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
			</BarChart.Root>,
		);

	test("hides the whole visualization from assistive tech and needs no accessible name", () => {
		const { container } = renderDecorative();
		const root = container.querySelector('[data-slot="bar-chart"]');
		expect(root).toHaveAttribute("aria-hidden", "true");
		// The canvas still paints the placeholder bars — decorative preserves the
		// visual rendering, it only strips the interaction and a11y layers.
		expect(container.querySelector("canvas")).toBeInTheDocument();
	});

	test("renders no interaction overlay, so nothing in the chart is a tab stop", () => {
		const { container } = renderDecorative();
		expect(screen.queryByRole("application")).not.toBeInTheDocument();
		expect(container.querySelector("[tabindex]")).not.toBeInTheDocument();
	});

	test("paints every series neutral, so no mark on a backdrop reads as data", () => {
		// The Root prop has to reach the store for the neutral fill to land, and the
		// legend swatch is where a DOM surface publishes what a series paints. The
		// canvas reads the same value from the same place — the browser sweep in
		// chart/decorative-paint.browser.test.tsx samples the painted pixels.
		const { container } = render(
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Bar dataKey="desktop" label="Desktop" color="chart-4" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const swatches = [
			...(container.querySelectorAll<HTMLElement>(
				'[data-slot="bar-chart-legend"] span[data-texture]',
			) ?? []),
		];
		expect(swatches).toHaveLength(2);
		for (const swatch of swatches) {
			// A `color` override loses to the fill too: a decorative chart carries no
			// series identity for a reader to decode.
			expect(swatch.style.backgroundColor).toBe("var(--color-chart-decorative)");
		}
	});

	test("a chart with real data keeps its palette and paints no neutral fill", () => {
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Legend />
			</BarChart.Root>,
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

	test("forces off a consumer-passed tabIndex so a decorative chart cannot become focusable", () => {
		// tabIndex is a valid div prop the decorative branch does not forbid, so it
		// would otherwise ride `{...props}` onto the aria-hidden root and reintroduce
		// a tab stop the decorative contract removed.
		const { container } = render(
			<BarChart.Root data={data} xKey="month" mode="decorative" tabIndex={0}>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(container.querySelector('[data-slot="bar-chart"]')).not.toHaveAttribute("tabindex");
	});

	test("renders no sr-only data table and no live region", () => {
		renderDecorative();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	test("is inert, so a composed CopyButton is not a tab stop inside the hidden backdrop", () => {
		const { container } = render(
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.CopyButton />
			</BarChart.Root>,
		);
		expect(container.querySelector('[data-slot="bar-chart"]')).toHaveAttribute("inert");
	});

	test("keyboard never surfaces a tooltip readout", async () => {
		const user = userEvent.setup();
		const { container } = renderDecorative();
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		// With no overlay to receive events, no hover is ever published, so the
		// tooltip surface never mounts.
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBeNull();
	});

	test("suppresses a type-bypassing controlled activeIndex so no readout surfaces", () => {
		// A loosely-typed / JS consumer can slip past the ChartAccessibilityProps
		// union — the same class of hole the xKey invariant backstops. The runtime
		// guard must still keep a decorative chart inert: an activeIndex of 1 drives
		// the tooltip to "February" on an interactive chart (see the controlled
		// activeIndex test above), but must surface nothing here.
		const { container } = render(
			<>
				{/* @ts-expect-error — decorative forbids activeIndex; the runtime guard must suppress it anyway */}
				<BarChart.Root data={data} xKey="month" mode="decorative" activeIndex={1}>
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</>,
		);
		expect(container.querySelector('[data-slot="bar-chart-tooltip"]')).toBeNull();
	});
});

describe("BarChart series slots", () => {
	test("automatic bars skip fixed slots", () => {
		const { container } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" seriesSlot={1} />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const legend = container.querySelector('[data-slot="bar-chart-legend"]');
		const swatches = legend == null ? [] : [...legend.querySelectorAll("span")];
		expect(swatches.map((swatch) => swatch.style.backgroundColor)).toStrictEqual([
			"var(--color-chart-2)",
			"var(--color-chart-1)",
		]);
	});

	test("automatic series close composition gaps", () => {
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
		expect(swatchColors()[1]).toContain("chart-2");
		rerender(
			<BarChart.Root data={filterableData} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="mobile" label="Mobile" />
				<BarChart.Bar dataKey="tablet" label="Tablet" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		const [mobileAfter, tabletAfter] = swatchColors();
		expect(mobileAfter).toContain("chart-1");
		expect(tabletAfter).toContain("chart-2");
	});

	test("regrouping a monthly chart does not exhaust the palette", () => {
		// A monthly time series grouped by provider, then regrouped by access key,
		// is the shape that used to break: eight provider keys register and leave,
		// so the four keys on screen all painted the overflow gray. One `groupBy`
		// click was enough. The Root is deliberately NOT keyed — remounting it
		// would discard the tween and replay the enter animation.
		const providers = ["aws", "gcp", "azure", "fly", "vercel", "render", "railway", "heroku"];
		const accessKeys = ["key-a", "key-b", "key-c", "key-d"];
		const monthlyRow = (month: string, keys: readonly string[]) => {
			const row: Record<string, string | number> = { month };
			for (const [index, key] of keys.entries()) {
				row[key] = 100 + index * 10;
			}
			return row;
		};
		const monthsFor = (keys: readonly string[]) =>
			["January", "February", "March"].map((month) => monthlyRow(month, keys));
		const chartFor = (keys: readonly string[]) => (
			<BarChart.Root data={monthsFor(keys)} xKey="month" stacked aria-label="Spend by month">
				{keys.map((key) => (
					<BarChart.Bar key={key} dataKey={key} label={key} />
				))}
				<BarChart.Legend />
			</BarChart.Root>
		);

		const { container, rerender } = render(chartFor(providers));
		rerender(chartFor(accessKeys));

		const legend = container.querySelector('[data-slot="bar-chart-legend"]');
		const swatches = [...(legend?.querySelectorAll("span[data-texture]") ?? [])].map(
			(swatch) => swatch instanceof HTMLElement && swatch.style.backgroundColor,
		);
		expect(swatches).toHaveLength(accessKeys.length);
		expect(swatches).not.toContain("var(--color-chart-other)");
		expect(new Set(swatches).size).toBe(accessKeys.length);
	});
});

test("BarChart.CopyButton announces 'Copied' through a live region, and again for a second copy inside the reset window", async () => {
	const user = userEvent.setup();
	const { container } = render(
		<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			<BarChart.CopyButton />
		</BarChart.Root>,
	);

	const button = screen.getByRole("button", { name: "Copy data as Markdown" });
	// Why the slot: the chart's keyboard announcer is a second `role="status"`. The
	// copy button's region is the chart's only `LiveRegion`.
	const status = container.querySelector('[data-slot="live-region"]');
	invariant(status != null, "the copy button renders its live region");
	expect(status).toHaveTextContent("");

	await user.click(button);
	await vi.waitFor(() => {
		expect(status).toHaveTextContent("Copied");
	});
	const first = status.textContent;

	await user.click(button);
	// A live region announces a DOM change, so a repeat must differ from the
	// text before it. The trailing no-break space reads the same.
	await vi.waitFor(() => {
		expect(status.textContent).not.toBe(first);
	});
	expect(status).toHaveTextContent("Copied");
});

/**
 * Type-level contracts, owned by `pnpm typecheck` and not by a `test()`. A
 * `@ts-expect-error` that compiles is the assertion; a runtime `expect` beside
 * it reads as coverage the vitest run does not have.
 *
 * A decorative chart needs no accessible name and takes no interaction props. A
 * static chart requires a name and takes no interaction props. An interactive
 * chart requires a name. A `mode` picked at runtime satisfies every mode it
 * can take, and a static or decorative Root type requires `mode`.
 */
export function typeLevelContracts(isPlaceholder: boolean) {
	type Row = (typeof data)[number];
	return (
		<>
			<BarChart.Root
				data={data}
				xKey="month"
				mode={isPlaceholder ? "static" : "interactive"}
				aria-label="Visitors"
			>
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- a runtime-picked mode satisfies every arm: the interactive arm needs a name */}
			<BarChart.Root data={data} xKey="month" mode={isPlaceholder ? "decorative" : "interactive"}>
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- a decorative Root type requires `mode`; omitted, the runtime default is interactive */}
			<BarChart.Root<Row, "decorative"> data={data} xKey="month">
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			<BarChart.Root data={data} xKey="month" mode="decorative">
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			<BarChart.Root data={data} xKey="month" mode="static" aria-label="Visitors, last 3 months">
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- a static chart requires an accessible name */}
			<BarChart.Root data={data} xKey="month" mode="static">
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- static forbids interaction props */}
			<BarChart.Root data={data} xKey="month" mode="static" aria-label="Visitors" activeIndex={1}>
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- an interactive chart requires an accessible name */}
			<BarChart.Root data={data} xKey="month">
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- decorative forbids an accessible name */}
			<BarChart.Root data={data} xKey="month" mode="decorative" aria-label="Placeholder">
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
			{/* @ts-expect-error -- decorative forbids interaction callbacks */}
			<BarChart.Root data={data} xKey="month" mode="decorative" onDatumActivate={() => {}}>
				<BarChart.Bar dataKey="desktop" />
			</BarChart.Root>
		</>
	);
}
