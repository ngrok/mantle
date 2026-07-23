import { scaleTime } from "d3-scale";

// The 1/2/5 "nice step" tick solver, ported from d3-array 3.2.4 (`ticks` /
// `tickIncrement`) so the chart engine doesn't pull the whole d3-array package
// in for two pure functions. Behavior is identical — `scales.test.ts` locks the
// parity cases (sub-integer, negative, reversed, and flat domains).
const e10 = Math.sqrt(50);
const e5 = Math.sqrt(10);
const e2 = Math.sqrt(2);

/**
 * Options for tick generation.
 */
type TickOptions = {
	/**
	 * Clamp the tick step to whole numbers so every tick is an integer — the
	 * shape for axes whose backing data is entirely integer-valued (counts),
	 * where a "1.5" gridline label is meaningless. May yield fewer ticks than
	 * `count`; a domain containing no integer yields no ticks.
	 */
	integer?: boolean;
};

/**
 * Solve for the tick range as scaled integers: returns `[i1, i2, inc]` where the
 * ticks are `i1..i2` multiplied by `inc`. A negative `inc` encodes a sub-integer
 * step: divide by `-inc` instead of multiplying, which keeps sub-integer ticks
 * free of floating-point drift.
 */
const tickSpec = (
	start: number,
	stop: number,
	count: number,
	options?: TickOptions,
): [number, number, number] => {
	const rawStep = (stop - start) / Math.max(0, count);
	// Integer mode: a step below 1 would place fractional ticks; clamping to 1
	// keeps the 1/2/5 progression (whose steps at or above 1 are all whole).
	const step = options?.integer ? Math.max(1, rawStep) : rawStep;
	const power = Math.floor(Math.log10(step));
	const error = step / Math.pow(10, power);
	const factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
	let i1;
	let i2;
	let inc;
	if (power < 0) {
		inc = Math.pow(10, -power) / factor;
		i1 = Math.round(start * inc);
		i2 = Math.round(stop * inc);
		if (i1 / inc < start) {
			i1 += 1;
		}
		if (i2 / inc > stop) {
			i2 -= 1;
		}
		inc = -inc;
	} else {
		inc = Math.pow(10, power) * factor;
		i1 = Math.round(start / inc);
		i2 = Math.round(stop / inc);
		if (i1 * inc < start) {
			i1 += 1;
		}
		if (i2 * inc > stop) {
			i2 -= 1;
		}
	}
	if (i2 < i1 && 0.5 <= count && count < 2) {
		return tickSpec(start, stop, count * 2, options);
	}
	return [i1, i2, inc];
};

/**
 * Human-friendly tick values (1/2/5 stepping) spanning `[start, stop]` for the
 * requested approximate `count`. Returns `[start]` for a flat domain (unless
 * integer mode excludes a fractional one) and `[]` for a non-positive count.
 *
 * @example
 * ```ts
 * ticks(0, 1000, 5); // [0, 200, 400, 600, 800, 1000]
 * ticks(0, 3, 5, { integer: true }); // [0, 1, 2, 3]
 * ```
 */
const ticks = (start: number, stop: number, count: number, options?: TickOptions): number[] => {
	if (!(count > 0)) {
		return [];
	}
	if (start === stop) {
		// A flat fractional domain (an explicitly flat fractional override) has
		// no integer to tick — the no-fractional-ticks contract is absolute.
		if (options?.integer && !Number.isInteger(start)) {
			return [];
		}
		return [start];
	}
	const reverse = stop < start;
	const [i1, i2, inc] = reverse
		? tickSpec(stop, start, count, options)
		: tickSpec(start, stop, count, options);
	if (!(i2 >= i1)) {
		return [];
	}
	const length = i2 - i1 + 1;
	const result: number[] = [];
	for (let i = 0; i < length; i += 1) {
		// Reversed domains count down from i2; a negative `inc` divides to keep
		// sub-integer ticks exact rather than multiplying by a fraction.
		const scaledIndex = reverse ? i2 - i : i1 + i;
		result.push(inc < 0 ? scaledIndex / -inc : scaledIndex * inc);
	}
	return result;
};

/**
 * The tick increment for `[start, stop]`: a positive result is the step size; a
 * negative `-inc` encodes a sub-integer step of `1 / inc`. Callers snap outward
 * with this by scaling up, rounding, and scaling back down.
 *
 * @example
 * ```ts
 * tickIncrement(0, 100, 5); // 20
 * tickIncrement(0, 1, 5); // -5  (i.e. a step of 0.2)
 * ```
 */
const tickIncrement = (start: number, stop: number, count: number): number =>
	tickSpec(start, stop, count)[2];

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
 * Human-friendly ticks (1/2/5 stepping) for a linear domain. With
 * `{ integer: true }` the step is clamped to whole numbers, so an axis backed
 * by integer-only data (counts) never grows fractional ticks like `1.5`.
 *
 * @example
 * ```ts
 * linearTicks([0, 1000], 5); // [0, 200, 400, 600, 800, 1000]
 * linearTicks([0, 3], 5, { integer: true }); // [0, 1, 2, 3]
 * ```
 */
const linearTicks = (
	domain: readonly [number, number],
	count: number,
	options?: TickOptions,
): number[] => ticks(domain[0], domain[1], count, options);

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
// `timeTicks` and `timeTickFormatter` are called back-to-back from the paint
// loop with the identical domain; caching the last `scaleTime` lets the pair
// build one instance per frame instead of two. During a domain glide the domain
// changes each frame so the cache turns over, but the two calls within a single
// frame share the same scale.
let cachedTimeDomain: readonly [number, number] | null = null;
let cachedTimeScale: ReturnType<typeof scaleTime> | null = null;

const timeScaleForDomain = (domain: readonly [number, number]): ReturnType<typeof scaleTime> => {
	if (
		cachedTimeScale != null &&
		cachedTimeDomain != null &&
		cachedTimeDomain[0] === domain[0] &&
		cachedTimeDomain[1] === domain[1]
	) {
		return cachedTimeScale;
	}
	const scale = scaleTime().domain([new Date(domain[0]), new Date(domain[1])]);
	cachedTimeDomain = [domain[0], domain[1]];
	cachedTimeScale = scale;
	return scale;
};

const timeTicks = (domain: readonly [number, number], count: number): number[] => {
	return timeScaleForDomain(domain)
		.ticks(count)
		.map((date) => date.getTime());
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
	const format = timeScaleForDomain(domain).tickFormat();
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
	// d3-array's nice(): snap the bounds outward, then re-tick the widened
	// domain and repeat until the step stops changing. A single pass can leave
	// bounds that don't land on tick values, because widening the domain can
	// select a coarser step than the one the raw domain implied. Iterations are
	// bounded — d3 relies on convergence within a couple of passes; the cap just
	// guards a pathological step that never settles.
	let start = domain[0];
	let stop = domain[1];
	let previousStep = Number.NaN;
	for (let iteration = 0; iteration < 10; iteration++) {
		// The tick increment is positive for a step of that size, negative for a
		// sub-integer step of `1 / -step`.
		const step = tickIncrement(start, stop, count);
		if (step === previousStep || step === 0 || !Number.isFinite(step)) {
			break;
		}
		if (step > 0) {
			start = Math.floor(start / step) * step;
			stop = Math.ceil(stop / step) * step;
		} else {
			const inc = -step;
			start = Math.floor(start * inc) / inc;
			stop = Math.ceil(stop * inc) / inc;
		}
		previousStep = step;
	}
	return [start, stop];
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
