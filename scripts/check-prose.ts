#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import process from "node:process";
import { proseLines } from "./check-doc-links.ts";

/** The files this check reads: prose and stylesheets. Comments in code are the `mantle/no-em-dash-comment` lint rule's job. */
const checkedFile = /\.(md|mdx|css)$/;

/**
 * Files this repo does not write by hand: generated changelogs, vendored code,
 * reference clones, and the verbatim copy of the ngrok style guide, which
 * cites its Notion source and must not fork from it.
 */
const skippedFile =
	/(^|\/)(CHANGELOG\.md|vendor\/|local\/)|^\.claude\/skills\/ngrok-style\/reference\/style-guide\.md$/;

const emDash = "—";
const inlineCode = /(`+)[^`]*?\1/g;
const cssComment = /\/\*[\s\S]*?\*\//g;

/**
 * The 1-based lines that hold an em dash in prose: markdown outside code
 * blocks and inline code, or a stylesheet comment.
 *
 * @example
 * emDashLines({ file: "a.md", text: "a — b\n`—`\n```\nc — d\n```" }); // => [1]
 */
export function emDashLines({ file, text }: { file: string; text: string }): number[] {
	if (file.endsWith(".css")) {
		const lines = new Set<number>();
		for (const match of text.matchAll(cssComment)) {
			const startLine = text.slice(0, match.index).split("\n").length;
			match[0].split("\n").forEach((commentLine, offset) => {
				if (commentLine.replace(inlineCode, "").includes(emDash)) {
					lines.add(startLine + offset);
				}
			});
		}
		return [...lines];
	}
	return proseLines(text)
		.filter(({ text: line }) => line.replace(inlineCode, "").includes(emDash))
		.map(({ line }) => line);
}

function cli(): void {
	// Why tracked files only: untracked notes in a working tree are not repo prose.
	const tracked = execFileSync("git", ["ls-files", "-z", "--cached"], { encoding: "utf8" }).split(
		"\0",
	);
	const files = (process.argv.length > 2 ? process.argv.slice(2) : tracked).filter(
		(file) =>
			checkedFile.test(file) &&
			!skippedFile.test(file) &&
			tracked.includes(file) &&
			fs.existsSync(file),
	);
	const problems = files.flatMap((file) =>
		emDashLines({ file, text: fs.readFileSync(file, "utf8") }).map(
			(line) =>
				`${file}:${line}: rewrite the em-dash aside as a parenthetical, a colon, a comma, or a separate sentence. See CONVENTIONS.md § Writing.`,
		),
	);
	for (const problem of problems) {
		console.error(problem);
	}
	if (problems.length > 0) {
		console.error(`\n${problems.length} em dash${problems.length === 1 ? "" : "es"} in prose.`);
		process.exitCode = 1;
		return;
	}
	console.log(`No em dashes in the prose of ${files.length} file${files.length === 1 ? "" : "s"}.`);
}

if (import.meta.main) {
	cli();
}
