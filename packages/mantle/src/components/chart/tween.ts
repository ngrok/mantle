/**
 * Interruptible value tweens for chart transitions.
 *
 * Each animated channel (x domain, y domain, per-datum series buffers) owns
 * one `ValueTween`. Retargeting an active tween starts from the CURRENT
 * interpolated values, never the original start, and tweens are ticked from
 * the engine's paint loop — there is no per-tween timer and React state is
 * never touched per frame. `prefers-reduced-motion` collapses every tween to
 * a snap by passing `duration: 0`.
 *
 * This module is internal shared implementation — not exported from the package.
 */

/**
 * Cubic ease-out: fast start, gentle settle.
 */
const easeCubicOut = (t: number): number => 1 - (1 - t) ** 3;

/**
 * A reusable tween over a vector of numbers. Buffers are reused across
 * retargets — no per-frame allocation.
 *
 * @example
 * ```ts
 * const tween = new ValueTween();
 * tween.retarget([0, 100], { duration: 280, now: performance.now() });
 * // each frame:
 * const stillAnimating = tween.tick(performance.now());
 * const [min, max] = tween.values();
 * ```
 */
class ValueTween {
	#from: Float64Array = new Float64Array(0);
	#to: Float64Array = new Float64Array(0);
	#current: Float64Array = new Float64Array(0);
	#startTime = 0;
	#duration = 0;
	#active = false;

	/**
	 * Whether the tween has frames left to play.
	 */
	get active(): boolean {
		return this.#active;
	}

	/**
	 * The current interpolated values. Do not mutate or retain across ticks.
	 */
	values(): Float64Array {
		return this.#current;
	}

	/**
	 * Aim the tween at `target`. An in-flight tween is interrupted and restarts
	 * from its current values; a length change or `duration <= 0` snaps
	 * directly to the target.
	 */
	retarget(target: ArrayLike<number>, options: { duration: number; now: number }): void {
		const { duration, now } = options;
		const length = target.length;
		const lengthChanged = this.#current.length !== length;
		if (lengthChanged) {
			this.#from = new Float64Array(length);
			this.#to = new Float64Array(length);
			this.#current = new Float64Array(length);
		}
		if (lengthChanged || duration <= 0) {
			for (let index = 0; index < length; index++) {
				const value = target[index] ?? Number.NaN;
				this.#from[index] = value;
				this.#to[index] = value;
				this.#current[index] = value;
			}
			this.#active = false;
			return;
		}
		for (let index = 0; index < length; index++) {
			this.#from[index] = this.#current[index] ?? Number.NaN;
			this.#to[index] = target[index] ?? Number.NaN;
		}
		this.#startTime = now;
		this.#duration = duration;
		this.#active = true;
	}

	/**
	 * Immediately finish at the target values.
	 */
	snap(): void {
		this.#current.set(this.#to);
		this.#active = false;
	}

	/**
	 * Advance to `now`. Returns `true` while more frames are needed. Gap
	 * endpoints (`NaN` on either side) snap to the target instead of
	 * interpolating through `NaN`.
	 */
	tick(now: number): boolean {
		if (!this.#active) {
			return false;
		}
		const progress = Math.min(1, (now - this.#startTime) / this.#duration);
		const eased = easeCubicOut(progress);
		for (let index = 0; index < this.#current.length; index++) {
			const from = this.#from[index] ?? Number.NaN;
			const to = this.#to[index] ?? Number.NaN;
			if (Number.isNaN(from) || Number.isNaN(to)) {
				this.#current[index] = to;
				continue;
			}
			this.#current[index] = from + (to - from) * eased;
		}
		if (progress >= 1) {
			this.#active = false;
		}
		return this.#active;
	}
}

/**
 * A frame-rate-independent exponential chase: the value continuously glides
 * toward its target with `speed` as the fraction covered per 60fps frame
 * (liveline's lerp backbone). Unlike a fixed-duration tween, retargeting
 * mid-flight never stutters — regular retargets (streaming appends) read as
 * constant smooth motion instead of ease-stop-jump ticks. A snap epsilon
 * terminates the chase so an idle chart stops burning frames.
 *
 * @example
 * ```ts
 * const chase = new ChaseTween();
 * chase.jump([0, 60]);
 * chase.aim([10, 70]);
 * // each frame:
 * const stillAnimating = chase.tick(performance.now());
 * const [min, max] = chase.values();
 * ```
 */
class ChaseTween {
	#target: Float64Array = new Float64Array(0);
	#current: Float64Array = new Float64Array(0);
	#lastTime = 0;
	#active = false;
	#speed: number;
	#epsilon: number;
	/** The largest per-component distance when the chase was (re)aimed. */
	#journey = 0;

	constructor(options: { speed?: number; epsilon?: number } = {}) {
		this.#speed = options.speed ?? 0.14;
		this.#epsilon = options.epsilon ?? 1e-3;
	}

	get active(): boolean {
		return this.#active;
	}

	values(): Float64Array {
		return this.#current;
	}

	/** Set the value instantly (first data, reduced motion, animate=false). */
	jump(target: ArrayLike<number>): void {
		if (this.#current.length !== target.length) {
			this.#target = new Float64Array(target.length);
			this.#current = new Float64Array(target.length);
		}
		for (let index = 0; index < target.length; index++) {
			const value = target[index] ?? Number.NaN;
			this.#target[index] = value;
			this.#current[index] = value;
		}
		this.#active = false;
	}

	/**
	 * Aim the chase at a new target; the glide continues from wherever it is.
	 * Re-aiming the current target is a no-op: an in-flight glide keeps its
	 * original journey bookkeeping and a settled chase stays settled.
	 */
	aim(target: ArrayLike<number>, now: number): void {
		if (this.#current.length !== target.length) {
			this.jump(target);
			return;
		}
		// Live charts re-aim an unchanged domain on every data ingest. Restarting
		// the journey bookkeeping for an identical target would ratchet the snap
		// threshold down to the shrinking remaining distance until it fell below
		// float rounding and the chase could never settle — so bail out before
		// touching any state. Exact equality is correct here: an unchanged target
		// is recomputed by the same deterministic code from the same data.
		let changed = false;
		for (let index = 0; index < target.length; index++) {
			const value = target[index] ?? Number.NaN;
			const previous = this.#target[index] ?? Number.NaN;
			const bothGaps = Number.isNaN(previous) && Number.isNaN(value);
			if (previous !== value && !bothGaps) {
				changed = true;
				break;
			}
		}
		if (!changed) {
			return;
		}
		let journey = 0;
		for (let index = 0; index < target.length; index++) {
			const value = target[index] ?? Number.NaN;
			this.#target[index] = value;
			const distance = Math.abs(value - (this.#current[index] ?? Number.NaN));
			if (Number.isFinite(distance) && distance > journey) {
				journey = distance;
			}
		}
		// The snap threshold is relative to THIS glide's length — never to the
		// targets' absolute magnitude, which would make epoch-millisecond time
		// domains snap instantly and all-zero targets never settle.
		this.#journey = journey;
		if (!this.#active) {
			this.#active = true;
			this.#lastTime = now;
		}
	}

	/**
	 * Advance toward the target. Returns `true` while more frames are needed.
	 * The snap threshold is relative to the current glide's length so domains
	 * of any magnitude terminate — and actually glide. A component whose
	 * remaining delta is too small for the step to make representable float
	 * progress snaps to the target, so rounding can never wedge the chase into
	 * ticking forever.
	 */
	tick(now: number): boolean {
		if (!this.#active) {
			return false;
		}
		// Clamp dt so a background-tab hiccup can't teleport the chase.
		const dt = Math.min(50, Math.max(0, now - this.#lastTime));
		this.#lastTime = now;
		const factor = 1 - Math.pow(1 - this.#speed, dt / 16.67);
		const snapDistance = Math.max(this.#journey * this.#epsilon, Number.EPSILON);
		let settled = true;
		for (let index = 0; index < this.#current.length; index++) {
			const target = this.#target[index] ?? Number.NaN;
			const current = this.#current[index] ?? Number.NaN;
			if (Number.isNaN(target) || Number.isNaN(current)) {
				this.#current[index] = target;
				continue;
			}
			const next = current + (target - current) * factor;
			// `next === current` with a positive factor means the remaining delta
			// is below the value's float resolution — no future frame can advance
			// it, so treat it as arrived. Skip factor 0 (two ticks sharing a
			// timestamp): that's "no time passed", not a stall, and snapping there
			// would teleport a live glide. This only ever makes the snap more
			// forgiving — it fires solely where the glide is already pixel-frozen.
			const stalled = factor > 0 && next === current;
			if (stalled || Math.abs(target - next) <= snapDistance) {
				this.#current[index] = target;
			} else {
				this.#current[index] = next;
				settled = false;
			}
		}
		this.#active = !settled;
		return this.#active;
	}
}

/**
 * Standard chart transition duration in milliseconds.
 */
const CHART_TWEEN_DURATION_MS = 280;

/**
 * Per-datum tweens are only meaningful below this point count; above it the
 * engine animates the scale domain instead (O(width) per frame via the
 * decimation cache) so 100k-point charts never tween 100k values.
 */
const PER_DATUM_TWEEN_LIMIT = 2500;

export {
	//,
	CHART_TWEEN_DURATION_MS,
	ChaseTween,
	easeCubicOut,
	PER_DATUM_TWEEN_LIMIT,
	ValueTween,
};
