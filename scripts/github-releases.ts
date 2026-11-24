#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * The longest release body this script sends, in UTF-8 bytes.
 * Why bytes below 125,000: GitHub rejects a longer body in characters, and a text never has more characters than bytes.
 */
export const RELEASE_BODY_LIMIT = 120_000;

/**
 * The section of a changesets `CHANGELOG.md` for one version, without its `## x.y.z` heading.
 * Returns `null` when the changelog has no section for the version.
 */
export function changelogEntry(changelog: string, version: string): string | null {
	const lines = changelog.split("\n");
	const start = lines.findIndex((line) => line.trim() === `## ${version}`);
	if (start === -1) {
		return null;
	}
	// Why a column-0 match is enough: changesets indents every line of a change body.
	const end = lines.findIndex((line, index) => index > start && /^## \d/.test(line));
	return lines
		.slice(start + 1, end === -1 ? undefined : end)
		.join("\n")
		.trim();
}

/**
 * The GitHub release body for one changelog entry: the whole entry when it fits in `limit` bytes.
 * Else the leading changes that fit, a count of the omitted changes, and a link to `fullNotesUrl`.
 */
export function releaseBody(
	entry: string,
	fullNotesUrl: string,
	limit = RELEASE_BODY_LIMIT,
): string {
	if (Buffer.byteLength(entry) <= limit) {
		return entry;
	}

	// Why cut before a column-0 `- ` or `### ` line: changesets indents each change body,
	// so the cut never splits a list, a table, or a code fence.
	const blocks = entry.split(/\n(?=- |### )/);
	const changeCount = blocks.filter((block) => block.startsWith("- ")).length;
	const notice = (omitted: number) =>
		`\n\n---\n\n${omitted} more ${omitted === 1 ? "change does" : "changes do"} not fit in a GitHub release. Read the full release notes in [CHANGELOG.md](${fullNotesUrl}).`;
	// Why both counts: the singular notice can be longer than the notice for the largest count.
	const budget =
		limit - Math.max(Buffer.byteLength(notice(1)), Buffer.byteLength(notice(changeCount)));

	const kept: string[] = [];
	let size = 0;
	for (const block of blocks) {
		const blockSize = Buffer.byteLength(block) + 1;
		if (size + blockSize > budget) {
			break;
		}
		kept.push(block);
		size += blockSize;
	}
	// A bump heading with no change under it reads as an empty section.
	while (kept.at(-1)?.startsWith("### ")) {
		kept.pop();
	}

	const keptChanges = kept.filter((block) => block.startsWith("- ")).length;
	return kept.join("\n") + notice(changeCount - keptChanges);
}

/** The GitHub heading anchor for a `## x.y.z` changelog heading. */
function versionAnchor(version: string): string {
	return version.toLowerCase().replace(/[^\w-]/g, "");
}

/** A public workspace package under `packages/`, at the version in its `package.json`. */
type WorkspacePackage = { name: string; version: string; dir: string };

/** Each public workspace package under `packages/`. */
function publicPackages(root: string): WorkspacePackage[] {
	return fs.readdirSync(path.join(root, "packages")).flatMap((entry) => {
		const manifest = path.join(root, "packages", entry, "package.json");
		if (!fs.existsSync(manifest)) {
			return [];
		}
		const pkg: { name: string; version: string; private?: boolean } = JSON.parse(
			fs.readFileSync(manifest, "utf8"),
		);
		return pkg.private
			? []
			: [{ name: pkg.name, version: pkg.version, dir: path.join("packages", entry) }];
	});
}

/** Whether `gh` exits 0 for `args`. */
function gh(args: string[]): boolean {
	return spawnSync("gh", args, { stdio: "ignore" }).status === 0;
}

/**
 * Creates the missing GitHub release for each tagged version of a public package.
 * Why tags, not the action output: a rerun publishes nothing new, so only the tags still name the versions to release.
 */
function main() {
	const repo = process.env.GITHUB_REPOSITORY ?? "ngrok/mantle";
	const sha = process.env.GITHUB_SHA ?? "main";
	const root = path.resolve(import.meta.dirname, "..");
	let failures = 0;

	for (const { name, version, dir } of publicPackages(root)) {
		const tag = `${name}@${version}`;
		// The action pushes the tag when it publishes, so a version with no tag is not on npm yet.
		const tagged = gh(["api", `repos/${repo}/git/ref/tags/${tag}`]);
		if (!tagged || gh(["release", "view", tag, "--repo", repo])) {
			continue;
		}
		try {
			const changelog = fs.readFileSync(path.join(root, dir, "CHANGELOG.md"), "utf8");
			const entry = changelogEntry(changelog, version);
			if (entry == null) {
				throw new Error(`${dir}/CHANGELOG.md has no ## ${version} section`);
			}
			const fullNotesUrl = `https://github.com/${repo}/blob/${sha}/${dir}/CHANGELOG.md#${versionAnchor(version)}`;
			execFileSync(
				"gh",
				[
					"release",
					"create",
					tag,
					"--repo",
					repo,
					"--title",
					tag,
					"--notes-file",
					"-",
					"--verify-tag",
					...(version.includes("-") ? ["--prerelease"] : []),
				],
				{ input: releaseBody(entry, fullNotesUrl), stdio: ["pipe", "inherit", "inherit"] },
			);
		} catch (error) {
			failures++;
			console.error(`failed ${tag}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	if (failures > 0) {
		process.exitCode = 1;
	}
}

if (import.meta.main) {
	main();
}
