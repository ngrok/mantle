#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

/** One command that `check:changed` runs. */
export type CheckStep = {
	name: string;
	command: string;
	args: string[];
};

const lintableFile = /\.(?:[cm]?[jt]sx?)$/;
const formattableFile = /\.(?:[cm]?[jt]sx?|json|jsonc|css|md|mdx|ya?ml)$/;
const agentDocFile = /(?:^|\/)(?:AGENTS|CONVENTIONS)\.md$/;
const tailwindSourceFile = /^(?:apps|packages)\/.+\.tsx?$/;
// Why every source file: a new theme, Tailwind version, or fixer rule can change the canonical form of any class.
const tailwindRulesFile = /\.css$|^pnpm-lock\.yaml$|^scripts\/tailwind-canonical/;
// Why styles, JSON, and YAML: stylesheets, package manifests, tsconfigs, and the lockfile change what compiles and what tests read.
const packageInputFile = /\.(?:[cm]?[jt]sx?|mdx|css|jsonc?|ya?ml)$/;
// Why the whole repo: a new rule or a plugin change can fail a file that did not change.
const lintConfigFile =
	/^(?:\.oxlintrc\.json|scripts\/oxlint-plugin-mantle\.js|scripts\/oxlint-rules\/[^/]+\.js)$/;
// Why: turbo selects only the root package for these paths, and the root has no `typecheck` or `test` task.
const rootTaskInputFile =
	/^(?:scripts\/|\.claude\/hooks\/|config\/tsconfig\/|packages\/mantle\/migrations\/|apps\/www\/app\/docs\/migrations\/|\.changeset\/[^/]+\.md$)/;

/**
 * Plan the checks for a set of changed files, cheapest first.
 *
 * Format, the Tailwind class check, lint, and the markdown link check read only the changed files that still
 * exist. A change to a stylesheet, the lockfile, or the Tailwind fixer checks the classes in every file.
 * Typecheck and tests run through turbo for each package that changed since `base`, plus the packages that depend on
 * it. A deleted file still schedules them, because a deletion can break an import. A lint config change lints the whole repo, and a change to a
 * script, a hook, a migration, or a changeset runs the root `typecheck:scripts` and `test:scripts` tasks.
 *
 * @example
 * planChecks({ files: ["packages/mantle/src/components/button/button.tsx"], deleted: [], base: "origin/main" });
 * // => fmt, tailwind, lint, typecheck, and test steps
 */
export function planChecks({
	files,
	deleted,
	base,
}: {
	/** Every changed path, deleted ones included. */
	files: readonly string[];
	/** The changed paths that no longer exist. */
	deleted: readonly string[];
	base: string;
}): CheckStep[] {
	const existing = files.filter((file) => !deleted.includes(file));
	const formattable = existing.filter((file) => formattableFile.test(file));
	const lintable = existing.filter((file) => lintableFile.test(file));
	const tailwindSources = existing.filter((file) => tailwindSourceFile.test(file));
	const markdown = existing.filter((file) => file.endsWith(".md"));
	const touchesPackage = files.some((file) => packageInputFile.test(file));
	const steps: CheckStep[] = [];

	if (formattable.length > 0) {
		steps.push({
			name: "fmt",
			command: "pnpm",
			args: ["exec", "oxfmt", "--check", "--no-error-on-unmatched-pattern", ...formattable],
		});
	}
	if (files.some((file) => tailwindRulesFile.test(file))) {
		steps.push({ name: "tailwind", command: "node", args: ["./scripts/tailwind-canonical.ts"] });
	} else if (tailwindSources.length > 0) {
		steps.push({
			name: "tailwind",
			command: "node",
			args: ["./scripts/tailwind-canonical.ts", ...tailwindSources],
		});
	}
	if (files.some((file) => lintConfigFile.test(file))) {
		steps.push({ name: "lint", command: "pnpm", args: ["run", "lint"] });
	} else if (lintable.length > 0) {
		steps.push({
			name: "lint",
			command: "pnpm",
			args: ["exec", "oxlint", "--type-aware", "--deny-warnings", ...lintable],
		});
	}
	if (files.some((file) => agentDocFile.test(file))) {
		steps.push({ name: "agent docs", command: "node", args: ["./scripts/check-agent-docs.ts"] });
	}
	if (markdown.length > 0) {
		steps.push({
			name: "doc links",
			command: "node",
			args: ["./scripts/check-doc-links.ts", ...markdown],
		});
	}
	if (touchesPackage) {
		const filter = `--filter=...[${base}]`;
		steps.push({
			name: "typecheck",
			command: "pnpm",
			args: ["exec", "turbo", "run", "typecheck", filter],
		});
		steps.push({ name: "test", command: "pnpm", args: ["exec", "turbo", "run", "test", filter] });
	}
	if (files.some((file) => rootTaskInputFile.test(file))) {
		steps.push({
			name: "scripts",
			command: "pnpm",
			args: ["exec", "turbo", "run", "typecheck:scripts", "test:scripts", "--filter=//"],
		});
	}
	return steps;
}

/**
 * Keep the last `lineCount` lines of command output.
 *
 * @example
 * tailLines({ text: "a\nb\nc\n", lineCount: 2 }); // => "b\nc"
 */
export function tailLines({ text, lineCount }: { text: string; lineCount: number }): string {
	return text.trimEnd().split("\n").slice(-lineCount).join("\n");
}

/** Run git and return its output lines, or fail with git's own message. */
function gitLines(args: string[]): string[] {
	const result = spawnSync("git", args, { encoding: "utf8" });
	if (result.status !== 0) {
		throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
	}
	return result.stdout.split("\n").filter((line) => line.length > 0);
}

/** The paths that differ from `base`: committed, staged, unstaged, untracked, and deleted. */
function changedFiles(base: string): string[] {
	const files = new Set([
		...gitLines(["diff", "--name-only", `${base}...HEAD`]),
		...gitLines(["diff", "--name-only", "HEAD"]),
		...gitLines(["ls-files", "--others", "--exclude-standard"]),
	]);
	return [...files].toSorted();
}

function cli(): void {
	const base = process.env.CHECK_BASE ?? "origin/main";
	const files = changedFiles(base);
	const deleted = files.filter((file) => !fs.existsSync(file));
	const steps = planChecks({ files, deleted, base });
	if (steps.length === 0) {
		console.log(`No changed files to check against ${base}.`);
		return;
	}

	const failed: string[] = [];
	for (const step of steps) {
		const result = spawnSync(step.command, step.args, {
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
		if (result.status === 0) {
			console.log(`✓ ${step.name}`);
			continue;
		}
		failed.push(step.name);
		console.log(`✗ ${step.name}: ${step.command} ${step.args.join(" ")}`);
		console.log(tailLines({ text: `${result.stdout}\n${result.stderr}`, lineCount: 40 }));
	}

	if (failed.length > 0) {
		console.log(
			`check:changed: ${failed.length} of ${steps.length} steps failed (${failed.join(", ")}).`,
		);
		process.exitCode = 1;
		return;
	}
	console.log(`check:changed: all ${steps.length} steps passed for ${files.length} changed files.`);
}

const entryPoint = process.argv[1];
if (entryPoint != null && import.meta.url === pathToFileURL(entryPoint).href) {
	try {
		cli();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
