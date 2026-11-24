import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { changelogEntry, RELEASE_BODY_LIMIT, releaseBody } from "./github-releases.ts";

const require = createRequire(import.meta.url);
const fullNotesUrl = "https://github.com/ngrok/mantle/blob/abc123/packages/mantle/CHANGELOG.md#020";

/** A change body shaped like mantle's largest: a list, an indented heading, and a code fence. */
function changeBody(index: number): string {
	return [
		`Change ${index}: rename a part and move its data attribute.`,
		"",
		"## Migration",
		"",
		"- read the guide",
		"- run the codemod",
		"",
		"```tsx",
		`<Dialog.Root data-change="${index}">${"x".repeat(400)}</Dialog.Root>`,
		"```",
	].join("\n");
}

/**
 * Runs the real `changeset version` on a temporary workspace with `count` changesets,
 * and returns the new `CHANGELOG.md`.
 */
function versionSyntheticRelease(count: number): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "changeset-version-"));
	const write = (file: string, content: string) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), content);
	};
	write("package.json", JSON.stringify({ name: "root", private: true }));
	write("pnpm-workspace.yaml", "packages:\n  - packages/*\n");
	write("packages/pkg/package.json", JSON.stringify({ name: "@synthetic/pkg", version: "0.1.0" }));
	write(
		".changeset/config.json",
		JSON.stringify({
			changelog: require.resolve("@changesets/cli/changelog"),
			commit: false,
			access: "public",
			baseBranch: "main",
		}),
	);
	for (let index = 0; index < count; index++) {
		const bump = index % 3 === 0 ? "minor" : "patch";
		write(
			`.changeset/change-${index}.md`,
			`---\n"@synthetic/pkg": ${bump}\n---\n\n${changeBody(index)}\n`,
		);
	}

	execFileSync(process.execPath, [require.resolve("@changesets/cli/bin.js"), "version"], {
		cwd: dir,
		stdio: "pipe",
	});
	return fs.readFileSync(path.join(dir, "packages/pkg/CHANGELOG.md"), "utf8");
}

describe("release notes for a large release", () => {
	// Why: a release body past GitHub's limit fails `gh release create` after npm publish.
	// This runs the real version step, so a change in the changesets output format fails here too.
	it("fits a 400-change release in the GitHub release limit and links the full notes", () => {
		const changelog = versionSyntheticRelease(400);
		const entry = changelogEntry(changelog, "0.2.0");

		expect(entry).not.toBeNull();
		expect(Buffer.byteLength(entry ?? "")).toBeGreaterThan(RELEASE_BODY_LIMIT);

		const body = releaseBody(entry ?? "", fullNotesUrl);
		const keptChanges = body.match(/^- /gm)?.length ?? 0;
		const omitted = Number(body.match(/(\d+) more changes? do(?:es)? not fit/)?.[1]);

		expect(Buffer.byteLength(body)).toBeLessThanOrEqual(RELEASE_BODY_LIMIT);
		expect(body).toContain(`](${fullNotesUrl})`);
		expect(keptChanges).toBeGreaterThan(0);
		expect(keptChanges + omitted).toBe(400);
		// An odd fence count means the cut split a code block.
		expect((body.match(/```/g)?.length ?? 0) % 2).toBe(0);
	}, 60_000);
});

describe("changelogEntry", () => {
	const changelog = "# pkg\n\n## 0.2.0\n\n- new\n\n  ## Indented\n\n## 0.1.10\n\n- old\n";

	it("reads one version up to the next version heading", () => {
		expect(changelogEntry(changelog, "0.2.0")).toBe("- new\n\n  ## Indented");
	});

	it("matches the version exactly", () => {
		expect(changelogEntry(changelog, "0.1.1")).toBeNull();
	});
});

describe("releaseBody", () => {
	it("returns an entry that fits unchanged", () => {
		const entry = "### Minor Changes\n\n- one\n- two";

		expect(releaseBody(entry, fullNotesUrl)).toBe(entry);
	});

	it("drops a bump heading that has no change left under it", () => {
		const entry = `### Minor Changes\n\n- ${"a".repeat(300)}\n\n### Patch Changes\n\n- ${"b".repeat(300)}`;

		const body = releaseBody(entry, fullNotesUrl, 600);

		expect(body).toContain("a".repeat(300));
		expect(body).not.toContain("### Patch Changes");
		expect(body).toContain("1 more change does not fit");
	});
});
