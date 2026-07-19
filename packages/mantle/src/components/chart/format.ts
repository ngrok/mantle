import type { XValue } from "./types.js";

/**
 * Default label formatting for axis ticks and tooltip readouts.
 *
 * This module is internal shared implementation — not exported from the package.
 */

const numberFormatter = new Intl.NumberFormat();

/**
 * Thousands-separated number formatting for value ticks and tooltip values —
 * clean numbers, never scientific notation.
 *
 * @example
 * ```ts
 * formatNumber(1284.5); // "1,284.5"
 * ```
 */
const formatNumber = (value: number): string => numberFormatter.format(value);

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

const dateOnlyFormatter = new Intl.DateTimeFormat(undefined, {
	year: "numeric",
	month: "short",
	day: "numeric",
});

/**
 * Default x-value formatting for tooltip labels: category labels pass
 * through, numbers are thousands-separated, dates render granularity-aware —
 * local-midnight dates (daily data) as a date with year, anything with a time
 * component as a compact date-time. Invalid dates render as an em dash
 * instead of throwing.
 *
 * @example
 * ```ts
 * formatXValue("January"); // "January"
 * formatXValue(new Date(2026, 6, 18, 14, 30)); // "Jul 18, 2:30 PM"
 * formatXValue(new Date(2026, 6, 18)); // "Jul 18, 2026"
 * ```
 */
const formatXValue = (value: XValue): string => {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number") {
		return formatNumber(value);
	}
	if (Number.isNaN(value.getTime())) {
		return "—";
	}
	const isLocalMidnight =
		value.getHours() === 0 &&
		value.getMinutes() === 0 &&
		value.getSeconds() === 0 &&
		value.getMilliseconds() === 0;
	if (isLocalMidnight) {
		return dateOnlyFormatter.format(value);
	}
	return dateTimeFormatter.format(value);
};

export {
	//,
	formatNumber,
	formatXValue,
};
