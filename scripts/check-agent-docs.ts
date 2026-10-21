#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

/** The largest size an agent doc may reach, in bytes. */
export type AgentDocBudget = {
	path: string;
	maxBytes: number;
};

/**
 * The always-loaded agent docs and their budgets.
 * Why bytes: a harness that cuts long command output counts tokens, and bytes track tokens at about 4 to 1.
 */
export const agentDocBudgets = [
	{ path: "AGENTS.md", maxBytes: 8_000 },
	{ path: "CONVENTIONS.md", maxBytes: 24_000 },
	{ path: "packages/AGENTS.md", maxBytes: 2_000 },
	{ path: "apps/www/AGENTS.md", maxBytes: 2_000 },
] satisfies readonly AgentDocBudget[];

/**
 * Check each agent doc under `rootDir` against its budget.
 *
 * @returns One message for each doc that is missing or over its budget; an empty array when all pass.
 *
 * @example
 * checkAgentDocs({ rootDir: process.cwd(), budgets: agentDocBudgets });
 * // => ["AGENTS.md is 8,214 bytes, over its 8,000-byte budget."]
 */
export function checkAgentDocs({
	rootDir,
	budgets,
}: {
	rootDir: string;
	budgets: readonly AgentDocBudget[];
}): string[] {
	const problems: string[] = [];
	for (const budget of budgets) {
		const filePath = path.join(rootDir, budget.path);
		if (!fs.existsSync(filePath)) {
			problems.push(`${budget.path} is missing. Update its budget in scripts/check-agent-docs.ts.`);
			continue;
		}
		const bytes = fs.statSync(filePath).size;
		if (bytes > budget.maxBytes) {
			problems.push(
				`${budget.path} is ${bytes.toLocaleString("en-US")} bytes, over its ${budget.maxBytes.toLocaleString("en-US")}-byte budget.`,
			);
		}
	}
	return problems;
}

const entryPoint = process.argv[1];
if (entryPoint != null && import.meta.url === pathToFileURL(entryPoint).href) {
	const rootDir = path.join(import.meta.dirname, "..");
	const problems = checkAgentDocs({ rootDir, budgets: agentDocBudgets });
	for (const problem of problems) {
		console.error(problem);
	}
	if (problems.length > 0) {
		console.error(
			"Move task-scoped rules to the doc that owns them. See AGENTS.md § Route by task.",
		);
		process.exitCode = 1;
	} else {
		console.log(`All ${agentDocBudgets.length} agent docs are within budget.`);
	}
}
