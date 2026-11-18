import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { engageChart } from "../../test-utils/engage-chart.js";
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

	test("a longitudeKey that no row carries throws with the WorldMap prop name", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<WorldMap.Root<Record<string, unknown>>
					data={agents}
					longitudeKey="lng"
					aria-label="Agents"
				>
					<WorldMap.Point latitudeKey="online" color="blue" />
				</WorldMap.Root>,
			),
		).toThrow('WorldMap.Root longitudeKey "lng" does not match any key');
	});

	test("a latitudeKey that no row carries throws with the WorldMap prop name", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<WorldMap.Root data={agents} longitudeKey="longitude" aria-label="Agents">
					<WorldMap.Point latitudeKey="lat" color="blue" />
				</WorldMap.Root>,
			),
		).toThrow('WorldMap.Point latitudeKey "lat" does not match any key');
	});

	test("a sizeKey that no row carries throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<WorldMap.Root<Record<string, unknown>>
					data={agents}
					longitudeKey="longitude"
					sizeKey="count"
					aria-label="Agents"
				>
					<WorldMap.Point latitudeKey="online" color="blue" />
				</WorldMap.Root>,
			),
		).toThrow('WorldMap.Root sizeKey "count" does not match any key');
	});
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
			expect(status).toHaveTextContent("sfo-edge-1, 37.8° N, 122.4° W. Online");
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
		const status = await screen.findByRole("status");
		expect(status.textContent).not.toContain("NaN");
	});

	test("Enter activates the point with its row and its longitude as the x value", async () => {
		const user = userEvent.setup();
		const onDatumActivate = vi.fn<(event: ChartDatumEvent) => void>();
		renderMap({ onDatumActivate });
		await user.tab();
		await user.keyboard("{ArrowRight}{Enter}");
		expect(onDatumActivate).toHaveBeenCalledWith({
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

	test('indicator="none" drops the series color key', async () => {
		const user = userEvent.setup();
		render(
			<WorldMap.Root data={agents} longitudeKey="longitude" aria-label="Agents">
				<WorldMap.Point latitudeKey="online" color="blue" label="Online" />
				<WorldMap.Tooltip indicator="none" />
			</WorldMap.Root>,
		);
		await user.tab();
		await user.keyboard("{ArrowRight}");
		const tooltip = document.querySelector('[data-slot="world-map-tooltip"]');
		expect(tooltip?.querySelector("[aria-hidden]")).toBeNull();
		expect(tooltip).toHaveTextContent("Online");
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
		expect(callout).toHaveClass("invisible", "w-48");
		// The map props stay off the DOM.
		expect(document.querySelector('[data-slot="world-map"]')).not.toHaveAttribute("bounds");
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
		expect(link).toHaveClass("underline", "w-48", "invisible");
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
	expect(() =>
		view.rerender(sizedMap([{ longitude: 0, latitude: 0, total: 2 }], "total")),
	).not.toThrow();
});
