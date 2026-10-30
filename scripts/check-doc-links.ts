#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/** One link in a markdown file, with the 1-based line it starts on. */
export type MarkdownLink = { target: string; line: number };

/** A fence opens or closes a code block, whose text holds no links or headings. */
const fence = /^\s*(`{3,}|~{3,})/;
const inlineCode = /(`+)[^`]*?\1/g;
const inlineLink = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^\s)]+)/g;
const referenceDefinition = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/;
const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/;

/** The lines of a markdown file outside its code blocks. */
function proseLines(markdown: string): { text: string; line: number }[] {
	const lines: { text: string; line: number }[] = [];
	let openFence: string | null = null;
	markdown.split("\n").forEach((text, index) => {
		const marker = fence.exec(text)?.[1];
		if (marker != null) {
			if (openFence == null) {
				openFence = marker;
			} else if (marker.startsWith(openFence.charAt(0)) && marker.length >= openFence.length) {
				openFence = null;
			}
			return;
		}
		if (openFence == null) {
			lines.push({ text, line: index + 1 });
		}
	});
	return lines;
}

/**
 * Every inline link and reference definition in a markdown file, outside code.
 *
 * @example
 * extractLinks("See [the spec](./SPEC.md#scope).\n\n```\n[not](a-link)\n```");
 * // => [{ target: "./SPEC.md#scope", line: 1 }]
 */
export function extractLinks(markdown: string): MarkdownLink[] {
	const links: MarkdownLink[] = [];
	for (const { text: rawText, line } of proseLines(markdown)) {
		// Why: a link inside inline code is an example, not a link.
		const text = rawText.replace(inlineCode, "");
		const definition = referenceDefinition.exec(text)?.[1];
		const targets =
			definition == null
				? [...text.matchAll(inlineLink)].map((match) => match[1] ?? "")
				: [definition];
		for (const target of targets) {
			links.push({ target: target.replace(/^<|>$/g, ""), line });
		}
	}
	return links;
}

/**
 * The anchor of each heading, as GitHub writes it: lowercase, punctuation dropped, spaces as `-`,
 * and a `-1`, `-2` suffix on a repeated heading.
 *
 * @example
 * headingAnchors("# Read Me\n## Read me\n## 11. Review checklist"); // => Set { "read-me", "read-me-1", "11-review-checklist" }
 */
export function headingAnchors(markdown: string): Set<string> {
	const anchors = new Set<string>();
	const counts = new Map<string, number>();
	for (const { text } of proseLines(markdown)) {
		const title = heading.exec(text)?.[1];
		if (title == null) {
			continue;
		}
		const plain = title.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, "");
		const slug = plain
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s_-]/gu, "")
			.replace(/\s/g, "-");
		const count = counts.get(slug) ?? 0;
		counts.set(slug, count + 1);
		anchors.add(count === 0 ? slug : `${slug}-${count}`);
	}
	return anchors;
}

/** Reads a file through the caller, so a test can pass an in-memory tree. */
export type ReadFile = (repoRelativePath: string) => string | null;

/**
 * The broken relative links in one markdown file: a target that does not exist, or a `#anchor` that
 * no heading in the target file writes. A URL with a scheme and a site path that starts with `/` are
 * out of scope.
 *
 * @param readFile Returns a repo-relative file's text, `""` for a directory, or `null` when the path does not exist.
 * @example
 * brokenLinks({ file: "AGENTS.md", readFile: (file) => (file === "AGENTS.md" ? "[x](./NOPE.md)" : null) });
 * // => ["AGENTS.md:1: ./NOPE.md does not exist"]
 */
export function brokenLinks({ file, readFile }: { file: string; readFile: ReadFile }): string[] {
	const markdown = readFile(file) ?? "";
	const problems: string[] = [];
	for (const { target, line } of extractLinks(markdown)) {
		if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("/")) {
			continue;
		}
		const [rawPath = "", anchor] = target.split("#", 2);
		let targetPath = file;
		if (rawPath !== "") {
			try {
				targetPath = path.posix.normalize(
					path.posix.join(path.posix.dirname(file), decodeURI(rawPath)),
				);
			} catch {
				problems.push(`${file}:${line}: ${target} is not a valid URI`);
				continue;
			}
		}
		const targetText = readFile(targetPath);
		if (targetText == null) {
			problems.push(`${file}:${line}: ${target} does not exist`);
			continue;
		}
		if (
			anchor != null &&
			anchor !== "" &&
			targetPath.endsWith(".md") &&
			!headingAnchors(targetText).has(anchor)
		) {
			problems.push(`${file}:${line}: ${target} names no heading in ${targetPath}`);
		}
	}
	return problems;
}

/** Reads a repo-relative path from disk: its text, `""` for a directory, or `null` when it does not exist. */
function readFromDisk(repoRelativePath: string): string | null {
	try {
		const stat = fs.statSync(repoRelativePath);
		return stat.isDirectory() ? "" : fs.readFileSync(repoRelativePath, "utf8");
	} catch {
		return null;
	}
}

function cli(): void {
	const files =
		process.argv.length > 2
			? process.argv.slice(2).filter((file) => file.endsWith(".md"))
			: execFileSync(
					"git",
					["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.md"],
					{
						encoding: "utf8",
					},
				)
					.split("\0")
					.filter((file) => file.length > 0 && fs.existsSync(file));
	const problems = files.flatMap((file) => brokenLinks({ file, readFile: readFromDisk }));
	for (const problem of problems) {
		console.error(problem);
	}
	if (problems.length > 0) {
		console.error(
			`\n${problems.length} broken link${problems.length === 1 ? "" : "s"} in ${files.length} markdown files.`,
		);
		process.exitCode = 1;
		return;
	}
	console.log(`All relative links resolve in ${files.length} markdown files.`);
}

if (import.meta.main) {
	cli();
}
