import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
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

	test("aria-labelledby names the overlay from a visible title", () => {
		// The preferred naming arm: the chart sits under a heading, so the name is
		// referenced instead of duplicated. `aria-label` is absent in this mode, so
		// the sr-only table falls back to its generic caption.
		render(
			<>
				<h3 id="chart-title">Visitors by month</h3>
				<BarChart.Root data={data} xKey="month" aria-labelledby="chart-title">
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</>,
		);
		expect(screen.getByRole("application", { name: "Visitors by month" })).toBeInTheDocument();
		expect(screen.getByRole("table", { name: "Chart data." })).toBeInTheDocument();
	});

	test("the overlay points assistive tech at the keyboard instructions", () => {
		renderChart();
		const describedBy = screen.getByRole("application").getAttribute("aria-describedby");
		expect(describedBy).not.toBeNull();
		const instructions = describedBy == null ? null : document.getElementById(describedBy);
		expect(instructions?.textContent).toContain("left and right arrow keys");
		expect(instructions?.textContent).toContain("Home and End");
		expect(instructions?.textContent).toContain("Enter to activate");
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
		// The consumer's className survives the merge onto the root.
		expect(root?.className).toContain("custom-class");
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
		// The readout's text is React-rendered from the store, but its visibility is
		// the inline opacity the engine writes on every commit — without asserting it
		// the entire hover UI could ship permanently invisible while every
		// textContent assertion above stays green.
		const user = userEvent.setup();
		renderChart();
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		if (!(tooltip instanceof HTMLElement)) {
			throw new Error("expected the tooltip surface to render");
		}
		expect(tooltip.style.opacity).toBe("0");
		await user.tab();
		await user.keyboard("{ArrowRight}");
		// The reveal lands on the engine's next animation frame.
		await waitFor(() => {
			expect(tooltip.style.opacity).toBe("1");
		});
		await user.keyboard("{Escape}");
		await waitFor(() => {
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
		// One Enter is one activation — a double-fire would ship a chart that
		// navigates twice per keypress.
		expect(onDatumActivate).toHaveBeenCalledExactlyOnceWith(
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
		// Exactly one publish per move: a count-blind assertion cannot see the
		// store echoing every commit back to the consumer.
		expect(onActiveIndexChange).toHaveBeenCalledExactlyOnceWith(0);
		await user.keyboard("{ArrowRight}");
		expect(onActiveIndexChange).toHaveBeenCalledTimes(2);
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(1);
	});
});

describe("BarChart paging keys", () => {
	// PageUp/PageDown step by a tenth of the series, so the stride is only
	// observable on a fixture of at least 10 rows. Unlike the arrow stride, the
	// page stride is derived from the row count alone, so it is exact even here
	// where happy-dom's zero-width plot decimates the series.
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
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		await user.tab();
		await user.keyboard("{PageUp}");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
		expect(tooltip?.textContent).toContain("Week 2");
		await user.keyboard("{PageUp}");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(4);
		expect(tooltip?.textContent).toContain("Week 4");
		await user.keyboard("{PageDown}");
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(2);
		expect(tooltip?.textContent).toContain("Week 2");
	});

	test("PageDown with no active datum enters a page in from the end", async () => {
		const user = userEvent.setup();
		const onActiveIndexChange = vi.fn<(index: number | null) => void>();
		renderWeeks(onActiveIndexChange);
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		await user.tab();
		await user.keyboard("{PageDown}");
		// last (19) minus the page stride (2).
		expect(onActiveIndexChange).toHaveBeenLastCalledWith(17);
		expect(tooltip?.textContent).toContain("Week 17");
	});
});

describe("BarChart pending", () => {
	test("pending holds the previous render instead of swapping in a skeleton", async () => {
		// The contract is "keep showing what is already there while fresh data
		// loads": the canvas, the data-table twin, and keyboard inspection all stay.
		// The dimming itself is a Tailwind opacity utility with no data attribute or
		// CSS variable behind it, so it is not assertable from either project — see
		// the deferred `data-pending` note.
		const user = userEvent.setup();
		const { container, rerender } = render(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		rerender(
			<BarChart.Root data={data} xKey="month" aria-label="Visitors by month" pending>
				<BarChart.Bar dataKey="desktop" label="Desktop" />
			</BarChart.Root>,
		);
		expect(container.querySelector("canvas")).toBeInTheDocument();
		expect(screen.getByRole("cell", { name: "305" })).toBeInTheDocument();
		await user.tab();
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
		const tooltip = document.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toBe("");
	});
});

describe("BarChart textures", () => {
	const texturedChart = (
		<BarChart.Root data={data} xKey="month" aria-label="Visitors by month">
			<BarChart.Bar dataKey="desktop" label="Desktop" />
			<BarChart.Bar dataKey="mobile" label="Mobile" texture="hatch" />
			<BarChart.Legend />
		</BarChart.Root>
	);

	const legendSwatches = (container: HTMLElement) => {
		const legend = container.querySelector('[data-slot="bar-chart-legend"]');
		return legend == null ? [] : [...legend.querySelectorAll<HTMLElement>("span[data-texture]")];
	};

	test("legend keys wear the series' texture as a redundant encoding", () => {
		// The stripe gradient itself is asserted in browser mode
		// (texture.browser.test.tsx) — happy-dom's CSS parser drops
		// repeating-linear-gradient values, so here we assert the structural
		// data-texture channel and that color still follows the entity.
		const { container } = render(texturedChart);
		const swatches = legendSwatches(container);
		expect(swatches.map((swatch) => swatch.getAttribute("data-texture"))).toEqual([
			"solid",
			"hatch",
		]);
		expect(swatches[1]?.style.backgroundColor).toContain("chart-2");
	});

	test("every texture value flows through to its legend key", () => {
		const quarterly = [
			{ month: "January", desktop: 186, mobile: 80, tablet: 40, kiosk: 12, tv: 6, watch: 3 },
			{ month: "February", desktop: 305, mobile: 200, tablet: 60, kiosk: 18, tv: 8, watch: 5 },
		];
		const { container } = render(
			<BarChart.Root data={quarterly} xKey="month" aria-label="Visitors by month">
				<BarChart.Bar dataKey="desktop" label="Desktop" />
				<BarChart.Bar dataKey="mobile" label="Mobile" texture="hatch" />
				<BarChart.Bar dataKey="tablet" label="Tablet" texture="hatch-reverse" />
				<BarChart.Bar dataKey="kiosk" label="Kiosk" texture="crosshatch" />
				<BarChart.Bar dataKey="tv" label="TV" texture="perpendicular" />
				<BarChart.Bar dataKey="watch" label="Watch" texture="dots" />
				<BarChart.Legend />
			</BarChart.Root>,
		);
		expect(legendSwatches(container).map((swatch) => swatch.getAttribute("data-texture"))).toEqual([
			"solid",
			"hatch",
			"hatch-reverse",
			"crosshatch",
			"perpendicular",
			"dots",
		]);
	});
});

describe("BarChart decorative mode", () => {
	const renderDecorative = () =>
		render(
			<BarChart.Root data={data} xKey="month" decorative>
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

	test("forces off a consumer-passed tabIndex so a decorative chart cannot become focusable", () => {
		// tabIndex is a valid div prop the decorative branch does not forbid, so it
		// would otherwise ride `{...props}` onto the aria-hidden root and reintroduce
		// a tab stop the decorative contract removed.
		const { container } = render(
			<BarChart.Root data={data} xKey="month" decorative tabIndex={0}>
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

	test("pointer and keyboard never surface a tooltip readout", async () => {
		const user = userEvent.setup();
		const { container } = renderDecorative();
		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		// The engine still owns the tooltip element, but with no overlay to receive
		// events it can never fill or reveal it.
		expect(tooltip?.textContent).toBe("");
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		expect(tooltip?.textContent).toBe("");
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
				<BarChart.Root data={data} xKey="month" decorative activeIndex={1}>
					<BarChart.Bar dataKey="desktop" label="Desktop" />
				</BarChart.Root>
			</>,
		);
		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip?.textContent).toBe("");
	});

	test("type model: decorative needs no name; interactive requires one and forbids decorative extras", () => {
		const { container } = render(
			<>
				{/* ✅ decorative needs neither an accessible name nor interaction props */}
				<BarChart.Root data={data} xKey="month" decorative>
					<BarChart.Bar dataKey="desktop" />
				</BarChart.Root>
				{/* @ts-expect-error — an interactive chart requires an accessible name */}
				<BarChart.Root data={data} xKey="month">
					<BarChart.Bar dataKey="desktop" />
				</BarChart.Root>
				{/* @ts-expect-error — decorative forbids an accessible name */}
				<BarChart.Root data={data} xKey="month" decorative aria-label="Placeholder">
					<BarChart.Bar dataKey="desktop" />
				</BarChart.Root>
				{/* @ts-expect-error — decorative forbids interaction callbacks */}
				<BarChart.Root data={data} xKey="month" decorative onDatumActivate={() => {}}>
					<BarChart.Bar dataKey="desktop" />
				</BarChart.Root>
			</>,
		);
		// `pnpm typecheck` owns the four directives above; what this run can still
		// see is that all four arms mount and only the interactive one is exposed
		// to assistive tech as an interaction surface.
		expect(container.querySelectorAll('[data-slot="bar-chart"]')).toHaveLength(4);
		expect(screen.getAllByRole("application")).toHaveLength(1);
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
