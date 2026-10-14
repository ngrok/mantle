import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const changesetDir = path.resolve(import.meta.dirname, "../.changeset");

/** The pending changesets, by file name. */
function pendingChangesets(): string[] {
	return fs
		.readdirSync(changesetDir)
		.filter((entry) => entry.endsWith(".md") && entry !== "README.md")
		.toSorted();
}

/** The bump a changeset gives `@ngrok/mantle`, or `null` when it names another package. */
function mantleBump(source: string): string | null {
	const match = source.match(/^"@ngrok\/mantle":\s*(\w+)\s*$/m);
	return match?.[1] ?? null;
}

describe("pending changesets", () => {
	const names = pendingChangesets();

	// Why: a breaking minor ships a migration guide and a codemod, and the
	// changeset is the one artifact every minor already has. A minor for a new
	// component or a preview promotion says so instead. Catches a breaking
	// minor whose author wrote the release note and skipped the guide.
	it.each(names.length > 0 ? names : ["(none)"])(
		"%s links a migration guide when it bumps @ngrok/mantle minor",
		(name) => {
			if (name === "(none)") {
				return;
			}
			const source = fs.readFileSync(path.join(changesetDir, name), "utf8");
			if (mantleBump(source) !== "minor") {
				return;
			}

			expect(source).toMatch(/mantle\.ngrok\.com\/migrations\/\d{4}-[a-z0-9-]+|No migration: \S/);
		},
	);

	// Why: VERSIONING.md has no major, and a `major` changeset would publish 1.0.0.
	it.each(names.length > 0 ? names : ["(none)"])("%s never bumps @ngrok/mantle major", (name) => {
		if (name === "(none)") {
			return;
		}
		const source = fs.readFileSync(path.join(changesetDir, name), "utf8");

		expect(mantleBump(source)).not.toBe("major");
	});
});
