#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { fixHint, hasStructuralCombinator } from "./oxlint-rules/no-structural-combinator.js";

/** The stylesheets this check reads: mantle's own CSS. Class strings are the `mantle/no-structural-combinator` lint rule's job. */
const checkedFile = /^packages\/mantle\/src\/.+\.css$/;

/** The comment that allows one rule. It must give a reason after the colon. */
const allowComment = /structural-selector-ok:\s*(?!\*\/)\S/;

type Problem = { line: number; selector: string };

/** A nested selector resolved against its parent rule's selector, as CSS nesting reads it. */
function resolveNested(parent: string | null, selector: string): string {
	if (parent == null) {
		return selector;
	}
	return selector.includes("&")
		? selector.replaceAll("&", `:is(${parent})`)
		: `:is(${parent}) ${selector}`;
}

/**
 * The selectors in a stylesheet that put a structural pseudo-class before a
 * combinator, with their 1-based lines. A nested rule is checked as its
 * resolved selector. A `structural-selector-ok: <reason>` comment right before
 * a rule allows it. `@custom-variant` selectors count.
 *
 * @example
 * selectorProblems(".a > tr:last-child > * { color: red }"); // => [{ line: 1, selector: ".a > tr:last-child > *" }]
 */
export function selectorProblems(text: string): Problem[] {
	const problems: Problem[] = [];
	let prelude = "";
	let preludeStart = 0;
	let allowed = false;
	let index = 0;
	// The resolved selector of each open block; an at-rule block keeps its parent's.
	const parents: (string | null)[] = [];
	const lineAt = (offset: number) => text.slice(0, offset).split("\n").length;
	const check = (selector: string, offset: number) => {
		const parent = parents.at(-1) ?? null;
		// Why the parent test: a parent that fails is already reported once.
		const parentFails = parent != null && hasStructuralCombinator(parent);
		if (!allowed && !parentFails && hasStructuralCombinator(resolveNested(parent, selector))) {
			problems.push({ line: lineAt(offset), selector: selector.trim().replace(/\s+/g, " ") });
		}
	};
	while (index < text.length) {
		if (text.startsWith("/*", index)) {
			const end = text.indexOf("*/", index + 2);
			const comment = text.slice(index, end < 0 ? text.length : end + 2);
			if (prelude.trim() === "" && allowComment.test(comment)) {
				allowed = true;
			}
			index += comment.length;
			continue;
		}
		const char = text[index] ?? "";
		if (char === '"' || char === "'") {
			let end = index + 1;
			while (end < text.length && text[end] !== char) {
				end += text[end] === "\\" ? 2 : 1;
			}
			prelude += text.slice(index, end + 1);
			index = end + 1;
			continue;
		}
		if (char === "{" || char === ";" || char === "}") {
			const trimmed = prelude.trim();
			const variant = /^@custom-variant\s+[\w-]+\s*\(([\s\S]*)\)$/.exec(trimmed);
			if (variant != null) {
				check(variant[1] ?? "", preludeStart);
			} else if (char === "{" && trimmed !== "" && !trimmed.startsWith("@")) {
				check(trimmed, preludeStart);
			}
			if (char === "{") {
				const parent = parents.at(-1) ?? null;
				const isRule = trimmed !== "" && !trimmed.startsWith("@");
				parents.push(isRule ? resolveNested(parent, trimmed) : parent);
			} else if (char === "}") {
				parents.pop();
			}
			prelude = "";
			allowed = false;
			index++;
			continue;
		}
		if (prelude.trim() === "" && !/\s/.test(char)) {
			preludeStart = index;
		}
		prelude += char;
		index++;
	}
	return problems;
}

/**
 * The 1-based lines that define a `data-*` custom variant. Tailwind's own
 * `data-*:` variants cover each state, and a misspelled custom one compiles
 * with no error and never matches (COMPONENT_SPEC.md §6).
 *
 * @example
 * customDataVariants("@custom-variant data-side-start (&[data-side=start]);"); // => [1]
 */
export function customDataVariants(text: string): number[] {
	return text
		.split("\n")
		.flatMap((line, index) => (/^\s*@custom-variant\s+data-/.test(line) ? [index + 1] : []));
}

function cli(): void {
	const tracked = execFileSync("git", ["ls-files", "-z", "--cached"], { encoding: "utf8" }).split(
		"\0",
	);
	const files = (process.argv.length > 2 ? process.argv.slice(2) : tracked).filter(
		(file) => checkedFile.test(file) && tracked.includes(file) && fs.existsSync(file),
	);
	const problems = files.flatMap((file) => {
		const text = fs.readFileSync(file, "utf8");
		return [
			...selectorProblems(text).map(
				({ line, selector }) => `${file}:${line}: \`${selector}\`: ${fixHint}`,
			),
			...customDataVariants(text).map(
				(line) =>
					`${file}:${line}: a \`data-*\` custom variant. Use Tailwind's built-in \`data-*:\` variant (COMPONENT_SPEC.md §6).`,
			),
		];
	});
	if (problems.length > 0) {
		console.log(problems.join("\n"));
		console.log(
			`check:css-selectors: ${problems.length} problems. A structural selector may take a \`/* structural-selector-ok: <reason> */\` comment when the cost is justified; a \`data-*\` custom variant may not.`,
		);
		process.exitCode = 1;
		return;
	}
	console.log(`check:css-selectors: ${files.length} stylesheets clean.`);
}

if (import.meta.main) {
	cli();
}
