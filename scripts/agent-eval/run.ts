#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
	appendFileSync,
	cpSync,
	mkdirSync,
	readFileSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { startMcpProxy } from "./proxy.ts";
import { addedFiles, criteria, scoreRun, type McpCall, type Score } from "./score.ts";
import { agentsMd, tasks, type Task } from "./tasks.ts";

const usage = `Usage: pnpm run eval:agents [options]

Runs coding agents on the fixed mantle tasks and scores the code they write.

  --agent <claude|codex>   An agent to run. Repeat for more. Default: claude.
  --model <agent=model>    The model for an agent, such as claude=claude-opus-5-5.
  --task <id>              A task to run. Repeat for more. Default: every task.
  --reps <n>               Runs of each task for each agent. Default: 1.
  --mcp-url <url>          The mantle MCP server. Default: https://mantle.ngrok.com/mcp.
  --mantle <spec>          The @ngrok/mantle that the app installs: a version or a packed .tgz.
                           Default: the latest published version.
  --concurrency <n>        Runs at one time. Default: 2.
  --timeout <minutes>      The longest one run may take. Default: 20.
  --out <dir>              Where to keep the apps, transcripts, and report.
  --rescore <dir>          Score the runs in an earlier --out again, with no agent runs.

Tasks: ${tasks.map((task) => task.id).join(", ")}`;

type Agent = "claude" | "codex";

/** What one run recorded, written to `run.json` so `--rescore` can score it again. */
type RunRecord = {
	id: string;
	task: string;
	agent: Agent;
	model?: string;
	exitCode: number | null;
	timedOut: boolean;
	durationMs: number;
	finalMessage: string;
	calls: readonly McpCall[];
	typechecks: boolean;
	diff: string;
	costUsd?: number;
	tokens?: number;
	score?: Score;
};

const repoRoot = path.join(import.meta.dirname, "../..");

/** Runs `command` and returns its exit code and output. Kills it after `timeoutMs`. */
function run(
	command: string,
	args: readonly string[],
	{ cwd, timeoutMs = 10 * 60_000 }: { cwd: string; timeoutMs?: number },
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
	return new Promise((resolve, reject) => {
		// Why detached: the agent CLI starts its own children, and a timeout must stop them all.
		const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"], detached: true });
		const killGroup = (signal: NodeJS.Signals) => {
			try {
				if (child.pid != null) {
					process.kill(-child.pid, signal);
				}
			} catch {
				// Why: the group can exit between the check and the signal.
			}
		};
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			killGroup("SIGTERM");
			setTimeout(() => killGroup("SIGKILL"), 10_000).unref();
		}, timeoutMs);
		child.stdout.on("data", (chunk: Buffer) => {
			stdout += chunk.toString();
		});
		child.stderr.on("data", (chunk: Buffer) => {
			stderr += chunk.toString();
		});
		child.on("error", reject);
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code, stdout, stderr, timedOut });
		});
	});
}

/** The pinned versions of `names` in the workspace catalog, so the app matches what mantle tests with. */
function catalogVersions(names: readonly string[]): Record<string, string> {
	const workspace = readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8");
	return Object.fromEntries(
		names.map((name) => {
			const version = new RegExp(`^\\s+"?${name}"?:\\s*"([^"]+)"`, "m").exec(workspace)?.[1];
			if (version == null) {
				throw new Error(`pnpm-workspace.yaml has no catalog version for ${name}.`);
			}
			return [name, version];
		}),
	);
}

/** Writes the eval app into `dir` and installs it once; each run copies it. */
async function prepareApp(dir: string, { mantle, skill }: { mantle: string; skill: string }) {
	const mantleSpec = mantle.endsWith(".tgz") ? `file:${path.resolve(mantle)}` : mantle;
	const files: Record<string, string> = {
		"package.json": JSON.stringify(
			{
				name: "mantle-eval-app",
				private: true,
				type: "module",
				dependencies: {
					"@ngrok/mantle": mantleSpec,
					...catalogVersions(["react", "react-dom", "@phosphor-icons/react"]),
				},
				devDependencies: catalogVersions(["typescript", "@types/react", "@types/react-dom"]),
			},
			null,
			2,
		),
		"tsconfig.json": JSON.stringify(
			{
				compilerOptions: {
					target: "ES2022",
					module: "ESNext",
					moduleResolution: "bundler",
					jsx: "react-jsx",
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					types: [],
				},
				include: ["src"],
			},
			null,
			2,
		),
		".gitignore": "node_modules\n",
		"AGENTS.md": agentsMd,
		"CLAUDE.md": "@AGENTS.md\n",
		".agents/skills/mantle/SKILL.md": skill,
		".claude/skills/mantle/SKILL.md": skill,
		"src/app.css": '@import "tailwindcss";\n@import "@ngrok/mantle/mantle.css";\n',
	};
	for (const [file, content] of Object.entries(files)) {
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), content);
	}
	const install = await run("npm", ["install", "--no-audit", "--no-fund"], { cwd: dir });
	if (install.code !== 0) {
		throw new Error(`npm install failed in the eval app:\n${install.stderr}`);
	}
}

/** The command line that runs `agent` headless on `prompt`, with only the eval's MCP server. */
function agentCommand(
	agent: Agent,
	{
		prompt,
		mcpUrl,
		model,
		lastMessageFile,
	}: { prompt: string; mcpUrl: string; model?: string; lastMessageFile: string },
): [string, string[]] {
	if (agent === "claude") {
		return [
			"claude",
			[
				"-p",
				prompt,
				"--output-format",
				"stream-json",
				"--verbose",
				"--mcp-config",
				JSON.stringify({ mcpServers: { mantle: { type: "http", url: mcpUrl } } }),
				"--strict-mcp-config",
				"--dangerously-skip-permissions",
				...(model == null ? [] : ["--model", model]),
			],
		];
	}
	return [
		"codex",
		[
			"exec",
			"--json",
			"--ephemeral",
			"--ignore-user-config",
			"--skip-git-repo-check",
			"--dangerously-bypass-approvals-and-sandbox",
			"--output-last-message",
			lastMessageFile,
			"-c",
			`mcp_servers.mantle.url=${JSON.stringify(mcpUrl)}`,
			...(model == null ? [] : ["--model", model]),
			prompt,
		],
	];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value != null && !Array.isArray(value);
}

/** The number at `key` of `record`, or 0. */
function numberAt(record: unknown, key: string): number {
	const value = isRecord(record) ? record[key] : undefined;
	return typeof value === "number" ? value : 0;
}

/** The JSON lines of an agent transcript that parse to objects. */
function jsonLines(transcript: string): Record<string, unknown>[] {
	return transcript.split("\n").flatMap((line) => {
		try {
			const value: unknown = JSON.parse(line);
			return isRecord(value) ? [value] : [];
		} catch {
			return [];
		}
	});
}

/** The final reply, cost, and token count in a transcript. */
function transcriptFacts(agent: Agent, transcript: string, lastMessage: string) {
	const events = jsonLines(transcript);
	if (agent === "claude") {
		const result = events.findLast((event) => event.type === "result");
		const usage = result?.usage;
		return {
			finalMessage: typeof result?.result === "string" ? result.result : "",
			costUsd: typeof result?.total_cost_usd === "number" ? result.total_cost_usd : undefined,
			tokens:
				numberAt(usage, "input_tokens") +
				numberAt(usage, "output_tokens") +
				numberAt(usage, "cache_read_input_tokens"),
		};
	}
	const tokens = events
		.filter((event) => event.type === "turn.completed")
		.reduce(
			(sum, event) =>
				sum + numberAt(event.usage, "input_tokens") + numberAt(event.usage, "output_tokens"),
			0,
		);
	return { finalMessage: lastMessage, costUsd: undefined, tokens };
}

/** One agent run on one task, in its own copy of the app. */
async function runOnce(
	{ id, task, agent, model }: { id: string; task: Task; agent: Agent; model?: string },
	{
		out,
		template,
		mcpUrl,
		timeoutMs,
	}: { out: string; template: string; mcpUrl: string; timeoutMs: number },
): Promise<RunRecord> {
	const dir = path.join(out, "runs", id);
	const app = path.join(dir, "app");
	// Why a link: each copy of the installed app would cost about 200 MB, and agents do not install packages.
	cpSync(template, app, {
		recursive: true,
		filter: (source) => source !== path.join(template, "node_modules"),
	});
	symlinkSync(path.join(template, "node_modules"), path.join(app, "node_modules"));
	for (const [file, content] of Object.entries(task.files ?? {})) {
		mkdirSync(path.dirname(path.join(app, file)), { recursive: true });
		writeFileSync(path.join(app, file), content);
	}
	await run("git", ["init", "-q"], { cwd: app });
	await run("git", ["add", "-A"], { cwd: app });
	await run(
		"git",
		["-c", "user.name=eval", "-c", "user.email=eval@example.com", "commit", "-qm", "base"],
		{
			cwd: app,
		},
	);

	const lastMessageFile = path.join(dir, "last-message.txt");
	const [command, args] = agentCommand(agent, {
		prompt: task.prompt,
		mcpUrl,
		model,
		lastMessageFile,
	});
	const started = Date.now();
	const result = await run(command, args, { cwd: app, timeoutMs });
	const durationMs = Date.now() - started;
	writeFileSync(path.join(dir, "transcript.jsonl"), result.stdout);
	writeFileSync(path.join(dir, "stderr.log"), result.stderr);
	let lastMessage = "";
	try {
		lastMessage = readFileSync(lastMessageFile, "utf8");
	} catch {
		// Why: only Codex writes the file, and only when it finishes.
	}

	await run("git", ["add", "-A"], { cwd: app });
	const diff = (
		await run("git", ["diff", "--cached", "--no-color", "-U0", "--", "src"], { cwd: app })
	).stdout;
	const typecheck = await run("npx", ["tsc", "--noEmit", "-p", "."], { cwd: app });
	writeFileSync(path.join(dir, "tsc.log"), typecheck.stdout);

	return {
		id,
		task: task.id,
		agent,
		model,
		exitCode: result.code,
		timedOut: result.timedOut,
		durationMs,
		calls: [],
		typechecks: typecheck.code === 0,
		diff,
		...transcriptFacts(agent, result.stdout, lastMessage),
	};
}

/** The latest published `@ngrok/mantle` version. */
async function latestMantle(): Promise<string> {
	const document: unknown = await (
		await fetch("https://registry.npmjs.org/@ngrok/mantle/latest")
	).json();
	if (!isRecord(document) || typeof document.version !== "string") {
		throw new Error("The npm registry returned no latest @ngrok/mantle version.");
	}
	return document.version;
}

/** Scores `record` against its task. */
function score(record: RunRecord): RunRecord {
	const task = tasks.find((candidate) => candidate.id === record.task);
	if (task == null) {
		throw new Error(`Run ${record.id} names an unknown task, ${record.task}.`);
	}
	return {
		...record,
		score: scoreRun(task, {
			files: addedFiles(record.diff).filter(({ path: file }) => /\.(tsx?|jsx?)$/.test(file)),
			calls: record.calls,
			finalMessage: record.finalMessage,
			typechecks: record.typechecks,
		}),
	};
}

/** One Markdown table cell. */
function cell(text: string): string {
	return text.replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** The status mark of one run. */
function statusOf(record: RunRecord): string {
	if (record.timedOut) {
		return "⏱️";
	}
	return record.score?.pass === true ? "✅" : "❌";
}

/** The Markdown report of `records`: pass rates by task and agent, by criterion, and each run. */
function report(
	records: readonly RunRecord[],
	{ mcpUrl, mantle }: { mcpUrl: string; mantle: string },
): string {
	const agents = [...new Set(records.map((record) => record.agent))];
	const rate = (subset: readonly RunRecord[], pass: (record: RunRecord) => boolean) =>
		subset.length === 0 ? "–" : `${subset.filter(pass).length}/${subset.length}`;
	const taskRows = tasks
		.filter((task) => records.some((record) => record.task === task.id))
		.map(
			(task) =>
				`| ${task.id} | ${agents
					.map((agent) =>
						rate(
							records.filter((record) => record.task === task.id && record.agent === agent),
							(record) => record.score?.pass === true,
						),
					)
					.join(" | ")} |`,
		);
	const criterionRows = criteria.map(
		(name) =>
			`| ${name} | ${agents
				.map((agent) =>
					rate(
						records.filter((record) => record.agent === agent),
						(record) => record.score?.criteria[name].pass === true,
					),
				)
				.join(" | ")} |`,
	);
	const runRows = records.map((record) => {
		const counts = ["find", "get", "check", "report_gap"]
			.map((tool) => record.calls.filter((call) => call.tool === tool).length)
			.join("/");
		const notes = criteria.flatMap((name) => record.score?.criteria[name].notes ?? []).join("; ");
		const status = statusOf(record);
		const cost = record.costUsd == null ? "" : `$${record.costUsd.toFixed(2)}`;
		return `| ${status} | ${record.id} | ${record.task} | ${record.agent}${record.model == null ? "" : ` (${record.model})`} | ${counts} | ${Math.round(record.durationMs / 1000)} s | ${cost} | ${cell(notes)} |`;
	});
	const header = (first: string) =>
		`| ${first} | ${agents.join(" | ")} |\n| --- |${" --- |".repeat(agents.length)}`;
	return [
		"## mantle agent eval",
		"",
		`MCP: ${mcpUrl}. mantle: ${mantle}. A run passes when it meets every criterion.`,
		"",
		header("Task"),
		...taskRows,
		"",
		header("Criterion"),
		...criterionRows,
		"",
		"<details><summary>Each run</summary>",
		"",
		"| | Run | Task | Agent | find/get/check/report_gap | Time | Cost | Why it failed |",
		"| --- | --- | --- | --- | --- | --- | --- | --- |",
		...runRows,
		"",
		"</details>",
		"",
	].join("\n");
}

/** Runs `jobs` with at most `limit` at one time, in order. */
async function pool<T, R>(
	jobs: readonly T[],
	limit: number,
	work: (job: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = Array.from({ length: jobs.length });
	let next = 0;
	const worker = async () => {
		for (let index = next; index < jobs.length; index = next) {
			next += 1;
			const job = jobs[index];
			if (job !== undefined) {
				results[index] = await work(job);
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
	return results;
}

function writeReport(
	out: string,
	records: readonly RunRecord[],
	context: { mcpUrl: string; mantle: string },
) {
	const markdown = report(records, context);
	writeFileSync(path.join(out, "report.md"), markdown);
	writeFileSync(path.join(out, "results.json"), JSON.stringify(records, null, 2));
	if (process.env.GITHUB_STEP_SUMMARY != null) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
	}
	process.stdout.write(`${markdown}\nResults: ${out}\n`);
}

async function main() {
	const { values } = parseArgs({
		options: {
			agent: { type: "string", multiple: true },
			model: { type: "string", multiple: true },
			task: { type: "string", multiple: true },
			reps: { type: "string", default: "1" },
			"mcp-url": { type: "string", default: "https://mantle.ngrok.com/mcp" },
			mantle: { type: "string" },
			concurrency: { type: "string", default: "2" },
			timeout: { type: "string", default: "20" },
			out: { type: "string" },
			rescore: { type: "string" },
			help: { type: "boolean" },
		},
	});
	if (values.help === true) {
		process.stdout.write(`${usage}\n`);
		return;
	}
	const mcpUrl = values["mcp-url"];

	if (values.rescore != null) {
		const out = path.resolve(values.rescore);
		const previous: { records: RunRecord[]; mantle: string; mcpUrl: string } = JSON.parse(
			readFileSync(path.join(out, "eval.json"), "utf8"),
		);
		writeReport(out, previous.records.map(score), previous);
		return;
	}

	const agents = (values.agent ?? ["claude"]).map((agent): Agent => {
		if (agent !== "claude" && agent !== "codex") {
			throw new Error(`Unknown agent ${agent}. Use claude or codex.\n\n${usage}`);
		}
		return agent;
	});
	const models = new Map(
		(values.model ?? []).map((pair) => [
			pair.slice(0, pair.indexOf("=")),
			pair.slice(pair.indexOf("=") + 1),
		]),
	);
	const selected =
		values.task == null ? tasks : tasks.filter((task) => values.task?.includes(task.id));
	if (selected.length === 0) {
		throw new Error(`No task matches ${values.task?.join(", ")}.\n\n${usage}`);
	}
	for (const agent of agents) {
		const probe = await run(agent, ["--version"], { cwd: repoRoot }).catch(() => undefined);
		if (probe?.code !== 0) {
			throw new Error(
				`The ${agent} CLI is not on PATH. Install it and sign in first (docs/mcp-evals.md).`,
			);
		}
	}

	const mantle = values.mantle ?? (await latestMantle());
	const out = path.resolve(
		values.out ??
			path.join(tmpdir(), "mantle-agent-eval", new Date().toISOString().replaceAll(":", "-")),
	);
	const template = path.join(out, "template");
	mkdirSync(out, { recursive: true });

	// Why the skill from the MCP server's site: a branch run serves the branch's skill, a prod run the published one.
	const skillResponse = await fetch(new URL("/.well-known/skills/mantle/SKILL.md", mcpUrl));
	if (!skillResponse.ok) {
		throw new Error(`Could not read the mantle skill from ${mcpUrl}: ${skillResponse.status}.`);
	}
	await prepareApp(template, { mantle, skill: await skillResponse.text() });

	const jobs = selected.flatMap((task) =>
		agents.flatMap((agent) =>
			Array.from({ length: Number(values.reps) }, (_, rep) => ({
				id: `${task.id}-${agent}-${rep + 1}`,
				task,
				agent,
				model: models.get(agent),
			})),
		),
	);
	const proxy = await startMcpProxy(mcpUrl);
	// Why after each run: a job that hits its timeout keeps the finished runs for `--rescore`.
	const finished: RunRecord[] = [];
	try {
		const records = await pool(jobs, Number(values.concurrency), async (job) => {
			process.stderr.write(`start ${job.id}\n`);
			const record = await runOnce(job, {
				out,
				template,
				mcpUrl: proxy.urlFor(job.id),
				timeoutMs: Number(values.timeout) * 60_000,
			});
			const scored = score({ ...record, calls: proxy.callsOf(job.id) });
			writeFileSync(path.join(out, "runs", job.id, "run.json"), JSON.stringify(scored, null, 2));
			finished.push(scored);
			writeFileSync(
				path.join(out, "eval.json"),
				JSON.stringify({ records: finished, mantle, mcpUrl }, null, 2),
			);
			process.stderr.write(`done ${job.id}: ${scored.score?.pass === true ? "pass" : "fail"}\n`);
			return scored;
		});
		writeReport(out, records, { mcpUrl, mantle });
	} finally {
		await proxy.close();
	}
}

await main();
