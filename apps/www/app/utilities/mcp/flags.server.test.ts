import { describe, expect, it, vi } from "vitest";
import { isMcpToolEnabled, mcpFlags } from "./flags.server";

describe("mcpFlags", () => {
	it("turns the server on for MANTLE_MCP=on", () => {
		vi.stubEnv("DEV", false);
		expect(mcpFlags({ MANTLE_MCP: "on" }).enabled).toBe(true);
	});

	it("keeps the server off for any other value", () => {
		vi.stubEnv("DEV", true);
		expect(mcpFlags({ MANTLE_MCP: "off" }).enabled).toBe(false);
	});

	it("follows dev mode when MANTLE_MCP is not set", () => {
		vi.stubEnv("DEV", false);
		expect(mcpFlags({}).enabled).toBe(false);
		vi.stubEnv("DEV", true);
		expect(mcpFlags({}).enabled).toBe(true);
	});
});

describe("isMcpToolEnabled", () => {
	it("turns off each listed tool and keeps the others", () => {
		const flags = mcpFlags({ MANTLE_MCP: "on", MANTLE_MCP_DISABLED_TOOLS: " check, preview " });
		expect(isMcpToolEnabled(flags, "preview")).toBe(false);
		expect(isMcpToolEnabled(flags, "check")).toBe(false);
		expect(isMcpToolEnabled(flags, "find")).toBe(true);
	});

	it("turns off every tool for *", () => {
		const flags = mcpFlags({ MANTLE_MCP: "on", MANTLE_MCP_DISABLED_TOOLS: "*" });
		expect(isMcpToolEnabled(flags, "find")).toBe(false);
	});

	it("turns off every tool when the server is off", () => {
		expect(isMcpToolEnabled(mcpFlags({ MANTLE_MCP: "off" }), "find")).toBe(false);
	});
});
