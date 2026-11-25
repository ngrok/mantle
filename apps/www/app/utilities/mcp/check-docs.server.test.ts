import { readFileSync, readdirSync } from "node:fs";
import mantlePackageJson from "@ngrok/mantle/package.json" with { type: "json" };
import path from "node:path";
import { parseSync } from "oxc-parser";
import { expect, it } from "vitest";
import { buildSiteAgentManifest } from "~/utilities/agent-manifest.server";
import { rawDocContent } from "~/utilities/docs";
import { checkCode, type Diagnostic } from "~/utilities/mcp/check.server";
import { versionDataFromFiles } from "~/utilities/mcp/version-data.server";
import { renderMdxToMarkdown } from "~/utilities/render-mdx-to-markdown.server";

/**
 * Agents copy the code that the docs publish, so `check` must pass it. This
 * test runs `check` on each page fence, page example, demo, and manifest
 * example against the workspace build of `@ngrok/mantle`.
 *
 * Migration guides are out of scope: their "before" code is wrong on purpose.
 * A fence that is not a full file, such as one part with an ellipsis, can fail
 * to parse; the test skips it.
 */
const PART_CODES: ReadonlySet<Diagnostic["code"]> = new Set<Diagnostic["code"]>([
	"unknown-part",
	"unknown-prop",
	"forbidden-prop",
	"missing-prop",
	"missing-dialog-title",
]);

const appDir = path.resolve(import.meta.dirname, "../..");
const mantleDir = path.resolve(appDir, "../../../packages/mantle");

/** The workspace build as a published version: `dist` declarations and the site manifest. */
async function workspaceVersionData() {
	// Why: a published `package.json` points each subpath at its `dist` entry.
	const exports = Object.fromEntries(
		Object.entries(mantlePackageJson.exports).map(([subpath, target]) => [
			subpath,
			typeof target === "object" && "import" in target ? target.import : target,
		]),
	);
	const manifest = await buildSiteAgentManifest();
	const files = new Map([
		["package.json", JSON.stringify({ ...mantlePackageJson, exports })],
		["dist/agent.json", JSON.stringify(manifest)],
	]);
	for (const name of readdirSync(path.join(mantleDir, "dist"))) {
		if (name.endsWith(".d.ts")) {
			files.set(`dist/${name}`, readFileSync(path.join(mantleDir, "dist", name), "utf8"));
		}
	}
	return versionDataFromFiles(manifest.version, files);
}

function fencesOf(markdown: string): string[] {
	return [...markdown.matchAll(/^(\s*)(`{3,})(?:tsx|jsx|ts)\b[^\n]*\n([\s\S]*?)\n\1\2\s*$/gm)].map(
		(match) => match[3] ?? "",
	);
}

function sourceFilesUnder(dir: string): Array<[string, string]> {
	return readdirSync(path.join(appDir, dir), { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".tsx") && !file.includes(".test."))
		.map((file) => [`${dir}/${file}`, readFileSync(path.join(appDir, dir, file), "utf8")]);
}

/**
 * The fence as one parseable file: imports first, then the rest as is, as a
 * function body (for a `return`), or as a fragment (for sibling elements).
 * Each blank-line block is tried alone when the whole fence fails.
 */
function asFiles(snippet: string): string[] {
	const importPattern = /^import\s[\s\S]*?from\s*["'][^"']+["'];?\s*$/gm;
	const imports = (snippet.match(importPattern) ?? []).join("\n");
	const body = snippet.replace(importPattern, "");
	const parse = (part: string) => {
		const jsx = part.search(/^\s*<[A-Za-z>]/m);
		const shapes = [
			part,
			`function snippet() {${part}\n}`,
			`const snippet = (<>${part}</>);`,
			jsx < 0
				? part
				: `function snippet() {${part.slice(0, jsx)}\nreturn (<>${part.slice(jsx).replace(/;\s*$/, "")}</>);\n}`,
		];
		return shapes
			.map((shape) => `${imports}\n${shape}`)
			.find((file) => parseSync("snippet.tsx", file).errors.length === 0);
	};
	const whole = parse(body);
	if (whole != null) {
		return [whole];
	}
	return body.split(/\n\s*\n/).flatMap((block) => parse(block) ?? []);
}

it("passes check on every docs snippet that agents read", async () => {
	const data = await workspaceVersionData();
	const exporterOf = new Map<string, string>();
	for (const [specifier, { names }] of data.exportsBySpecifier) {
		for (const name of names) {
			if (!exporterOf.has(name)) {
				exporterOf.set(name, specifier);
			}
		}
	}

	const snippets: Array<[string, string]> = [
		...sourceFilesUnder("docs"),
		...sourceFilesUnder("examples"),
		...sourceFilesUnder("features"),
	];
	for (const [file, mdx] of Object.entries(rawDocContent)) {
		if (!file.includes("/migrations/")) {
			for (const fence of fencesOf(renderMdxToMarkdown(mdx))) {
				snippets.push([file, fence]);
			}
		}
	}
	const { components, hooks, utilities } = data.manifest;
	for (const record of [...components, ...hooks, ...utilities]) {
		for (const example of record.examples ?? []) {
			const fences = fencesOf(example);
			for (const fence of fences.length > 0 ? fences : [example]) {
				snippets.push([`${record.name} JSDoc`, fence]);
			}
		}
	}

	// Why the declarations too: `get` returns their JSDoc, and parts and props carry examples the manifest lacks.
	for (const name of readdirSync(path.join(mantleDir, "dist"))) {
		if (name.endsWith(".d.ts")) {
			const declarations = readFileSync(path.join(mantleDir, "dist", name), "utf8");
			for (const [, block = ""] of declarations.matchAll(
				/@example[^\n]*\n([\s\S]*?)(?=\n\s*\*\s*@\w|\*\/)/g,
			)) {
				const example = block.replaceAll(/^\s*\* ?/gm, "");
				const fences = fencesOf(example);
				for (const fence of fences.length > 0 ? fences : [example]) {
					snippets.push([`dist/${name} JSDoc`, fence]);
				}
			}
		}
	}

	const findings: string[] = [];
	for (const [source, snippet] of snippets) {
		for (let file of asFiles(snippet)) {
			// Why: a short fence names its parts without imports, as a page reads.
			if (!file.includes("@ngrok/mantle/")) {
				const namesBySpecifier = new Map<string, string[]>();
				for (const [, name = ""] of file.matchAll(/<([A-Z]\w*)/g)) {
					const specifier = exporterOf.get(name);
					const names = specifier == null ? undefined : namesBySpecifier.get(specifier);
					if (specifier != null && !names?.includes(name)) {
						namesBySpecifier.set(specifier, [...(names ?? []), name]);
					}
				}
				const imports = [...namesBySpecifier].map(
					([specifier, names]) => `import { ${names.join(", ")} } from "${specifier}";`,
				);
				file = `${imports.join("\n")}\n${file}`;
			}
			for (const diagnostic of checkCode({ code: file, data })) {
				if (PART_CODES.has(diagnostic.code)) {
					findings.push(`${source}: ${diagnostic.message}`);
				}
			}
		}
	}

	expect(snippets.length).toBeGreaterThan(1_000);
	expect(findings).toEqual([]);
}, 60_000);
