import { createContext, useContext, useState, useSyncExternalStore } from "react";
import invariant from "tiny-invariant";
import type { ChartEngine } from "./engine.js";
import type { ChartStore } from "./store.js";
import type { ChartDatum, ChartDatumEvent, SeriesMark, SeriesMeta, XScaleKind } from "./types.js";

/**
 * The shared React layer of the chart family. `BarChart`, `LineChart`,
 * `AreaChart`, and `ScatterPlot` are thin public wrappers over these
 * primitives, mirroring how `dialog/primitive` backs the dialog family and
 * `list/primitive` backs the list family.
 *
 * Interaction is the Root's UNCONDITIONAL contract: the crosshair/hover band,
 * tooltip, keyboard stepping (arrows / PageUp / PageDown / Home / End /
 * Escape, Enter/Space to activate), aria-live announcements, the sr-only
 * description, and the sr-only data table all ship with Root itself. The
 * composed Tooltip part customizes the readout; omitting it never removes the
 * hover layer, and no part removal can strip keyboard access to the data.
 *
 * A Root mounts dormant: a shell of the plot, the named overlay, and the
 * sr-only description. It builds its paint surface and its engine once it
 * nears the viewport, takes focus, or prints, and it mounts the data table
 * once focus lands inside it. A list of 100 charts pays for the ones a reader
 * can see, and a table of sparklines holds no hidden tables until a reader
 * asks for one.
 *
 * This module is internal shared implementation — it is not exported from the
 * package.
 */

/**
 * Every interactive chart must have an accessible name: either a direct
 * `aria-label` or an `aria-labelledby` reference to a visible title (preferred
 * when the chart sits under a heading — no drift-prone duplicated text).
 * Enforced at the type level; the name lands on the interaction overlay (the
 * chart's single named element — the canvas itself is aria-hidden so AT never
 * announces the chart twice). Decorative charts are exempt — see
 * {@link ChartAccessibilityProps}.
 */
type ChartAccessibleName =
	| { "aria-label": string; "aria-labelledby"?: never }
	| { "aria-labelledby": string; "aria-label"?: never };

/**
 * The interaction props an interactive chart may wire: the controlled
 * `activeIndex` and the two notification callbacks. Modeled apart from the base
 * props so a static or decorative chart can forbid them: neither has a hover
 * UI or activates a datum, so these would be dead code.
 */
type ChartInteractionProps = {
	/**
	 * Controlled active datum index, an index into `data` (`null` = none).
	 * Omit for uncontrolled hover.
	 */
	activeIndex?: number | null;
	/** Notified when hover/keyboard moves the active index (an index into `data`). */
	onActiveIndexChange?: (index: number | null) => void;
	/** Notified on datum activation: mark click, or Enter/Space on the focused chart. */
	onDatumActivate?: (event: ChartDatumEvent) => void;
};

/** The interaction props a static or decorative chart forbids. */
type ChartNoInteractionProps = {
	activeIndex?: never;
	onActiveIndexChange?: never;
	onDatumActivate?: never;
};

/** The accessible-name props a decorative chart forbids. */
type ChartNoAccessibleName = {
	"aria-label"?: never;
	"aria-labelledby"?: never;
};

/**
 * How much of the chart's contract a Root exposes: `"interactive"` (the
 * default), `"static"`, or `"decorative"`. See the `mode` prop.
 */
type ChartMode = "interactive" | "static" | "decorative";

/**
 * The accessibility and interactivity contract every chart Root takes, keyed
 * by `mode`, so an invalid combination does not compile:
 *
 * - **`"interactive"`** (the default): requires an accessible name
 *   (`aria-label` xor `aria-labelledby`) and may wire the interaction props.
 * - **`"static"`**: requires an accessible name and forbids the interaction
 *   props.
 * - **`"decorative"`**: forbids the accessible name and the interaction props.
 *
 * Each arm pins `mode` to its own literal, and the two noninteractive arms
 * require it. A union `TMode` then satisfies every arm it can take, so a
 * `mode` picked at runtime between `"decorative"` and `"interactive"` still
 * needs the name. An explicit `"static"` or `"decorative"` type argument
 * cannot omit `mode`, which would select the interactive runtime default.
 *
 * Why a type parameter and not a union over `mode`: a family Root infers
 * `TMode` from the `mode` it is given, so the props resolve to one shape.
 * A union would make TypeScript relate a Root with no `mode` to the static
 * shape as well, and a `zKey={maybe}` prop then fails to type-check.
 */
type ChartAccessibilityProps<TMode extends ChartMode = ChartMode> = {
	/**
	 * How much of the chart's contract this Root exposes. Pick by what a
	 * reader does with the chart:
	 *
	 * | `mode` | Use it for | A reader gets |
	 * | --- | --- | --- |
	 * | `"interactive"` (default) | A chart a reader explores: a dashboard panel, a detail page, a report with a question behind it. | A named `role="application"` Tab stop, hover and keyboard point cursor, a tooltip readout, polite announcements, and an sr-only data table on focus. |
	 * | `"static"` | A chart a reader glances at while the exact values sit beside it: a sparkline in a table row or a card, a trend in a print report. | A named `role="img"` with a text description (kind, count, range, series), no Tab stop, no hover, no tooltip, no table. `animate` defaults to `false`. |
	 * | `"decorative"` | A placeholder whose values are not information: synthetic bars behind an empty state, a hero backdrop. | Nothing: hidden from assistive technology, out of the tab order, inert, every series in one neutral fill. |
	 *
	 * **Noninteractive is not decorative.** A sparkline beside a total still
	 * tells a reader when activity happened and how it varied, so it keeps a
	 * name and a description; only its values live in the text beside it.
	 * One hundred sparklines in a table as one hundred Tab stops is a focus
	 * order no reader wants, and a readout that only a pointer can reach
	 * fails WCAG 2.2 SC 2.1.1 (Keyboard), so `"static"` offers neither. A
	 * chart that is the only source of its values stays `"interactive"`.
	 *
	 * **`"static"`** names the plot `role="img"`, with the consumer's
	 * `aria-label` or `aria-labelledby` and an `aria-describedby` to the
	 * description, so a screen reader hears what the chart holds without a
	 * Tab stop. There is no overlay: no hover band, no tooltip, no keyboard
	 * point cursor, no data table, no live region, and a composed `Tooltip`
	 * part has no effect. Pointer events pass through to the row or card
	 * behind it. The series keep their colors. `animate` defaults to `false`,
	 * because a list of sparklines that each play a reveal as the reader
	 * scrolls is motion with no information in it; pass `animate` to opt in.
	 *
	 * **`"decorative"`** keeps the canvas rendering and the animation and
	 * drops every layer that only real data needs: it is hidden from assistive
	 * technology (no name, no description, no table, no live region), out of
	 * the tab order, and inert to pointer and keyboard. Every series paints
	 * `--color-chart-decorative`, one neutral fill that outranks a series'
	 * `color`: a backdrop encodes no series identity, and a
	 * hue on values that are not information invites a reader to decode it.
	 * The token is the darkest neutral step that keeps `text-muted` over the
	 * WCAG AA floor for 14px text in both themes (4.56:1 in light, 4.93:1
	 * in dark), so an overlaid message needs no scrim, no blur, and no
	 * dimming to stay readable; `chart/decorative-contrast.test.tsx` measures
	 * every theme. Retune the fill per chart by redeclaring the token in
	 * `className` (`[--color-chart-decorative:var(--color-neutral-100)]`) and
	 * re-measure the message against the new value.
	 *
	 * A decorative chart sets `aria-hidden` on the Root, so assistive technology
	 * does not read its children either. Render an empty-state message as a
	 * sibling of the Root, not as a child.
	 *
	 * @default "interactive"
	 *
	 * @example
	 * ```tsx
	 * // Interactive: a dashboard panel a reader explores.
	 * <LineChart.Root data={latency} xKey="time" aria-labelledby="latency-heading">
	 *   <LineChart.Grid />
	 *   <LineChart.XAxis />
	 *   <LineChart.YAxis />
	 *   <LineChart.Line dataKey="p50" label="p50" color="blue" />
	 *   <LineChart.Line dataKey="p99" label="p99" color="emerald" />
	 *   <LineChart.Tooltip />
	 *   <LineChart.Legend />
	 * </LineChart.Root>
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Static: a sparkline in a table cell, with the total beside it as text.
	 * <div className="flex items-center gap-2">
	 *   <BarChart.Root
	 *     data={service.requests}
	 *     xKey="day"
	 *     mode="static"
	 *     aria-label={`Requests for ${service.name}, last 30 days`}
	 *     className="aspect-auto h-6 w-28"
	 *   >
	 *     <BarChart.Bar dataKey="count" label="Requests" color="blue" />
	 *   </BarChart.Root>
	 *   <span className="text-muted text-xs tabular-nums">{compact(service.requestTotal)}</span>
	 * </div>
	 * ```
	 *
	 * @example
	 * ```tsx
	 * // Decorative: the message is a sibling of the chart, so AT still announces it.
	 * <div className="relative w-full">
	 *   <BarChart.Root data={placeholderUsage} xKey="day" mode="decorative">
	 *     <BarChart.Bar dataKey="value" color="blue" />
	 *   </BarChart.Root>
	 *   <Empty.Root className="absolute inset-0 m-auto h-fit w-fit">
	 *     <Empty.Title>No usage yet</Empty.Title>
	 *     <Empty.Description>
	 *       <p>Traffic will appear here once your endpoints start receiving requests.</p>
	 *     </Empty.Description>
	 *   </Empty.Root>
	 * </div>
	 * ```
	 */
	mode?: TMode;
} & (TMode extends "decorative"
	? { mode: "decorative" } & ChartNoAccessibleName & ChartNoInteractionProps
	: TMode extends "static"
		? { mode: "static" } & ChartAccessibleName & ChartNoInteractionProps
		: { mode?: "interactive" } & ChartAccessibleName & ChartInteractionProps);

type ChartContextValue = {
	kind: SeriesMark;
	/** The public namespace name, e.g. `"BarChart"` — used in error messages. */
	componentName: string;
	store: ChartStore;
	engineRef: { current: ChartEngine | null };
	/**
	 * The Root's current data props, read at interaction time (never at render
	 * time) by parts like `CopyButton` — a ref so the context value, created
	 * once per Root lifetime, stays stable across data updates.
	 */
	dataRef: {
		current: {
			data: readonly ChartDatum[];
			xKey: string;
			/** The resolved x scale, so a copy reads a time-scale x as the engine does. */
			xScale: XScaleKind;
			zKey: string | undefined;
		};
	};
};

const ChartContext = createContext<ChartContextValue | null>(null);

/**
 * Read the chart context, throwing a descriptive invariant when a part is
 * rendered outside its Root (a renderless part would otherwise no-op with
 * zero signal).
 */
const useChartContext = (partName: string): ChartContextValue => {
	const context = useContext(ChartContext);
	invariant(
		context,
		() =>
			`${partName} must be composed inside ${partName.split(".")[0]}.Root — it registers into the chart it belongs to and renders nothing on its own.`,
	);
	return context;
};

/**
 * Subscribe to the registered series only. `publishHover` replaces the
 * snapshot object but keeps the `series` reference. A part that never reads
 * `hover` therefore skips the hover re-render.
 */
const useStoreSeries = (store: ChartStore): SeriesMeta[] =>
	useSyncExternalStore(
		store.subscribe,
		() => store.getSnapshot().series,
		() => store.getSnapshot().series,
	);

/** Whether two objects hold the same own keys with `Object.is`-equal values. */
const shallowEqualObjects = (a: object, b: object): boolean => {
	const keys = Object.keys(a);
	if (keys.length !== Object.keys(b).length) {
		return false;
	}
	return keys.every(
		(key) => Object.hasOwn(b, key) && Object.is(Reflect.get(a, key), Reflect.get(b, key)),
	);
};

/**
 * Return the previous render's object while the new one is shallow-equal to
 * it, so a rest object rebuilt every render can sit in a dependency array.
 *
 * Why a render-phase `setStable`: the previous object must survive between
 * renders, and React allows a conditional set of the component's own state
 * during render (it re-runs the render with the new value). A ref read during
 * render does the same job, but the React Compiler rejects it.
 */
const useShallowStable = <T extends object>(value: T): T => {
	const [stable, setStable] = useState(value);
	if (shallowEqualObjects(stable, value)) {
		return stable;
	}
	setStable(value);
	return value;
};

export type {
	//,
	ChartAccessibilityProps,
	ChartContextValue,
	ChartMode,
};

export {
	//,
	ChartContext,
	useChartContext,
	useShallowStable,
	useStoreSeries,
};
