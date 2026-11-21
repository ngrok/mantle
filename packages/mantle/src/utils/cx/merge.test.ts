import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { extendTailwindMerge, validators } from "tailwind-merge";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { expect, test } from "vitest";
import { mergeClassList } from "./merge.js";

// The oracle: tailwind-merge with mantle's utilities and its one conflict choice added.
const oracle = extendTailwindMerge({
	extend: {
		conflictingClassGroups: { "font-size": ["leading"] },
		theme: { spacing: ["em"], ease: ["out-strong"] },
		classGroups: {
			"font-size": [
				"text-mono",
				"text-size-inherit",
				{ "text-heading": ["base", validators.isTshirtSize] },
				{ "text-paragraph": ["base", validators.isTshirtSize] },
			],
		},
	},
});

const loadTailwindClasses = async () => {
	const require = createRequire(import.meta.url);
	const themePath = require.resolve("tailwindcss/theme.css");
	const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss/theme";', {
		base: process.cwd(),
		loadStylesheet: async () => ({
			content: readFileSync(themePath, "utf8"),
			base: "/",
			path: themePath,
		}),
	});
	return designSystem.getClassList().map(([className]) => className);
};

test("merges each Tailwind utility with its look-alikes like tailwind-merge", async () => {
	const classes = await loadTailwindClasses();
	// Why a guard: an empty class list passes the loop below with no check.
	expect(classes.length).toBeGreaterThan(20_000);
	// Pair each class with a sample of the classes that share its first segment (`text-`, `bg-`,
	// `border-`, …), in both orders. Those are the pairs where a wrong class group shows.
	const families = new Map<string, string[]>();
	for (const className of classes) {
		const family = className.replace(/^[-!@]/, "").split(/[-[(]/)[0] ?? "";
		families.set(family, [...(families.get(family) ?? []), className]);
	}
	const mismatches: { input: string; expected: string; actual: string }[] = [];
	let pairCount = 0;
	for (const members of families.values()) {
		const step = Math.max(1, Math.floor(members.length / 12));
		const sample = members.filter((_, index) => index % step === 0);
		for (const member of members) {
			for (const other of sample) {
				for (const input of [`${member} ${other}`, `${other} ${member}`]) {
					pairCount++;
					const expected = oracle(input);
					const actual = mergeClassList(input);
					if (actual !== expected) {
						mismatches.push({ input, expected, actual });
					}
				}
			}
		}
	}
	// Pair each keyword class (`absolute`, `truncate`, `sr-only`, …) with a sample of every class,
	// for the conflicts that cross families, such as `sr-only` over `p-*` and `overflow-*`.
	const keywords = classes.filter(
		(className) => !className.includes("-") || className.endsWith("sr-only"),
	);
	const sampled = classes.filter((_, index) => index % 10 === 0);
	for (const keyword of keywords) {
		for (const other of sampled) {
			for (const input of [`${keyword} ${other}`, `${other} ${keyword}`]) {
				pairCount++;
				const expected = oracle(input);
				const actual = mergeClassList(input);
				if (actual !== expected) {
					mismatches.push({ input, expected, actual });
				}
			}
		}
	}
	expect(pairCount).toBeGreaterThan(600_000);
	expect(mismatches.slice(0, 10), `${mismatches.length} of ${pairCount} pairs differ`).toEqual([]);
});
