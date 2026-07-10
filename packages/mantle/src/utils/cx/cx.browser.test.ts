import { describe, expect, test } from "vitest";
import { cx } from "./cx.js";

/**
 * Real-browser (Chromium/V8) profiling for `cx`. `cx` layers three caches over the vendored
 * merge engine — a whole-string result cache (`./vendor/lib/tw-merge.ts`), a per-call-site
 * cache for the tagged-template form (`./vendor/lib/merge-template.ts`), and a V8-only
 * arg-sequence cache (in `./cx.ts`) — so we validate the speedups against a cold merge in a
 * real browser rather than happy-dom. These assert the *relative* claims (cache hits beat a
 * cold full merge) and log ops/sec so the run doubles as a profile. They are intentionally
 * generous to stay non-flaky in CI.
 */

// Realistic, conflict-bearing class lists in the spirit of mantle components.
const SAMPLES = [
	"flex items-center justify-between gap-2 rounded border px-4 py-2 text-sm font-medium",
	"bg-blue-500 text-white hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-blue-400",
	"absolute inset-0 z-10 grid place-items-center bg-black/50 p-4 p-6",
	"text-red-500 text-blue-500 mb-2 text-base leading-4 text-xl leading-5",
	"p-4 pt-5 pb-6 pr-3 pb-3 m-2 mx-4 mt-1",
	"w-4 w-em h-em h-6 size-4 size-em gap-4 gap-em",
	"rounded-md rounded-lg shadow shadow-md border border-2 border-form",
	"transition-colors duration-150 ease-in-out hover:opacity-80 disabled:opacity-50",
];

type BenchResult = { label: string; opsPerSec: number; elapsedMs: number };

/** Time `fn` over `iterations` calls after a warmup, returning ops/sec. */
function bench(label: string, iterations: number, fn: (index: number) => string): BenchResult {
	const warmup = Math.min(iterations, 10_000);
	for (let index = 0; index < warmup; index++) {
		fn(index);
	}
	const start = performance.now();
	for (let index = 0; index < iterations; index++) {
		fn(index);
	}
	const elapsedMs = performance.now() - start;
	return { label, opsPerSec: (iterations / elapsedMs) * 1000, elapsedMs };
}

describe("cx — browser correctness (real V8)", () => {
	test("resolves conflicts and mantle overrides in a real browser", () => {
		expect(cx("p-4 p-8")).toBe("p-8");
		expect(cx("text-mono text-base")).toBe("text-base");
		expect(cx("w-4 w-em")).toBe("w-em");
		expect(cx`px-2 px-4 ${"bg-blue-500"}`).toBe("px-4 bg-blue-500");
		expect(cx("bg-blue-500", "bg-red-500")).toBe("bg-red-500");
	});
});

describe("cx — performance profile (real V8)", () => {
	test("cache hits and tagged templates beat a cold merge", () => {
		// Cold: a large pool of distinct strings, cycled so the whole-string LRU mostly misses
		// and each call pays a full split + conflict resolution.
		const coldPool: string[] = [];
		for (let index = 0; index < 3000; index++) {
			coldPool.push(`${SAMPLES[index % SAMPLES.length]} mt-${index} pb-${index % 97}`);
		}
		const cold = bench("cold (unique strings, full merge)", 150_000, (index) =>
			cx(coldPool[index % coldPool.length]),
		);

		// Cached: the same string every call — whole-string cache hits after the first.
		const cachedInput = SAMPLES[0];
		const cached = bench("cached (repeated string)", 1_000_000, () => cx(cachedInput));

		// Variadic component-style call: stable base classes + a couple of toggled variants,
		// exercising the V8 arg-sequence cache (no re-hash of the joined string).
		const variadic = bench("variadic (stable args, arg cache)", 1_000_000, (index) =>
			cx("flex items-center px-4 py-2", index % 2 === 0 && "bg-blue-500", "text-sm"),
		);

		// Tagged template: a single stable call site cycling a boolean — call-site cache hits.
		const template = bench(
			"template (stable call site)",
			1_000_000,
			(index) => cx`flex items-center px-4 py-2 ${index % 2 === 0 && "bg-blue-500"} text-sm`,
		);

		const results = [cold, cached, variadic, template];
		const fmt = (value: number) => `${(value / 1000).toFixed(0)}k ops/s`;
		// Surfaced in the reporter output as the in-browser profile (console.log forwards
		// from the browser; console.table does not).
		console.log("=== cx in-browser profile (Chromium/V8) ===");
		for (const result of results) {
			console.log(
				`${result.label.padEnd(36)} ${fmt(result.opsPerSec).padStart(12)}  ${(result.opsPerSec / cold.opsPerSec).toFixed(1)}x vs cold`,
			);
		}

		// Relative claims (generous margins to stay non-flaky):
		expect(cached.opsPerSec).toBeGreaterThan(cold.opsPerSec);
		expect(variadic.opsPerSec).toBeGreaterThan(cold.opsPerSec);
		expect(template.opsPerSec).toBeGreaterThan(cold.opsPerSec);
		// Cache hits should be dramatically faster than a cold merge.
		expect(cached.opsPerSec).toBeGreaterThan(cold.opsPerSec * 3);
	});
});
