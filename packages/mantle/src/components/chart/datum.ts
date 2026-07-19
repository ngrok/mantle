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

export {
	//,
	datumValue,
};
