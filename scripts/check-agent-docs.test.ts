import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import {
	checkAgentDocs,
	findRetiredLibraryMentions,
	listCurrentDocs,
	retiredLibraries,
} from "./check-agent-docs.ts";

const budgets = [{ path: "AGENTS.md", maxBytes: 10 }];

let rootDir = "";

beforeEach(() => {
	rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "mantle-agent-docs-"));
	return () => fs.rmSync(rootDir, { recursive: true, force: true });
});

describe("checkAgentDocs", () => {
	it("passes a doc at exactly its budget", () => {
		fs.writeFileSync(path.join(rootDir, "AGENTS.md"), "x".repeat(10));

		expect(checkAgentDocs({ rootDir, budgets })).toEqual([]);
	});

	it("reports a doc one byte over its budget", () => {
		fs.writeFileSync(path.join(rootDir, "AGENTS.md"), "x".repeat(11));

		expect(checkAgentDocs({ rootDir, budgets })).toEqual([
			"AGENTS.md is 11 bytes, over its 10-byte budget.",
		]);
	});

	it("counts bytes, not characters", () => {
		// Why: "é" is two bytes in UTF-8, so six of them pass a 10-character count and fail a 10-byte one.
		fs.writeFileSync(path.join(rootDir, "AGENTS.md"), "é".repeat(6));

		expect(checkAgentDocs({ rootDir, budgets })).toEqual([
			"AGENTS.md is 12 bytes, over its 10-byte budget.",
		]);
	});

	it("reports a missing doc", () => {
		expect(checkAgentDocs({ rootDir, budgets })).toEqual([
			"AGENTS.md is missing. Update its budget in scripts/check-agent-docs.ts.",
		]);
	});
});

describe("findRetiredLibraryMentions", () => {
	const libraries = [{ mention: /\bRadix\b/, packageName: /^@radix-ui\// }];

	const write = (file: string, content: string) => {
		fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true });
		fs.writeFileSync(path.join(rootDir, file), content);
	};

	const writeManifest = (dependencies: Record<string, string>) =>
		write("packages/mantle/package.json", JSON.stringify({ dependencies }));

	it("reports the line of a contributor doc that names a library the manifest does not list", () => {
		writeManifest({ sonner: "2.0.7" });
		write("docs/motion.md", "# Motion\n\nA Radix overlay keeps keyframes.\n");

		expect(findRetiredLibraryMentions({ rootDir, files: ["docs/motion.md"], libraries })).toEqual([
			"docs/motion.md:3 names Radix, which packages/mantle/package.json does not list.",
		]);
	});

	it.each(["dependencies", "peerDependencies"])(
		"allows the name while the manifest lists the library in %s",
		(field) => {
			write(
				"packages/mantle/package.json",
				JSON.stringify({ [field]: { "@radix-ui/react-dialog": "1.1.15" } }),
			);
			write("docs/motion.md", "A Radix overlay keeps keyframes.\n");

			expect(findRetiredLibraryMentions({ rootDir, files: ["docs/motion.md"], libraries })).toEqual(
				[],
			);
		},
	);

	it("skips a decision doc, which records what was true on its date", () => {
		writeManifest({});
		write("decisions/2026-11-21-hooks.md", "Mantle wraps Radix.\n");

		expect(
			findRetiredLibraryMentions({ rootDir, files: ["decisions/2026-11-21-hooks.md"], libraries }),
		).toEqual([]);
	});
});

describe("retiredLibraries", () => {
	it.each([
		["Radix wraps the dialog.", true],
		["`@radix-ui/react-tabs` ships Tabs.", true],
		["cmdk filters the list.", true],
		["the input-otp library", true],
		["HeadlessUI renders the radio.", true],
		["Select `[data-input-otp]` in a page style.", false],
		["No library names (`data-radix-*`).", false],
	])("%s → reported: %s", (line, reported) => {
		expect(retiredLibraries.some((library) => library.mention.test(line))).toBe(reported);
	});
});

describe("listCurrentDocs", () => {
	it("finds nested skills, docs, READMEs, and docs-site pages, and skips decisions, migrations, and changelogs", () => {
		for (const file of [
			"AGENTS.md",
			"README.md",
			"docs/principles/a.md",
			".claude/skills/x/SKILL.md",
			"decisions/2026-11-21-a.md",
			"packages/mantle/README.md",
			"packages/mantle/CHANGELOG.md",
			"apps/www/app/docs/index.mdx",
			"apps/www/app/docs/components/forms/select.mdx",
			"apps/www/app/docs/migrations/0017-select-migration.mdx",
		]) {
			fs.mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true });
			fs.writeFileSync(path.join(rootDir, file), "");
		}

		expect(listCurrentDocs(rootDir).toSorted()).toEqual([
			".claude/skills/x/SKILL.md",
			"AGENTS.md",
			"README.md",
			"apps/www/app/docs/components/forms/select.mdx",
			"apps/www/app/docs/index.mdx",
			"docs/principles/a.md",
			"packages/mantle/README.md",
		]);
	});
});
