import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { stampMigrations } from "./stamp-migrations.ts";

function guide(lines: readonly string[]): string {
	return [
		"---",
		"title: A Migration",
		"description: A change.",
		...lines,
		"---",
		"",
		"# Body",
		"",
	].join("\n");
}

function setup(guides: Record<string, string>, rulesDirs: readonly string[]) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "mantle-stamp-"));
	const paths = { docsDir: path.join(root, "docs"), rulesDir: path.join(root, "rules") };
	fs.mkdirSync(paths.docsDir);
	for (const [name, source] of Object.entries(guides)) {
		fs.writeFileSync(path.join(paths.docsDir, `${name}.mdx`), source);
	}
	for (const dir of rulesDirs) {
		fs.mkdirSync(path.join(paths.rulesDir, dir), { recursive: true });
		fs.writeFileSync(path.join(paths.rulesDir, dir, "rules.yml"), "");
	}
	const read = (name: string) => fs.readFileSync(path.join(paths.docsDir, `${name}.mdx`), "utf8");
	return { paths, read };
}

describe("stampMigrations", () => {
	// Catches: a number that follows the directory order and not the slug, a
	// renumbered guide, a stamp on a released guide, and codemodIn on a manual guide.
	it("numbers unreleased guides by slug after the highest number and stamps the version", () => {
		const released = guide(["number: 34", 'introducedIn: "0.95.0"']);
		const { paths, read } = setup(
			{
				"0034-old-migration": released,
				"0035-pending-migration": guide(["number: 35"]),
				"zebra-migration": guide([]),
				"apple-migration": guide(["codemodIdempotent: false"]),
			},
			["0035-pending", "zebra"],
		);

		expect(stampMigrations({ paths, version: "0.96.0" })).toEqual([
			"0035-pending-migration",
			"apple-migration",
			"zebra-migration",
		]);
		expect(read("0034-old-migration")).toBe(released);
		expect(read("0035-pending-migration")).toBe(
			guide(["number: 35", 'introducedIn: "0.96.0"', 'codemodIn: "0.96.0"']),
		);
		expect(read("apple-migration")).toBe(
			guide(["codemodIdempotent: false", "number: 36", 'introducedIn: "0.96.0"']),
		);
		expect(read("zebra-migration")).toBe(
			guide(["number: 37", 'introducedIn: "0.96.0"', 'codemodIn: "0.96.0"']),
		);
	});

	// Catches: a codemod added after its guide shipped that never gets
	// `codemodIn`, also in a numbered guide, and a restamped `introducedIn`.
	it("stamps codemodIn alone on a released guide that gains a codemod", () => {
		const { paths, read } = setup(
			{
				"0014-old-migration": guide(["number: 14", 'introducedIn: "0.94.0"']),
				"late-migration": guide(["number: 36 # kept", 'introducedIn: "0.95.0"']),
				"next-migration": guide([]),
			},
			["0014-old", "late"],
		);

		expect(stampMigrations({ paths, version: "0.96.0" })).toEqual([
			"0014-old-migration",
			"late-migration",
			"next-migration",
		]);
		expect(read("0014-old-migration")).toBe(
			guide(["number: 14", 'introducedIn: "0.94.0"', 'codemodIn: "0.96.0"']),
		);
		expect(read("late-migration")).toBe(
			guide(["number: 36 # kept", 'introducedIn: "0.95.0"', 'codemodIn: "0.96.0"']),
		);
		expect(read("next-migration")).toBe(guide(["number: 37", 'introducedIn: "0.96.0"']));
	});

	it("leaves every guide alone on a second run", () => {
		const { paths, read } = setup({ "apple-migration": guide([]) }, []);
		stampMigrations({ paths, version: "0.96.0" });
		const once = read("apple-migration");

		expect(stampMigrations({ paths, version: "0.97.0" })).toEqual([]);
		expect(read("apple-migration")).toBe(once);
	});
});
