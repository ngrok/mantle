import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { engageChart } from "../../test-utils/engage-chart.js";
import { createIntersectionObserverStub } from "../../test-utils/mock-intersection-observer.js";
import type { ChartDatumEvent } from "./world-map.js";
import { WorldMap } from "./world-map.js";

// Rows out of west-to-east order, so the tests see the map sort them.
const agents = [
	{ name: "fra-edge-1", longitude: 8.68, online: 50.11, offline: null, sessions: 30 },
	{ name: "sfo-edge-1", longitude: -122.42, online: 37.77, offline: null, sessions: 12 },
	{ name: "syd-edge-1", longitude: 151.21, online: null, offline: -33.87, sessions: 4 },
];

const renderMap = (extraRootProps: Record<string, unknown> = {}) =>
	render(
		<WorldMap.Root
			data={agents}
			longitudeKey="longitude"
			labelKey="name"
			aria-label="Agents by location"
			{...extraRootProps}
		>
			<WorldMap.Graticule />
			<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
			<WorldMap.Point latitudeKey="offline" color="blue" label="Offline" />
			<WorldMap.Tooltip />
			<WorldMap.Legend />
		</WorldMap.Root>,
	);

const tooltipText = () =>
	document.querySelector('[data-slot="world-map-tooltip"]')?.textContent ?? "";

describe("WorldMap.Root", () => {
	test("renders a labelled overlay that the description names as a world map", () => {
		renderMap();
		const overlay = screen.getByRole("application", { name: "Agents by location" });
		const description = document.getElementById(overlay.getAttribute("aria-describedby") ?? "");
		expect(description).toHaveAttribute("data-slot", "world-map-description");
		expect(description?.textContent).toContain("World map with 3 points.");
		expect(description?.textContent).toContain("from west to east");
	});

	test("forwards className, ref, and data-* props to the root element", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(
			<WorldMap.Root
				data={agents}
				longitudeKey="longitude"
				labelKey="name"
				sizeKey="sessions"
				bounds={{ west: -130, south: -40, east: 160, north: 60 }}
				aria-label="Agents by location"
				className="custom-class"
				data-testid="map-root"
				ref={ref}
			>
				<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
			</WorldMap.Root>,
		);
		const root = container.querySelector('[data-slot="world-map"]');
		expect(root).toHaveClass("custom-class");
		expect(root).toHaveAttribute("data-testid", "map-root");
		expect(ref.current).toBe(root);
		// The map props configure the map; none reaches the DOM as an attribute.
		for (const name of ["longitudeKey", "labelKey", "sizeKey", "bounds"]) {
			expect(root).not.toHaveAttribute(name);
		}
	});
});

/** One map for each key prop, with a key that no row carries. */
const keyTypos = [
	{
		prop: "longitudeKey",
		map: (
			<WorldMap.Root<Record<string, unknown>> data={agents} longitudeKey="lng" aria-label="Agents">
				<WorldMap.Point latitudeKey="online" color="blue" />
			</WorldMap.Root>
		),
		message: 'WorldMap.Root longitudeKey "lng" does not match any key',
	},
	{
		prop: "latitudeKey",
		map: (
			<WorldMap.Root data={agents} longitudeKey="longitude" aria-label="Agents">
				<WorldMap.Point latitudeKey="lat" color="blue" />
			</WorldMap.Root>
		),
		message: 'WorldMap.Point latitudeKey "lat" does not match any key',
	},
	{
		prop: "sizeKey",
		map: (
			<WorldMap.Root<Record<string, unknown>>
				data={agents}
				longitudeKey="longitude"
				sizeKey="count"
				aria-label="Agents"
			>
				<WorldMap.Point latitudeKey="online" color="blue" />
			</WorldMap.Root>
		),
		message: 'WorldMap.Root sizeKey "count" does not match any key',
	},
];

// Why the second path has no observer, and not one that reports in view: a typo that
// throws inside `observe()` leaves the shared observers in place. A dormant stub that a
// later test installs then observes no map.
describe.each([
	{ state: "a dormant map", dormant: true },
	{ state: "a map with no IntersectionObserver", dormant: false },
])("WorldMap key typos on $state", ({ dormant }) => {
	test.each(keyTypos)(
		"a $prop that no row carries throws with the WorldMap prop name",
		({ map, message }) => {
			// A dormant map checks its keys in the mount commit. With no observer, a map builds
			// its engine at mount, and the engine's ingest checks them.
			vi.stubGlobal(
				"IntersectionObserver",
				dormant ? createIntersectionObserverStub({ intersecting: false }).Observer : undefined,
			);
			vi.spyOn(console, "error").mockImplementation(() => {});
			expect(() => render(map)).toThrow(message);
		},
	);
});

describe("WorldMap data table", () => {
	test("lists one row per point from west to east, with its name, series, and coordinates", () => {
		renderMap();
		engageChart();
		expect(screen.getByRole("table")).toHaveAccessibleName("Agents by location: map data.");
		const rows = screen.getAllByRole("row").slice(1);
		expect(rows.map((row) => row.textContent)).toEqual([
			"sfo-edge-1Online37.77-122.42",
			"fra-edge-1Online50.118.68",
			"syd-edge-1Offline-33.87151.21",
		]);
		expect(screen.getByRole("cell", { name: "-122.42" })).toHaveAttribute("data-value", "-122.42");
	});

	test("adds a column with each point's size value when the map has a sizeKey", () => {
		renderMap({ sizeKey: "sessions" });
		engageChart();
		expect(screen.getByRole("columnheader", { name: "sessions" })).toBeInTheDocument();
		const rows = screen.getAllByRole("row").slice(1);
		expect(rows.map((row) => row.lastElementChild?.textContent)).toEqual(["12", "30", "4"]);
	});

	test("names a point by its coordinates when the map has no labelKey", () => {
		renderMap({ labelKey: undefined });
		engageChart();
		expect(screen.getByRole("rowheader", { name: "37.8° N, 122.4° W" })).toBeInTheDocument();
	});

	test("an aria-labelledby that names an ancestor of the map resolves without the table text", async () => {
		const user = userEvent.setup();
		render(
			<section id="agents-card">
				<h2>Agents</h2>
				<WorldMap.Root
					data={agents}
					longitudeKey="longitude"
					labelKey="name"
					aria-labelledby="agents-card"
				>
					<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
				</WorldMap.Root>
			</section>,
		);
		// Focus mounts the table, whose caption sits inside the named ancestor.
		await user.tab();
		const caption = document.querySelector('[data-slot="world-map-data-table"] caption');
		expect(caption?.textContent).toMatch(/^Agents.*: map data\.$/);
		// A column header is table text: the table holds it, and the caption does not.
		expect(screen.getByRole("columnheader", { name: "Latitude" })).toBeInTheDocument();
		expect(caption?.textContent).not.toContain("Latitude");
	});
});

describe("WorldMap keyboard interaction", () => {
	test("arrow keys step from west to east and the tooltip names each point", async () => {
		const user = userEvent.setup();
		renderMap();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(tooltipText()).toBe("sfo-edge-137.8° N, 122.4° WOnline");
		await user.keyboard("{ArrowRight}");
		expect(tooltipText()).toContain("fra-edge-1");
		await user.keyboard("{End}");
		expect(tooltipText()).toBe("syd-edge-133.9° S, 151.2° EOffline");
	});

	test("with a sizeKey, the tooltip and the announcement give the size value", async () => {
		const user = userEvent.setup();
		renderMap({ sizeKey: "sessions" });
		await user.tab();
		await user.keyboard("{ArrowRight}");
		expect(tooltipText()).toBe("sfo-edge-137.8° N, 122.4° Wsessions: 12Online");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status).toHaveTextContent("sfo-edge-1, 37.8° N, 122.4° W. Online, sessions: 12");
		});
	});

	test("each step announces the name, the coordinates, and the series", async () => {
		const user = userEvent.setup();
		renderMap();
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const status = await screen.findByRole("status");
		await vi.waitFor(() => {
			expect(status.textContent).toBe("sfo-edge-1, 37.8° N, 122.4° W. Online");
		});
	});

	test("the keyboard skips a row with no latitude in any series", async () => {
		const user = userEvent.setup();
		const unplaced = { name: "home-lab", longitude: 0, online: null, offline: null, sessions: 1 };
		renderMap({ data: [...agents, unplaced] });
		await user.tab();
		await user.keyboard("{ArrowRight}{ArrowRight}");
		// home-lab sits between sfo-edge-1 (122.4° W) and fra-edge-1 (8.7° E) from west to east.
		expect(tooltipText()).toContain("fra-edge-1");
		await user.keyboard("{ArrowLeft}");
		expect(tooltipText()).toContain("sfo-edge-1");
	});

	// Why these two keys: each lands on a row with no point, and must search toward the
	// west. A search toward the east finds no point after sea-cable, and goes from home-lab
	// back to fra-edge-1.
	test.each([
		{ key: "End", keys: "{End}", lands: "syd-edge-1" },
		{ key: "Page Down", keys: "{ArrowRight}{ArrowRight}{PageDown}", lands: "sfo-edge-1" },
	])("$key skips a row with no point toward the west", async ({ keys, lands }) => {
		const user = userEvent.setup();
		// From west to east: sfo-edge-1, home-lab, fra-edge-1, syd-edge-1, sea-cable.
		const unplaced = [
			{ name: "home-lab", longitude: 0, online: null, offline: null, sessions: 1 },
			{ name: "sea-cable", longitude: 170, online: null, offline: null, sessions: 1 },
		];
		renderMap({ data: [...agents, ...unplaced] });
		await user.tab();
		await user.keyboard(keys);
		expect(tooltipText()).toContain(lands);
	});

	describe("after new rows", () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		test("a row with no point under the keyboard cursor is not announced", async () => {
			const user = userEvent.setup();
			// The new westernmost row has no latitude, and it takes the cursor's place.
			const pending = { name: "pending", longitude: -130, online: null, offline: null };
			const map = (data: ReadonlyArray<(typeof agents)[number] | typeof pending>) => (
				<WorldMap.Root
					data={data}
					longitudeKey="longitude"
					labelKey="name"
					aria-label="Agents by location"
				>
					<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
				</WorldMap.Root>
			);
			const view = render(map(agents));
			await user.tab();
			await user.keyboard("{ArrowRight}");
			const status = await screen.findByRole("status");
			await vi.waitFor(() => {
				expect(status).toHaveTextContent("sfo-edge-1");
			});
			vi.useFakeTimers({ shouldAdvanceTime: true });
			view.rerender(map([...agents, pending]));
			// Longer than the wait before the live region speaks.
			await vi.advanceTimersByTimeAsync(300);
			expect(status).toBeEmptyDOMElement();
		});
	});

	test("Enter activates the point with its row and its longitude as the x value", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		renderMap({ onDatumActivate });
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		expect(onDatumActivate).toHaveBeenCalledTimes(1);
		expect(onDatumActivate).toHaveBeenLastCalledWith({
			index: 1,
			xValue: -122.42,
			datum: agents[1],
			dataKey: null,
		});
	});
});

describe("WorldMap.Tooltip", () => {
	test("the render-prop children replaces the readout inside a label wrapper", async () => {
		const user = userEvent.setup();
		render(
			<WorldMap.Root data={agents} longitudeKey="longitude" aria-label="Agents">
				<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
				<WorldMap.Tooltip>{({ index }) => `Row ${index}`}</WorldMap.Tooltip>
			</WorldMap.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const label = document.querySelector('[data-slot="world-map-tooltip-label"]');
		expect(label).toHaveTextContent("Row 1");
	});

	// Why one table: the same query reads the color key as present and as absent.
	test.each([
		{
			name: "the default indicator keys the series name with a color dot",
			indicator: undefined,
			dots: 1,
		},
		{ name: 'indicator="none" drops the series color key', indicator: "none", dots: 0 },
	] as const)("$name", async ({ indicator, dots }) => {
		const user = userEvent.setup();
		render(
			<WorldMap.Root data={agents} longitudeKey="longitude" aria-label="Agents">
				<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
				<WorldMap.Tooltip indicator={indicator} />
			</WorldMap.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="world-map-tooltip"]');
		expect(tooltip?.querySelectorAll("[aria-hidden]")).toHaveLength(dots);
		expect(tooltip).toHaveTextContent("Online");
	});

	test("a controlled activeIndex on a row with no point shows an empty readout", () => {
		const unplaced = { name: "home-lab", longitude: 0, online: null, offline: null, sessions: 1 };
		renderMap({ data: [...agents, unplaced], activeIndex: 3 });
		// The surface mounts for the active row. Its readout has no place to name, so it renders nothing.
		expect(document.querySelector('[data-slot="world-map-tooltip"]')).toBeEmptyDOMElement();
	});
});

describe("WorldMap.Legend", () => {
	test("names each series beside its glyph", () => {
		renderMap();
		const legend = document.querySelector('[data-slot="world-map-legend"]');
		expect(legend).toHaveTextContent("Online");
		expect(legend).toHaveTextContent("Offline");
		expect(legend?.querySelectorAll("[data-shape]")).toHaveLength(2);
	});
});

describe("WorldMap.Callout and WorldMap.Connector", () => {
	const client = { longitude: -87.63, latitude: 41.88 };
	const pop = { longitude: -82.99, latitude: 39.96 };

	test("a callout is page content, hidden until the map places it", () => {
		render(
			<WorldMap.Root
				data={agents}
				longitudeKey="longitude"
				bounds={{ west: -105, south: 30, east: -65, north: 50 }}
				aria-label="Client location"
			>
				<WorldMap.Point latitudeKey="online" color="blue" />
				<WorldMap.Connector from={client} to={pop} />
				<WorldMap.Callout {...client} side="bottom" className="w-48">
					Chicago, Illinois, United States
				</WorldMap.Callout>
			</WorldMap.Root>,
		);
		const callout = screen.getByText("Chicago, Illinois, United States");
		expect(callout).toHaveAttribute("data-slot", "world-map-callout");
		expect(callout).toHaveAttribute("data-side", "bottom");
		expect(callout).toHaveClass("w-48");
		// Why the class: a cross-file spelling pin (docs/testing.md). `GeoView` shows a placed callout
		// with an inline `visibility`, which overrides `invisible` but not `hidden` or `opacity-0`.
		expect(callout).toHaveClass("invisible");
	});

	test("a part outside WorldMap.Root throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<WorldMap.Connector from={client} to={pop} />)).toThrow(
			"WorldMap.Connector must be composed inside WorldMap.Root.",
		);
		expect(() => render(<WorldMap.Callout {...client}>Chicago</WorldMap.Callout>)).toThrow(
			"WorldMap.Callout must be composed inside WorldMap.Root.",
		);
	});

	test("bounds whose west is not less than its east throw", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => renderMap({ bounds: { west: 170, south: -50, east: -170, north: 10 } })).toThrow(
			"WorldMap.Root bounds.west must be less than bounds.east.",
		);
	});
});

describe("WorldMap.Callout asChild", () => {
	test("renders the child with the callout's slot, classes, and ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<WorldMap.Root data={agents} longitudeKey="longitude" aria-label="Agents">
				<WorldMap.Point latitudeKey="online" color="blue" />
				<WorldMap.Callout
					asChild
					longitude={8.68}
					latitude={50.11}
					className="w-48"
					data-testid="callout"
					ref={ref}
				>
					<a href="/clients/fra" className="underline">
						Frankfurt
					</a>
				</WorldMap.Callout>
			</WorldMap.Root>,
		);
		const link = screen.getByRole("link", { name: "Frankfurt" });
		expect(link).toHaveAttribute("data-slot", "world-map-callout");
		expect(link).toHaveAttribute("data-side", "top");
		expect(link).toHaveAttribute("data-testid", "callout");
		expect(link).toHaveClass("underline", "w-48");
		// Why the class: the same cross-file spelling pin as the plain callout (docs/testing.md).
		// The child starts hidden, and `GeoView` shows it with an inline `visibility`.
		expect(link).toHaveClass("invisible");
		expect(ref.current).toBe(link);
	});
});

test("a new labelKey keeps the map's paint surface", () => {
	const view = renderMap();
	engageChart();
	const surface = document.querySelector('[data-slot="world-map-canvas"]');
	expect(surface).not.toBeNull();
	view.rerender(
		<WorldMap.Root
			data={agents}
			longitudeKey="longitude"
			labelKey="sessions"
			aria-label="Agents by location"
		>
			<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
		</WorldMap.Root>,
	);
	expect(document.querySelector('[data-slot="world-map-canvas"]')).toBe(surface);
});

test("data and a sizeKey that change together re-render an engaged map", () => {
	const sizedMap = (data: readonly Record<string, unknown>[], sizeKey: string) => (
		<WorldMap.Root<Record<string, unknown>>
			data={data}
			longitudeKey="longitude"
			sizeKey={sizeKey}
			aria-label="Agents"
		>
			<WorldMap.Point latitudeKey="latitude" color="blue" />
		</WorldMap.Root>
	);
	const view = render(sizedMap([{ longitude: 0, latitude: 0, count: 1 }], "count"));
	engageChart();
	view.rerender(sizedMap([{ longitude: 0, latitude: 0, total: 2 }], "total"));
	expect(screen.getByRole("columnheader", { name: "total" })).toBeInTheDocument();
	expect(screen.getByRole("cell", { name: "2" })).toHaveAttribute("data-value", "2");
});
