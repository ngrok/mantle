"use client";

import type { Ref } from "react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useIsHydrated } from "../../hooks/use-is-hydrated.js";
import { datumValue } from "./datum.js";
import type { XSummary } from "./describe.js";
import { describeChartParts } from "./describe.js";
import { formatNumber, formatXValue } from "./format.js";
import type { ChartStore } from "./store.js";
import type { ChartDatum, HoverSnapshot, SeriesMark } from "./types.js";
import { useStoreSeries } from "./context.js";
import type { ChartListContextValue } from "./list.js";

/**
 * The screen-reader layer of an interactive chart: the description, the
 * keyboard-step announcers, and the sr-only data table.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * The hover snapshot of a keyboard step alone, else `null`. Only a keyboard
 * step is announced, so a registration or a pointer hover never re-renders
 * the announcer.
 */
const useStoreKeyboardHover = (store: ChartStore): HoverSnapshot | null =>
	useSyncExternalStore(
		store.subscribe,
		() => keyboardHover(store),
		() => keyboardHover(store),
	);

const keyboardHover = (store: ChartStore): HoverSnapshot | null => {
	const hover = store.getSnapshot().hover;
	return hover?.viaKeyboard === true ? hover : null;
};

/**
 * Rows the sr-only data-table twin renders before summarizing. Screen-reader
 * users navigate the keyboard point cursor for dense data; the table is the
 * bounded structural alternative (an unbounded table at 100k rows would be a
 * million-node DOM bomb and unusable to AT anyway).
 */
const CHART_TABLE_ROW_LIMIT = 150;

/**
 * The overlay's accessible description: the chart kind, how many points or
 * categories it holds, their x range, the series, and the keyboard keys. A
 * dormant chart has no data table yet, so this is what a screen reader gets
 * from it. One string child, so React writes it with `textContent` and a
 * browser translation engine cannot detach it. The grouped count and the x
 * range wait for hydration, because `Intl` output can differ between the
 * server and the client.
 */
const ChartDescription = ({
	id,
	kind,
	slotName,
	seriesRef,
	summary,
	instructions,
}: {
	id: string;
	kind: SeriesMark;
	slotName: string;
	/** The Root writes the registered series into this span after every commit. */
	seriesRef: Ref<HTMLSpanElement>;
	summary: XSummary;
	/** Whether to end with the keyboard instructions: an interactive chart answers them, a static one does not. */
	instructions: boolean;
}) => {
	const hydrated = useIsHydrated();
	const parts = describeChartParts({ kind, summary, hydrated });
	return (
		// Why sr-only, not hidden: a hidden span would shape no text, but browse
		// mode would no longer read the description as page content.
		<span id={id} data-slot={`${slotName}-description`} className="sr-only">
			<span>{parts.sentence}</span>
			<span ref={seriesRef} />
			{instructions && <span>{parts.instructions}</span>}
		</span>
	);
};

/**
 * Debounced polite announcements for keyboard stepping, so rapid arrowing
 * doesn't flood the screen-reader queue.
 */
const ChartAnnouncer = ({
	store,
	xHasTimeOfDay,
}: {
	store: ChartStore;
	/** Whether the dataset's x dates carry a time-of-day component (label granularity). */
	xHasTimeOfDay: boolean;
}) => {
	const hover = useStoreKeyboardHover(store);
	const [announcement, setAnnouncement] = useState("");
	// Why clear the state and not derive "": the clear must be a real DOM change
	// before the debounced write, because AT does not re-announce identical text.
	// Derived state flashes the previous datum's text first.
	if (hover == null && announcement !== "") {
		setAnnouncement("");
	}
	useEffect(() => {
		if (hover == null) {
			return;
		}
		const timer = setTimeout(() => {
			setAnnouncement(announcementFor(hover, xHasTimeOfDay));
		}, ANNOUNCE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [hover, xHasTimeOfDay]);
	return (
		<span role="status" aria-live="polite" className="sr-only">
			{announcement}
		</span>
	);
};

/** The wait before a keyboard step announces, so fast arrowing does not flood the reader. */
const ANNOUNCE_DELAY_MS = 120;

/** What a keyboard step announces: the x value, then each series' value. */
const announcementFor = (hover: HoverSnapshot, xHasTimeOfDay: boolean): string => {
	const values = hover.points
		.map(
			(point) => `${point.label}: ${point.value == null ? "no data" : formatNumber(point.value)}`,
		)
		.join(", ");
	const zPart =
		hover.zValue === undefined
			? ""
			: `, z: ${hover.zValue == null ? "no data" : formatNumber(hover.zValue)}`;
	return `${formatXValue(hover.xValue, { datasetHasTimeOfDay: xHasTimeOfDay })}. ${values}${zPart}`;
};

/**
 * The announcer of a chart inside a List: it writes to the list's one live
 * region instead of rendering its own. It renders nothing.
 */
const ChartListAnnouncer = ({
	id,
	list,
	store,
	xHasTimeOfDay,
}: {
	id: string;
	list: ChartListContextValue;
	store: ChartStore;
	xHasTimeOfDay: boolean;
}) => {
	const hover = useStoreKeyboardHover(store);
	// Why: a chart that unmounts takes its last announcement out of the shared region.
	useEffect(() => () => list.announce(id, ""), [id, list]);
	useEffect(() => {
		// Why clear first: AT does not announce text that did not change, so a
		// step back to the same datum must pass through an empty region.
		list.announce(id, "");
		if (hover == null) {
			return;
		}
		const timer = setTimeout(() => {
			list.announce(id, announcementFor(hover, xHasTimeOfDay));
		}, ANNOUNCE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [hover, id, list, xHasTimeOfDay]);
	return null;
};

/**
 * The referenced text never announces a change, so there is nothing to
 * subscribe to. React still reads the snapshot again after the mount commit.
 */
function subscribeToNothing(): () => void {
	return () => {
		// Why: intentionally empty. The snapshot changes only with `labelledBy`.
	};
}

/**
 * Resolves the chart's name for the data-table caption: the `aria-label` when
 * set, else the text of the `aria-labelledby` element once it is in the DOM.
 * The server render falls back to "Chart data" because the referenced element
 * is not reachable there.
 *
 * Why `useSyncExternalStore`: the text lives in the DOM, outside React. React
 * reads the snapshot again after the mount commit, so a referenced element
 * that mounts in the same commit still resolves.
 */
const useResolvedChartLabel = (label: string | undefined, labelledBy: string | undefined) => {
	const referencedText = useSyncExternalStore(
		subscribeToNothing,
		() => readReferencedText(labelledBy),
		() => undefined,
	);
	return label ?? referencedText;
};

/**
 * Matches every chart data table. The label skips their text: a referenced
 * ancestor of the chart holds the caption, and a caption that feeds its own
 * snapshot renders forever.
 */
const CHART_DATA_TABLE_SELECTOR = '[data-slot$="-chart-data-table"]';

/**
 * Joins the trimmed text of each element that `labelledBy` names, in order,
 * without the text of a chart data table. Returns `undefined` when no element
 * has text.
 */
function readReferencedText(labelledBy: string | undefined): string | undefined {
	if (labelledBy == null) {
		return undefined;
	}
	const text = labelledBy
		.split(/\s+/)
		.map((id) => textOutsideChartTables(document.getElementById(id)))
		.filter(Boolean)
		.join(" ");
	return text || undefined;
}

/**
 * Returns the trimmed text of `element` without the text of a chart data table
 * inside it.
 */
function textOutsideChartTables(element: HTMLElement | null): string {
	if (element == null) {
		return "";
	}
	if (element.querySelector(CHART_DATA_TABLE_SELECTOR) == null) {
		return element.textContent?.trim() ?? "";
	}
	const walker = document.createTreeWalker(
		element,
		NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
		{
			acceptNode: (node) => {
				if (node instanceof Element) {
					return node.matches(CHART_DATA_TABLE_SELECTOR)
						? NodeFilter.FILTER_REJECT
						: NodeFilter.FILTER_SKIP;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		},
	);
	let text = "";
	for (let node = walker.nextNode(); node != null; node = walker.nextNode()) {
		text += node.textContent ?? "";
	}
	return text.trim();
}

/**
 * The chart's structural twin: an sr-only table of the data, bounded to
 * {@link CHART_TABLE_ROW_LIMIT} rows with a caption stating the summarization.
 * Tooltips enhance, they never gate — every plotted value is reachable here
 * or through the keyboard point cursor.
 */
const ChartDataTable = ({
	data,
	label,
	labelledBy,
	slotName,
	store,
	xHasTimeOfDay,
	xKey,
	zKey,
}: {
	data: readonly ChartDatum[];
	/** The chart's `aria-label`, so multi-chart pages get distinct captions. */
	label: string | undefined;
	/**
	 * The chart's `aria-labelledby`. The caption reads the referenced element's
	 * text after mount, so an `aria-labelledby` chart gets the same distinct
	 * caption as an `aria-label` chart.
	 */
	labelledBy: string | undefined;
	slotName: string;
	store: ChartStore;
	/** Whether the dataset's x dates carry a time-of-day component (label granularity). */
	xHasTimeOfDay: boolean;
	xKey: string;
	zKey: string | undefined;
}) => {
	// Why a selector: `publishHover` replaces the snapshot on every index
	// change. Without the selector, the table reconciles up to 150 rows for a
	// value it never reads.
	const series = useStoreSeries(store);
	const resolvedLabel = useResolvedChartLabel(label, labelledBy);
	if (data.length === 0 || series.length === 0) {
		return null;
	}
	const rows = data.slice(0, CHART_TABLE_ROW_LIMIT);
	return (
		// The slot names the twin for programmatic discovery — an agent scraping
		// the machine-readable table targets it without heuristics.
		<div className="sr-only" data-slot={`${slotName}-data-table`}>
			<table>
				<caption>
					{`${resolvedLabel == null ? "Chart data" : `${resolvedLabel} — chart data`}${
						data.length > CHART_TABLE_ROW_LIMIT
							? `. Showing the first ${CHART_TABLE_ROW_LIMIT} of ${data.length} rows.`
							: "."
					}`}
				</caption>
				<thead>
					<tr>
						<th scope="col">{xKey}</th>
						{series.map((column) => (
							<th key={column.dataKey} scope="col">
								{column.label}
							</th>
						))}
						{zKey != null && <th scope="col">{zKey}</th>}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => {
						// Cells carry the display-formatted text for AT and the raw value
						// beside it for machines — `<time dateTime>` and `data-value` let
						// agents scrape exact timestamps/numbers from the DOM without
						// reverse-engineering locale formatting.
						const x = datumValue(row, xKey);
						const isValidDate = x instanceof Date && !Number.isNaN(x.getTime());
						const xText =
							typeof x === "string" || typeof x === "number" || x instanceof Date
								? formatXValue(x, { datasetHasTimeOfDay: xHasTimeOfDay })
								: String(x);
						return (
							// oxlint-disable-next-line react/no-array-index-key -- rows have no identity beyond position; the table is regenerated wholesale on data change, never reordered
							<tr key={index}>
								<th
									scope="row"
									data-value={typeof x === "number" && Number.isFinite(x) ? x : undefined}
								>
									{isValidDate ? <time dateTime={x.toISOString()}>{xText}</time> : xText}
								</th>
								{series.map((column) => {
									const value = datumValue(row, column.dataKey);
									const isFinite = typeof value === "number" && Number.isFinite(value);
									return (
										<td key={column.dataKey} data-value={isFinite ? value : undefined}>
											{isFinite ? formatNumber(value) : "—"}
										</td>
									);
								})}
								{zKey != null &&
									(() => {
										const zRaw = datumValue(row, zKey);
										const zIsFinite = typeof zRaw === "number" && Number.isFinite(zRaw);
										return (
											<td data-value={zIsFinite ? zRaw : undefined}>
												{zIsFinite ? formatNumber(zRaw) : "—"}
											</td>
										);
									})()}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export {
	//,
	CHART_TABLE_ROW_LIMIT,
	ChartAnnouncer,
	ChartDataTable,
	ChartDescription,
	ChartListAnnouncer,
};
