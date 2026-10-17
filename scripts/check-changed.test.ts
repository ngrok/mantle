import { describe, expect, it } from "vitest";

import { planChecks, tailLines } from "./check-changed.ts";

const stepNames = (files: string[]) =>
	planChecks({ files, base: "origin/main" }).map((step) => step.name);

describe("planChecks", () => {
	it("plans nothing for files no check reads", () => {
		expect(stepNames(["apps/www/public/logo.png"])).toEqual([]);
	});

	it("formats prose and skips lint, typecheck, and tests", () => {
		expect(stepNames(["decisions/2026-07-04-list-family-api-design.md"])).toEqual(["fmt"]);
	});

	it("checks the budget when an agent doc changes", () => {
		expect(stepNames(["packages/AGENTS.md"])).toEqual(["fmt", "agent docs"]);
	});

	it("typechecks and tests a changed docs page, which the www suite reads", () => {
		expect(stepNames(["apps/www/app/docs/components/button.mdx"])).toEqual([
			"fmt",
			"typecheck",
			"test",
		]);
	});

	it("lints only the code files and scopes turbo to packages changed since the base", () => {
		const steps = planChecks({
			files: ["packages/mantle/src/components/button/button.tsx", "README.md"],
			base: "origin/release",
		});

		expect(steps).toEqual([
			{
				name: "fmt",
				command: "pnpm",
				args: [
					"exec",
					"oxfmt",
					"--check",
					"--no-error-on-unmatched-pattern",
					"packages/mantle/src/components/button/button.tsx",
					"README.md",
				],
			},
			{
				name: "lint",
				command: "pnpm",
				args: ["exec", "oxlint", "packages/mantle/src/components/button/button.tsx"],
			},
			{
				name: "typecheck",
				command: "pnpm",
				args: ["exec", "turbo", "run", "typecheck", "--filter=...[origin/release]"],
			},
			{
				name: "test",
				command: "pnpm",
				args: ["exec", "turbo", "run", "test", "--filter=...[origin/release]"],
			},
		]);
	});
});

describe("tailLines", () => {
	it("keeps the last lines and drops the trailing newline", () => {
		expect(tailLines({ text: "a\nb\nc\n", lineCount: 2 })).toBe("b\nc");
	});
});
