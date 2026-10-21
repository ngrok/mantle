import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

import { checkAgentDocs } from "./check-agent-docs.ts";

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
