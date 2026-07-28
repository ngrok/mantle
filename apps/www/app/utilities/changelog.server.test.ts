import { describe, expect, it } from "vitest";
import { parseChangeBody, parseVersions } from "./changelog.server";

describe("parseChangeBody", () => {
	it("extracts PR, commit, author, and trimmed summary from a typical changesets bullet", () => {
		const raw =
			"[#1167](https://github.com/ngrok/mantle/pull/1167) " +
			"[`acd0c55`](https://github.com/ngrok/mantle/commit/acd0c55527fefdf410e28858db2eaf90a9f5d2f5) " +
			"Thanks [@cody-dot-js](https://github.com/cody-dot-js)! - Add `OtpInput`.";
		expect(parseChangeBody(raw)).toEqual({
			summary: "Add `OtpInput`.",
			pr: "https://github.com/ngrok/mantle/pull/1167",
			commit: "https://github.com/ngrok/mantle/commit/acd0c55527fefdf410e28858db2eaf90a9f5d2f5",
			author: "cody-dot-js",
		});
	});

	it("handles partial metadata (no PR link)", () => {
		const raw =
			"[`abcdef0`](https://github.com/ngrok/mantle/commit/abcdef0) " +
			"Thanks [@octocat](https://github.com/octocat)! - patch only";
		expect(parseChangeBody(raw)).toEqual({
			summary: "patch only",
			pr: undefined,
			commit: "https://github.com/ngrok/mantle/commit/abcdef0",
			author: "octocat",
		});
	});

	it("returns the whole body as summary when no metadata is present", () => {
		expect(parseChangeBody("Plain prose with no preamble.")).toEqual({
			summary: "Plain prose with no preamble.",
			pr: undefined,
			commit: undefined,
			author: undefined,
		});
	});

	it("does not strip a `Thanks` mention that appears mid-sentence", () => {
		const raw = "Refactor module. Thanks to @octocat for the report.";
		const parsed = parseChangeBody(raw);
		expect(parsed.summary).toBe(raw);
		expect(parsed.author).toBeUndefined();
	});
});

describe("parseVersions", () => {
	it("returns one entry per `## X.Y.Z` heading, in source order", () => {
		const source = [
			"# @ngrok/mantle",
			"",
			"## 1.0.0",
			"",
			"### Patch Changes",
			"",
			"- first patch",
			"",
			"## 0.9.0",
			"",
			"### Minor Changes",
			"",
			"- a minor change",
			"",
		].join("\n");
		const versions = parseVersions(source);
		expect(versions.map((entry) => entry.version)).toEqual(["1.0.0", "0.9.0"]);
	});

	// `### Major Changes` has never appeared in the real CHANGELOG (mantle is
	// still pre-1.0), so this is the only thing standing between the first
	// breaking release and silently dropping every breaking-change entry.
	it("groups changes by bump heading", () => {
		const source = [
			"## 1.0.0",
			"",
			"### Major Changes",
			"",
			"- major a",
			"",
			"### Minor Changes",
			"",
			"- minor a",
			"",
			"### Patch Changes",
			"",
			"- patch a",
			"- patch b",
			"",
		].join("\n");
		const [version] = parseVersions(source);
		expect(version?.changes).toEqual([
			{ bump: "major", summary: "major a", pr: undefined, commit: undefined, author: undefined },
			{ bump: "minor", summary: "minor a", pr: undefined, commit: undefined, author: undefined },
			{ bump: "patch", summary: "patch a", pr: undefined, commit: undefined, author: undefined },
			{ bump: "patch", summary: "patch b", pr: undefined, commit: undefined, author: undefined },
		]);
	});

	// The version regex's optional prerelease group has no instance in the real
	// CHANGELOG either; a tightened regex would skip the heading entirely and
	// fold its bullets into the previous version.
	it("captures prerelease versions verbatim", () => {
		const source = [
			"## 1.0.0-beta.1",
			"",
			"### Patch Changes",
			"",
			"- a prerelease patch",
			"",
			"## 1.0.0-rc.2",
			"",
			"### Minor Changes",
			"",
			"- a prerelease minor",
			"",
		].join("\n");
		const versions = parseVersions(source);
		expect(versions.map((entry) => entry.version)).toEqual(["1.0.0-beta.1", "1.0.0-rc.2"]);
		expect(versions[0]?.changes.map((change) => change.summary)).toEqual(["a prerelease patch"]);
		expect(versions[1]?.changes.map((change) => change.summary)).toEqual(["a prerelease minor"]);
	});

	it("folds two-space-indented continuation lines into the prior bullet", () => {
		const source = [
			"## 1.0.0",
			"",
			"### Patch Changes",
			"",
			"- summary line",
			"",
			"  follow-up paragraph",
			"",
		].join("\n");
		const [version] = parseVersions(source);
		expect(version?.changes[0]?.summary).toBe("summary line\n\nfollow-up paragraph");
	});

	it("folds an indented fenced block into its bullet, the shape changesets emit", () => {
		// This is what the real file looks like: `packages/mantle/CHANGELOG.md` has 46
		// indented fences and none at column 0. Indented fences never reach the `inFence`
		// branch — the two-space continuation rule carries them — so this pins the path
		// production actually takes, and the column-0 fixture below pins the other one.
		const source = [
			"## 1.0.0",
			"",
			"### Patch Changes",
			"",
			"- example:",
			"",
			"  ```ts",
			"  const value = 1;",
			"  ```",
			"",
		].join("\n");
		const [version] = parseVersions(source);
		expect(version?.changes).toHaveLength(1);
		expect(version?.changes[0]?.summary).toBe("example:\n\n```ts\nconst value = 1;\n```");
	});

	it("treats fenced code blocks as content, not structure", () => {
		const source = [
			"## 1.0.0",
			"",
			"### Patch Changes",
			"",
			"- example:",
			"",
			// Fences at column 0: `parseVersions` gates `inFence` on
			// `line.startsWith("```")`, so an indented fence never enters the branch
			// and the whole fence-tracking block could be deleted with this green.
			"```ts",
			"// looks like a top-level bullet but isn't",
			"- not a bullet",
			"## not a heading",
			"```",
			"",
		].join("\n");
		const [version] = parseVersions(source);
		expect(version?.changes).toHaveLength(1);
		expect(version?.changes[0]?.summary).toContain("- not a bullet");
		expect(version?.changes[0]?.summary).toContain("## not a heading");
	});

	it("ignores headings that appear before any version", () => {
		const source = ["# @ngrok/mantle", "", "Some intro prose.", ""].join("\n");
		expect(parseVersions(source)).toEqual([]);
	});

	it("skips bumps with unknown headings", () => {
		const source = [
			"## 1.0.0",
			"",
			"### Notes",
			"",
			"- a note that should be dropped",
			"",
			"### Patch Changes",
			"",
			"- a real patch",
			"",
		].join("\n");
		const [version] = parseVersions(source);
		expect(version?.changes.map((change) => change.summary)).toEqual(["a real patch"]);
	});
});
