import { expect, test } from "vitest";
import { cx } from "./cx.js";

/**
 * Real-browser (Chromium/V8) benchmarks for `cx`. `cx` layers three caches over the vendored
 * merge engine: a whole-string result cache (`./vendor/lib/tw-merge.ts`), a per-call-site cache
 * for the tagged-template form (`./vendor/lib/merge-template.ts`), and a V8-only arg-sequence
 * cache (`./cx.ts`). The test registers a cold merge and one workload per cache through the
 * `bench` fixture, then asserts each cache hit is faster than the cold merge with
 * `toBeFasterThan`. Vitest owns the sampling and the comparison, so the file carries no
 * wall-clock threshold.
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

test("cache hits and tagged templates beat a cold merge", async ({ bench }) => {
	// Why a 3000-string pool: the whole-string LRU cannot hold it, so each cold call pays a
	// full split and conflict resolution.
	const coldPool: string[] = [];
	for (let index = 0; index < 3000; index++) {
		coldPool.push(`${SAMPLES[index % SAMPLES.length]} mt-${index} pb-${index % 97}`);
	}
	let coldIndex = 0;
	let variadicIndex = 0;
	let templateIndex = 0;
	const cachedInput = SAMPLES[0];

	const result = await bench.compare(
		bench("cold (unique strings, full merge)", () => cx(coldPool[coldIndex++ % coldPool.length])),
		// The same string every call, so the whole-string cache hits after the first.
		bench("cached (repeated string)", () => cx(cachedInput)),
		// Stable base classes plus a toggled variant, so the V8 arg-sequence cache hits with no
		// re-hash of the joined string.
		bench("variadic (stable args, arg cache)", () =>
			cx("flex items-center px-4 py-2", variadicIndex++ % 2 === 0 && "bg-blue-500", "text-sm")),
		// One stable call site that cycles a boolean, so the call-site cache hits.
		bench("template (stable call site)", () =>
			cx`flex items-center px-4 py-2 ${templateIndex++ % 2 === 0 && "bg-blue-500"} text-sm`),
	);

	const cold = result.get("cold (unique strings, full merge)");
	expect(result.get("cached (repeated string)")).toBeFasterThan(cold);
	expect(result.get("variadic (stable args, arg cache)")).toBeFasterThan(cold);
	expect(result.get("template (stable call site)")).toBeFasterThan(cold);
});
