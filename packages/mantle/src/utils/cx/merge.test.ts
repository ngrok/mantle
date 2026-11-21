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

test("merges arbitrary values and variables like tailwind-merge", async () => {
	// Tailwind's class list has no arbitrary values, so these pair each root that reads the kind of
	// its value with labeled and unlabeled values of each kind, and with its own Tailwind classes.
	const tailwindClasses = await loadTailwindClasses();
	const values = [
		"[2px]",
		"[2cap]",
		"[2vi]",
		"[3svb]",
		"[0]",
		"[12]",
		"[1.5]",
		"[.5em]",
		"[calc(1px+2px)]",
		"[--spacing(4)]",
		"[#fff]",
		"[rgb(0_0_0)]",
		"[hsl(0_0%_0%)]",
		"[light-dark(#000,#fff)]",
		"[url(a.png)]",
		"[image-set(url(a.png)_1x)]",
		"[cross-fade(url(a),url(b))]",
		"[element(#a)]",
		"[linear-gradient(red,blue)]",
		"[0_1px_2px_black]",
		"[.5px_1px_2px_black]",
		"[inset_0_1px_red]",
		"[length:2px]",
		"[size:2px]",
		"[bg-size:2px]",
		"[percentage:50%]",
		"[position:10px]",
		"[color:red]",
		"[image:url(a)]",
		"[url:a]",
		"[shadow:a]",
		"[number:3]",
		"[weight:600]",
		"[family-name:x]",
		"[something]",
		"(--x)",
		"(length:--x)",
		"(size:--x)",
		"(position:--x)",
		"(percentage:--x)",
		"(color:--x)",
		"(image:--x)",
		"(shadow:--x)",
		"(weight:--x)",
		"(family-name:--x)",
		"(number:--x)",
	];
	const roots = [
		"text",
		"font",
		"bg",
		"decoration",
		"shadow",
		"inset-shadow",
		"text-shadow",
		"drop-shadow",
		"ring",
		"inset-ring",
		"ring-offset",
		"outline",
		"stroke",
		"from",
		"via",
		"to",
		"mask",
		"mask-linear-from",
		"mask-t-to",
		"mask-x-from",
		"border",
		"border-x",
		"border-t",
		"tab",
		"transform",
		"w",
		"p",
		"leading",
		"filter",
		"backdrop-filter",
		"col",
		"row",
		"col-span",
		"@container",
	];
	const containers = [
		"@container",
		"@container-normal",
		"@container-size",
		"@container/a",
		"@container-size/b",
		"@container-normal/c",
	];
	const groups = [
		...roots.map((root) => {
			const own = tailwindClasses.filter((className) => className.startsWith(`${root}-`));
			const step = Math.max(1, Math.floor(own.length / 16));
			return [
				...own.filter((_, index) => index % step === 0),
				...values.map((value) => `${root}-${value}`),
			];
		}),
		containers,
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
	expect(pairCount).toBeGreaterThan(90_000);
	expect(mismatches.slice(0, 10), `${mismatches.length} of ${pairCount} pairs differ`).toEqual([]);
});

test("keeps a custom class that shares a root with a Tailwind utility", async () => {
	// A plugin or app class such as `animate-in` or `items-brand` sets its own properties, so a
	// Tailwind utility with the same root must not remove it, and it must not remove the utility.
	const classes = await loadTailwindClasses();
	const mismatches: { input: string; expected: string; actual: string }[] = [];
	let pairCount = 0;
	for (const className of classes) {
		const root = /^-?(.+)-[^-]+$/.exec(className)?.[1];
		if (root == null) {
			continue;
		}
		for (const input of [`${root}-brand ${className}`, `${className} ${root}-brand`]) {
			pairCount++;
			const expected = oracle(input);
			const actual = mergeClassList(input);
			if (actual !== expected) {
				mismatches.push({ input, expected, actual });
			}
		}
	}
	expect(pairCount).toBeGreaterThan(40_000);
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
