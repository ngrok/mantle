import { Alert } from "@ngrok/mantle/alert";
import { useEffect, useState, useSyncExternalStore } from "react";
import { data } from "react-router";
import { startPrototypeTailwind } from "~/features/mcp-preview/prototype-tailwind";
import { runPrototype, type RunPrototypeResult } from "~/features/mcp-preview/run-prototype";
import { isMcpToolEnabled, mcpFlags } from "~/utilities/mcp/flags.server";
import { decodePreviewFragment, parsePreviewHash } from "~/utilities/mcp/preview-url";

/** Returns 404 unless the MCP server and its `preview` tool are on. */
export function loader() {
	if (!isMcpToolEnabled(mcpFlags(), "preview")) {
		throw data(null, { status: 404 });
	}
	return null;
}

/** Titles the frame and keeps it out of search indexes. */
export function meta() {
	return [{ title: "Prototype - @ngrok/mantle" }, { name: "robots", content: "noindex, nofollow" }];
}

function subscribeToHash(onChange: () => void) {
	window.addEventListener("hashchange", onChange);
	return () => window.removeEventListener("hashchange", onChange);
}

const decodeMessages = {
	missing: "The link has no code. Ask the agent for a new preview link.",
	"too-large": "The code in the link is too large to preview.",
	invalid: "The link is damaged. Copy the whole link, or ask the agent for a new one.",
} as const;

async function loadPrototype(fragment: string | null): Promise<RunPrototypeResult> {
	const decoded = await decodePreviewFragment(fragment);
	if (!decoded.ok) {
		return { ok: false, title: "The preview cannot open", message: decodeMessages[decoded.reason] };
	}
	return runPrototype(decoded.code);
}

type FrameState = { fragment: string | null; result: RunPrototypeResult } | null;

/**
 * The sandboxed document that runs a prototype. The preview page frames it with
 * `sandbox="allow-scripts"`, and its CSP repeats the sandbox and blocks the
 * network, so the code has no cookies, no storage, and no way to send data.
 */
export default function McpPreviewFrame() {
	const hash = useSyncExternalStore(
		subscribeToHash,
		() => window.location.hash,
		() => "",
	);
	const { code: fragment, theme } = parsePreviewHash(hash);
	const [state, setState] = useState<FrameState>(null);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			const [result] = await Promise.all([loadPrototype(fragment), startPrototypeTailwind()]);
			if (!cancelled) {
				setState({ fragment, result });
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [fragment]);

	useEffect(() => {
		const html = document.documentElement;
		html.classList.remove("light", "dark");
		html.classList.add(theme);
		html.dataset.theme = theme;
		html.dataset.appliedTheme = theme;
	}, [theme]);

	// Why compare the fragment: a new link must not show the last prototype while it loads.
	if (state == null || state.fragment !== fragment) {
		return null;
	}
	if (!state.result.ok) {
		return (
			<div className="p-4">
				<Alert.Root intent="danger">
					<Alert.Icon />
					<Alert.Content>
						<Alert.Title>{state.result.title}</Alert.Title>
						<Alert.Description className="whitespace-pre-wrap font-mono text-xs">
							{state.result.message}
						</Alert.Description>
					</Alert.Content>
				</Alert.Root>
			</div>
		);
	}
	const { Component } = state.result;
	return <Component />;
}
