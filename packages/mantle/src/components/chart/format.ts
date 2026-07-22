import type { XValue } from "./types.js";

/**
 * Default label formatting for axis ticks and tooltip readouts.
 *
 * This module is internal shared implementation — not exported from the package.
 */

const numberFormatter = new Intl.NumberFormat();

// The locale default caps fraction digits at three, which would round
// small-magnitude data (error rates, durations in seconds) to
// indistinguishable "0"s — sub-1 magnitudes get significant digits instead.
const smallNumberFormatter = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 4 });

const fractionDigitFormatters = new Map<number, Intl.NumberFormat>();

type FormatNumberOptions = {
	/**
	 * Exact fraction-digit precision, when the caller can derive it (axis ticks
	 * derive it from the tick step so neighboring labels never collapse into
	 * duplicate strings).
	 */
	maximumFractionDigits?: number;
};

/**
 * Thousands-separated number formatting for value ticks and tooltip values —
 * clean numbers, never scientific notation. Values between -1 and 1 keep four
 * significant digits so small-magnitude data never rounds to a bare "0".
 *
 * @example
 * ```ts
 * formatNumber(1284.5); // "1,284.5"
 * formatNumber(0.0004); // "0.0004"
 * formatNumber(0.0001, { maximumFractionDigits: 4 }); // "0.0001"
 * ```
 */
const formatNumber = (value: number, options?: FormatNumberOptions): string => {
	// Normalize negative zero so computed/stacked values (e.g. `0 * -1`) never
	// render as "-0" — Intl.NumberFormat formats -0 as "-0" on every path.
	const normalized = Object.is(value, -0) ? 0 : value;
	const digits = options?.maximumFractionDigits;
	if (digits != null) {
		let formatter = fractionDigitFormatters.get(digits);
		if (formatter == null) {
			formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: digits });
			fractionDigitFormatters.set(digits, formatter);
		}
		return formatter.format(normalized);
	}
	if (normalized !== 0 && Math.abs(normalized) < 1) {
		return smallNumberFormatter.format(normalized);
	}
	return numberFormatter.format(normalized);
};

/**
 * The fraction digits tick labels need for a given tick step so neighboring
 * labels never collapse into duplicates. Tick steps are 1/2/5 × 10^k, so the
 * step's own magnitude is exactly enough precision.
 *
 * @example
 * ```ts
 * tickFractionDigits(0.0001); // 4
 * tickFractionDigits(0.5); // 1
 * tickFractionDigits(50); // 0
 * ```
 */
const tickFractionDigits = (step: number): number => {
	if (!Number.isFinite(step) || step <= 0) {
		return 0;
	}
	// Intl.NumberFormat rejects more than 20 fraction digits.
	return Math.min(20, Math.max(0, -Math.floor(Math.log10(step))));
};

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
 * True when a date carries a time-of-day component (anything past local
 * midnight).
 *
 * @example
 * ```ts
 * hasTimeOfDay(new Date(2026, 6, 18, 14, 30)); // true
 * hasTimeOfDay(new Date(2026, 6, 18)); // false
 * ```
 */
const hasTimeOfDay = (value: Date): boolean =>
	value.getHours() !== 0 ||
	value.getMinutes() !== 0 ||
	value.getSeconds() !== 0 ||
	value.getMilliseconds() !== 0;

type FormatXValueOptions = {
	/**
	 * Whether the dataset the value belongs to carries any time-of-day
	 * component. Granularity is a property of the series, not the sample: the
	 * midnight point inside an hourly series must keep its time
	 * ("Jul 18, 12:00 AM"), while all-midnight daily data reads as dates. When
	 * omitted, granularity is inferred from the value alone.
	 */
	datasetHasTimeOfDay?: boolean;
};

/**
 * Default x-value formatting for tooltip labels: category labels pass
 * through, numbers are thousands-separated, dates render granularity-aware —
 * all-midnight (daily) data as a date with year, anything with a time
 * component as a compact date-time. Invalid dates render as an em dash
 * instead of throwing.
 *
 * @example
 * ```ts
 * formatXValue("January"); // "January"
 * formatXValue(new Date(2026, 6, 18, 14, 30)); // "Jul 18, 2:30 PM"
 * formatXValue(new Date(2026, 6, 18)); // "Jul 18, 2026"
 * formatXValue(new Date(2026, 6, 18), { datasetHasTimeOfDay: true }); // "Jul 18, 12:00 AM"
 * ```
 */
const formatXValue = (value: XValue, options?: FormatXValueOptions): string => {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "number") {
		return formatNumber(value);
	}
	if (Number.isNaN(value.getTime())) {
		return "—";
	}
	const showTime = options?.datasetHasTimeOfDay ?? hasTimeOfDay(value);
	if (showTime) {
		return dateTimeFormatter.format(value);
	}
	return dateOnlyFormatter.format(value);
};

export {
	//,
	formatNumber,
	formatXValue,
	hasTimeOfDay,
	tickFractionDigits,
};
