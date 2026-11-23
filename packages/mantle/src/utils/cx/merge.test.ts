import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Scanner } from "@tailwindcss/oxide";
import { extendTailwindMerge, validators } from "tailwind-merge";
import { parseSync } from "oxc-parser";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { expect, test } from "vitest";
import mantleCss from "../../mantle.css?raw";
import { loadMantleImport } from "../../test-utils/parse-theme-css.js";
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

test("merges the arbitrary values that mantle and its apps use like tailwind-merge", async () => {
	// Tailwind's class list has no arbitrary values. These are the kinds of arbitrary value that
	// mantle, ngrok-private/frontend, and ngrok-private/ngrok write, on the roots that read the
	// kind of their value. decisions/2026-11-21-cx-merge-scope.md lists the kinds out of scope.
	const tailwindClasses = await loadTailwindClasses();
	const values: Record<string, string[]> = {
		text: ["[1.5rem]", "[.5em]", "[12px]", "[2cqi]", "[#fff]", "(--x)"],
		bg: ["[#fff]", "[Highlight]", "[radial-gradient(red_1px,transparent_1px)]", "(--x)"],
		shadow: ["[inset_0_0_2px_2px_var(--x)]", "[0_1px_0_rgb(0_0_0/0.1)]", "(--x)"],
		"drop-shadow": ["[0_1px_2px_rgb(0_0_0/0.1)]"],
		ring: ["(--x)"],
		outline: ["[Highlight]"],
		border: ["[#fff]", "[Highlight]", "[2px]", "(--x)"],
		from: ["[#fff]"],
		leading: ["[1.5em]", "[1.2]", "[2cqw]"],
		w: ["[2px]", "[calc(100%-2rem)]", "(--x)"],
		p: ["[2px]", "(--x)"],
		row: ["[1/span_2]"],
	};
	const groups = [
		...Object.entries(values).map(([root, rootValues]) => {
			const own = tailwindClasses.filter((className) => className.startsWith(`${root}-`));
			const step = Math.max(1, Math.floor(own.length / 16));
			return [
				...own.filter((_, index) => index % step === 0),
				...rootValues.map((value) => `${root}-${value}`),
			];
		}),
		// Container names, which frontend uses with `@container-size`.
		["@container", "@container-normal", "@container-size", "@container/a", "@container-size/b"],
		// Variant order: tailwind-merge sorts variants, except around `before`, `after`, `*`, and an
		// arbitrary variant, where the order changes the selector.
		[
			"hover:md:p-2",
			"md:hover:p-4",
			"before:hover:p-2",
			"hover:before:p-4",
			"[&>*]:hover:p-2",
			"hover:[&>*]:p-4",
			"*:hover:p-1",
			"hover:*:p-3",
		],
	];
	const mismatches: { input: string; expected: string; actual: string }[] = [];
	let pairCount = 0;
	for (const classes of groups) {
		for (const first of classes) {
			for (const second of classes) {
				const input = `${first} ${second}`;
				pairCount++;
				const expected = oracle(input);
				const actual = mergeClassList(input);
				if (actual !== expected) {
					mismatches.push({ input, expected, actual });
				}
			}
		}
	}
	expect(pairCount).toBeGreaterThan(5000);
	expect(mismatches.slice(0, 10), `${mismatches.length} of ${pairCount} pairs differ`).toEqual([]);
});

test("keeps a variant class apart from plain classes when one merge has many variant stacks", () => {
	// The 65,536th variant stack would wrap its id to the id of a class with no variants. The first
	// merge fills the variant slots past their limit, so the second one starts from empty slots.
	mergeClassList(Array.from({ length: 5000 }, (_, index) => `aria-[i=${index}]:block`).join(" "));
	const blocks = Array.from({ length: 65_535 }, (_, index) => `data-[i=${index}]:block`);
	const result = mergeClassList(["p-2", ...blocks, "data-[i=last]:p-4"].join(" "));
	expect(result.startsWith("p-2 ")).toBe(true);
});

test("names no class in its tables that Tailwind builds", async () => {
	// Why: Tailwind scans mantle's built JavaScript, which keeps these tables and drops the
	// comments, so a class that a table names gets built on each page that imports cx. The
	// tables separate names with commas, which the scanner does not split on. The code itself
	// still names a few roots, value kinds, and class groups; most pages build those classes anyway.
	const mergeSource = readFileSync(createRequire(import.meta.url).resolve("./merge.ts"), "utf8");
	const { comments } = parseSync("merge.ts", mergeSource);
	const source = comments.reduceRight(
		(text, { start, end }) => text.slice(0, start) + text.slice(end),
		mergeSource,
	);
	const candidates = new Scanner({}).scanFiles([{ content: source, extension: "js" }]);
	const designSystem = await __unstable__loadDesignSystem(mantleCss, {
		loadStylesheet: loadMantleImport,
	});
	const css = designSystem.candidatesToCss(candidates);
	expect(candidates.filter((_, index) => css[index] != null).toSorted()).toEqual([
		"border",
		"font-family",
		"outline",
		"scrollbar",
		"shadow",
		"text-wrap",
		"transform",
	]);
});
