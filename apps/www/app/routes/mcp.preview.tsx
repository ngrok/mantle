import { Alert } from "@ngrok/mantle/alert";
import { Label } from "@ngrok/mantle/label";
import { Switch } from "@ngrok/mantle/switch";
import { useSyncExternalStore } from "react";
import { data } from "react-router";
import { useMantleVersion } from "~/components/mantle-version-provider";
import { isMcpToolEnabled, mcpFlags } from "~/utilities/mcp/flags.server";
import { parsePreviewHash, type PreviewTheme } from "~/utilities/mcp/preview-url";
import type { Route } from "./+types/mcp.preview";

/**
 * Returns 404 unless the MCP server and its `preview` tool are on. The frame
 * origin comes from `MANTLE_PREVIEW_FRAME_ORIGIN`, so production can serve the
 * frame from a host with no ngrok sessions.
 */
export function loader({ request }: Route.LoaderArgs) {
	if (!isMcpToolEnabled(mcpFlags(), "preview")) {
		throw data(null, { status: 404 });
	}
	const frameOrigin = process.env.MANTLE_PREVIEW_FRAME_ORIGIN || new URL(request.url).origin;
	return { frameOrigin };
}

/** Titles the page and keeps it out of search indexes. */
export function meta() {
	return [
		{ title: "Prototype preview - @ngrok/mantle" },
		{ name: "robots", content: "noindex, nofollow" },
	];
}

function subscribeToHash(onChange: () => void) {
	window.addEventListener("hashchange", onChange);
	return () => window.removeEventListener("hashchange", onChange);
}

// Why `null` on the server: the browser never sends the fragment, so the server cannot render the frame.
function useLocationHash() {
	return useSyncExternalStore(
		subscribeToHash,
		() => window.location.hash,
		() => null,
	);
}

function setTheme(theme: PreviewTheme) {
	const params = new URLSearchParams(window.location.hash.slice(1));
	params.set("theme", theme);
	// Why `replace`: it fires `hashchange` and adds no history entry for each toggle.
	window.location.replace(`#${params.toString()}`);
}

/**
 * The page a `preview` link opens. It shows a fixed warning banner and runs
 * the prototype in a sandboxed frame. The code stays in the URL fragment, and
 * the frame reads it from its own fragment.
 */
export default function McpPreviewPage({ loaderData }: Route.ComponentProps) {
	const mantleVersion = useMantleVersion();
	const hash = useLocationHash();
	const { theme } = parsePreviewHash(hash ?? "");

	return (
		<div className="flex h-dvh flex-col">
			<header className="border-b border-card bg-card p-3">
				<Alert.Root intent="warning">
					<Alert.Icon />
					<Alert.Content className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
						<div>
							<Alert.Title>
								Prototype from generated code. Do not enter passwords or secrets.
							</Alert.Title>
							<Alert.Description>
								<span>Renders @ngrok/mantle </span>
								<span translate="no">{mantleVersion}</span>
							</Alert.Description>
						</div>
						<Label className="flex items-center gap-2">
							<span>Dark theme</span>
							<Switch
								checked={theme === "dark"}
								onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
							/>
						</Label>
					</Alert.Content>
				</Alert.Root>
			</header>
			<main className="min-h-0 flex-1">
				{hash != null && (
					<iframe
						title="Prototype preview"
						src={`${loaderData.frameOrigin}/mcp/preview-frame${hash}`}
						sandbox="allow-scripts"
						referrerPolicy="no-referrer"
						className="size-full border-0"
					/>
				)}
			</main>
		</div>
	);
}
