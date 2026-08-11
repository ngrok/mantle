#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";
import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";

/** A TCP listener from the `lsof` field output. */
export type TcpListener = {
	pid: number;
	command: string;
	port: number;
};

/** A named mantle port range. */
export type ServerRange = {
	serverName: string;
	startPort: number;
};

/** A mantle listener with its matching range name. */
export type TargetListener = TcpListener & {
	serverName: string;
};

type FindTargetListenersOptions = {
	listeners: readonly TcpListener[];
	ranges?: readonly ServerRange[];
	emptyPortLimit?: number;
};

type StopResult = {
	failedProcessCount: number;
	targetProcessCount: number;
};

type CliOptions = {
	dryRun: boolean;
	help: boolean;
};

const emptyPortLimit = 10;
const stopGracePeriodMs = 2_000;
const devServerCommands = new Set(["node", "bun", "deno", "vite"]);
const serverRanges = [
	// `apps/www` pins 3333 in its `vite.config.ts`; Vite walks up from there when the port is taken.
	{ serverName: "www", startPort: 3333 },
] satisfies readonly ServerRange[];

const usage = `Usage: pnpm run kill:dev-servers [--dry-run]

Stop mantle dev servers in the known local port ranges.

Options:
  --dry-run   List matching dev servers without stopping them.
  -h, --help  Show this help text.`;

/**
 * Parse TCP listeners from `lsof -Fpcn` output.
 *
 * @example
 * ```ts
 * parseLsofListeners("p123\ncnode\nn*:3333\n");
 * // [{ pid: 123, command: "node", port: 3333 }]
 * ```
 */
export function parseLsofListeners(output: string): TcpListener[] {
	const listeners: TcpListener[] = [];
	const listenerKeys = new Set<string>();
	let currentPid: number | null = null;
	let currentCommand: string | null = null;

	for (const field of output.split("\n")) {
		const fieldType = field.slice(0, 1);
		const fieldValue = field.slice(1);

		if (fieldType === "p") {
			currentPid = parsePositiveInteger(fieldValue);
			currentCommand = null;
			continue;
		}

		if (fieldType === "c") {
			currentCommand = fieldValue;
			continue;
		}

		if (fieldType !== "n" || currentPid == null || currentCommand == null) {
			continue;
		}

		const portMatch = /:(\d+)$/.exec(fieldValue);
		const port = parsePositiveInteger(portMatch?.[1] ?? "");

		if (port == null || port > 65_535) {
			continue;
		}

		const listenerKey = `${currentPid}:${port}`;
		if (listenerKeys.has(listenerKey)) {
			continue;
		}

		listenerKeys.add(listenerKey);
		listeners.push({ pid: currentPid, command: currentCommand, port });
	}

	return listeners;
}

/**
 * Parse a positive base-10 integer or return `null`.
 *
 * @example
 * ```ts
 * parsePositiveInteger("3333"); // 3333
 * parsePositiveInteger("0"); // null
 * ```
 */
function parsePositiveInteger(value: string): number | null {
	if (!/^\d+$/.test(value)) {
		return null;
	}

	const parsedValue = Number(value);
	return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

/**
 * Find mantle runtime listeners inside the configured scan windows.
 *
 * A bound port resets the empty-port count even when another process owns it.
 *
 * @example
 * ```ts
 * findTargetListeners({
 *   listeners: [{ pid: 123, command: "node", port: 3333 }],
 * });
 * // [{ pid: 123, command: "node", port: 3333, serverName: "www" }]
 * ```
 */
export function findTargetListeners({
	listeners,
	ranges = serverRanges,
	emptyPortLimit: configuredEmptyPortLimit = emptyPortLimit,
}: FindTargetListenersOptions): TargetListener[] {
	if (!Number.isInteger(configuredEmptyPortLimit) || configuredEmptyPortLimit < 1) {
		throw new RangeError("emptyPortLimit must be a positive integer.");
	}

	const listenersByPort = new Map<number, TcpListener[]>();
	for (const listener of listeners) {
		const portListeners = listenersByPort.get(listener.port) ?? [];
		portListeners.push(listener);
		listenersByPort.set(listener.port, portListeners);
	}

	const targets: TargetListener[] = [];
	for (const range of ranges) {
		const endPort = Math.floor(range.startPort / 100) * 100 + 99;
		let emptyPortCount = 0;

		for (let port = range.startPort; port <= endPort; port += 1) {
			const portListeners = listenersByPort.get(port) ?? [];

			if (portListeners.length === 0) {
				emptyPortCount += 1;
				if (emptyPortCount >= configuredEmptyPortLimit) {
					break;
				}
			} else {
				emptyPortCount = 0;
			}

			for (const listener of portListeners) {
				if (devServerCommands.has(listener.command.toLowerCase())) {
					targets.push({ ...listener, serverName: range.serverName });
				}
			}
		}
	}

	return targets;
}

/**
 * Read the current TCP listeners from `lsof`.
 *
 * @example
 * ```ts
 * const listeners = readTcpListeners();
 * ```
 */
function readTcpListeners(): TcpListener[] {
	const result = spawnSync("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn"], { encoding: "utf8" });

	if (result.error != null) {
		if (isNodeErrorWithCode(result.error, "ENOENT")) {
			throw new Error("kill:dev-servers requires lsof.", { cause: result.error });
		}
		throw result.error;
	}

	if (result.status === 1 && result.stdout.trim() === "" && result.stderr.trim() === "") {
		return [];
	}

	if (result.status !== 0) {
		throw new Error(
			result.stderr.trim() || `lsof exited with status ${result.status ?? "unknown"}.`,
		);
	}

	return parseLsofListeners(result.stdout);
}

/**
 * Get a readable command for one process.
 *
 * @example
 * ```ts
 * getProcessCommand({ pid: 123, fallback: "node" });
 * ```
 */
function getProcessCommand({ pid, fallback }: { pid: number; fallback: string }): string {
	const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
	if (result.status !== 0) {
		return fallback;
	}

	return result.stdout.trim() || fallback;
}

/**
 * Stop each target process and force-stop listeners that remain after two seconds.
 *
 * @example
 * ```ts
 * await stopTargetProcesses(targets);
 * ```
 */
async function stopTargetProcesses(targets: readonly TargetListener[]): Promise<StopResult> {
	const targetPortsByPid = new Map<number, Set<number>>();
	for (const target of targets) {
		const targetPorts = targetPortsByPid.get(target.pid) ?? new Set<number>();
		targetPorts.add(target.port);
		targetPortsByPid.set(target.pid, targetPorts);
	}

	const signaledPids: number[] = [];
	let failedProcessCount = 0;

	for (const pid of targetPortsByPid.keys()) {
		try {
			process.kill(pid, "SIGTERM");
			signaledPids.push(pid);
		} catch (error) {
			if (error instanceof Error && isNodeErrorWithCode(error, "ESRCH")) {
				continue;
			}

			console.error(
				`Could not stop PID ${pid}: ${error instanceof Error ? error.message : String(error)}`,
			);
			failedProcessCount += 1;
		}
	}

	if (signaledPids.length > 0) {
		await setTimeout(stopGracePeriodMs);
		const currentListenerKeys = new Set(
			readTcpListeners().map((listener) => `${listener.pid}:${listener.port}`),
		);

		for (const pid of signaledPids) {
			const targetPorts = targetPortsByPid.get(pid) ?? new Set<number>();
			const stillListens = [...targetPorts].some((port) =>
				currentListenerKeys.has(`${pid}:${port}`),
			);

			if (!stillListens) {
				continue;
			}

			try {
				process.kill(pid, "SIGKILL");
			} catch (error) {
				if (error instanceof Error && isNodeErrorWithCode(error, "ESRCH")) {
					continue;
				}

				console.error(
					`Could not force-stop PID ${pid}: ${error instanceof Error ? error.message : String(error)}`,
				);
				failedProcessCount += 1;
			}
		}
	}

	return { failedProcessCount, targetProcessCount: targetPortsByPid.size };
}

/**
 * Parse the CLI arguments or throw on an unknown one.
 *
 * @example
 * ```ts
 * parseCliOptions(["node", "kill-dev-servers.ts", "--dry-run"]);
 * // { dryRun: true, help: false }
 * ```
 */
export function parseCliOptions(argv: readonly string[]): CliOptions {
	const options: CliOptions = { dryRun: false, help: false };

	for (const argument of argv.slice(2)) {
		if (argument === "--dry-run") {
			options.dryRun = true;
			continue;
		}

		if (argument === "-h" || argument === "--help") {
			options.help = true;
			continue;
		}

		throw new Error(`Unknown argument: ${argument}\n\n${usage}`);
	}

	return options;
}

/**
 * Run the `kill:dev-servers` command.
 *
 * @example
 * ```ts
 * await cli(["node", "kill-dev-servers.ts", "--dry-run"]);
 * ```
 */
async function cli(argv: string[] = process.argv): Promise<void> {
	const options = parseCliOptions(argv);

	if (options.help) {
		console.log(usage);
		return;
	}

	const targets = findTargetListeners({ listeners: readTcpListeners() });

	if (targets.length === 0) {
		console.log("No mantle dev servers found.");
		return;
	}

	const processCommands = new Map<number, string>();
	for (const target of targets) {
		const processCommand =
			processCommands.get(target.pid) ??
			getProcessCommand({ pid: target.pid, fallback: target.command });
		processCommands.set(target.pid, processCommand);
		console.log(
			`${target.serverName.padEnd(4)} port ${String(target.port).padEnd(5)} PID ${String(target.pid).padEnd(7)} ${processCommand}`,
		);
	}

	const processCount = processCommands.size;
	if (options.dryRun) {
		console.log(`Dry run: found ${targets.length} listener(s) across ${processCount} process(es).`);
		return;
	}

	const result = await stopTargetProcesses(targets);
	const stoppedProcessCount = result.targetProcessCount - result.failedProcessCount;
	if (result.failedProcessCount > 0) {
		console.error(
			`Stopped ${stoppedProcessCount} process(es); ${result.failedProcessCount} process(es) could not be stopped.`,
		);
		process.exitCode = 1;
		return;
	}

	console.log(`Stopped ${stoppedProcessCount} dev server process(es).`);
}

/** Check whether a Node error has the specified code. */
function isNodeErrorWithCode(error: Error, code: string): boolean {
	return "code" in error && error.code === code;
}

const entryPoint = process.argv[1];
if (entryPoint != null && import.meta.url === pathToFileURL(entryPoint).href) {
	try {
		await cli();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
