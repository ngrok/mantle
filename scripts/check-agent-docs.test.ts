import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { checkAgentDocs, findRetiredLibraryMentions } from "./check-agent-docs.ts";

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

	it("allows the name while the manifest still lists the library", () => {
		writeManifest({ "@radix-ui/react-dialog": "1.1.15" });
		write("docs/motion.md", "A Radix overlay keeps keyframes.\n");

		expect(findRetiredLibraryMentions({ rootDir, files: ["docs/motion.md"], libraries })).toEqual(
			[],
		);
	});

	it("skips a decision doc, which records what was true on its date", () => {
		writeManifest({});
		write("decisions/2026-11-21-hooks.md", "Mantle wraps Radix.\n");

		expect(
			findRetiredLibraryMentions({ rootDir, files: ["decisions/2026-11-21-hooks.md"], libraries }),
		).toEqual([]);
	});
});
