import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const pluginPath = path.join(import.meta.dirname, "oxlint-plugin-mantle.js");
const oxlintPath = path.join(import.meta.dirname, "..", "node_modules", ".bin", "oxlint");

let rootDir = "";

beforeEach(() => {
	rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "mantle-oxlint-plugin-"));
	return () => fs.rmSync(rootDir, { recursive: true, force: true });
});

/** Lint one fixture with one plugin rule turned on, and return the rule IDs oxlint reports, one per line. */
function lint({
	rule,
	fileName,
	source,
}: {
	rule: string;
	fileName: string;
	source: string;
}): string[] {
	fs.writeFileSync(
		path.join(rootDir, ".oxlintrc.json"),
		JSON.stringify({
			jsPlugins: [pluginPath],
			categories: {},
			rules: { [`mantle/${rule}`]: "error" },
		}),
	);
	fs.writeFileSync(path.join(rootDir, fileName), source);
	const result = spawnSync(oxlintPath, ["--format=unix", fileName], {
		cwd: rootDir,
		encoding: "utf8",
	});
	return [...result.stdout.matchAll(/\[Error\/mantle\(([a-z-]+)\)\]/g)].map(
		(match) => match[1] ?? "",
	);
}

/** Run `oxlint --fix` on one fixture with one plugin rule turned on, and return the fixed source. */
function fix({ rule, source }: { rule: string; source: string }): string {
	lint({ rule, fileName: "a.ts", source });
	spawnSync(oxlintPath, ["--fix", "a.ts"], { cwd: rootDir, encoding: "utf8" });
	return fs.readFileSync(path.join(rootDir, "a.ts"), "utf8");
}

describe("multiline-exports", () => {
	it("keeps a string export name and a type modifier when it expands the list", () => {
		const source = 'const a = 1;\nexport { a as "a-b", type T };\n';

		expect(fix({ rule: "multiline-exports", source })).toBe(
			'const a = 1;\nexport {\n\t//,\n\ta as "a-b",\n\ttype T,\n};\n',
		);
	});

	it("reports a list that holds a comment but does not fix it", () => {
		const source = "const a = 1;\nexport { a, /* keep */ a as b };\n";

		expect(lint({ rule: "multiline-exports", fileName: "a.ts", source })).toEqual([
			"multiline-exports",
		]);
		expect(fix({ rule: "multiline-exports", source })).toBe(source);
	});
});

describe("no-jsx-null-ternary", () => {
	it("reports a ternary with a null arm inside JSX", () => {
		const source =
			"export const A = ({ on }: { on: boolean }) => <div>{on ? <b /> : null}</div>;\n";

		expect(lint({ rule: "no-jsx-null-ternary", fileName: "a.tsx", source })).toEqual([
			"no-jsx-null-ternary",
		]);
	});

	it("reports a ternary with a null first arm inside JSX", () => {
		const source =
			"export const A = ({ off }: { off: boolean }) => <div>{off ? null : <b />}</div>;\n";

		expect(lint({ rule: "no-jsx-null-ternary", fileName: "a.tsx", source })).toEqual([
			"no-jsx-null-ternary",
		]);
	});

	it("leaves a ternary in a JSX attribute alone", () => {
		const source =
			"export const A = ({ on }: { on: boolean }) => <div title={on ? 'on' : null} />;\n";

		expect(lint({ rule: "no-jsx-null-ternary", fileName: "a.tsx", source })).toEqual([]);
	});

	it("leaves a ternary outside JSX alone", () => {
		const source = "export const pick = (on: boolean) => (on ? 1 : null);\n";

		expect(lint({ rule: "no-jsx-null-ternary", fileName: "a.tsx", source })).toEqual([]);
	});
});

describe("no-sleep-in-tests", () => {
	it("reports a promise that resolves on a timer", () => {
		const source = "await new Promise((resolve) => setTimeout(resolve, 100));\n";

		expect(lint({ rule: "no-sleep-in-tests", fileName: "a.test.ts", source })).toEqual([
			"no-sleep-in-tests",
		]);
	});

	it("reports a timer callback that calls the resolver", () => {
		const source = [
			"await new Promise((resolve) => setTimeout(() => resolve(), 100));",
			"await new Promise((resolve) => { setTimeout(() => { resolve(undefined); }, 100); });",
			"",
		].join("\n");

		expect(lint({ rule: "no-sleep-in-tests", fileName: "a.test.ts", source })).toEqual([
			"no-sleep-in-tests",
			"no-sleep-in-tests",
		]);
	});

	it("leaves a timer that does not resolve the promise alone", () => {
		const source = [
			"await new Promise((resolve) => { setTimeout(() => {}, 100); resolve(1); });",
			"await new Promise((resolve) => { setTimeout((resolve) => resolve(), 100); resolve(1); });",
			"",
		].join("\n");

		expect(lint({ rule: "no-sleep-in-tests", fileName: "a.test.ts", source })).toEqual([]);
	});
});

describe("no-process-env-write", () => {
	it("reports each write to process.env or a key of it, with dot or bracket access", () => {
		const source = [
			'process.env = { ...process.env, NODE_ENV: "test" };',
			'process.env.NODE_ENV = "test";',
			"delete process.env.NODE_ENV;",
			'Reflect.deleteProperty(process.env, "NODE_ENV");',
			'process["env"].NODE_ENV = "test";',
			"process.env.COUNT++;",
			"",
		].join("\n");

		expect(lint({ rule: "no-process-env-write", fileName: "a.test.ts", source })).toEqual(
			Array.from({ length: 6 }, () => "no-process-env-write"),
		);
	});

	it("leaves a read, vi.stubEnv, and a computed key that is not env alone", () => {
		const source = [
			"const nodeEnv = process.env.NODE_ENV;",
			'vi.stubEnv("NODE_ENV", "test");',
			'const key = "title";',
			'process[key].NODE_ENV = "test";',
			"",
		].join("\n");

		expect(lint({ rule: "no-process-env-write", fileName: "a.test.ts", source })).toEqual([]);
	});
});

describe("no-presence-matcher-on-get-by", () => {
	it("reports a getBy query wrapped in a presence matcher, negated or not", () => {
		const source = [
			"expect(screen.getByRole('button')).toBeDefined();",
			"expect(getByText('Save')).not.toBeNull();",
			"",
		].join("\n");

		expect(lint({ rule: "no-presence-matcher-on-get-by", fileName: "a.test.ts", source })).toEqual([
			"no-presence-matcher-on-get-by",
			"no-presence-matcher-on-get-by",
		]);
	});

	it("leaves a queryBy query alone", () => {
		const source = "expect(screen.queryByRole('button')).not.toBeNull();\n";

		expect(lint({ rule: "no-presence-matcher-on-get-by", fileName: "a.test.ts", source })).toEqual(
			[],
		);
	});
});

describe("no-bare-to-have-been-called", () => {
	it("reports a bare call matcher and leaves the negated form alone", () => {
		const source = [
			"expect(spy).toHaveBeenCalled();",
			"expect(spy).not.toHaveBeenCalled();",
			"",
		].join("\n");

		expect(lint({ rule: "no-bare-to-have-been-called", fileName: "a.test.ts", source })).toEqual([
			"no-bare-to-have-been-called",
		]);
	});
});

describe("no-absent-class-assertion", () => {
	it("reports a negated class matcher and leaves the positive form alone", () => {
		const source = [
			"expect(el).not.toHaveClass('hidden');",
			"expect(el).toHaveClass('hidden');",
			"",
		].join("\n");

		expect(lint({ rule: "no-absent-class-assertion", fileName: "a.test.ts", source })).toEqual([
			"no-absent-class-assertion",
		]);
	});
});

describe("no-display-name", () => {
	it("reports a displayName assignment", () => {
		const source = "function Button() {}\nButton.displayName = 'Button';\n";

		expect(lint({ rule: "no-display-name", fileName: "a.ts", source })).toEqual([
			"no-display-name",
		]);
	});
});

describe("no-namespace-object", () => {
	it("reports a compound namespace object", () => {
		const source =
			"const Root = () => null;\nconst Item = () => null;\nconst Menu = { Root, Option: Item } as const;\nexport { Menu };\n";

		expect(lint({ rule: "no-namespace-object", fileName: "a.tsx", source })).toEqual([
			"no-namespace-object",
		]);
	});

	it("reports an exported compound namespace object", () => {
		const source = "const Root = () => null;\nexport const Menu = { Root };\n";

		expect(lint({ rule: "no-namespace-object", fileName: "a.tsx", source })).toEqual([
			"no-namespace-object",
		]);
	});

	it("leaves an UPPER_SNAKE_CASE lookup and an object with a literal value alone", () => {
		const source =
			"const Root = 1;\nexport const SEVERITY = { Root };\nexport const Sizes = { Small: 1, Root };\n";

		expect(lint({ rule: "no-namespace-object", fileName: "a.tsx", source })).toEqual([]);
	});
});

describe("no-default-export", () => {
	it("reports a default export", () => {
		expect(
			lint({ rule: "no-default-export", fileName: "a.ts", source: "export default 1;\n" }),
		).toEqual(["no-default-export"]);
	});

	it("leaves the default export of an ambient module declaration alone", () => {
		const source = 'declare module "*.css" {\n\tconst css: string;\n\texport default css;\n}\n';

		expect(lint({ rule: "no-default-export", fileName: "a.d.ts", source })).toEqual([]);
	});
});

describe("no-em-dash-comment", () => {
	it("reports an em dash in comment prose", () => {
		const source =
			"/**\n * The flush resets the cursor \u2014 and the queue.\n */\nexport const a = 1;\n// Keep it \u2014 always.\n";

		expect(lint({ rule: "no-em-dash-comment", fileName: "a.ts", source })).toEqual([
			"no-em-dash-comment",
			"no-em-dash-comment",
		]);
	});

	it("allows an em dash in example code, an inline code span, and a string", () => {
		const source = [
			"/**",
			" * Names the `\u2014` character.",
			" *",
			" * @example",
			' * show("a \u2014 b");',
			" *",
			" * ```ts",
			" * // fenced \u2014 code",
			" * ```",
			" */",
			'export const a = "\u2014";',
			"",
		].join("\n");

		expect(lint({ rule: "no-em-dash-comment", fileName: "a.ts", source })).toEqual([]);
	});
});

// One case each way for the rules ported from the frontend repo. The cases pin the mantle changes:
// the render-prop exemption in `no-classname-construction` and the reason clause.
describe.each([
	{
		rule: "require-suppression-reason",
		fileName: "a.ts",
		reported: "// oxlint-disable-next-line no-var\nvar a = 1;\nexport { a };\n",
		allowed:
			"// oxlint-disable-next-line no-var -- Why: the test needs a var.\nvar a = 1;\nexport { a };\n",
	},
	{
		rule: "no-classname-construction",
		fileName: "a.tsx",
		reported: 'export const A = ({ on }: { on: boolean }) => <div className={on ? "a" : "b"} />;\n',
		allowed:
			'export const A = ({ className }: { className: string | ((on: boolean) => string) }) => (\n\t<a className={typeof className === "function" ? className(true) : className} />\n);\n',
	},
	{
		rule: "no-boolean-positional-param",
		fileName: "a.ts",
		reported: "export function f(name: string, open: boolean) {\n\treturn open ? name : '';\n}\n",
		allowed:
			"export function f({ name, open }: { name: string; open: boolean }) {\n\treturn open ? name : '';\n}\n",
	},
	{
		rule: "prefer-can-use-dom",
		fileName: "a.ts",
		reported: 'export const browser = typeof window !== "undefined";\n',
		allowed: "export const browser = canUseDOM();\n",
	},
	{
		rule: "no-config-teardown",
		fileName: "a.test.ts",
		reported: "afterEach(() => {\n\tvi.restoreAllMocks();\n});\n",
		allowed: "afterEach(() => {\n\tvi.useRealTimers();\n});\n",
	},
])("$rule", ({ rule, fileName, reported, allowed }) => {
	it("reports the bad shape", () => {
		expect(lint({ rule, fileName, source: reported })).toEqual([rule]);
	});

	it("allows the good shape", () => {
		expect(lint({ rule, fileName, source: allowed })).toEqual([]);
	});
});

describe("no-structural-combinator", () => {
	it.each([
		// The Table.Head and Table.Foot classes that #1794 removed.
		'cx("[&>tr:last-child>*]:border-b [&>tr:last-child>*]:border-card-muted");',
		'cx("[&>tr:first-child>*]:border-t");',
		'const a = "md:[&>li:nth-child(2n)_span]:p-2";',
		"const a = `group-first:hidden`;",
		'const a = "[&:is(tr:last-child_*)]:p-2";',
		'cx("first:*:p-2 not-last:[&>td]:p-2 in-[tr:last-child]:p-2 group-not-first:p-2");',
		'cx("first:group-[.x]:*:p-2 not-[:first-child]:*:p-2");',
		'cx("[&>tr:last-child]:[&>*]:border-b");',
	])("flags %s", (source) => {
		expect(
			lint({ rule: "no-structural-combinator", fileName: "a.ts", source }).length,
		).toBeGreaterThan(0);
	});

	it.each([
		'cx("[&>tr:not(:has(+tr))>*]:border-b [&>tr+tr>*]:border-t");',
		'cx("[&>*:last-child]:rounded-l-none [&>*:not(:first-child)]:-ml-px last:border-0");',
		'cx("has-[>button:last-child]:pe-1 [&:has(>a:first-child_b)]:p-2");',
		'document.querySelector("tr:last-child > td");',
		'cx("*:first:p-2 first:hover:p-2 first:group-[.x]:p-2 group-hover:p-2");',
		'cx("[&[data-label=\\":empty\\"]>*]:p-2");',
	])("allows %s", (source) => {
		expect(lint({ rule: "no-structural-combinator", fileName: "a.ts", source })).toEqual([]);
	});
});

describe("no-unanchored-child-variant", () => {
	it.each([
		'cx("*:pointer-events-auto");',
		'cx("md:**:data-[slot=icon]:shrink-0");',
		'const a = "data-state-inactive:*:paused";',
		'cx("not-has-data-[slot=x]:[&_[data-a],&_[data-b]]:top-1/2");',
		`cx("[&_[data-label='(']]:*:p-2");`,
	])("flags %s", (source) => {
		expect(
			lint({ rule: "no-unanchored-child-variant", fileName: "a.ts", source }).length,
		).toBeGreaterThan(0);
	});

	it.each([
		'cx("[&>*]:pointer-events-auto [&_[data-slot=icon]]:shrink-0");',
		'cx("data-state-inactive:[&>*]:paused [&>:first-child]:size-7");',
		'cx("[&:is([data-a],[data-b])]:p-2 has-[[data-a],[data-b]]:p-2");',
		'const a = "2 * 3: four";',
		'cx("[&_.foo\\\\,bar]:p-2");',
	])("allows %s", (source) => {
		expect(lint({ rule: "no-unanchored-child-variant", fileName: "a.ts", source })).toEqual([]);
	});
});
