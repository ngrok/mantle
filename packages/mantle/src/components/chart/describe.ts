import type { ChartDatum, SeriesMark, XScaleKind, XValue } from "./types.js";
import { datumValue, toEpochOrNumber } from "./datum.js";
import { formatNumber, formatXValue, hasTimeOfDay } from "./format.js";

/**
 * The text behind the interaction overlay's `aria-describedby`: what a chart
 * holds and how to drive it. A dormant chart (one the reader has not reached)
 * has no data table yet, so this sentence is what a screen reader gets.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** What one pass over `data` learns about the x column. */
type XSummary = {
	/** Rows with a usable x value; every row counts on a category scale. */
	count: number;
	/**
	 * The smallest x on a continuous scale, the first row's x on a category
	 * scale. `null` with no usable rows.
	 */
	first: XValue | null;
	/** The largest x on a continuous scale, the last row's x on a category scale. */
	last: XValue | null;
	/** Any `Date` x carries a time-of-day component (label granularity). */
	hasTimeOfDay: boolean;
};

const asXValue = (raw: unknown): XValue =>
	typeof raw === "string" || typeof raw === "number" || raw instanceof Date ? raw : String(raw);

/**
 * Summarize the x column in one pass. Category scales keep data order; a
 * continuous scale drops rows whose x is not a finite number or date, as
 * ingest does.
 *
 * @example
 * ```ts
 * scanX([{ t: new Date("2026-07-02") }, { t: new Date("2026-07-01") }], "t", "time");
 * // { count: 2, first: 2026-07-01, last: 2026-07-02, hasTimeOfDay: false }
 * ```
 */
const scanX = (data: readonly ChartDatum[], xKey: string, xScale: XScaleKind): XSummary => {
	let timeOfDay = false;
	if (xScale === "band" || xScale === "point") {
		let first: XValue | null = null;
		let last: XValue | null = null;
		for (const row of data) {
			const value = asXValue(datumValue(row, xKey));
			if (value instanceof Date && hasTimeOfDay(value)) {
				timeOfDay = true;
			}
			first ??= value;
			last = value;
		}
		return { count: data.length, first, last, hasTimeOfDay: timeOfDay };
	}
	const isTime = xScale === "time";
	let count = 0;
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (const row of data) {
		const raw = datumValue(row, xKey);
		const epoch = toEpochOrNumber(raw, isTime);
		if (!Number.isFinite(epoch)) {
			continue;
		}
		// A time scale also takes an epoch number or a parseable string, and their
		// time of day sets the label granularity the same as a `Date`'s.
		if (!timeOfDay) {
			const date = raw instanceof Date ? raw : isTime ? new Date(epoch) : null;
			if (date != null && hasTimeOfDay(date)) {
				timeOfDay = true;
			}
		}
		count += 1;
		min = Math.min(min, epoch);
		max = Math.max(max, epoch);
	}
	if (count === 0) {
		return { count, first: null, last: null, hasTimeOfDay: timeOfDay };
	}
	return {
		count,
		first: isTime ? new Date(min) : min,
		last: isTime ? new Date(max) : max,
		hasTimeOfDay: timeOfDay,
	};
};

const KIND_LABEL: Record<SeriesMark, string> = {
	line: "Line chart",
	bar: "Bar chart",
	area: "Area chart",
	scatter: "Scatter plot",
};

const KEYBOARD_INSTRUCTIONS =
	"Use the left and right arrow keys to move between data points, Page Up and Page Down to jump by a tenth of the data, Home and End to jump to the first and last, Enter or Space to activate the current point, and Escape to dismiss the readout.";

/** What one row is to a chart of this kind: a category on a bar chart, a data point elsewhere. */
const nounFor = (kind: SeriesMark, single: boolean): string => {
	if (kind === "bar") {
		return single ? "category" : "categories";
	}
	return single ? "data point" : "data points";
};

type DescribeChartOptions = {
	kind: SeriesMark;
	summary: XSummary;
	/** Registered series labels in paint order. */
	seriesLabels: readonly string[];
	/**
	 * Whether the client has hydrated. `Intl` output can differ between the
	 * server and the client, so the grouped count and the x range wait for it.
	 */
	hydrated: boolean;
};

/**
 * The series sentence of a description, with its leading space; empty with
 * no series.
 *
 * @example
 * ```ts
 * describeSeries(["Requests", "Errors"]); // " Series: Requests, Errors."
 * ```
 */
const describeSeries = (seriesLabels: readonly string[]): string =>
	seriesLabels.length > 0 ? ` Series: ${seriesLabels.join(", ")}.` : "";

/**
 * The two fixed parts of a description: the sentence that names the chart
 * kind, its count, and its x range, and the keyboard instructions with their
 * leading space. The series sentence between them comes from
 * {@link describeSeries}, written separately once the parts registered.
 *
 * @example
 * ```ts
 * const { sentence, instructions } = describeChartParts({ kind: "line", summary, hydrated: true });
 * // sentence: "Line chart with 30 data points from Jul 1, 2026 to Jul 30, 2026."
 * ```
 */
const describeChartParts = ({
	kind,
	summary,
	hydrated,
}: Omit<DescribeChartOptions, "seriesLabels">): { sentence: string; instructions: string } => {
	let sentence: string;
	if (summary.count === 0) {
		sentence = `${KIND_LABEL[kind]} with no data.`;
	} else {
		const single = summary.count === 1;
		const noun = nounFor(kind, single);
		const count = hydrated ? formatNumber(summary.count) : String(summary.count);
		let range = "";
		if (hydrated && summary.first != null && summary.last != null) {
			const options = { datasetHasTimeOfDay: summary.hasTimeOfDay };
			range = single
				? ` at ${formatXValue(summary.first, options)}`
				: ` from ${formatXValue(summary.first, options)} to ${formatXValue(summary.last, options)}`;
		}
		sentence = `${KIND_LABEL[kind]} with ${count} ${noun}${range}.`;
	}
	return { sentence, instructions: ` ${KEYBOARD_INSTRUCTIONS}` };
};

/**
 * Compose the overlay's description: the chart kind, how many points or
 * categories it holds, their x range, the series, and the keyboard keys.
 *
 * @example
 * ```ts
 * describeChart({ kind: "line", summary, seriesLabels: ["Requests", "Errors"], hydrated: true });
 * // "Line chart with 30 data points from Jul 1, 2026 to Jul 30, 2026. Series: Requests, Errors. Use the left and right arrow keys …"
 * ```
 */
const describeChart = ({ kind, summary, seriesLabels, hydrated }: DescribeChartOptions): string => {
	const { sentence, instructions } = describeChartParts({ kind, summary, hydrated });
	return `${sentence}${describeSeries(seriesLabels)}${instructions}`;
};

export type {
	//,
	XSummary,
};
export {
	//,
	describeChart,
	describeChartParts,
	describeSeries,
	scanX,
};
