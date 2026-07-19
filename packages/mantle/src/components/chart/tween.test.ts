import { describe, expect, test } from "vitest";
import { ChaseTween, easeCubicOut, ValueTween } from "./tween.js";

describe("easeCubicOut", () => {
	test("starts at 0, ends at 1, front-loads motion", () => {
		expect(easeCubicOut(0)).toBe(0);
		expect(easeCubicOut(1)).toBe(1);
		expect(easeCubicOut(0.5)).toBeGreaterThan(0.5);
	});
});

describe("ValueTween", () => {
	test("interpolates toward the target over the duration", () => {
		const tween = new ValueTween();
		tween.retarget([0], { duration: 0, now: 0 });
		tween.retarget([100], { duration: 100, now: 0 });
		expect(tween.active).toBe(true);
		tween.tick(50);
		const mid = tween.values()[0] ?? 0;
		expect(mid).toBeGreaterThan(0);
		expect(mid).toBeLessThan(100);
		expect(tween.tick(100)).toBe(false);
		expect(tween.values()[0]).toBe(100);
		expect(tween.active).toBe(false);
	});

	test("duration 0 snaps immediately (reduced motion)", () => {
		const tween = new ValueTween();
		tween.retarget([1, 2, 3], { duration: 0, now: 0 });
		expect(tween.active).toBe(false);
		expect([...tween.values()]).toEqual([1, 2, 3]);
	});

	test("retargeting mid-flight restarts from the CURRENT values, not the original start", () => {
		const tween = new ValueTween();
		tween.retarget([0], { duration: 0, now: 0 });
		tween.retarget([100], { duration: 100, now: 0 });
		tween.tick(50);
		const midway = tween.values()[0] ?? 0;
		tween.retarget([0], { duration: 100, now: 50 });
		tween.tick(50);
		// Immediately after the interrupt, we're still at the midway value.
		expect(tween.values()[0]).toBeCloseTo(midway, 5);
		tween.tick(150);
		expect(tween.values()[0]).toBe(0);
	});

	test("a length change snaps (no index-misaligned interpolation)", () => {
		const tween = new ValueTween();
		tween.retarget([1, 2], { duration: 0, now: 0 });
		tween.retarget([5, 6, 7], { duration: 100, now: 0 });
		expect(tween.active).toBe(false);
		expect([...tween.values()]).toEqual([5, 6, 7]);
	});

	test("NaN endpoints snap to the target instead of interpolating through NaN", () => {
		const tween = new ValueTween();
		tween.retarget([Number.NaN, 10], { duration: 0, now: 0 });
		tween.retarget([5, 20], { duration: 100, now: 0 });
		tween.tick(50);
		// index 0 came from NaN: snaps to 5. index 1 interpolates normally.
		expect(tween.values()[0]).toBe(5);
		const interpolated = tween.values()[1] ?? 0;
		expect(interpolated).toBeGreaterThan(10);
		expect(interpolated).toBeLessThan(20);
	});

	test("snap() finishes at the target", () => {
		const tween = new ValueTween();
		tween.retarget([0], { duration: 0, now: 0 });
		tween.retarget([100], { duration: 1000, now: 0 });
		tween.snap();
		expect(tween.active).toBe(false);
		expect(tween.values()[0]).toBe(100);
	});
});

describe("ChaseTween", () => {
	test("jump sets the value instantly with no animation", () => {
		const chase = new ChaseTween();
		chase.jump([0, 100]);
		expect(chase.active).toBe(false);
		expect([...chase.values()]).toEqual([0, 100]);
	});

	test("aim glides toward the target and terminates at it", () => {
		const chase = new ChaseTween({ speed: 0.2 });
		chase.jump([0]);
		chase.aim([100], 0);
		expect(chase.active).toBe(true);
		chase.tick(16.67);
		const first = chase.values()[0] ?? 0;
		expect(first).toBeGreaterThan(0);
		expect(first).toBeLessThan(100);
		// Run the chase out; the snap epsilon must terminate it exactly.
		let time = 16.67;
		let guard = 0;
		while (chase.tick((time += 16.67)) && guard < 1000) {
			guard += 1;
		}
		expect(guard).toBeLessThan(1000);
		expect(chase.values()[0]).toBe(100);
		expect(chase.active).toBe(false);
	});

	test("re-aiming mid-glide continues from the current value — no restart stutter", () => {
		const chase = new ChaseTween({ speed: 0.2 });
		chase.jump([0]);
		chase.aim([100], 0);
		chase.tick(50);
		const midway = chase.values()[0] ?? 0;
		expect(midway).toBeGreaterThan(0);
		chase.aim([200], 50);
		chase.tick(66.67);
		const after = chase.values()[0] ?? 0;
		// Still moving forward from midway, toward the NEW target.
		expect(after).toBeGreaterThan(midway);
		expect(after).toBeLessThan(200);
	});

	test("regular retargets produce continuous motion (never a dead stop between appends)", () => {
		// Simulates a streaming window: the target advances every 12 frames; the
		// chase must keep moving on every single frame in between.
		const chase = new ChaseTween({ speed: 0.14 });
		chase.jump([0, 60]);
		let time = 0;
		let previous = chase.values()[1] ?? 0;
		for (let append = 1; append <= 5; append++) {
			chase.aim([append, 60 + append], time);
			for (let frame = 0; frame < 12; frame++) {
				time += 16.67;
				chase.tick(time);
				const current = chase.values()[1] ?? 0;
				expect(current).toBeGreaterThanOrEqual(previous);
				previous = current;
			}
		}
		expect(previous).toBeGreaterThan(60);
	});

	test("a length change jumps instead of interpolating mismatched vectors", () => {
		const chase = new ChaseTween();
		chase.jump([1, 2]);
		chase.aim([5, 6, 7], 0);
		expect(chase.active).toBe(false);
		expect([...chase.values()]).toEqual([5, 6, 7]);
	});

	test("large dt gaps are clamped so a background tab cannot teleport the glide", () => {
		const chase = new ChaseTween({ speed: 0.14 });
		chase.jump([0]);
		chase.aim([100], 0);
		chase.tick(10_000);
		const after = chase.values()[0] ?? 0;
		expect(after).toBeGreaterThan(0);
		expect(after).toBeLessThan(50);
	});

	test("epoch-magnitude domains still glide — the snap threshold follows the journey, not the target size", () => {
		// Regression: with a snap distance relative to |target| (~1.75e12 epoch
		// ms), a streaming time window's 150ms shift snapped on the first tick
		// and live charts never animated.
		const epoch = 1_750_000_000_000;
		const chase = new ChaseTween({ speed: 0.14 });
		chase.jump([epoch, epoch + 60_000]);
		chase.aim([epoch + 150, epoch + 60_150], 0);
		expect(chase.tick(16.67)).toBe(true);
		const first = chase.values()[0] ?? 0;
		expect(first).toBeGreaterThan(epoch);
		expect(first).toBeLessThan(epoch + 150);
	});

	test("all-zero targets settle promptly instead of chasing to Number.EPSILON", () => {
		// Regression: a magnitude-relative threshold degenerated to EPSILON for
		// zero targets (the 1D/2D collapse factors), burning seconds of
		// invisible full-rate repaints after the morph visually settled.
		const chase = new ChaseTween({ speed: 0.16 });
		chase.jump([1, 1]);
		chase.aim([0, 0], 0);
		let time = 0;
		let frames = 0;
		while (chase.tick((time += 16.67)) && frames < 1000) {
			frames += 1;
		}
		// ~1e-3 of the unit journey settles in well under a second of frames.
		expect(frames).toBeLessThan(60);
		expect(chase.values()[0]).toBe(0);
	});
});
