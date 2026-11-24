#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * The longest release body this script sends, in UTF-8 bytes.
 *
 * Why 120,000: GitHub rejects a release body longer than 125,000 characters.
 * A UTF-8 byte count is never smaller than the character count, so the margin holds for any text.
 */
export const RELEASE_BODY_LIMIT = 120_000;

/** One package that `changesets/action` published, from its `published-packages` output. */
type PublishedPackage = { name: string; version: string };

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
 * The GitHub release body for one changelog entry.
 * Returns the whole entry when it fits in `limit` bytes.
 * Else returns the leading changes that fit, then a count of the omitted changes and a link to `fullNotesUrl`.
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

/** The directory of each workspace package under `packages/`, by package name. */
function packageDirs(root: string): Map<string, string> {
	const dirs = new Map<string, string>();
	for (const entry of fs.readdirSync(path.join(root, "packages"))) {
		const manifest = path.join(root, "packages", entry, "package.json");
		if (fs.existsSync(manifest)) {
			const pkg: { name: string } = JSON.parse(fs.readFileSync(manifest, "utf8"));
			dirs.set(pkg.name, path.join("packages", entry));
		}
	}
	return dirs;
}

/**
 * Creates one GitHub release for each package in `PUBLISHED_PACKAGES`, with a body that fits GitHub's size limit.
 * Skips a release that already exists, so a rerun after a partial failure is safe.
 */
function main() {
	const published: PublishedPackage[] = JSON.parse(process.env.PUBLISHED_PACKAGES ?? "[]");
	const repo = process.env.GITHUB_REPOSITORY ?? "ngrok/mantle";
	const sha = process.env.GITHUB_SHA ?? "main";
	const root = path.resolve(import.meta.dirname, "..");
	const dirs = packageDirs(root);
	let failures = 0;

	for (const { name, version } of published) {
		const tag = `${name}@${version}`;
		try {
			const dir = dirs.get(name);
			if (!dir) {
				throw new Error(`no workspace package named ${name}`);
			}
			const changelog = fs.readFileSync(path.join(root, dir, "CHANGELOG.md"), "utf8");
			const entry = changelogEntry(changelog, version);
			if (entry == null) {
				throw new Error(`${dir}/CHANGELOG.md has no ## ${version} section`);
			}
			const fullNotesUrl = `https://github.com/${repo}/blob/${sha}/${dir}/CHANGELOG.md#${versionAnchor(version)}`;

			const existing = spawnSync("gh", ["release", "view", tag, "--repo", repo], {
				stdio: "ignore",
			});
			if (existing.status === 0) {
				console.log(`skip ${tag}: the release exists`);
				continue;
			}
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
