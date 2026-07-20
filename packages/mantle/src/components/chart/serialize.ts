import { datumValue } from "./datum.js";
import type { ChartDatum, SeriesMeta } from "./types.js";

/**
 * Serialization of chart data to clipboard-friendly text formats.
 *
 * This module is internal shared implementation — not exported from the
 * package; the per-family `CopyButton` parts are the public surface.
 */

/**
 * Make a value safe inside a markdown table cell: pipes are escaped and
 * newlines collapse to spaces so a cell can never break the row grammar.
 */
const escapeCell = (text: string): string =>
	text.replaceAll("|", "\\|").replaceAll(/\s*\n\s*/g, " ");

/**
 * A machine-stable x cell: ISO 8601 for dates (unambiguous and re-parseable,
 * unlike the locale-formatted display strings), plain un-separated digits for
 * numbers, the value itself for category strings. Invalid dates render as an
 * em dash, matching the tooltip/table convention.
 */
const xCell = (value: unknown): string => {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? "—" : value.toISOString();
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : "—";
	}
	if (typeof value === "string") {
		return escapeCell(value);
	}
	return "—";
};

/**
 * A machine-stable value cell: plain un-separated digits, with `null`/missing
 * (and anything non-finite) rendered as an em dash — never zero.
 */
const valueCell = (value: unknown): string =>
	typeof value === "number" && Number.isFinite(value) ? String(value) : "—";

/** One markdown table row from its cell texts. */
const tableRow = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;

type SerializeChartMarkdownOptions = {
	/** The chart's rows, in the order they should appear in the table. */
	data: readonly ChartDatum[];
	/** The key of each row's x value; also the first column's header. */
	xKey: string;
	/** The registered series in paint order; labels become column headers. */
	series: readonly Pick<SeriesMeta, "dataKey" | "label">[];
	/** Scatter plots only: the depth-value key, appended as a final column. */
	zKey?: string;
};

/**
 * Serialize chart data to a GitHub-flavored markdown table: one x column, one
 * column per series, and an optional z column — the same layout as the
 * chart's sr-only data table twin. Output is machine-stable (ISO 8601 dates,
 * un-separated numbers, em dash for gaps) so pasted tables stay parseable by
 * humans, spreadsheets, and LLMs alike.
 *
 * @example
 * ```ts
 * serializeChartMarkdown({
 *   data: [{ time: new Date("2026-07-18T10:00:00Z"), p50: 120 }],
 *   xKey: "time",
 *   series: [{ dataKey: "p50", label: "p50" }],
 * });
 * // | time | p50 |
 * // | --- | --- |
 * // | 2026-07-18T10:00:00.000Z | 120 |
 * ```
 */
const serializeChartMarkdown = ({
	data,
	xKey,
	series,
	zKey,
}: SerializeChartMarkdownOptions): string => {
	const headers = [
		escapeCell(xKey),
		...series.map((entry) => escapeCell(entry.label)),
		...(zKey == null ? [] : [escapeCell(zKey)]),
	];
	const rows = data.map((row) => [
		xCell(datumValue(row, xKey)),
		...series.map((entry) => valueCell(datumValue(row, entry.dataKey))),
		...(zKey == null ? [] : [valueCell(datumValue(row, zKey))]),
	]);
	return [
		tableRow(headers),
		tableRow(headers.map(() => "---")),
		...rows.map((cells) => tableRow(cells)),
	].join("\n");
};

export type {
	//,
	SerializeChartMarkdownOptions,
};
export {
	//,
	serializeChartMarkdown,
};
