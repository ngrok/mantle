import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
	findTargetListeners,
	parseCliOptions,
	parseLsofListeners,
	stopTargetProcesses,
} from "./kill-dev-servers.ts";
import type { ServerRange, TcpListener } from "./kill-dev-servers.ts";

vi.mock("node:child_process", () => ({
	spawnSync: vi.fn<(command: string, args: readonly string[]) => SpawnSyncReturns<string>>(),
}));
// Why: an unmocked grace period adds two real seconds to every stop test.
vi.mock("node:timers/promises", () => ({
	setTimeout: vi.fn<(delay?: number) => Promise<undefined>>(async () => undefined),
}));

const wwwRange = [{ serverName: "www", startPort: 3333 }] satisfies readonly ServerRange[];

describe("parseLsofListeners", () => {
	it("parses IPv4, IPv6, and wildcard listeners without duplicates", () => {
		const output = [
			"p123",
			"cnode",
			"f1",
			"n*:3333",
			"f2",
			"n127.0.0.1:3333",
			"p456",
			"cbun",
			"f3",
			"n[::1]:3334",
		].join("\n");

		expect(parseLsofListeners(output)).toEqual([
			{ pid: 123, command: "node", port: 3333 },
			{ pid: 456, command: "bun", port: 3334 },
		]);
	});
});

describe("findTargetListeners", () => {
	it("stops before a listener after ten consecutive empty ports", () => {
		const listeners: TcpListener[] = [
			{ pid: 123, command: "node", port: 3333 },
			{ pid: 456, command: "node", port: 3344 },
		];

		expect(findTargetListeners({ listeners, ranges: wwwRange })).toEqual([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
		]);
	});

	it("uses other bound processes to reset the empty-port count", () => {
		const listeners: TcpListener[] = [
			{ pid: 123, command: "node", port: 3333 },
			{ pid: 456, command: "Code Helper (Plugin)", port: 3338 },
			{ pid: 789, command: "bun", port: 3347 },
		];

		expect(findTargetListeners({ listeners, ranges: wwwRange })).toEqual([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
			{ pid: 789, command: "bun", port: 3347, serverName: "www" },
		]);
	});

	it("labels a Vite-bumped port with the www range", () => {
		const listeners: TcpListener[] = [{ pid: 123, command: "node", port: 3334 }];

		expect(findTargetListeners({ listeners })).toEqual([
			{ pid: 123, command: "node", port: 3334, serverName: "www" },
		]);
	});

	it("ignores listeners outside the default ranges", () => {
		const listeners: TcpListener[] = [{ pid: 123, command: "node", port: 6767 }];

		expect(findTargetListeners({ listeners })).toEqual([]);
	});

	it("does not scan into the next hundred ports", () => {
		const listeners: TcpListener[] = [
			{ pid: 123, command: "deno", port: 3399 },
			{ pid: 456, command: "vite", port: 3400 },
		];

		expect(findTargetListeners({ listeners, ranges: wwwRange, emptyPortLimit: 100 })).toEqual([
			{ pid: 123, command: "deno", port: 3399, serverName: "www" },
		]);
	});
});

describe("parseCliOptions", () => {
	it("parses --dry-run and --help", () => {
		expect(parseCliOptions(["node", "kill-dev-servers.ts"])).toEqual({
			dryRun: false,
			help: false,
		});
		expect(parseCliOptions(["node", "kill-dev-servers.ts", "--dry-run"])).toEqual({
			dryRun: true,
			help: false,
		});
		expect(parseCliOptions(["node", "kill-dev-servers.ts", "-h"])).toEqual({
			dryRun: false,
			help: true,
		});
	});

	it("throws on an unknown argument", () => {
		expect(() => parseCliOptions(["node", "kill-dev-servers.ts", "--force"])).toThrowError(
			/Unknown argument: --force/,
		);
	});
});

/** Build a successful `spawnSync` result whose stdout is `lsof -Fpcn` field output. */
function lsofResult(stdout: string): SpawnSyncReturns<string> {
	return { pid: 999, output: [null, stdout, ""], stdout, stderr: "", status: 0, signal: null };
}

/** Build an `Error` that carries a Node error code. */
function errnoError(message: string, code: string): NodeJS.ErrnoException {
	const error: NodeJS.ErrnoException = new Error(message);
	error.code = code;
	return error;
}

describe("stopTargetProcesses", () => {
	beforeEach(() => {
		vi.mocked(spawnSync).mockReset();
	});

	it("sends one SIGTERM per process and skips SIGKILL when its listeners exit in the grace period", async () => {
		const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
		vi.mocked(spawnSync).mockReturnValue(lsofResult(""));

		const result = await stopTargetProcesses([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
			{ pid: 123, command: "node", port: 3334, serverName: "www" },
		]);

		expect(kill.mock.calls).toEqual([[123, "SIGTERM"]]);
		expect(result).toEqual({ failedProcessCount: 0, targetProcessCount: 1 });
	});

	it("force-stops a process that still listens after the grace period", async () => {
		const kill = vi.spyOn(process, "kill").mockImplementation(() => true);
		vi.mocked(spawnSync).mockReturnValue(lsofResult("p123\ncnode\nn*:3333\n"));

		const result = await stopTargetProcesses([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
		]);

		expect(kill.mock.calls).toEqual([
			[123, "SIGTERM"],
			[123, "SIGKILL"],
		]);
		expect(result).toEqual({ failedProcessCount: 0, targetProcessCount: 1 });
	});

	it("treats a process that exited before the signal as stopped", async () => {
		const kill = vi.spyOn(process, "kill").mockImplementation(() => {
			throw errnoError("kill ESRCH", "ESRCH");
		});

		const result = await stopTargetProcesses([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
		]);

		expect(kill).toHaveBeenCalledTimes(1);
		expect(spawnSync).not.toHaveBeenCalled();
		expect(result).toEqual({ failedProcessCount: 0, targetProcessCount: 1 });
	});

	it("counts a process it cannot signal and still stops the rest", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const kill = vi
			.spyOn(process, "kill")
			.mockImplementationOnce(() => {
				throw errnoError("kill EPERM", "EPERM");
			})
			.mockImplementation(() => true);
		vi.mocked(spawnSync).mockReturnValue(lsofResult(""));

		const result = await stopTargetProcesses([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
			{ pid: 456, command: "node", port: 3334, serverName: "www" },
		]);

		expect(kill.mock.calls).toEqual([
			[123, "SIGTERM"],
			[456, "SIGTERM"],
		]);
		expect(consoleError).toHaveBeenCalledTimes(1);
		expect(consoleError).toHaveBeenLastCalledWith(
			expect.stringContaining("Could not stop PID 123"),
		);
		expect(result).toEqual({ failedProcessCount: 1, targetProcessCount: 2 });
	});

	it("counts a force-stop failure", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		// The first call is the SIGTERM, which succeeds; the second is the SIGKILL, which fails.
		vi.spyOn(process, "kill")
			.mockImplementationOnce(() => true)
			.mockImplementation(() => {
				throw errnoError("kill EPERM", "EPERM");
			});
		vi.mocked(spawnSync).mockReturnValue(lsofResult("p123\ncnode\nn*:3333\n"));

		const result = await stopTargetProcesses([
			{ pid: 123, command: "node", port: 3333, serverName: "www" },
		]);

		expect(consoleError).toHaveBeenCalledTimes(1);
		expect(consoleError).toHaveBeenLastCalledWith(
			expect.stringContaining("Could not force-stop PID 123"),
		);
		expect(result).toEqual({ failedProcessCount: 1, targetProcessCount: 1 });
	});
});
