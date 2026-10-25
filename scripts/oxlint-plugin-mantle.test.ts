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
