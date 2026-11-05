"use client";

import type {
	ChartAccessibilityProps,
	ChartMode,
	ChartRootBaseProps,
	LegendPrimitiveProps,
	TooltipPrimitiveProps,
} from "../chart/primitive.js";
import type {
	ChartDatum,
	ChartDatumEvent,
	ChartSeriesSlot,
	PointShape,
	SeriesColor,
} from "../chart/types.js";
import {
	ChartLegendPrimitive,
	ChartRootPrimitive,
	useGridPrimitive,
	useSeriesPrimitive,
	useTooltipPrimitive,
} from "../chart/primitive.js";
import { cx } from "../../utils/cx/cx.js";
import { WORLD_LAND } from "./world-land.js";

/**
 * Props for {@link WorldMap.Root}. Each row is one place: a longitude on the
 * Root, and a latitude per composed `WorldMap.Point` series. Rows without a
 * finite longitude are not plotted.
 */
type WorldMapRootProps<
	TDatum extends ChartDatum = ChartDatum,
	TMode extends ChartMode = "interactive",
> = Omit<ChartRootBaseProps, "stacked" | "yDomain"> &
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
		 * a small point on top of a large one stays visible. If no row has the
		 * key, the Root throws.
		 */
		sizeKey?: Extract<keyof TDatum, string>;
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
	 * A fixed visual identity slot. Slots `1` through `8` select a paired chart
	 * color and point shape. `"other"` selects the shared neutral treatment.
	 *
	 * Series receive unreserved slots in composition order. Set `seriesSlot` to
	 * give a series a fixed visual identity.
	 */
	seriesSlot?: ChartSeriesSlot;
	/**
	 * Override the color channel with a chart token or any CSS color. A series
	 * that carries good/bad meaning, such as a blocklisted agent, should wear
	 * the semantic status colors, never a categorical slot.
	 */
	color?: SeriesColor;
	/**
	 * The glyph this series' points wear, mirrored by the legend key and the
	 * hover dot. Shape keeps series apart without color vision. When omitted,
	 * the series wears the glyph paired to its series slot.
	 */
	shape?: PointShape;
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
 * Hovering hits the nearest point within 24px.
 *
 * A Root mounts dormant: a shell of the plot, the named overlay, and its
 * sr-only description. It builds its canvas once it comes within one viewport
 * of the visible area, takes focus, or prints, and it mounts the sr-only data
 * table once focus lands inside it.
 *
 * **Live data.** Pass new rows whenever they arrive. A point at a place the
 * last rows did not have gets one ring that grows and fades in 900ms; a moved
 * point is a new place. Reduced motion and `animate={false}` play no ring.
 *
 * The Root's own subtree is addressable by slot: `world-map` on the wrapper,
 * then `world-map-plot`, `world-map-canvas`, `world-map-markers`,
 * `world-map-tooltip`, `world-map-description`, and, once focus lands inside
 * the map, `world-map-data-table`. The canvas and the hover layers are
 * engine-owned: absent from server HTML and from a dormant map.
 *
 * **Data attributes:**
 *
 * | Data Attribute | Value | Description |
 * | --- | --- | --- |
 * | `data-slot` | `"world-map-description"` | The `sr-only` description the overlay's `aria-describedby` points at: the point count, the series labels, and, on an interactive map, the keyboard instructions. Omitted when `mode="decorative"`. |
 * | `data-slot` | `"world-map-data-table"` | The `sr-only` data table: one row per point, with its name, series, latitude, and longitude, from west to east. Mounts once focus lands inside the map (`data-state` flips to `"engaged"`) and stays. Interactive maps only. |
 * | `data-state` | `"dormant"` \| `"engaged"` | On the Root. Flips to `"engaged"` once focus lands inside the map, and never flips back. Interactive maps only. |
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
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Root = <TDatum extends ChartDatum = ChartDatum, TMode extends ChartMode = "interactive">(
	props: WorldMapRootProps<TDatum, TMode>,
) => (
	// Why no destructure: a rest over the `mode` union loses the union, and the props stop type-checking.
	<ChartRootPrimitive
		{...props}
		kind="scatter"
		componentName="WorldMap"
		slotName="world-map"
		projection="robinson"
		land={WORLD_LAND}
		xKey={props.longitudeKey}
		xScale="linear"
		// Why 2:1: the Robinson world is 1.97 times as wide as it is tall, and the legend needs the rest.
		className={cx("aspect-2/1", props.className)}
	/>
);

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
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
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
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
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
 * its coordinates), then its coordinates, then its series. Compose this part
 * to append a footer, or replace the readout through the render-prop
 * `children`, which receives the hovered row as `datum`.
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
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
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
 *   <WorldMap.Point latitudeKey="online" label="Online" />
 *   <WorldMap.Point latitudeKey="offline" label="Offline" seriesSlot="other" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const Legend = (props: WorldMapLegendProps) => (
	<ChartLegendPrimitive partName="WorldMap.Legend" slotName="world-map" {...props} />
);

/**
 * A canvas-rendered world map that plots points by longitude and latitude on
 * the Robinson projection, such as ngrok agents placed by their IP address.
 * Robinson bends the meridians so no region swells the way Mercator swells
 * the poles, which keeps a point's place and the land around it honest.
 *
 * The map is a chart: hover and keyboard reach every point, the tooltip and
 * polite announcements name it, the sr-only data table lists every point,
 * and new rows animate in. Size points by a count (`sizeKey`) when many share
 * one place, as IP geolocation puts many agents in one city.
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--world-map-land-color` | `var(--color-neutral-200)` | The land fill. |
 * | `--world-map-ocean-color` | `var(--color-neutral-50)` | The fill inside the world's outline. |
 * | `--color-chart-1` … `--color-chart-8` | per theme | The categorical series slots, in assignment order. |
 * | `--color-chart-other` | `--color-neutral-500` | The neutral slot. |
 *
 * Set a variable on `Root` to restyle one map:
 * `className="[--world-map-land-color:var(--color-neutral-300)]"`.
 *
 * @useWhen Show where things are in the world: agents, endpoints, or edge locations placed by longitude and latitude.
 *
 * @siblings
 * - `ScatterPlot`: the two values are measures, not a place on Earth.
 * - `DataTable`: a reader needs to sort, filter, or act on each place more than see where it is.
 *
 * @see https://mantle.ngrok.com/components/preview/world-map
 *
 * @example
 * Composition:
 * ```
 * WorldMap.Root
 * ├── WorldMap.Graticule
 * ├── WorldMap.Point (one per series)
 * ├── WorldMap.Tooltip
 * └── WorldMap.Legend
 * ```
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
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const WorldMap = {
	/**
	 * The root of a world map: owns the data, the Robinson projection, the
	 * canvas renderer, and the whole interaction contract.
	 *
	 * @see https://mantle.ngrok.com/components/preview/world-map#worldmaproot
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
	 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
	 *   <WorldMap.Tooltip />
	 *   <WorldMap.Legend />
	 * </WorldMap.Root>
	 * ```
	 */
	Root,
	/**
	 * Meridians and parallels every 30°, under the land.
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
	 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
	 *   <WorldMap.Tooltip />
	 *   <WorldMap.Legend />
	 * </WorldMap.Root>
	 * ```
	 */
	Graticule,
	/**
	 * One point series; registers with the map and paints on canvas.
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
	 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
	 *   <WorldMap.Tooltip />
	 *   <WorldMap.Legend />
	 * </WorldMap.Root>
	 * ```
	 */
	Point,
	/**
	 * Customizes the always-on hover/keyboard tooltip readout.
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
	 *   <WorldMap.Point latitudeKey="latitude" label="Agents" />
	 *   <WorldMap.Tooltip footer="Select a point to open the agent" />
	 *   <WorldMap.Legend />
	 * </WorldMap.Root>
	 * ```
	 */
	Tooltip,
	/**
	 * The legend; compose it on every map with more than one series.
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
	 *   <WorldMap.Point latitudeKey="online" label="Online" />
	 *   <WorldMap.Point latitudeKey="offline" label="Offline" seriesSlot="other" />
	 *   <WorldMap.Tooltip />
	 *   <WorldMap.Legend />
	 * </WorldMap.Root>
	 * ```
	 */
	Legend,
} as const;

export type {
	//,
	ChartDatumEvent,
	ChartMode,
	WorldMapLegendProps,
	WorldMapPointProps,
	WorldMapRootProps,
	WorldMapTooltipProps,
};
export {
	//,
	WorldMap,
};
