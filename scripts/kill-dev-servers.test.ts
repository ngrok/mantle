import { describe, expect, it } from "vitest";

import { findTargetListeners, parseCliOptions, parseLsofListeners } from "./kill-dev-servers.ts";
import type { ServerRange, TcpListener } from "./kill-dev-servers.ts";

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
