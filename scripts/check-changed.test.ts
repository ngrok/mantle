import { describe, expect, it } from "vitest";

import { planChecks, tailLines } from "./check-changed.ts";

const stepNames = (files: string[], deleted: string[] = []) =>
	planChecks({ files, deleted, base: "origin/main" }).map((step) => step.name);

describe("planChecks", () => {
	it("plans nothing for files no check reads", () => {
		expect(stepNames(["apps/www/public/logo.png"])).toEqual([]);
	});

	it("formats prose and checks its links, and skips lint, typecheck, and tests", () => {
		expect(stepNames(["decisions/2026-07-04-list-family-api-design.md"])).toEqual([
			"fmt",
			"doc links",
		]);
	});

	it("checks the budget when an agent doc changes", () => {
		expect(stepNames(["packages/AGENTS.md"])).toEqual(["fmt", "agent docs", "doc links"]);
	});

	it("typechecks and tests a changed docs page, which the www suite reads", () => {
		expect(stepNames(["apps/www/app/docs/components/button.mdx"])).toEqual([
			"fmt",
			"typecheck",
			"test",
		]);
	});

	it("typechecks and tests a change to a package manifest, which compilation reads", () => {
		expect(stepNames(["packages/mantle/package.json"])).toEqual(["fmt", "typecheck", "test"]);
	});

	it.each(["packages/mantle/src/mantle.css", "pnpm-lock.yaml", "scripts/tailwind-canonical.ts"])(
		"checks the Tailwind classes of every file when %s changes",
		(file) => {
			const tailwind = planChecks({ files: [file], deleted: [], base: "origin/main" }).find(
				(step) => step.name === "tailwind",
			);

			expect(tailwind?.args).toEqual(["./scripts/tailwind-canonical.ts"]);
		},
	);

	it("runs the root script tasks too for a shared tsconfig, which the scripts tsconfig extends", () => {
		expect(stepNames(["config/tsconfig/tsconfig.client-package.json"])).toEqual([
			"fmt",
			"typecheck",
			"test",
			"scripts",
		]);
	});

	it("typechecks and tests a deleted source file, and formats and lints none", () => {
		const file = "packages/mantle/src/components/button/button.tsx";

		expect(stepNames([file], [file])).toEqual(["typecheck", "test"]);
	});

	it("checks the budget when an agent doc is deleted", () => {
		expect(stepNames(["packages/AGENTS.md"], ["packages/AGENTS.md"])).toEqual(["agent docs"]);
	});

	it.each([
		".oxlintrc.json",
		"scripts/oxlint-plugin-mantle.js",
		"scripts/oxlint-rules/prefer-type-alias.js",
	])("lints the whole repo when %s changes", (file) => {
		const lint = planChecks({ files: [file], deleted: [], base: "origin/main" }).find(
			(step) => step.name === "lint",
		);

		expect(lint?.args).toEqual(["run", "lint"]);
	});

	it("runs the root script tasks for a changeset-only change", () => {
		expect(stepNames([".changeset/new-feature.md"])).toEqual(["fmt", "doc links", "scripts"]);
	});

	it("runs the root script tasks beside the package checks for a script change", () => {
		expect(stepNames(["scripts/check-changed.ts"])).toEqual([
			"fmt",
			"lint",
			"typecheck",
			"test",
			"scripts",
		]);
	});

	it("lints only the code files, checks only the markdown links, and scopes turbo to packages changed since the base", () => {
		const steps = planChecks({
			files: ["packages/mantle/src/components/button/button.tsx", "README.md"],
			deleted: [],
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
				name: "tailwind",
				command: "node",
				args: [
					"./scripts/tailwind-canonical.ts",
					"packages/mantle/src/components/button/button.tsx",
				],
			},
			{
				name: "lint",
				command: "pnpm",
				args: [
					"exec",
					"oxlint",
					"--type-aware",
					"--deny-warnings",
					"packages/mantle/src/components/button/button.tsx",
				],
			},
			{
				name: "doc links",
				command: "node",
				args: ["./scripts/check-doc-links.ts", "README.md"],
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
