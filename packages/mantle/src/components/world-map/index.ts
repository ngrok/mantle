/**
 * Re-exports for the World Map component.
 *
 * @see https://mantle.ngrok.com/components/preview/world-map
 */

import * as WorldMapParts from "./world-map-parts.js";
/**
 * A canvas-rendered world map that plots points by longitude and latitude on
 * the Robinson projection, such as ngrok agents placed by their IP address.
 * Robinson bends the meridians so no region swells the way Mercator swells
 * the poles, which keeps a point's place and the land around it honest.
 *
 * The map is a chart:
 *
 * - Hover and the keyboard reach each point the plot shows.
 * - The tooltip and polite announcements name the point.
 * - The sr-only data table lists the first 150 points from west to east.
 * - A point at a new place pulses once.
 *
 * Size points by a count (`sizeKey`) when many share one place, as IP
 * geolocation puts many agents in one city. For one request, zoom to the
 * client's region (`bounds`), keep a card over its place (`Callout`), and
 * draw a line to the ngrok edge (`Connector`).
 *
 * **CSS variables (public API):**
 *
 * | CSS Variable | Default | Description |
 * | --- | --- | --- |
 * | `--world-map-land-color` | `var(--color-neutral-200)` | The land fill. |
 * | `--world-map-ocean-color` | `var(--color-neutral-50)` | The fill inside the world's outline. |
 *
 * Set a variable on `Root` to restyle one map:
 * `className="[--world-map-land-color:var(--color-neutral-300)]"`.
 *
 * @useWhen Show where things are in the world: agents, endpoints, or edge locations placed by longitude and latitude, or one request's client and the ngrok edge that received it.
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
 * ├── WorldMap.Connector
 * ├── WorldMap.Callout
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
 *   <WorldMap.Point latitudeKey="latitude" label="Agents" color="blue" />
 *   <WorldMap.Tooltip />
 *   <WorldMap.Legend />
 * </WorldMap.Root>
 * ```
 */
const WorldMap = WorldMapParts;

export {
	//,
	WorldMap,
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
} from "./world-map.js";
