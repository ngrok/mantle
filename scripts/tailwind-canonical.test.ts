import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	CSS_ENTRY,
	CanonicalFormCache,
	REPO_ROOT,
	applyReplacements,
	cacheKeyFor,
	canonicalForms,
	isClassList,
	isFixerTarget,
	literals,
	loadDesignSystem,
	scanContent,
	shard,
} from "./tailwind-canonical.ts";

/** A stand-in for `designSystem.parseCandidate`: a spacing utility or `flex` parses, anything else does not. */
function parses(token: string): boolean {
	return /^[a-z-]+-\d+$|^flex$/.test(token);
}

it("isFixerTarget owns app and package source but not scripts, cx, fixtures, or markdown", () => {
	expect(isFixerTarget("apps/www/app/root.tsx")).toBe(true);
	expect(isFixerTarget("packages/mantle/src/components/button/button.tsx")).toBe(true);
	expect(isFixerTarget("scripts/tailwind-canonical.test.ts")).toBe(false);
	expect(isFixerTarget("packages/mantle/src/utils/cx/cx.test.ts")).toBe(false);
	expect(isFixerTarget("packages/mantle/migrations/0002-data-table-action-header/before.tsx")).toBe(
		false,
	);
	expect(isFixerTarget("apps/www/app/docs/components/button.mdx")).toBe(false);
});

describe("applyReplacements", () => {
	it("keeps later offsets valid when an earlier replacement changes length", () => {
		const content = 'cx("w-[14rem]", "-ml-[7px]")';

		expect(
			applyReplacements(content, [
				{ position: 4, candidate: "w-[14rem]", canonical: "w-56" },
				{ position: 17, candidate: "-ml-[7px]", canonical: "ml-[-7px]" },
			]),
		).toBe('cx("w-56", "ml-[-7px]")');
	});

	it("refuses a replacement whose candidate is not at its offset", () => {
		expect(() =>
			applyReplacements("a b", [{ position: 0, candidate: "b", canonical: "c" }]),
		).toThrow('Candidate "b" is not at offset 0');
	});
});

describe("literals", () => {
	it("covers string and template literals but not comments or JSX text", () => {
		const content =
			'// flex-shrink\nconst a = cx("flex", `grow ${b}`);\nconst c = <p>flex-shrink</p>;';

		expect(literals(content, "x.tsx")).toEqual([
			{ start: 29, text: "flex" },
			{ start: 37, text: "grow " },
			{ start: 46, text: "" },
		]);
	});

	it("skips an argument to a function other than a class function, and an object key", () => {
		const content =
			'el.style.setProperty("flex-shrink", "0");\nconst style = { "flex-shrink": 0 };';

		expect(literals(content, "x.ts")).toEqual([]);
	});

	it("skips a comparison operand, a case test, a JSX child, and an attribute that takes no class", () => {
		const content =
			'cx(property === "flex-shrink" && "border-1");\nswitch (a) { case "flex-shrink": break; }\n<input name="flex-shrink" className="grow" />;\n<p>{"flex-shrink"}</p>;';

		expect(literals(content, "x.tsx").map(({ text }) => text)).toEqual(["border-1", "grow"]);
	});

	it("skips one bare word outside a class attribute or a class function", () => {
		const content =
			'const property = "flex-shrink";\nconst a = "flex p-2";\ncx("grow");\n<div className="shrink" />;';

		expect(literals(content, "x.tsx").map(({ text }) => text)).toEqual([
			"flex p-2",
			"grow",
			"shrink",
		]);
	});

	it("skips the name of a class field, an interface member, and an enum member", () => {
		const content =
			'class S { "flex-shrink" = "grow p-2"; }\ninterface T { "flex-shrink": number }\nenum U { "flex-shrink" = 1 }';

		expect(literals(content, "x.ts").map(({ text }) => text)).toEqual(["grow p-2"]);
	});

	it("covers a class function's arguments and object keys, and JSX inside another call", () => {
		const content = 'cx("grow", { "shrink-0": a });\nrender(<div className="flex" />);';

		expect(literals(content, "x.tsx").map(({ text }) => text)).toEqual([
			"grow",
			"shrink-0",
			"flex",
		]);
	});

	it("keeps template offsets valid in a file with CRLF line endings", () => {
		const content = "const a = `flex\r\n-ml-[7px]`;";

		expect(literals(content, "x.ts")).toEqual([{ start: 11, text: "flex\r\n-ml-[7px]" }]);
	});
});

describe("isClassList", () => {
	it("accepts a list where more than half of the tokens are utilities", () => {
		expect(isClassList("group mt-2 p-4", parses)).toBe(true);
	});

	it("rejects a sentence with one utility name in it", () => {
		expect(isClassList("Set flex on the row", parses)).toBe(false);
		expect(isClassList("Use mt-2", parses)).toBe(false);
	});

	it("rejects CSS text whatever its tokens", () => {
		expect(isClassList("mt-2 { flex: 1 }", parses)).toBe(false);
	});
});

it("shard deals items round-robin into no more shards than there are items", () => {
	expect(shard(["a", "b", "c"], 2)).toEqual([["a", "c"], ["b"]]);
	expect(shard(["a"], 4)).toEqual([["a"]]);
});

// Why: one real design system, because the point of the script is this wiring.
it("scanContent finds classes in class lists and skips a comment and a stylesheet", async () => {
	const content =
		'// uses flex-shrink\nconst a = cx("flex-shrink");\nconst css = `.shrink-0 { flex-shrink: 0 }`;';

	const hits = scanContent(content, "apps/www/app/x.tsx", await loadDesignSystem(CSS_ENTRY));

	expect(hits).toEqual([{ position: 34, candidate: "flex-shrink" }]);
});

/**
 * Only the theme tokens that the canonicalForms rows read.
 *
 * Why: the rows test which rewrites the fixer keeps, not mantle's token values. Tailwind builds its
 * lookup tables on the first canonicalizeCandidates call, and the build time grows with the theme.
 * For this theme it is about 0.35 s. For the full mantle theme it takes seconds.
 */
const FIXTURE_THEME = `@theme {
	--spacing: 0.25rem;
	--color-tooltip: #000;
	--color-red-500: oklch(63.7% 0.237 25.331);
	--container-lg: 32rem;
	--breakpoint-lg: 64rem;
	--text-base: 1rem;
	--leading-normal: 1.5;
	--text-color-muted: #6b7280;
}
@tailwind utilities;`;

describe("canonicalForms", () => {
	let designSystem: Awaited<ReturnType<typeof loadDesignSystem>>;

	// The first call builds the lookup tables, so no test pays for the build.
	beforeAll(async () => {
		designSystem = await __unstable__loadDesignSystem(FIXTURE_THEME, { base: REPO_ROOT });
		designSystem.canonicalizeCandidates(["p-4"]);
	});

	it("keeps a literal or a scale step that would become a theme token", () => {
		expect(
			canonicalForms(designSystem, [
				"bg-[#000]",
				"[background-color:#000]",
				"w-128",
				"min-[64rem]:grid-cols-2",
				"not-min-[64rem]:flex",
				"[@media(width>=64rem)]:flex",
				"min-[64rem]:[&_[data-slot=icon]]:p-1",
				"text-base/[1.5]",
				"w-[calc(var(--spacing)*128)]",
			]),
		).toEqual([
			["bg-[#000]", "bg-[#000]"],
			["[background-color:#000]", "[background-color:#000]"],
			["w-128", "w-128"],
			["min-[64rem]:grid-cols-2", "min-[64rem]:grid-cols-2"],
			["not-min-[64rem]:flex", "not-min-[64rem]:flex"],
			["[@media(width>=64rem)]:flex", "[@media(width>=64rem)]:flex"],
			["min-[64rem]:[&_[data-slot=icon]]:p-1", "min-[64rem]:[&_[data-slot=icon]]:p-1"],
			["text-base/[1.5]", "text-base/[1.5]"],
			["w-[calc(var(--spacing)*128)]", "w-[calc(var(--spacing)*128)]"],
		]);
	});

	// Why: Tailwind compiles `100%-var(--_x)` to `var(-- x)`, so the canonical form drops `--_x`.
	it("keeps a calc whose canonical form drops a variable", () => {
		expect(canonicalForms(designSystem, ["max-w-[calc(100%_-_var(--_x))]"])).toEqual([
			["max-w-[calc(100%_-_var(--_x))]", "max-w-[calc(100%_-_var(--_x))]"],
		]);
	});

	it("still rewrites a scale step, a variable the source names, a renamed utility, and a renamed variant", () => {
		expect(
			canonicalForms(designSystem, [
				"w-[7.5rem]",
				"text-[var(--text-color-muted)]",
				"[color:var(--color-red-500)]",
				"bg-gradient-to-r",
				"bg-red-500/[50%]",
				"[&_[data-slot=icon]]:p-1",
				"data-[active]:opacity-100",
			]),
		).toEqual([
			["w-[7.5rem]", "w-30"],
			["text-[var(--text-color-muted)]", "text-muted"],
			["[color:var(--color-red-500)]", "text-red-500"],
			["bg-gradient-to-r", "bg-linear-to-r"],
			["bg-red-500/[50%]", "bg-red-500/50"],
			["[&_[data-slot=icon]]:p-1", "**:data-[slot=icon]:p-1"],
			["data-[active]:opacity-100", "data-active:opacity-100"],
		]);
	});
});

describe("CanonicalFormCache", () => {
	let cacheDirectory: string;

	beforeEach(async () => {
		cacheDirectory = await mkdtemp(path.join(tmpdir(), "tailwind-canonical-"));
	});

	afterEach(async () => {
		await rm(cacheDirectory, { recursive: true, force: true });
	});

	it("keeps the forms another run saved after this one loaded", async () => {
		const first = await CanonicalFormCache.load(CSS_ENTRY, { cacheDirectory });
		const second = await CanonicalFormCache.load(CSS_ENTRY, { cacheDirectory });
		first.set("probe-[1px]", "probe-px");
		second.set("probe-[2px]", "probe-0.5");
		await first.save();
		await second.save();

		const reloaded = await CanonicalFormCache.load(CSS_ENTRY, { cacheDirectory });

		expect([reloaded.get("probe-[1px]"), reloaded.get("probe-[2px]")]).toEqual([
			"probe-px",
			"probe-0.5",
		]);
	});

	it("drops every form when the file carries another key", async () => {
		const file = path.join(cacheDirectory, `${CSS_ENTRY.replaceAll("/", "__")}.json`);
		await writeFile(
			file,
			JSON.stringify({ key: "an older tailwind", forms: { "probe-[1px]": "probe-px" } }),
		);

		const cache = await CanonicalFormCache.load(CSS_ENTRY, { cacheDirectory });

		expect(cache.get("probe-[1px]")).toBeUndefined();
	});
});

describe("cacheKeyFor", () => {
	let directory: string;

	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), "tailwind-canonical-key-"));
	});

	afterEach(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	it("changes when a stylesheet the entry imports changes", async () => {
		const entry = path.join(directory, "entry.css");
		await writeFile(entry, '@import "./theme.css";');
		await writeFile(path.join(directory, "theme.css"), "@theme { --spacing: 4px; }");
		const before = await cacheKeyFor(entry);

		await writeFile(path.join(directory, "theme.css"), "@theme { --spacing: 1px; }");

		expect(await cacheKeyFor(entry)).not.toBe(before);
	});
});
