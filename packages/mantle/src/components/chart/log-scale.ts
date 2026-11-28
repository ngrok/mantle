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
	}
	return [lo, hi > lo ? hi : lo + 1];
};

/**
 * The tick values of a log axis over the exponent domain `[lo, hi]`: powers of
 * ten, at most `max` of them, with every decade or every nth decade. A domain
 * that holds fewer than two powers of ten gets linear ticks instead.
 *
 * @example
 * ```ts
 * logTicks([0, 4], 5); // [1, 10, 100, 1000, 10000]
 * logTicks([0, 12], 4); // [1, 10000, 100000000, 1000000000000]
 * ```
 */
const logTicks = (domain: readonly [number, number], max: number): number[] => {
	// Why the tolerance: an end such as `log10(1000)` can land a hair off 3.
	const first = Math.ceil(domain[0] - 1e-9);
	const last = Math.floor(domain[1] + 1e-9);
	const count = last - first + 1;
	if (count < 2) {
		return linearTicksAtMost([10 ** domain[0], 10 ** domain[1]], max);
	}
	const every = Math.ceil(count / Math.max(1, Math.floor(max)));
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
		for (const column of columns) {
			for (const value of column) {
				if (value > 0) {
					min = Math.min(min, value);
					max = Math.max(max, value);
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
			ticks: (domain, limit, format) =>
				logTicks([domain[0] + lo, domain[1] + lo], limit).map((value) => {
					const defaultLabel = (compact ??= new Intl.NumberFormat(undefined, {
						notation: "compact",
						maximumSignificantDigits: 3,
					})).format(value);
					return {
						value: toPlot(value),
						// Why a `step` of 0: a log axis has no even step.
						text: format == null ? defaultLabel : format(value, { defaultLabel, step: 0 }),
					};
				}),
		};
	},
};

export {
	//,
	logDomain,
	logScale,
	logTicks,
};
