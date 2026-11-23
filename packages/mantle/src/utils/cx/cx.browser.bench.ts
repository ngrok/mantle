import { expect, test } from "vitest";
import { cx } from "./cx.js";
import { mergeClassList } from "./merge.js";

/**
 * Real-browser (Chromium/V8) benchmarks for `cx`. `cx` keeps two caches over the merge in
 * `./merge.ts`: an argument cache keyed on the first argument (`./cx.ts`) and a per-call-site
 * cache for the tagged-template form. Each workload races a merge of the same class list, so a
 * cache that stops hitting loses the race. Vitest owns the sampling and the comparison, so the
 * file carries no wall-clock threshold.
 *
 * Why not a pool of unique strings as the baseline: the merge memoizes each class's group, so a
 * repeated string beats unique strings with no `cx` cache at all, and the race cannot fail.
 */

const STATIC =
	"flex items-center justify-between gap-2 rounded border px-4 py-2 text-sm font-medium";
const BASE = "flex items-center px-4 py-2";

test("cache hits and tagged templates beat a merge of the same classes", async ({ bench }) => {
	let variadicIndex = 0;
	let templateIndex = 0;
	let mergeIndex = 0;

	const result = await bench.compare(
		bench("merge (same classes, no cx cache)", () =>
			mergeClassList(`${BASE} ${mergeIndex++ % 2 === 0 ? "bg-blue-500 " : ""}text-sm`)),
		// The same string every call, so the argument cache hits after the second.
		bench("cached (repeated string)", () => cx(STATIC)),
		// Stable base classes plus a toggled variant, so the argument cache hits with no join.
		bench("variadic (stable args, arg cache)", () =>
			cx(BASE, variadicIndex++ % 2 === 0 && "bg-blue-500", "text-sm")),
		// One stable call site that cycles a boolean, so the call-site cache hits.
		bench("template (stable call site)", () =>
			cx`flex items-center px-4 py-2 ${templateIndex++ % 2 === 0 && "bg-blue-500"} text-sm`),
		// Why short runs: a cache hit is many times faster than a merge, so 100 ms of samples
		// separates them; the default second per workload adds about 20 s and no signal.
		{ time: 100, warmupTime: 20 },
	);

	const merge = result.get("merge (same classes, no cx cache)");
	expect(result.get("cached (repeated string)")).toBeFasterThan(merge);
	expect(result.get("variadic (stable args, arg cache)")).toBeFasterThan(merge);
	expect(result.get("template (stable call site)")).toBeFasterThan(merge);
});
