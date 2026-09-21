import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { BarChart } from "../bar-chart/index.js";
import { LineChart } from "../line-chart/index.js";
import { datumValue } from "./datum.js";
import { ChartStore } from "./store.js";
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

	test("a changed div prop re-registers and reaches the tooltip element", () => {
		const registerTooltip = vi.spyOn(ChartStore.prototype, "registerTooltip");
		const { container, rerender } = render(chart({ id: "readout-before" }));
		rerender(chart({ id: "readout-after" }));
		// Same keys, one different value: the shallow compare must read values.
		expect(registerTooltip).toHaveBeenCalledTimes(2);
		const tooltip = container.querySelector('[data-slot="bar-chart-tooltip"]');
		expect(tooltip).toHaveAttribute("id", "readout-after");
	});

	test("a div prop added or removed on re-render re-registers and reaches the tooltip element", () => {
		const registerTooltip = vi.spyOn(ChartStore.prototype, "registerTooltip");
		const { container, rerender } = render(chart({}));
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
		expect(screen.getAllByRole("row")).toHaveLength(21);
		const rowReads = vi.mocked(datumValue);
		// Why this guard: if the module mock stops applying, the zero below is
		// vacuous. The mount reads every cell through the spy.
		expect(rowReads).toHaveBeenCalledWith(rows[19], "tablet");
		rowReads.mockClear();
		await user.tab();
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

	test("an object ref holds the tooltip element and resets to null on unmount", () => {
		const ref = createRef<HTMLDivElement>();
		const { container, unmount } = render(
			<LineChart.Root data={latency} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Tooltip ref={ref} />
			</LineChart.Root>,
		);
		const tooltip = container.querySelector('[data-slot="line-chart-tooltip"]');
		expect(tooltip).toBeInTheDocument();
		expect(ref.current).toBe(tooltip);
		unmount();
		expect(ref.current).toBeNull();
	});

	test("a callback ref receives the element once and its cleanup runs once on unmount", () => {
		const cleanup = vi.fn<() => void>();
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);
		const { container, unmount } = render(
			<LineChart.Root data={latency} xKey="time" aria-label="Request latency">
				<LineChart.Line dataKey="p50" label="p50" />
				<LineChart.Tooltip ref={callbackRef} />
			</LineChart.Root>,
		);
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
