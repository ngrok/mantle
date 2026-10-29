/** The MCP feature switches, read from the environment on each call. */
export type McpFlags = {
	/** Whether `/mcp` and the preview pages answer at all. */
	enabled: boolean;
	/** Tool names that are off. `*` turns off every tool. */
	disabledTools: ReadonlySet<string>;
};

/**
 * Reads the MCP kill switches from the environment. Each call reads
 * `process.env` again, so an operator can change a switch with no deploy.
 *
 * - `MANTLE_MCP=on` turns the server on. With no value it is on in dev and off in production.
 * - `MANTLE_MCP_DISABLED_TOOLS` is a comma list of tool names to turn off. `*` turns off all.
 *
 * @example
 * // MANTLE_MCP=on MANTLE_MCP_DISABLED_TOOLS=check,preview
 * const flags = mcpFlags();
 * flags.enabled; // => true
 * isMcpToolEnabled(flags, "preview"); // => false
 */
export function mcpFlags(env: Record<string, string | undefined> = process.env): McpFlags {
	const value = env.MANTLE_MCP?.trim().toLowerCase();
	const enabled = value == null || value === "" ? import.meta.env.DEV : value === "on";
	const disabledTools = new Set(
		(env.MANTLE_MCP_DISABLED_TOOLS ?? "")
			.split(",")
			.map((name) => name.trim())
			.filter((name) => name !== ""),
	);
	return { enabled, disabledTools };
}

/**
 * Whether the server is on and the named tool is not turned off.
 *
 * @example
 * isMcpToolEnabled(mcpFlags(), "preview");
 */
export function isMcpToolEnabled(flags: McpFlags, tool: string): boolean {
	return flags.enabled && !flags.disabledTools.has("*") && !flags.disabledTools.has(tool);
}
