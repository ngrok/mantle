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

/**
 * The selectors in a stylesheet that put a structural pseudo-class before a
 * combinator, with their 1-based lines. A `structural-selector-ok: <reason>`
 * comment right before a rule allows it. `@custom-variant` selectors count.
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
	const lineAt = (offset: number) => text.slice(0, offset).split("\n").length;
	const check = (selector: string, offset: number) => {
		if (!allowed && hasStructuralCombinator(selector)) {
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
			const end = text.indexOf(char, index + 1);
			prelude += text.slice(index, end < 0 ? text.length : end + 1);
			index = end < 0 ? text.length : end + 1;
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

function cli(): void {
	const tracked = execFileSync("git", ["ls-files", "-z", "--cached"], { encoding: "utf8" }).split(
		"\0",
	);
	const files = (process.argv.length > 2 ? process.argv.slice(2) : tracked).filter(
		(file) => checkedFile.test(file) && tracked.includes(file) && fs.existsSync(file),
	);
	const problems = files.flatMap((file) =>
		selectorProblems(fs.readFileSync(file, "utf8")).map(
			({ line, selector }) => `${file}:${line}: \`${selector}\`: ${fixHint}`,
		),
	);
	if (problems.length > 0) {
		console.log(problems.join("\n"));
		console.log(
			`check:css-selectors: ${problems.length} selectors. Add a \`/* structural-selector-ok: <reason> */\` comment before a rule only when the cost is justified.`,
		);
		process.exitCode = 1;
		return;
	}
	console.log(`check:css-selectors: ${files.length} stylesheets clean.`);
}

if (import.meta.main) {
	cli();
}
