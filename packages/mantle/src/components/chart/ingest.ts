import invariant from "tiny-invariant";
import type { ChartDatum, SeriesMark, SeriesSpec, XScaleKind, XValue } from "./types.js";
import { datumValue, missingKeyMessage, toEpochOrNumber, uncoercibleXMessage } from "./datum.js";
import { hasTimeOfDay } from "./format.js";

/**
 * Row ingest: consumer rows into the typed columns the engine draws from.
 * Pure, so it runs and tests without a DOM.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/** The public part name of each series mark, for error messages. */
const PART_NAME: Record<SeriesMark, string> = {
	bar: "BarChart.Bar",
	line: "LineChart.Line",
	area: "AreaChart.Area",
	scatter: "ScatterPlot.Point",
};

type IngestInput = {
	rows: readonly ChartDatum[];
	xKey: string;
	xScale: XScaleKind;
	/** The registered series, in paint order. `columns` follows this order. */
	specs: readonly SeriesSpec[];
	/** The depth key of a 3D scatter plot; `null` for every other chart. */
	zKey: string | null;
	/** The Root's public name, such as `"BarChart.Root"`, for error messages. */
	rootName: string;
};

type IngestResult = {
	/** The rows with a position on the x axis. */
	rowCount: number;
	/** The x position of each view index: an epoch or a number, or the index on a category scale. */
	xs: Float64Array<ArrayBuffer>;
	/** The consumer's x value per view index, on category scales only; empty on continuous ones. */
	xValues: XValue[];
	/** view index → source index, or `null` when the view is the data array itself. */
	order: Int32Array | null;
	/** source index → view index, `-1` for a dropped row; `null` with `order`. */
	orderInverse: Int32Array | null;
	/** Every x position is an integer. */
	xsAllIntegers: boolean;
	/** Some category date carries a time of day, so labels keep it. */
	xHasTimeOfDay: boolean;
	/** One column per series in `specs` order, by view index; `NaN` is a gap. */
	columns: Float64Array<ArrayBuffer>[];
	/** The smallest and largest finite value across every column; `0` when none. */
	valueMin: number;
	valueMax: number;
	/** Every finite value is an integer. */
	valuesAllIntegers: boolean;
	/** The depth column of a 3D scatter plot, by view index; empty without `zKey`. */
	zs: Float64Array<ArrayBuffer>;
	/** The finite depth extent, or `null` when no row has a depth. */
	zExtent: [number, number] | null;
};

type XIngest = Pick<
	IngestResult,
	"rowCount" | "xs" | "xValues" | "order" | "orderInverse" | "xsAllIntegers"
>;

const ingestCategories = ({ rows, xKey, rootName }: IngestInput): XIngest => {
	const count = rows.length;
	const xs = new Float64Array(count);
	const xValues: XValue[] = Array.from({ length: count }, () => "");
	// `undefined` means the x key is absent from the row: when EVERY row misses
	// it that is an xKey typo, and it must fail fast the way a dataKey typo
	// does, not render a full axis of "undefined" categories.
	let foundX = false;
	for (let index = 0; index < count; index++) {
		const row = rows[index];
		const raw = row == null ? undefined : datumValue(row, xKey);
		if (raw !== undefined) {
			foundX = true;
		}
		xValues[index] =
			typeof raw === "string" || typeof raw === "number" || raw instanceof Date ? raw : String(raw);
		xs[index] = index;
	}
	invariant(count === 0 || foundX, () => missingKeyMessage(rootName, "xKey", xKey, rows));
	// Category positions are indexes: integral, and never linear-ticked.
	return { rowCount: count, xs, xValues, order: null, orderInverse: null, xsAllIntegers: true };
};

const ingestContinuous = ({ rows, xKey, xScale, rootName }: IngestInput): XIngest => {
	// Why typed arrays: a stream ingests on every append, and an object per row
	// is garbage at that rate. `xsAll` and `sources` hold the coercible rows in
	// row order; a sort, when needed, permutes them.
	const xsAll = new Float64Array(rows.length);
	const sources = new Int32Array(rows.length);
	let kept = 0;
	let sortedAscending = true;
	// `undefined` = key absent (an all-rows absence is a typo, below); `null` =
	// an explicit per-row gap that drops silently. A present but uncoercible
	// value that leaves no coercible rows means the data cannot live on this
	// scale, and silence would render a blank chart.
	let sawXKey = false;
	let sawNonNullish = false;
	for (let index = 0; index < rows.length; index++) {
		const row = rows[index];
		const raw = row == null ? undefined : datumValue(row, xKey);
		if (raw !== undefined) {
			sawXKey = true;
		}
		if (raw != null) {
			sawNonNullish = true;
		}
		// Only finite x survives: Infinity, NaN, and invalid dates have no
		// position and would poison the domain into NaN.
		const x = toEpochOrNumber(raw, xScale === "time");
		if (Number.isFinite(x)) {
			if (kept > 0 && x < (xsAll[kept - 1] ?? 0)) {
				sortedAscending = false;
			}
			xsAll[kept] = x;
			sources[kept] = index;
			kept += 1;
		}
	}
	invariant(rows.length === 0 || sawXKey, () => missingKeyMessage(rootName, "xKey", xKey, rows));
	invariant(!sawNonNullish || kept > 0, () => uncoercibleXMessage(rootName, xKey, xScale));
	// Sorting once keeps decimation and hit-testing correct for out-of-order
	// responses; the sorted view is the engine's contract. A tie keeps row order.
	const count = kept;
	let xs = count === rows.length ? xsAll : xsAll.slice(0, count);
	let order = count === rows.length ? sources : sources.slice(0, count);
	if (!sortedAscending) {
		const unsortedXs = xs;
		const unsortedSources = order;
		const permutation = Array.from({ length: count }, (_unused, slot) => slot).toSorted(
			(a, b) => (unsortedXs[a] ?? 0) - (unsortedXs[b] ?? 0) || a - b,
		);
		xs = new Float64Array(count);
		order = new Int32Array(count);
		for (let slot = 0; slot < count; slot++) {
			const from = permutation[slot] ?? slot;
			xs[slot] = unsortedXs[from] ?? 0;
			order[slot] = unsortedSources[from] ?? 0;
		}
	}
	let xsAllIntegers = true;
	for (let index = 0; index < count; index++) {
		if (!Number.isInteger(xs[index])) {
			xsAllIntegers = false;
			break;
		}
	}
	// Every row kept, in row order: the view is the data array itself.
	if (count === rows.length && sortedAscending) {
		return { rowCount: count, xs, xValues: [], order: null, orderInverse: null, xsAllIntegers };
	}
	// The inverse backs the public index contract: consumers speak in their
	// data array's indexes, and -1 marks a dropped row.
	const orderInverse = new Int32Array(rows.length).fill(-1);
	for (let index = 0; index < count; index++) {
		const source = order[index];
		if (source != null) {
			orderInverse[source] = index;
		}
	}
	return { rowCount: count, xs, xValues: [], order, orderInverse, xsAllIntegers };
};

/**
 * Read `rows` into columns: the x positions (sorted ascending on a continuous
 * scale, with rows that have no position dropped), one value column per
 * series, and the depth column of a 3D scatter plot. Throws the key
 * invariants: an x key, a `dataKey`, or a `zKey` that no row carries.
 *
 * @example
 * ```ts
 * const result = ingestRows({ rows, xKey: "time", xScale: "time", specs, zKey: null, rootName: "LineChart.Root" });
 * result.columns[0]; // the first series' values, NaN at gaps
 * ```
 */
const ingestRows = (input: IngestInput): IngestResult => {
	const { rows, specs, zKey } = input;
	const x =
		input.xScale === "band" || input.xScale === "point"
			? ingestCategories(input)
			: ingestContinuous(input);
	const { rowCount: count, order } = x;
	const sourceOf = (index: number): number => (order == null ? index : (order[index] ?? index));

	// Date label granularity is a dataset property: the midnight point inside
	// an hourly series must keep its time of day. A continuous ingest leaves
	// `xValues` empty, so a time scale allocates no `Date` here.
	let xHasTimeOfDay = false;
	for (const value of x.xValues) {
		if (value instanceof Date && hasTimeOfDay(value)) {
			xHasTimeOfDay = true;
			break;
		}
	}

	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	// Stacked sums of integers are integers, so the raw values cover stacked domains too.
	let valuesAllIntegers = true;
	const columns = specs.map((spec) => {
		const values = new Float64Array(count);
		let found = false;
		for (let index = 0; index < count; index++) {
			const row = rows[sourceOf(index)];
			const raw = row == null ? undefined : datumValue(row, spec.dataKey);
			if (raw === undefined) {
				values[index] = Number.NaN;
				continue;
			}
			found = true;
			// A non-finite value (an Infinity from an upstream divide-by-zero)
			// renders as a gap; in the extent it would blank the whole chart.
			const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Number.NaN;
			values[index] = value;
			if (!Number.isNaN(value)) {
				min = Math.min(min, value);
				max = Math.max(max, value);
				if (!Number.isInteger(value)) {
					valuesAllIntegers = false;
				}
			}
		}
		invariant(count === 0 || found, () =>
			missingKeyMessage(PART_NAME[spec.mark], "dataKey", spec.dataKey, rows),
		);
		return values;
	});

	let zs = new Float64Array(0);
	let zExtent: [number, number] | null = null;
	if (zKey != null) {
		zs = new Float64Array(count);
		let zMin = Number.POSITIVE_INFINITY;
		let zMax = Number.NEGATIVE_INFINITY;
		let zFound = false;
		for (let index = 0; index < count; index++) {
			const row = rows[sourceOf(index)];
			const raw = row == null ? undefined : datumValue(row, zKey);
			if (raw !== undefined) {
				zFound = true;
			}
			const value = typeof raw === "number" && Number.isFinite(raw) ? raw : Number.NaN;
			zs[index] = value;
			if (!Number.isNaN(value)) {
				zMin = Math.min(zMin, value);
				zMax = Math.max(zMax, value);
			}
		}
		invariant(count === 0 || zFound, () =>
			missingKeyMessage("ScatterPlot.Root", "zKey", zKey, rows),
		);
		zExtent = zMin === Number.POSITIVE_INFINITY ? null : [zMin, zMax];
	}

	return {
		...x,
		xHasTimeOfDay,
		columns,
		valueMin: min === Number.POSITIVE_INFINITY ? 0 : min,
		valueMax: max === Number.NEGATIVE_INFINITY ? 0 : max,
		valuesAllIntegers,
		zs,
		zExtent,
	};
};

export type {
	//,
	IngestInput,
	IngestResult,
};
export {
	//,
	ingestRows,
	PART_NAME,
};
