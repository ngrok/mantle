"use client";

import type { ComponentProps, ReactNode } from "react";
import {
	createContext,
	use,
	useCallback,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import invariant from "tiny-invariant";
import { useComposedRefs } from "../../utils/compose-refs/use-composed-refs.js";
import type { WithAsChild } from "../../types/as-child.js";
import { cx } from "../../utils/cx/cx.js";
import type { WithDataSlot } from "../../utils/data-slot.js";
import { joinDataSlot } from "../../utils/data-slot.js";
import type { ChartDataTableProps } from "../chart/a11y.js";
import { CHART_TABLE_ROW_LIMIT, useResolvedChartLabel } from "../chart/a11y.js";
import { createCanvasBackend } from "../chart/canvas-backend.js";
import type { ChartAccessibilityProps, ChartMode, ChartReadout } from "../chart/context.js";
import { useStoreSeries } from "../chart/context.js";
import { datumValue } from "../chart/datum.js";
import { observeResize } from "../chart/environment.js";
import { formatNumber } from "../chart/format.js";
import type { GeoBounds, GeoPlace } from "../chart/geo.js";
import { formatCoordinates } from "../chart/geo.js";
import { GeoScene } from "../chart/geo-view.js";
import { ChartLegendPrimitive } from "../chart/legend.js";
import type { LegendPrimitiveProps } from "../chart/legend.js";
import { useGridPrimitive, useSeriesPrimitive } from "../chart/registration.js";
import { ChartRootPrimitive } from "../chart/root.js";
import type { ChartRootBaseProps } from "../chart/root.js";
import { useTooltipPrimitive } from "../chart/tooltip.js";
import type { TooltipPrimitiveProps } from "../chart/tooltip.js";
import type {
	ChartDatum,
	ChartDatumEvent,
	HoverSnapshot,
	PointShape,
	SeriesColor,
} from "../chart/types.js";
import { Slot } from "../slot/index.js";
import { WORLD_LAND } from "./world-land.js";

/**
 * Props for {@link WorldMap.Root}. Each row is one place: a longitude on the
 * Root, and a latitude per composed `WorldMap.Point` series. Rows without a
 * finite longitude are not plotted.
 */
type WorldMapRootProps<
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
> = Omit<ChartRootBaseProps, "stacked"> &
	ChartAccessibilityProps<TMode> & {
		/** Rows of data; each row is one point per composed `WorldMap.Point` series. */
		data: readonly TDatum[];
		/**
		 * The key of each row's longitude, in degrees east (−180 to 180). If no
		 * row has the key, the Root throws.
		 */
		longitudeKey: Extract<keyof TDatum, string>;
		/**
		 * The key of each row's name, such as an agent's hostname. The tooltip,
		 * the keyboard announcement, and the data table read it. A row without a
		 * name reads as its coordinates. When omitted, every point reads as its
		 * coordinates.
		 */
		labelKey?: Extract<keyof TDatum, string>;
		/**
		 * The key of each row's size value, such as how many agents share the
		 * place. A point's area follows the value: the largest value gets a 16px
		 * radius, and no point shrinks below 4px, so the smallest stays a target.
		 * Rows without a positive value take 4px. Larger points paint first, so
		 * a small point on top of a large one stays visible. Past 5,000 points
		 * the points lose their 2px surface ring, so a small point shows on a
		 * large one only when their colors differ. If no row has the key, the
		 * Root throws.
		 */
		sizeKey?: Extract<keyof TDatum, string>;
		/**
		 * The region the map shows, in degrees, such as the area around one
		 * client. The region fills the plot and keeps its shape, so the plot
		 * shows more of the map on its loose side. Points, connectors, and
		 * callouts outside the plot do not show, and the keyboard cursor skips
		 * those points. The data table still lists them. The map ends at the
		 * antimeridian, so a region that reaches past ±180° stops there. `west`
		 * must be less than `east`. When omitted, the map shows the whole world.
		 *
		 * @example
		 * ```tsx
		 * <WorldMap.Root bounds={{ west: -15, south: 35, east: 35, north: 62 }} … />
		 * ```
		 */
		bounds?: GeoBounds;
	};

/**
 * Props for {@link WorldMap.Point}.
 */
type WorldMapPointProps = {
	/**
	 * The row key this series reads its latitudes from, in degrees north (−90
	 * to 90). If no row has the key, the map throws, so put the key in every
	 * row, with `null` for a row that is not in this series.
	 */
	latitudeKey: string;
	/** Display name for the legend, tooltip, and data table. Defaults to `latitudeKey`. */
	label?: string;
	/**
	 * The color the series paints: a mantle color name, the same `Color` that
	 * `Badge` takes, or any CSS color. Required: name every series' color on
	 * purpose. A series that means good or bad, such as a blocklisted agent,
	 * takes a functional color such as `"danger"`.
	 */
	color: SeriesColor;
	/**
	 * The glyph this series' points wear, mirrored by the legend key and the
	 * hover dot. Shape keeps series apart without color vision.
	 *
	 * @default "circle"
	 */
	shape?: PointShape;
};

/**
 * Props for {@link WorldMap.Connector}.
 */
type WorldMapConnectorProps = {
	/** The place the line starts, in degrees. */
	from: GeoPlace;
	/** The place the line ends, in degrees. */
	to: GeoPlace;
	/**
	 * The line color: a mantle color name or any CSS color.
	 *
	 * @default "neutral"
	 */
	color?: SeriesColor;
	/**
	 * Whether the line is dashed or solid.
	 *
	 * @default "dashed"
	 */
	lineStyle?: "dashed" | "solid";
};

/**
 * Props for {@link WorldMap.Callout}.
 */
type WorldMapCalloutProps = Omit<ComponentProps<"div">, "children"> &
	WithAsChild &
	WithDataSlot &
	GeoPlace & {
		/**
		 * Which side of the place the callout sits on. When that side has no
		 * room, the callout flips to the other side; near the plot's edge it
		 * moves to stay inside the plot.
		 *
		 * @default "top"
		 */
		side?: "top" | "bottom";
		children: ReactNode;
	};

/**
 * Props for {@link WorldMap.Tooltip}.
 */
type WorldMapTooltipProps = Omit<
	TooltipPrimitiveProps,
	"labelFormat" | "valueFormat" | "indicator"
> & {
	/**
	 * The series color key beside each series name: a dot (default) or nothing.
	 *
	 * @default "dot"
	 */
	indicator?: "dot" | "none";
};

/**
 * Props for {@link WorldMap.Legend}.
 */
type WorldMapLegendProps = LegendPrimitiveProps;

/**
 * The root of a world map: owns the data, the Robinson projection, the canvas
 * renderer, and the whole interaction contract (the tooltip, keyboard
 * stepping from west to east with polite announcements, an sr-only
 * description, an sr-only data table, Enter/Space + click activation).
 * Hovering hits the nearest point within 24px. With `sizeKey`, a pointer over
 * a point hits the top point there, not a neighbor with a nearer center. The
 * keyboard cursor skips a row that has no point in the plot. Such a row has
 * no latitude in any series, or, with `bounds`, its point is outside the plot.
 *
 * A Root mounts dormant: a shell of the plot, the named overlay, and its
 * sr-only description. It builds its canvas once it comes within one viewport
 * of the visible area, takes focus, or prints, and it mounts the sr-only data
 * table once focus lands inside it.
 *
 * **Live data.** Pass new rows whenever they arrive. A point at a place its
 * series did not have gets one ring that starts at the point's edge, grows,
 * and fades in 900ms. A moved point is a new place. A point that changes
 * series at one place, such as an agent that goes offline, gets a ring too.
 * The map plays no ring:
 *
 * - under reduced motion, or with `animate={false}`
 * - while it is off screen
 * - for its first rows
 * - for an update that adds more than 48 places
 * - when it has more than 5,000 rows
 *
 * At most 48 rings run at one time.
 *
 * The Root's own subtree is addressable by slot: `world-map` on the wrapper,
 * then `world-map-plot`, `world-map-canvas`, `world-map-crosshair`,
 * `world-map-hover-band`, `world-map-markers`, `world-map-tooltip`,
 * `world-map-description`, and, once focus lands inside the map,
 * `world-map-data-table`. A world map shows one marker dot on the hit point,
 * and never the crosshair or the band. That dot carries `chart-active-point`
 * plus a `data-shape` of `"circle"`, `"square"`, `"triangle"`, `"diamond"`,
 * `"triangle-down"`, `"plus"`, `"cross"`, or `"star"`, naming the glyph its
 * series wears. The canvas and the three hover layers are engine-owned:
 * absent from server HTML and from a dormant map. The canvas arrives at
 * activation, and the layers arrive on the first hover or keyboard step.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"world-map-description"` | The `sr-only` description the overlay's `aria-describedby` points at: the point count, the series labels, and, on an interactive map, the keyboard instructions. Omitted when `mode="decorative"`. |
 * | `data-slot` | `"world-map-data-table"` | The `sr-only` data table: one row for each of the first 150 points from west to east, with its name, series, latitude, longitude, and, with `sizeKey`, its size value. Mounts once focus lands inside the map (`data-engaged` appears) and stays. Interactive maps only. |
 * | `data-engaged` | present once engaged | On the Root. Appears once focus lands inside the map, and never goes away. Interactive maps only. |
 * | `data-value` | a number | On the latitude, longitude, and finite size cells of the `sr-only` data table. The raw number. The name row header has none. |
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--world-map-land-color` | `var(--color-neutral-200)` | The land fill. |
 * | `--world-map-ocean-color` | `var(--color-neutral-50)` | The fill inside the world's outline. |
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmaproot
 *
 * @example
 * ```tsx
 * const agents = [
 *   { name: "sfo-edge-1", longitude: -122.42, latitude: 37.77, sessions: 12 },
 *   { name: "fra-edge-1", longitude: 8.68, latitude: 50.11, sessions: 30 },
 *   { name: "syd-edge-1", longitude: 151.21, latitude: -33.87, sessions: 4 },
 * ];
 *
 * <WorldMap.Root
 *   data={agents}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   sizeKey="sessions"
 *   aria-label="Agents by location"
 * >
 *   <WorldMap.Graticule />
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" color="blue" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum, TMode extends ChartMode = "interactive">(
	props: WorldMapRootProps<TDatum, TMode>,
) => {
	const { longitudeKey, labelKey, sizeKey, bounds, children } = props;
	const { west, south, east, north }: Partial<GeoBounds> = bounds ?? {};
	invariant(
		west == null || east == null || west < east,
		"WorldMap.Root bounds.west must be less than bounds.east.",
	);
	// Why the bounds in the initializer: the chart Root's layout effects run
	// before this component's, and its first paint reads the region.
	const [scene] = useState(() => new GeoScene(WORLD_LAND, bounds ?? null));
	const readout = useMemo(() => mapReadout(labelKey, sizeKey), [labelKey, sizeKey]);
	useLayoutEffect(() => {
		scene.setBounds(
			west == null || south == null || east == null || north == null
				? null
				: { west, south, east, north },
		);
	}, [scene, west, south, east, north]);
	return (
		// Why no destructure: a rest over the `mode` union loses the union, and the props stop type-checking.
		<ChartRootPrimitive
			{...props}
			kind="scatter"
			componentName="WorldMap"
			slotName="world-map"
			paintBackend={createCanvasBackend}
			scatterView={scene.createView}
			readout={readout}
			xKey={longitudeKey}
			xScale="linear"
			// Why 2:1: the Robinson world is 1.97 times as wide as it is tall.
			className={cx("aspect-2/1", props.className)}
		>
			<GeoSceneContext value={scene}>{children}</GeoSceneContext>
		</ChartRootPrimitive>
	);
};

/**
 * One point series. Renders nothing itself: it registers the series with the
 * map, which paints its points on canvas over the land.
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmappoint
 *
 * @example
 * ```tsx
 * <WorldMap.Root
 *   data={agents}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   sizeKey="sessions"
 *   aria-label="Agents by location"
 * >
 *   <WorldMap.Graticule />
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" color="blue" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Point = ({ latitudeKey, ...props }: WorldMapPointProps) =>
	useSeriesPrimitive("WorldMap.Point", "scatter", { ...props, dataKey: latitudeKey });

/**
 * Meridians and parallels every 30°, painted on canvas under the land
 * (renderless). Omit the part to omit the graticule.
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmapgraticule
 *
 * @example
 * ```tsx
 * <WorldMap.Root
 *   data={agents}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   sizeKey="sessions"
 *   aria-label="Agents by location"
 * >
 *   <WorldMap.Graticule />
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" color="blue" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Graticule = () => useGridPrimitive("WorldMap.Graticule", {});

/**
 * Customizes the hover/keyboard tooltip readout. The tooltip itself is part
 * of `WorldMap.Root`'s interaction contract and renders even when this part
 * is absent. The default readout names the point (its `labelKey` value, else
 * its coordinates), then its coordinates, its size value when the map has a
 * `sizeKey`, and its series. Compose this part to append a footer, or replace
 * the readout through the render-prop `children`, which receives the hovered
 * row as `datum`.
 *
 * **Structure.** A `children` readout renders inside a
 * `<div data-slot="world-map-tooltip-label">`. When it goes away, React
 * removes that div instead of your own text nodes: a browser translation
 * engine reparents a text node, and a removal aimed at one throws. The div is
 * `display: contents`, so it lays out nothing of its own.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"world-map-tooltip-label"` | On the `<div>` wrapping a `children` readout. The default readout has none. |
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmaptooltip
 *
 * @example
 * ```tsx
 * <WorldMap.Root
 *   data={agents}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   sizeKey="sessions"
 *   aria-label="Agents by location"
 * >
 *   <WorldMap.Graticule />
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" color="blue" />
 *   <WorldMap.Tooltip footer="Select a point to open the agent" />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Tooltip = ({ indicator, ...props }: WorldMapTooltipProps) =>
	useTooltipPrimitive("WorldMap.Tooltip", {
		...props,
		indicator: indicator === "none" ? "none" : "line",
	});

/**
 * The legend: series names keyed by their point glyphs, rendered as real DOM
 * in flow below the map. Compose it on every map with more than one series,
 * so identity never relies on color alone. It renders nothing for a single
 * series.
 *
 * **Structure.** A `children` render prop renders inside a
 * `<div data-slot="world-map-legend-label">`, which is `display: contents`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"world-map-legend"` | The legend list. |
 * | `data-slot` | `"world-map-legend-label"` | On the `<div>` wrapping a `children` render prop. The default legend has none. |
 * | `data-shape` | `"circle"` \| `"square"` \| `"triangle"` \| `"diamond"` \| `"triangle-down"` \| `"plus"` \| `"cross"` \| `"star"` | On each series' swatch, naming the glyph its `WorldMap.Point` wears. |
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmaplegend
 *
 * @example
 * ```tsx
 * <WorldMap.Root
 *   data={agents}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   aria-label="Agents by status"
 * >
 *   <WorldMap.Graticule />
 *   <WorldMap.Point latitudeKey="online" label="Online" color="success" />
 *   <WorldMap.Point latitudeKey="offline" label="Offline" color="neutral" shape="square" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Legend = (props: WorldMapLegendProps) => (
	<ChartLegendPrimitive partName="WorldMap.Legend" slotName="world-map" {...props} />
);

/** The scene of the nearest `WorldMap.Root`, which its Connector and Callout parts register with. */
const GeoSceneContext = createContext<GeoScene | null>(null);

const useGeoScene = (partName: string): GeoScene => {
	const scene = use(GeoSceneContext);
	invariant(scene != null, `${partName} must be composed inside WorldMap.Root.`);
	return scene;
};

/**
 * A line between two places, such as from a client to the ngrok edge that
 * received its request. It follows the great circle, the shortest route on
 * the globe, and paints on canvas under the points (renderless). Where the
 * line crosses the antimeridian, it runs to the edge of the map and starts
 * again at the opposite edge. The line is decoration: name both places with
 * points or a callout, so a reader who cannot see the line gets the same
 * facts.
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmapconnector
 *
 * @example
 * ```tsx
 * const client = { longitude: -87.63, latitude: 41.88 };
 * const pop = { longitude: -82.99, latitude: 39.96 };
 *
 * <WorldMap.Root
 *   data={[
 *     { name: "Chicago, Illinois", ...client, client: client.latitude, pop: null },
 *     { name: "ngrok Ohio", ...pop, client: null, pop: pop.latitude },
 *   ]}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   bounds={{ west: -105, south: 30, east: -65, north: 50 }}
 *   aria-label="Client location"
 * >
 *   <WorldMap.Point latitudeKey="client" label="Client" color="success" />
 *   <WorldMap.Point latitudeKey="pop" label="ngrok edge" color="accent" shape="diamond" />
 *   <WorldMap.Connector from={client} to={pop} color="accent" />
 *   <WorldMap.Callout {...client}>Chicago, Illinois, United States</WorldMap.Callout>
 * </WorldMap.Root>
 * ```
 */
const Connector = ({
	from,
	to,
	color = "neutral",
	lineStyle = "dashed",
}: WorldMapConnectorProps) => {
	const scene = useGeoScene("WorldMap.Connector");
	const id = useId();
	const { longitude: fromLongitude, latitude: fromLatitude } = from;
	const { longitude: toLongitude, latitude: toLatitude } = to;
	useLayoutEffect(() => {
		scene.connectors.set(id, {
			from: { longitude: fromLongitude, latitude: fromLatitude },
			to: { longitude: toLongitude, latitude: toLatitude },
			color,
			lineStyle,
		});
		scene.changed();
	}, [scene, id, fromLongitude, fromLatitude, toLongitude, toLatitude, color, lineStyle]);
	// Why its own effect: a delete on each prop change would move the connector to the end of the paint order.
	useLayoutEffect(
		() => () => {
			scene.connectors.delete(id);
			scene.changed();
		},
		[scene, id],
	);
	return null;
};

/**
 * A card that stays over one place, such as the location of the client on a
 * request's detail page. Unlike the tooltip, it shows without a hover. It is
 * real DOM after the plot, so a screen reader reads it as page content. It
 * shows once the map has painted, and hides while its place is outside the
 * plot. When its content changes size, the map places it again. It takes no
 * pointer events, so the points under it still hover; add
 * `pointer-events-auto` to `className` for a callout with a link. Pass
 * `asChild` to render your own element, such as a `Card`, in place of the
 * `<div>`.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"world-map-callout"` | The callout. |
 * | `data-side` | `"top"` \| `"bottom"` | The side of the place the callout sits on after placement: `side`, or the other side after a flip. |
 *
 * @see https://mantle.ngrok.com/components/preview/world-map#worldmapcallout
 *
 * @example
 * ```tsx
 * const client = { longitude: -87.63, latitude: 41.88 };
 * const pop = { longitude: -82.99, latitude: 39.96 };
 *
 * <WorldMap.Root
 *   data={[
 *     { name: "Chicago, Illinois", ...client, client: client.latitude, pop: null },
 *     { name: "ngrok Ohio", ...pop, client: null, pop: pop.latitude },
 *   ]}
 *   longitudeKey="longitude"
 *   labelKey="name"
 *   bounds={{ west: -105, south: 30, east: -65, north: 50 }}
 *   aria-label="Client location"
 * >
 *   <WorldMap.Point latitudeKey="client" label="Client" color="success" />
 *   <WorldMap.Point latitudeKey="pop" label="ngrok edge" color="accent" shape="diamond" />
 *   <WorldMap.Connector from={client} to={pop} color="accent" />
 *   <WorldMap.Callout {...client}>Chicago, Illinois, United States</WorldMap.Callout>
 * </WorldMap.Root>
 * ```
 */
const Callout = ({
	longitude,
	latitude,
	side = "top",
	asChild = false,
	className,
	children,
	ref,
	"data-slot": dataSlot,
	...props
}: WorldMapCalloutProps) => {
	const scene = useGeoScene("WorldMap.Callout");
	const id = useId();
	/** The last size report. A new place or side registers the same element again, and its size is still right. */
	const lastReport = useRef<{ element: HTMLElement; width: number; height: number } | null>(null);
	// Why a ref callback: it runs again for a new element, and it watches the size, which moves the callout off its place.
	const register = useCallback(
		(element: HTMLDivElement) => {
			const place = { longitude, latitude };
			const known = lastReport.current?.element === element ? lastReport.current : null;
			const size = known == null ? null : { width: known.width, height: known.height };
			scene.callouts.set(id, { element, place, side, size });
			if (size != null) {
				scene.calloutsChanged();
			}
			// Why read in the callback: it runs after layout, so the read forces none. The first report comes right after the mount.
			const stopResize = observeResize(
				element,
				() => {
					const width = element.offsetWidth;
					const height = element.offsetHeight;
					const last = lastReport.current;
					// Why return: a report with the size that the map already has moves nothing.
					if (last?.element === element && last.width === width && last.height === height) {
						return;
					}
					lastReport.current = { element, width, height };
					scene.callouts.set(id, { element, place, side, size: { width, height } });
					scene.calloutsChanged();
				},
				// Why the border box: the placement uses `offsetWidth` and `offsetHeight`, which hold the padding and the border.
				{ box: "border-box" },
			);
			return () => {
				stopResize();
				scene.callouts.delete(id);
			};
		},
		[scene, id, longitude, latitude, side],
	);
	const composedRef = useComposedRefs(register, ref);
	const Component = asChild ? Slot : "div";
	return (
		<Component
			data-slot={joinDataSlot(dataSlot, "world-map-callout")}
			data-side={side}
			ref={composedRef}
			className={cx(
				// Why invisible: the map places the callout after it paints, and an unplaced one would sit at the corner.
				// Why no z-index: the callout comes after the plot, so it paints over the canvas, and the hover tooltip (z-10) paints over it while the plot is at full opacity.
				"bg-popover border-popover text-strong pointer-events-none invisible absolute left-0 top-0 rounded-md border px-2.5 py-1.5 text-xs shadow-md",
				className,
			)}
			{...props}
		>
			{children}
		</Component>
	);
};

/** The public names of the map's keys, for error messages. */
const MAP_KEY_NAMES = { x: "longitudeKey", series: "latitudeKey" } as const;

/** The map steps by longitude, so its instructions name the direction. */
const MAP_KEYBOARD_INSTRUCTIONS =
	"Use the left and right arrow keys to move between points from west to east, Page Up and Page Down to jump by a tenth of the points, Home and End to jump to the westernmost and easternmost, Enter or Space to activate the current point, and Escape to dismiss the readout.";

/**
 * A point's name for people: the `labelKey` value when the row has one, else
 * the point's coordinates.
 */
const pointName = (datum: ChartDatum, labelKey: string | undefined, place: GeoPlace): string => {
	const name = labelKey == null ? undefined : datumValue(datum, labelKey);
	if ((typeof name === "string" && name !== "") || typeof name === "number") {
		return String(name);
	}
	return formatCoordinates(place.longitude, place.latitude);
};

/**
 * A point's size for people, such as `"sessions: 12"`. `null` without a size
 * key or a size value. Why read it out: the point's area shows it to sighted
 * people only.
 */
const sizeText = (datum: ChartDatum, sizeKey: string | undefined): string | null => {
	const size = sizeKey == null ? undefined : datumValue(datum, sizeKey);
	return typeof size === "number" && Number.isFinite(size)
		? `${sizeKey}: ${formatNumber(size)}`
		: null;
};

/** The place a hover points at. */
const hoverPlace = (hover: HoverSnapshot): GeoPlace => ({
	longitude: typeof hover.xValue === "number" ? hover.xValue : Number.NaN,
	latitude: hover.points[0]?.value ?? Number.NaN,
});

/** The map's readout: a row reads as a place, by its name, else by its coordinates. */
const mapReadout = (labelKey: string | undefined, sizeKey: string | undefined): ChartReadout => ({
	keyNames: MAP_KEY_NAMES,
	Tooltip: ({ hover, config }) => {
		// Why nothing: a controlled index can name a row with no point, and its coordinates would read "NaN".
		if (hover.points.length === 0) {
			return null;
		}
		const place = hoverPlace(hover);
		const coordinates = formatCoordinates(place.longitude, place.latitude);
		const name = pointName(hover.datum, labelKey, place);
		const size = sizeText(hover.datum, sizeKey);
		const footer = config?.footer;
		return (
			<>
				<div className="text-strong font-medium">{name}</div>
				{name !== coordinates && <div className="text-muted tabular-nums">{coordinates}</div>}
				{size != null && <div className="text-muted tabular-nums">{size}</div>}
				<div className="mt-1 grid gap-1">
					{hover.points.map((point) => (
						<div key={point.dataKey} className="flex items-center gap-1.5">
							{config?.indicator !== "none" && (
								<span
									aria-hidden
									className="forced-color-adjust-none size-2 shrink-0 rounded-full"
									style={{ backgroundColor: point.color }}
								/>
							)}
							<span className="text-muted">{point.label}</span>
						</div>
					))}
				</div>
				{footer != null && (
					<div className="text-muted mt-1">
						{typeof footer === "function" ? footer(hover) : footer}
					</div>
				)}
			</>
		);
	},
	announce: (hover) => {
		if (hover.points.length === 0) {
			return "";
		}
		const place = hoverPlace(hover);
		const coordinates = formatCoordinates(place.longitude, place.latitude);
		const name = pointName(hover.datum, labelKey, place);
		const where = name === coordinates ? name : `${name}, ${coordinates}`;
		const size = sizeText(hover.datum, sizeKey);
		const series = hover.points.map((point) => point.label).join(", ");
		return `${where}. ${series}${size == null ? "" : `, ${size}`}`;
	},
	describe: (summary, hydrated) => {
		const count = hydrated ? formatNumber(summary.count) : String(summary.count);
		return {
			sentence:
				summary.count === 0
					? "World map with no points."
					: `World map with ${count} ${summary.count === 1 ? "point" : "points"}.`,
			instructions: ` ${MAP_KEYBOARD_INSTRUCTIONS}`,
		};
	},
	DataTable: (props) => <MapDataTable {...props} labelKey={labelKey} sizeKey={sizeKey} />,
});

/**
 * The map's structural twin: an sr-only table with one row per point,
 * bounded to {@link CHART_TABLE_ROW_LIMIT} rows. Each row names the point, its
 * series, its coordinates, and its size value when the map has a size key, in
 * the west-to-east order the keyboard steps.
 */
const MapDataTable = ({
	data,
	label,
	labelledBy,
	slotName,
	store,
	xKey,
	labelKey,
	sizeKey,
}: ChartDataTableProps & { labelKey: string | undefined; sizeKey: string | undefined }) => {
	const series = useStoreSeries(store);
	const resolvedLabel = useResolvedChartLabel(label, labelledBy);
	const points = data
		.flatMap((datum, rowIndex) => {
			const longitude = datumValue(datum, xKey);
			if (typeof longitude !== "number" || !Number.isFinite(longitude)) {
				return [];
			}
			return series.flatMap(({ dataKey, label: seriesLabel }) => {
				const latitude = datumValue(datum, dataKey);
				return typeof latitude === "number" && Number.isFinite(latitude)
					? [{ datum, rowIndex, dataKey, seriesLabel, longitude, latitude }]
					: [];
			});
		})
		.toSorted((a, b) => a.longitude - b.longitude || a.rowIndex - b.rowIndex);
	if (points.length === 0) {
		return null;
	}
	const caption = `${resolvedLabel == null ? "Map data" : `${resolvedLabel}: map data`}${
		points.length > CHART_TABLE_ROW_LIMIT
			? `. Showing the first ${CHART_TABLE_ROW_LIMIT} of ${points.length} points, from west to east.`
			: "."
	}`;
	return (
		<div className="sr-only" data-slot={`${slotName}-data-table`}>
			<table>
				<caption>{caption}</caption>
				<thead>
					<tr>
						<th scope="col">Point</th>
						<th scope="col">Series</th>
						<th scope="col">Latitude</th>
						<th scope="col">Longitude</th>
						{sizeKey != null && <th scope="col">{sizeKey}</th>}
					</tr>
				</thead>
				<tbody>
					{points.slice(0, CHART_TABLE_ROW_LIMIT).map((point) => (
						<tr key={`${point.dataKey}:${point.rowIndex}`}>
							<th scope="row">{pointName(point.datum, labelKey, point)}</th>
							<td>{point.seriesLabel}</td>
							<td data-value={point.latitude}>{formatNumber(point.latitude)}</td>
							<td data-value={point.longitude}>{formatNumber(point.longitude)}</td>
							{sizeKey != null && <SizeCell datum={point.datum} sizeKey={sizeKey} />}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

/** A table cell with a point's size value; empty when the row has none. */
const SizeCell = ({ datum, sizeKey }: { datum: ChartDatum; sizeKey: string }) => {
	const size = datumValue(datum, sizeKey);
	return typeof size === "number" && Number.isFinite(size) ? (
		<td data-value={size}>{formatNumber(size)}</td>
	) : (
		<td />
	);
};

export type {
	//,
	ChartDatumEvent,
	ChartMode,
	GeoBounds,
	WorldMapCalloutProps,
	WorldMapConnectorProps,
	WorldMapLegendProps,
	WorldMapPointProps,
	WorldMapRootProps,
	WorldMapTooltipProps,
};
export {
	//,
	Root,
	Graticule,
	Point,
	Tooltip,
	Legend,
	Connector,
	Callout,
};
