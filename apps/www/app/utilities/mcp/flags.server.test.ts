import { describe, expect, it, vi } from "vitest";
import { isMcpToolEnabled, mcpFlags } from "./flags.server";

describe("mcpFlags", () => {
	it("turns the server on when MANTLE_MCP is not set, in production too", () => {
		vi.stubEnv("DEV", false);
		expect(mcpFlags({}).enabled).toBe(true);
		expect(mcpFlags({ MANTLE_MCP: "on" }).enabled).toBe(true);
	});

	it("turns the server off for MANTLE_MCP=off, in any case", () => {
		expect(mcpFlags({ MANTLE_MCP: "off" }).enabled).toBe(false);
		expect(mcpFlags({ MANTLE_MCP: " OFF " }).enabled).toBe(false);
	});
});

describe("isMcpToolEnabled", () => {
	it("turns off each listed tool and keeps the others", () => {
		const flags = mcpFlags({ MANTLE_MCP_DISABLED_TOOLS: " check, preview " });
		expect(isMcpToolEnabled(flags, "preview")).toBe(false);
		expect(isMcpToolEnabled(flags, "check")).toBe(false);
		expect(isMcpToolEnabled(flags, "find")).toBe(true);
	});

	it("turns off every tool for *", () => {
		const flags = mcpFlags({ MANTLE_MCP_DISABLED_TOOLS: "*" });
		expect(isMcpToolEnabled(flags, "find")).toBe(false);
	});

	it("turns off every tool when the server is off", () => {
		expect(isMcpToolEnabled(mcpFlags({ MANTLE_MCP: "off" }), "find")).toBe(false);
	});
});
