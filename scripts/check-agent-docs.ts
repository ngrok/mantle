#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/** The largest size an agent doc may reach, in bytes. */
export type AgentDocBudget = {
	path: string;
	maxBytes: number;
};

/**
 * The always-loaded agent docs and their budgets.
 * Why bytes: a harness that cuts long command output counts tokens, and bytes track tokens at about 4 to 1.
 */
export const agentDocBudgets = [
	{ path: "AGENTS.md", maxBytes: 10_000 },
	{ path: "CONVENTIONS.md", maxBytes: 24_000 },
	{ path: "packages/AGENTS.md", maxBytes: 2_000 },
	{ path: "apps/www/AGENTS.md", maxBytes: 2_000 },
] satisfies readonly AgentDocBudget[];

/**
 * Check each agent doc under `rootDir` against its budget.
 *
 * @returns One message for each doc that is missing or over its budget; an empty array when all pass.
 *
 * @example
 * checkAgentDocs({ rootDir: process.cwd(), budgets: agentDocBudgets });
 * // => ["AGENTS.md is 8,214 bytes, over its 8,000-byte budget."]
 */
export function checkAgentDocs({
	rootDir,
	budgets,
}: {
	rootDir: string;
	budgets: readonly AgentDocBudget[];
}): string[] {
	const problems: string[] = [];
	for (const budget of budgets) {
		const filePath = path.join(rootDir, budget.path);
		if (!fs.existsSync(filePath)) {
			problems.push(`${budget.path} is missing. Update its budget in scripts/check-agent-docs.ts.`);
			continue;
		}
		const bytes = fs.statSync(filePath).size;
		if (bytes > budget.maxBytes) {
			problems.push(
				`${budget.path} is ${bytes.toLocaleString("en-US")} bytes, over its ${budget.maxBytes.toLocaleString("en-US")}-byte budget.`,
			);
		}
	}
	return problems;
}

/** A library mantle used to wrap, and the package name that would bring it back. */
export type RetiredLibrary = {
	mention: RegExp;
	packageName: RegExp;
};

/**
 * The UI libraries mantle replaced with native elements and its own behavior hooks.
 * Why a list: a doc that still names one teaches a reader or an agent a design that main no longer has.
 * Why case-sensitive: a lowercase `data-radix-*` names a shape that COMPONENT_SPEC.md §6 bans, not a dependency.
 */
export const retiredLibraries = [
	{ mention: /\bRadix\b|@radix-ui\//, packageName: /^@radix-ui\// },
	{ mention: /\bAriakit\b|@ariakit\//, packageName: /^@ariakit\// },
	{ mention: /\bcmdk\b/, packageName: /^cmdk$/ },
	{ mention: /\bHeadless ?UI\b|@headlessui\//, packageName: /^@headlessui\// },
	// Why the lookbehind: `OtpInput` still emits `data-input-otp`, which is not the library.
	{ mention: /(?<![\w-])input-otp\b/, packageName: /^input-otp$/ },
	{ mention: /\bFloating UI\b|@floating-ui\//, packageName: /^@floating-ui\// },
] satisfies readonly RetiredLibrary[];

/**
 * The docs that describe mantle as it is today, relative to the repo root: the docs that guide work on mantle
 * itself, the READMEs, and the pages of the docs site.
 * Why no `decisions/`, migration guides, or changelogs: each records what was true at its date or version.
 */
export const currentDocFile =
	/^(?:AGENTS|CONVENTIONS|COMPONENT_SPEC|VERSIONING|CONTRIBUTING|README)\.md$|^(?:packages|apps\/www)\/AGENTS\.md$|^packages\/[^/]+\/README\.md$|^docs\/.+\.md$|^\.claude\/.+\.md$|^\.github\/copilot-instructions\.md$|^apps\/www\/app\/docs\/(?!migrations\/).+\.mdx$/;

/**
 * Find each line of a current doc that names a retired library that `packages/mantle/package.json` no longer lists.
 *
 * @param files Paths relative to `rootDir`. Paths that `currentDocFile` does not match are skipped.
 * @returns One message for each line that names a retired library.
 *
 * @example
 * findRetiredLibraryMentions({ rootDir: process.cwd(), files: ["docs/motion.md"], libraries: retiredLibraries });
 * // => ["docs/motion.md:54 names Radix, which packages/mantle/package.json does not list."]
 */
export function findRetiredLibraryMentions({
	rootDir,
	files,
	libraries,
}: {
	rootDir: string;
	files: readonly string[];
	libraries: readonly RetiredLibrary[];
}): string[] {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(rootDir, "packages/mantle/package.json"), "utf8"),
	);
	const listed = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies });
	const retired = libraries.filter(
		(library) => !listed.some((name) => library.packageName.test(name)),
	);
	const problems: string[] = [];
	for (const file of files) {
		if (!currentDocFile.test(file)) {
			continue;
		}
		const lines = fs.readFileSync(path.join(rootDir, file), "utf8").split("\n");
		const frontmatterEnd = lines[0] === "---" ? lines.indexOf("---", 1) : -1;
		let inAliases = false;
		lines.forEach((line, index) => {
			// Why: an alias only feeds search and MCP `find`, so `cmdk` still leads a port of cmdk code to Command.
			// A frontmatter key starts at column 0. A block-list item starts with `-` or a space.
			if (index < frontmatterEnd) {
				if (/^[^\s-]/.test(line)) {
					inAliases = line.startsWith("aliases:");
				}
				if (inAliases) {
					return;
				}
			}
			for (const library of retired) {
				const match = library.mention.exec(line);
				if (match != null) {
					problems.push(
						`${file}:${index + 1} names ${match[0]}, which packages/mantle/package.json does not list.`,
					);
				}
			}
		});
	}
	return problems;
}

/** Every current doc under `rootDir`, relative to it. */
export function listCurrentDocs(rootDir: string): string[] {
	const nested = ["docs", ".claude", "apps/www/app/docs"]
		.filter((dir) => fs.existsSync(path.join(rootDir, dir)))
		.flatMap((dir) =>
			fs
				.readdirSync(path.join(rootDir, dir), { recursive: true, encoding: "utf8" })
				.map((file) => `${dir}/${file.split(path.sep).join("/")}`),
		);
	const packages = fs.existsSync(path.join(rootDir, "packages"))
		? fs.readdirSync(path.join(rootDir, "packages")).map((dir) => `packages/${dir}/README.md`)
		: [];
	const fixed = [
		"packages/AGENTS.md",
		"apps/www/AGENTS.md",
		".github/copilot-instructions.md",
		...packages,
	].filter((file) => fs.existsSync(path.join(rootDir, file)));
	return [...fs.readdirSync(rootDir), ...fixed, ...nested].filter((file) =>
		currentDocFile.test(file),
	);
}

if (import.meta.main) {
	const rootDir = path.join(import.meta.dirname, "..");
	const mentions = findRetiredLibraryMentions({
		rootDir,
		files: listCurrentDocs(rootDir),
		libraries: retiredLibraries,
	});
	for (const mention of mentions) {
		console.error(mention);
	}
	if (mentions.length > 0) {
		console.error(
			"Describe what main does today: native elements and the hooks under packages/mantle/src/behaviors.",
		);
		process.exitCode = 1;
	}
	const problems = checkAgentDocs({ rootDir, budgets: agentDocBudgets });
	for (const problem of problems) {
		console.error(problem);
	}
	if (problems.length > 0) {
		console.error(
			"Move task-scoped rules to the doc that owns them. See AGENTS.md § Route by task.",
		);
		process.exitCode = 1;
	} else {
		console.log(`All ${agentDocBudgets.length} agent docs are within budget.`);
	}
}
