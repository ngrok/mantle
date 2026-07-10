import { describe, expect, test } from "vitest";
import { type ClassValue, cx } from "./cx.js";
import fixtureData from "./__fixtures__/parity.json" with { type: "json" };

type ParityCase = { args: ClassValue[]; expected: string };

// `expected` was frozen by running the PREVIOUS implementation (clsx + extendTailwindMerge)
// over a corpus harvested from this repo plus curated edge cases — the byte-for-byte oracle
// the vendored engine must reproduce. See ./vendor/README.md.
const fixture: ParityCase[] = fixtureData;

describe("cx — parity with the previous clsx + extendTailwindMerge implementation", () => {
	test("fixture is non-trivial", () => {
		expect(fixture.length).toBeGreaterThan(3000);
	});

	test("produces byte-identical output for every fixture case", () => {
		const mismatches: Array<{ args: ClassValue[]; expected: string; actual: string }> = [];
		for (const { args, expected } of fixture) {
			const actual = cx(...args);
			if (actual !== expected) {
				mismatches.push({ args, expected, actual });
			}
		}

		expect(
			mismatches.slice(0, 10),
			`${mismatches.length} of ${fixture.length} cases diverged from the oracle`,
		).toEqual([]);
	});
});

describe("cx — type compatibility with the historical contract", () => {
	// The contract documented at apps/www/app/docs/utils/cx.mdx and shipped before vendoring.
	type LegacyCx = (...inputs: ClassValue[]) => string;

	test("cx is assignable to (...inputs: ClassValue[]) => string", () => {
		// Compile-time proof (checked by `tsc`): an incompatible signature fails to assign.
		const legacy: LegacyCx = cx;
		expect(typeof legacy).toBe("function");
		expect(legacy("p-4", "p-8")).toBe("p-8");
	});

	test("Parameters<typeof cx> is exactly ClassValue[]", () => {
		// If the variadic parameter type changed, this annotation would fail to typecheck.
		const params: Parameters<typeof cx> = [
			"flex",
			{ active: true },
			["px-4", false],
			null,
			undefined,
			1,
		];
		expect(cx(...params)).toBe("flex active px-4 1");
	});

	test("ReturnType<typeof cx> is exactly string", () => {
		const result: ReturnType<typeof cx> = cx("p-4");
		const asString: string = result;
		expect(asString).toBe("p-4");
	});
});
