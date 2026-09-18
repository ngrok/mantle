import { expect, test } from "vitest";
import { type ClassValue, cx } from "./cx.js";
import fixtureData from "./__fixtures__/parity.json" with { type: "json" };

type ParityCase = { args: ClassValue[]; expected: string };

// `expected` was frozen by running the PREVIOUS implementation (clsx + extendTailwindMerge)
// over a corpus harvested from this repo plus curated edge cases — the byte-for-byte oracle
// the vendored engine must reproduce. See ./vendor/README.md.
const fixture: ParityCase[] = fixtureData;

test("cx produces byte-identical output to the clsx + extendTailwindMerge oracle for every fixture case", () => {
	// Why the guard: on an empty or truncated fixture the loop below passes vacuously.
	if (fixture.length <= 3000) {
		throw new Error(`parity fixture holds ${fixture.length} cases; expected more than 3000`);
	}
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

/**
 * Type-level contracts, owned by `pnpm typecheck` rather than by a `test()`: a runtime
 * `expect` beside them would read as coverage the vitest run does not have. `cx` stays
 * assignable to the `(...inputs: ClassValue[]) => string` signature that
 * `apps/www/app/docs/utils/cx.mdx` documents. Its parameter list reads back as
 * `ClassValue[]` and its return type as `string`.
 */
export function typeLevelContracts() {
	const legacy: (...inputs: ClassValue[]) => string = cx;
	const params: Parameters<typeof cx> = [
		"flex",
		{ active: true },
		["px-4", false],
		null,
		undefined,
		1,
	];
	const result: ReturnType<typeof cx> = legacy(...params);
	const asString: string = result;
	return asString;
}
