import { expect, test } from "vitest";
import { newestReleases } from "./mantle-changelog-mdx";

/** A changesets-shaped section for `version` with `size` characters of change text. */
function release(version: string, size: number): string {
	return `## ${version}\n\n### Patch Changes\n\n- ${"x".repeat(size)}\n`;
}

const changelog = [
	"# @ngrok/mantle\n",
	release("0.3.0", 600),
	release("0.2.0", 300),
	release("0.1.0", 300),
].join("\n");

test("keeps the title and the newest releases that fit, newest first", () => {
	const page = newestReleases(changelog, 1000);

	expect(page.startsWith("# @ngrok/mantle\n")).toBe(true);
	expect(page).toContain("## 0.3.0");
	expect(page).toContain("## 0.2.0");
	expect(page).not.toContain("## 0.1.0");
});

test("keeps the newest release when it alone is larger than the budget", () => {
	const page = newestReleases(changelog, 100);

	expect(page).toContain(`- ${"x".repeat(600)}`);
	expect(page).not.toContain("## 0.2.0");
});

// Why: changesets indents a change body, so a `## ` line inside one is not a release.
test("does not split a release at an indented heading in a change body", () => {
	const nested = `# @ngrok/mantle\n\n## 0.2.0\n\n- intro\n\n  ## 1. Steps\n\n  ${"y".repeat(500)}\n\n## 0.1.0\n\n- old\n`;

	const page = newestReleases(nested, 100);

	expect(page).toContain("  ## 1. Steps");
	expect(page).toContain("y".repeat(500));
	expect(page).not.toContain("## 0.1.0");
});
