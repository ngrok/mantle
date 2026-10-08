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

export {
	//,
	datumValue,
	toEpochOrNumber,
};
