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

	it("groups changes by bump heading", () => {
		const source = [
			"## 1.0.0",
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
			{ bump: "minor", summary: "minor a", pr: undefined, commit: undefined, author: undefined },
			{ bump: "patch", summary: "patch a", pr: undefined, commit: undefined, author: undefined },
			{ bump: "patch", summary: "patch b", pr: undefined, commit: undefined, author: undefined },
		]);
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

	it("treats fenced code blocks as content, not structure", () => {
		const source = [
			"## 1.0.0",
			"",
			"### Patch Changes",
			"",
			"- example:",
			"",
			"  ```ts",
			"  // looks like a top-level bullet but isn't",
			"  - not a bullet",
			"  ## not a heading",
			"  ```",
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
