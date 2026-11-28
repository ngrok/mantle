import { formatNumber, tickFractionDigits } from "./format.js";
import { linearTicksAtMost } from "./scales.js";
import type { YDomain, YScale } from "./types.js";

let compact: Intl.NumberFormat | null = null;

/**
 * The exponent domain `[lo, hi]` of a log axis. An automatic minimum is one
 * decade below the decade of the smallest positive value, so the smallest bar
 * keeps one to two decades of length. An automatic maximum is the power of ten
 * at or above the largest value. A positive fixed end is kept; a fixed end at
 * or below zero follows the data, because a log axis has no zero.
 *
 * @example
 * ```ts
 * logDomain([3, 4200], ["auto", "auto"]); // [-1, 4]
 * ```
 */
const logDomain = (
	positive: readonly [number, number] | null,
	fixed: YDomain,
): [number, number] => {
	const [minFixed, maxFixed] = fixed;
	let lo = positive == null ? 0 : Math.floor(Math.log10(positive[0])) - 1;
	if (typeof minFixed === "number" && minFixed > 0) {
		lo = Math.log10(minFixed);
	}
	let hi = positive == null ? lo + 1 : Math.ceil(Math.log10(positive[1]));
	if (typeof maxFixed === "number" && maxFixed > 0) {
		hi = Math.log10(maxFixed);
		// Why: a fixed maximum wins over an automatic minimum above it.
		if (!(typeof minFixed === "number" && minFixed > 0) && lo >= hi) {
			lo = Math.floor(hi) - 1;
		}
	}
	return [lo, hi > lo ? hi : lo + 1];
};

/**
 * The tick values of a log axis over the exponent domain `[lo, hi]`: powers of
 * ten, at most `max` of them, with every decade or every nth decade. `null`
 * when the domain holds fewer than two powers of ten.
 *
 * @example
 * ```ts
 * logTicks([0, 4], 5); // [1, 10, 100, 1000, 10000]
 * logTicks([0, 12], 4); // [1, 10000, 100000000, 1000000000000]
 * logTicks([0.3, 0.9], 5); // null
 * ```
 */
const logTicks = (domain: readonly [number, number], max: number): number[] | null => {
	// Why the tolerance: an end such as `log10(1000)` can land a hair off 3.
	// Why the clamp: `1e-324` is 0 and `1e309` is Infinity, which have no place.
	const first = Math.max(-323, Math.ceil(domain[0] - 1e-9));
	const last = Math.min(308, Math.floor(domain[1] + 1e-9));
	const count = last - first + 1;
	if (count < 2) {
		return null;
	}
	if (!(max >= 1)) {
		return [];
	}
	// Why `max(1, …)`: an unbounded `max`, as on horizontal bars, gives a stride of 0.
	const every = Math.max(1, Math.ceil(count / Math.floor(max)));
	const ticks: number[] = [];
	for (let exponent = first; exponent <= last; exponent += every) {
		// Why the string: `10 ** -3` is 0.0010000000000000002, and `1e-3` is exact.
		ticks.push(Number(`1e${exponent}`));
	}
	return ticks;
};

/**
 * A log y scale: each power of ten takes the same height, so values that
 * differ by orders of magnitude read on one axis. Pass it to a `YAxis`
 * `scale`. The ticks are powers of ten with compact labels (`1K`, `1M`). A
 * value at or below zero has no mark; the tooltip and the data table keep it.
 * A chart that does not import it ships none of its code.
 *
 * @example
 * ```tsx
 * import { BarChart, logScale } from "@ngrok/mantle/bar-chart";
 *
 * <BarChart.YAxis scale={mode === "log" ? logScale : "linear"} domain={[0, "auto"]} />
 * ```
 */
const logScale: YScale = {
	name: "log",
	plot: (columns, fixed) => {
		let min = Number.POSITIVE_INFINITY;
		let max = 0;
		let integer = true;
		for (const column of columns) {
			for (const value of column) {
				if (value > 0) {
					min = Math.min(min, value);
					max = Math.max(max, value);
					integer &&= Number.isInteger(value);
				}
			}
		}
		const [lo, hi] = logDomain(max > 0 ? [min, max] : null, fixed);
		// Why `- lo`: the bottom of the plot paints at `0`, so a bar, an area, and
		// an enter reveal still grow from zero.
		const toPlot = (value: number) => (value > 0 ? Math.log10(value) - lo : Number.NaN);
		return {
			columns: columns.map((column) => column.map(toPlot)),
			domain: [0, hi - lo],
			toPlot,
			ticks: (domain, limit, format) => {
				// Why the precision: `10 ** Math.log10(8)` is 7.999999999999999, which drops the 8 tick.
				const raw = (end: number) => Number((10 ** (end + lo)).toPrecision(12));
				const range: [number, number] = [raw(domain[0]), raw(domain[1])];
				const powers = logTicks([domain[0] + lo, domain[1] + lo], limit);
				// Why linear ticks inside one decade: a power of ten or none is too few.
				// Why a count of at most 5: a horizontal axis has no limit but its width.
				const values =
					powers ??
					linearTicksAtMost(range, limit, {
						count: Math.min(limit, 5),
						integer: integer && max > 0,
					});
				// Why a `step` of 0 for powers: they have no even step.
				const step = powers == null && values.length > 1 ? (values[1] ?? 0) - (values[0] ?? 0) : 0;
				// Why the span for one linear tick: `1.002` must not round to `1`.
				const precision = powers == null && values.length === 1 ? range[1] - range[0] : step;
				return values.map((value) => {
					// Why exponents at the ends: compact notation writes every leading zero
					// of `1e-100`, and a label that long takes the whole plot width.
					// Why the step's digits: `1K` would label 1,000 and 1,000.5 alike.
					let defaultLabel = value.toExponential();
					if (value >= 1e-3 && value < 1e15) {
						defaultLabel =
							precision > 0
								? formatNumber(value, { maximumFractionDigits: tickFractionDigits(precision) })
								: (compact ??= new Intl.NumberFormat(undefined, {
										notation: "compact",
										maximumSignificantDigits: 3,
									})).format(value);
					}
					return {
						value: toPlot(value),
						text: format == null ? defaultLabel : format(value, { defaultLabel, step }),
					};
				});
			},
		};
	},
};

export {
	//,
	logDomain,
	logScale,
	logTicks,
};
