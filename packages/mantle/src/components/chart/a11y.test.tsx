import { act, render, screen } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ChartAnnouncer, ChartDataTable, ChartListAnnouncer } from "./a11y.js";
import { ChartListContext, ChartListPrimitive } from "./list.js";
import type { TooltipConfig } from "./store.js";
import { ChartStore } from "./store.js";
import type { ChartDatum, HoverSnapshot, SeriesSpec, XScaleKind } from "./types.js";

// The formatters use the runtime's default locale. `vitest.config.ts` pins `TZ=UTC` and
// `LC_ALL=en_US.UTF-8` in `test.env`, so en-US output is deterministic here.

const p50: SeriesSpec = {
	dataKey: "p50",
	label: "p50",
	color: "blue",
	mark: "line",
	curve: "linear",
	markers: false,
	connectNulls: false,
	shape: "circle",
	texture: "solid",
};

/** A store with one registered series: the table renders nothing without one. */
const storeWithSeries = (): ChartStore => {
	const store = new ChartStore();
	store.registerSeries(p50);
	return store;
};

describe("ChartDataTable row headers", () => {
	const renderTable = ({ data, xScale }: { data: readonly ChartDatum[]; xScale?: XScaleKind }) =>
		render(
			<ChartDataTable
				data={data}
				label="Request latency"
				labelledBy={undefined}
				slotName="line-chart"
				store={storeWithSeries()}
				xHasTimeOfDay
				xKey="time"
				xScale={xScale}
				zKey={undefined}
			/>,
		);

	test.each([
		{ kind: "an epoch number", time: Date.UTC(2026, 6, 18, 10, 0) },
		{ kind: "a date string", time: "2026-07-18T10:00:00Z" },
	])("on a time scale $kind reads as a date in a <time dateTime>", ({ time }) => {
		renderTable({ data: [{ time, p50: 120 }], xScale: "time" });
		const header = screen.getByRole("rowheader");
		expect(header).toHaveTextContent(/^Jul 18, 10:00\sAM$/);
		expect(header.querySelector("time")).toHaveAttribute("datetime", "2026-07-18T10:00:00.000Z");
	});

	test("on a time scale an x that is not a time reads as an em dash with no <time>", () => {
		renderTable({ data: [{ time: "not a date", p50: 120 }], xScale: "time" });
		const header = screen.getByRole("rowheader");
		expect(header).toHaveTextContent(/^—$/);
		// The sibling test above proves this query finds a rendered <time>.
		expect(header.querySelector("time")).toBeNull();
	});

	test("with no scale passed a number is not read as an epoch", () => {
		renderTable({ data: [{ time: 1_000_000, p50: 120 }] });
		const header = screen.getByRole("rowheader");
		expect(header).toHaveTextContent(/^1,000,000$/);
		expect(header).toHaveAttribute("data-value", "1000000");
	});

	test.each([
		{ kind: "null", time: null },
		{ kind: "a non-finite number", time: Number.POSITIVE_INFINITY },
	])("a row whose x is $kind keeps its place and reads an em dash", ({ time }) => {
		renderTable({
			data: [
				{ time, p50: 12 },
				{ time: 1, p50: 14 },
			],
			xScale: "linear",
		});
		// An agent maps table row n to data[n], so the row the chart drops stays.
		const headers = screen.getAllByRole("rowheader").map((header) => header.textContent);
		expect(headers).toStrictEqual(["—", "1"]);
		expect(screen.getByRole("cell", { name: "12" })).toBeInTheDocument();
	});
});

/** The snapshot the engine publishes for a keyboard step to `index`, where the one series reads `value`. */
const keyboardStep = (index: number, value = 120): HoverSnapshot => ({
	index,
	xValue: `b${index}`,
	datum: {},
	points: [{ dataKey: "p50", label: "p50", value, color: "var(--color-chart-blue)" }],
	viaKeyboard: true,
});

/** Publish `hover` the way the engine does, on a step and on each data update. */
const publish = (store: ChartStore, hover: HoverSnapshot | null): void => {
	act(() => {
		store.publishHover(hover);
	});
};

/** Run the fake clock forward, with the React updates that its timers start. */
const advance = (milliseconds: number): Promise<void> =>
	act(async () => {
		await vi.advanceTimersByTimeAsync(milliseconds);
	});

describe("keyboard step announcements", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("a step to another datum is announced 120 ms later, while data updates arrive every 50 ms", async () => {
		const store = new ChartStore();
		render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		publish(store, keyboardStep(0));
		await advance(120);
		publish(store, keyboardStep(1));
		await advance(50);
		// A data update publishes a new snapshot object for the same datum.
		publish(store, keyboardStep(1));
		await advance(50);
		publish(store, keyboardStep(1));
		await advance(20);
		expect(screen.getByRole("status").textContent).toBe("b1. p50: 120");
	});

	test("a step announces the values of the latest snapshot when its wait ends", async () => {
		const store = new ChartStore();
		render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		publish(store, keyboardStep(1, 120));
		// A data update lands during the wait.
		publish(store, keyboardStep(1, 130));
		await advance(120);
		expect(screen.getByRole("status").textContent).toBe("b1. p50: 130");
	});

	test("a data update under a parked cursor does not change the announcement", async () => {
		const store = new ChartStore();
		render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		publish(store, keyboardStep(1, 120));
		await advance(120);
		publish(store, keyboardStep(1, 130));
		await advance(240);
		expect(screen.getByRole("status").textContent).toBe("b1. p50: 120");
	});

	test("a data update that changes the label granularity under a parked cursor announces nothing", async () => {
		const store = new ChartStore();
		const { rerender } = render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		publish(store, keyboardStep(1));
		await advance(120);
		rerender(<ChartAnnouncer store={store} xHasTimeOfDay />);
		// A new wait would start from an empty region.
		expect(screen.getByRole("status").textContent).toBe("b1. p50: 120");
	});

	test("a step to a datum that reads the same as the last one is announced again", async () => {
		const store = new ChartStore();
		render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		const region = screen.getByRole("status");
		publish(store, keyboardStep(0));
		await advance(120);
		expect(region.textContent).toBe("b0. p50: 120");
		// Timestamps less than a minute apart share one label, so two data points can read the same.
		publish(store, { ...keyboardStep(1), xValue: "b0" });
		// Assistive technology does not announce text that did not change, so the step starts from an empty region.
		expect(region).toBeEmptyDOMElement();
		await advance(120);
		expect(region.textContent).toBe("b0. p50: 120");
	});

	test("the announcement clears when the keyboard cursor leaves the chart", async () => {
		const store = new ChartStore();
		render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		const region = screen.getByRole("status");
		publish(store, keyboardStep(1));
		await advance(120);
		expect(region.textContent).toBe("b1. p50: 120");
		publish(store, null);
		expect(region).toBeEmptyDOMElement();
	});

	test("a pointer hover is not announced", async () => {
		const store = new ChartStore();
		render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
		publish(store, { ...keyboardStep(1), viaKeyboard: false });
		await advance(240);
		// The sibling tests prove the same snapshot announces as a keyboard step.
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
	});

	describe("in a List", () => {
		/** A chart's announcer inside a List, wired the way the Root wires it. */
		const ListedAnnouncer = ({ store }: { store: ChartStore }) => {
			const list = useContext(ChartListContext);
			if (list == null) {
				throw new Error("expected a List around the announcer");
			}
			return <ChartListAnnouncer id="chart" list={list} store={store} xHasTimeOfDay={false} />;
		};

		const renderInList = (store: ChartStore) =>
			render(
				<ChartListPrimitive slotName="chart-list">
					<ListedAnnouncer store={store} />
				</ChartListPrimitive>,
			);

		test("a data update under a parked cursor leaves the shared region as it is", async () => {
			const store = new ChartStore();
			renderInList(store);
			publish(store, keyboardStep(1));
			await advance(120);
			// Equal values in a new object: what an ingest publishes under a parked cursor.
			publish(store, keyboardStep(1));
			expect(screen.getByRole("status").textContent).toBe("b1. p50: 120");
		});

		test("a step to another datum empties the shared region until its announcement", async () => {
			const store = new ChartStore();
			renderInList(store);
			const region = screen.getByRole("status");
			publish(store, keyboardStep(0));
			await advance(120);
			expect(region.textContent).toBe("b0. p50: 120");
			publish(store, keyboardStep(1));
			expect(region).toBeEmptyDOMElement();
			await advance(120);
			expect(region.textContent).toBe("b1. p50: 120");
		});
	});

	describe("text", () => {
		/** Register the formats of a Tooltip part, as `useTooltipPrimitive` does. */
		const registerFormats = (
			store: ChartStore,
			formats: Partial<Pick<TooltipConfig, "labelFormat" | "valueFormat">>,
		): void => {
			store.registerTooltip({
				labelFormat: undefined,
				valueFormat: undefined,
				indicator: "line",
				footer: undefined,
				children: undefined,
				divProps: {},
				...formats,
			});
		};

		/** The text the announcer holds once the wait after a keyboard step ends. */
		const announcementOf = async (
			store: ChartStore,
			hover: HoverSnapshot,
		): Promise<string | null> => {
			render(<ChartAnnouncer store={store} xHasTimeOfDay={false} />);
			publish(store, hover);
			await advance(120);
			return screen.getByRole("status").textContent;
		};

		/** A keyboard step on a stacked chart: two series from the top down, and their total. */
		const stackedStep: HoverSnapshot = {
			index: 1,
			xValue: "b1",
			datum: {},
			points: [
				{ dataKey: "p99", label: "p99", value: 480, color: "var(--color-chart-pink)" },
				{ dataKey: "p50", label: "p50", value: 120, color: "var(--color-chart-blue)" },
			],
			total: 600,
			viaKeyboard: true,
		};

		test("a valueFormat that returns a string reaches the announcement", async () => {
			const store = new ChartStore();
			registerFormats(store, { valueFormat: (value) => `${value}ms` });
			expect(await announcementOf(store, keyboardStep(1))).toBe("b1. p50: 120ms");
		});

		test("a valueFormat that returns a number reaches the announcement", async () => {
			const store = new ChartStore();
			registerFormats(store, { valueFormat: (value) => value / 1000 });
			expect(await announcementOf(store, keyboardStep(1))).toBe("b1. p50: 0.12");
		});

		test("a valueFormat that returns an element keeps the default text", async () => {
			const store = new ChartStore();
			registerFormats(store, { valueFormat: (value) => <b>{value}ms</b> });
			expect(await announcementOf(store, keyboardStep(1))).toBe("b1. p50: 120");
		});

		test("a labelFormat that returns a string reaches the announcement", async () => {
			const store = new ChartStore();
			registerFormats(store, { labelFormat: (value) => `Bucket ${String(value)}` });
			expect(await announcementOf(store, keyboardStep(1))).toBe("Bucket b1. p50: 120");
		});

		test("a stacked chart announces the Total first, as the tooltip shows it", async () => {
			expect(await announcementOf(new ChartStore(), stackedStep)).toBe(
				"b1. Total: 600, p99: 480, p50: 120",
			);
		});

		test("the Total passes through valueFormat under the key 'total'", async () => {
			const store = new ChartStore();
			registerFormats(store, {
				valueFormat: (value, dataKey) => (dataKey === "total" ? `${value}ms in all` : `${value}ms`),
			});
			expect(await announcementOf(store, stackedStep)).toBe(
				"b1. Total: 600ms in all, p99: 480ms, p50: 120ms",
			);
		});
	});
});
