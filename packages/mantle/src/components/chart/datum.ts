/**
 * The single read point for consumer-shaped chart rows.
 *
 * Rows cross an untyped boundary (their shape belongs to the consumer), so
 * the engine never indexes them directly; `Reflect.get` reads a property from
 * any object without asserting a shape, and the declared `unknown` return
 * keeps every caller narrowing intentionally.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * Read `key` off a chart datum.
 *
 * @example
 * ```ts
 * const raw = datumValue(row, "desktop");
 * const value = typeof raw === "number" ? raw : Number.NaN;
 * ```
 */
const datumValue = (datum: object, key: string): unknown => Reflect.get(datum, key);

/**
 * Coerce a consumer x value for continuous scales. Time scales accept `Date`,
 * epoch milliseconds, or parseable date strings; anything else is `NaN`.
 *
 * @example
 * ```ts
 * toEpochOrNumber(new Date("2026-07-18T00:00:00Z"), true); // 1784332800000
 * toEpochOrNumber("2026-07-18", false); // NaN
 * ```
 */
const toEpochOrNumber = (raw: unknown, isTime: boolean): number => {
	if (raw instanceof Date) {
		return raw.getTime();
	}
	if (typeof raw === "number") {
		return raw;
	}
	if (isTime && typeof raw === "string") {
		return new Date(raw).getTime();
	}
	return Number.NaN;
};

/**
 * The message for a key that no row carries, the way the engine's ingest
 * reports it. It lists the keys of every row, because a key that only some
 * rows carry is valid.
 *
 * @example
 * ```ts
 * missingKeyMessage("BarChart.Bar", "dataKey", "visits", rows);
 * // 'BarChart.Bar dataKey "visits" does not match any key in the provided data. Available keys: month, desktop.'
 * ```
 */
const missingKeyMessage = (
	owner: string,
	keyName: "xKey" | "dataKey" | "zKey",
	key: string,
	rows: readonly object[],
): string => {
	const available = new Set<string>();
	for (const row of rows) {
		for (const rowKey of Object.keys(row)) {
			available.add(rowKey);
		}
	}
	return `${owner} ${keyName} "${key}" does not match any key in the provided data. Available keys: ${[...available].join(", ")}.`;
};

/** The message for x values none of which read as the scale's type. */
const uncoercibleXMessage = (rootName: string, xKey: string, xScale: string): string =>
	`${rootName} could not read any "${xKey}" values as ${xScale === "time" ? "dates" : "numbers"} for the "${xScale}" x scale — check the xScale and the data types.`;

type ChartKeys = {
	/** The Root's display name in a message, such as `BarChart.Root`. */
	rootName: string;
	/** The series part's display name in a message, such as `BarChart.Bar`. */
	partName: string;
	rows: readonly object[];
	xKey: string;
	xScale: "band" | "point" | "linear" | "time";
	/** The registered series keys. */
	dataKeys: readonly string[];
	zKey: string | null;
};

/** Whether any of `candidates` carries `key`: a `null` value counts, an absent key does not. */
const hasKey = (candidates: readonly object[], key: string): boolean =>
	candidates.some((row) => datumValue(row, key) !== undefined);

/**
 * Throw the key invariants the engine's ingest throws, with the same
 * messages, so a chart that holds no engine yet fails fast in its mount
 * commit instead of in the observer task that activates it. On a continuous
 * scale the series and depth keys are checked against the rows the engine
 * plots (those with a finite x), and no plotted row leaves nothing to check.
 *
 * @example
 * ```ts
 * assertChartKeys({ rootName: "BarChart.Root", partName: "BarChart.Bar", rows, xKey: "month", xScale: "band", dataKeys: ["desktop"], zKey: null });
 * // throws when no row carries "month" or "desktop"
 * ```
 */
const assertChartKeys = ({
	rootName,
	partName,
	rows,
	xKey,
	xScale,
	dataKeys,
	zKey,
}: ChartKeys): void => {
	if (rows.length === 0) {
		return;
	}
	if (!hasKey(rows, xKey)) {
		throw new Error(missingKeyMessage(rootName, "xKey", xKey, rows));
	}
	let plotted: readonly object[] = rows;
	if (xScale === "linear" || xScale === "time") {
		let sawNonNullish = false;
		plotted = rows.filter((row) => {
			const raw = datumValue(row, xKey);
			if (raw != null) {
				sawNonNullish = true;
			}
			return Number.isFinite(toEpochOrNumber(raw, xScale === "time"));
		});
		if (sawNonNullish && plotted.length === 0) {
			throw new Error(uncoercibleXMessage(rootName, xKey, xScale));
		}
	}
	// The engine reads the series and depth columns from the plotted rows alone,
	// so a key that only a dropped row carries is a typo there too.
	if (plotted.length === 0) {
		return;
	}
	for (const dataKey of dataKeys) {
		if (!hasKey(plotted, dataKey)) {
			throw new Error(missingKeyMessage(partName, "dataKey", dataKey, rows));
		}
	}
	if (zKey != null && !hasKey(plotted, zKey)) {
		throw new Error(missingKeyMessage(rootName, "zKey", zKey, rows));
	}
};

export type {
	//,
	ChartKeys,
};
export {
	//,
	assertChartKeys,
	datumValue,
	missingKeyMessage,
	toEpochOrNumber,
	uncoercibleXMessage,
};
