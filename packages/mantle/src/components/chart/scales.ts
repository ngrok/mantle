import { tickIncrement, ticks as d3Ticks } from "d3-array";
import { scaleTime } from "d3-scale";

/**
 * Plain multiply-add coefficients derived from a linear domain→range mapping.
 * The d3 scale objects stay the authority for domains, niceness, and ticks;
 * per-point mapping in paint loops uses `value * k + b` to avoid d3's nested
 * closure calls at 100k+ points.
 *
 * @example
 * ```ts
 * const { k, b } = linearCoefficients([0, 100], [0, 640]);
 * const x = 25 * k + b; // 160
 * ```
 */
type LinearCoefficients = {
	k: number;
	b: number;
};

/**
 * Derive `pos = value * k + b` coefficients for a linear domain→range mapping.
 * A degenerate (zero-width) domain maps every value to the range midpoint.
 *
 * @example
 * ```ts
 * const { k, b } = linearCoefficients([0, 10], [0, 100]);
 * expect(5 * k + b).toBe(50);
 * ```
 */
const linearCoefficients = (
	domain: readonly [number, number],
	range: readonly [number, number],
): LinearCoefficients => {
	const domainSpan = domain[1] - domain[0];
	if (domainSpan === 0) {
		return { k: 0, b: (range[0] + range[1]) / 2 };
	}
	const k = (range[1] - range[0]) / domainSpan;
	return { k, b: range[0] - domain[0] * k };
};

/**
 * The computed geometry of a categorical band axis: `count` bands laid across
 * `[rangeStart, rangeEnd]` with proportional inner/outer padding. Hand-rolled
 * instead of d3's `scaleBand` so inversion (pixel → band index) falls out of
 * the same step math.
 */
type BandLayout = {
	count: number;
	rangeStart: number;
	/** Distance from one band's start to the next band's start. */
	step: number;
	/** The paintable thickness of one band. */
	bandwidth: number;
	/** Offset from `rangeStart` to the first band's start. */
	offset: number;
};

/**
 * Lay out `count` categorical bands across a pixel range.
 *
 * @example
 * ```ts
 * const layout = computeBandLayout({ count: 4, rangeStart: 0, rangeEnd: 400, paddingInner: 0.2, paddingOuter: 0.1 });
 * const x = bandStart(layout, 0);
 * ```
 */
const computeBandLayout = (options: {
	count: number;
	rangeStart: number;
	rangeEnd: number;
	/** Fraction of the step left as air between adjacent bands (0–1). */
	paddingInner: number;
	/** Fraction of the step left as air before the first and after the last band. */
	paddingOuter: number;
}): BandLayout => {
	const { count, rangeStart, rangeEnd, paddingInner, paddingOuter } = options;
	const span = rangeEnd - rangeStart;
	if (count <= 0 || span <= 0) {
		return { count: Math.max(0, count), rangeStart, step: 0, bandwidth: 0, offset: 0 };
	}
	const step = span / Math.max(1, count - paddingInner + paddingOuter * 2);
	const bandwidth = step * (1 - paddingInner);
	const offset = step * paddingOuter;
	return { count, rangeStart, step, bandwidth, offset };
};

/**
 * The pixel where band `index` starts.
 *
 * @example
 * ```ts
 * const x = bandStart(layout, 2);
 * ```
 */
const bandStart = (layout: BandLayout, index: number): number =>
	layout.rangeStart + layout.offset + index * layout.step;

/**
 * The pixel at the center of band `index`.
 *
 * @example
 * ```ts
 * const centerX = bandCenter(layout, 0);
 * ```
 */
const bandCenter = (layout: BandLayout, index: number): number =>
	bandStart(layout, index) + layout.bandwidth / 2;

/**
 * Invert a pixel position to the nearest band index, clamped to the domain.
 * Returns `null` when the layout has no bands. Any pixel within a band's whole
 * step (including its padding air) hits that band, so hover targets are never
 * smaller than the step.
 *
 * @example
 * ```ts
 * const index = invertBand(layout, pointerX);
 * ```
 */
const invertBand = (layout: BandLayout, pixel: number): number | null => {
	if (layout.count === 0 || layout.step === 0) {
		return null;
	}
	const raw = Math.floor(
		(pixel - layout.rangeStart - layout.offset + layout.step / 2 - layout.bandwidth / 2) /
			layout.step,
	);
	return Math.min(layout.count - 1, Math.max(0, raw));
};

/**
 * Human-friendly ticks (1/2/5 stepping) for a linear domain.
 *
 * @example
 * ```ts
 * linearTicks([0, 1000], 5); // [0, 200, 400, 600, 800, 1000]
 * ```
 */
const linearTicks = (domain: readonly [number, number], count: number): number[] =>
	d3Ticks(domain[0], domain[1], count);

/**
 * Calendar-aware ticks (epoch milliseconds) for a time domain — the reason
 * d3-scale is a dependency: correct month/DST/year boundaries are the hardest
 * axis math to hand-roll.
 *
 * @example
 * ```ts
 * const tickTimes = timeTicks([start.getTime(), end.getTime()], 6);
 * ```
 */
const timeTicks = (domain: readonly [number, number], count: number): number[] => {
	const scale = scaleTime().domain([new Date(domain[0]), new Date(domain[1])]);
	return scale.ticks(count).map((date) => date.getTime());
};

/**
 * A multi-granularity label formatter for time-axis ticks (d3's default:
 * years at year boundaries, month names at month boundaries, and so on).
 *
 * @example
 * ```ts
 * const format = timeTickFormatter([start, end]);
 * format(new Date(2026, 0, 1).getTime()); // "2026"
 * ```
 */
const timeTickFormatter = (domain: readonly [number, number]): ((epochMs: number) => string) => {
	const scale = scaleTime().domain([new Date(domain[0]), new Date(domain[1])]);
	const format = scale.tickFormat();
	return (epochMs: number) => format(new Date(epochMs));
};

/**
 * Expand a `[min, max]` domain to "nice" human-friendly bounds that land on
 * tick values.
 *
 * @example
 * ```ts
 * niceDomain([3, 97], 5); // [0, 100]
 * ```
 */
const niceDomain = (domain: readonly [number, number], count: number): [number, number] => {
	if (domain[0] > domain[1]) {
		// An inverted domain (e.g. a yDomain override on the wrong side of the
		// data) would produce NaN steps; render it right-side-up instead.
		return niceDomain([domain[1], domain[0]], count);
	}
	if (domain[0] === domain[1]) {
		// A flat domain would divide by zero everywhere downstream; pad it so a
		// constant series paints mid-plot instead of crashing or filling the plot.
		const value = domain[0];
		const pad = value === 0 ? 1 : Math.abs(value) * 0.5;
		return niceDomain([value - pad, value + pad], count);
	}
	// d3's tick increment: positive means a step of that size, negative means a
	// step of `1 / -step` (sub-integer ticks) — scale up, snap outward, scale down.
	const step = tickIncrement(domain[0], domain[1], count);
	if (step > 0) {
		return [Math.floor(domain[0] / step) * step, Math.ceil(domain[1] / step) * step];
	}
	return [Math.floor(domain[0] * -step) / -step, Math.ceil(domain[1] * -step) / -step];
};

export type {
	//,
	BandLayout,
	LinearCoefficients,
};
export {
	//,
	bandCenter,
	bandStart,
	computeBandLayout,
	invertBand,
	linearCoefficients,
	linearTicks,
	niceDomain,
	timeTickFormatter,
	timeTicks,
};
