/** The `ui://` URI of the MCP App view that shows a `preview` result in the chat. */
export const PREVIEW_APP_URI = "ui://mantle/preview.html";

/** The MIME type of an MCP App view, from the MCP Apps extension (SEP-1865). */
export const MCP_APP_MIME_TYPE = "text/html;profile=mcp-app";

/**
 * The CSP sources of the frames that an MCP App host puts above a view: the
 * chat page and the view's sandbox host. `frame-ancestors` checks each frame
 * above a document, so the prototype frame must allow both to load in a view.
 *
 * Why wildcards: the sandbox host changes with the connector URL. A view of
 * another connector can then frame the prototype, but the frame has an opaque
 * origin, no cookies, and no network, so that view gets nothing from it.
 */
export const MCP_APP_HOST_SOURCES = [
	"https://claude.ai",
	"https://*.claudemcpcontent.com",
	"https://chatgpt.com",
	"https://*.oaiusercontent.com",
	"vscode-webview:",
] as const;

/** A value as a script literal that cannot close the `<script>` element. */
function scriptLiteral(value: string): string {
	return JSON.stringify(value).replaceAll("<", "\\u003c");
}

/**
 * The HTML of the MCP App view for `preview`. The view sends `ui/initialize`
 * to the host and reads the preview link from the `structuredContent.url` of
 * the `ui/notifications/tool-result` notification. It loads the prototype
 * frame from `frameOrigin` with the fragment of that link, so it never loads a
 * host-supplied origin. When the host reports `frameDomains` that do not cover
 * `frameOrigin`, it shows a button that opens the preview page with
 * `ui/open-link` instead.
 *
 * @example
 * previewAppHtml({ pageOrigin: "https://mantle.ngrok.com", frameOrigin: "https://mantle.ngrok.com" });
 * // => "<!doctype html>…"
 */
export function previewAppHtml({
	pageOrigin,
	frameOrigin,
}: {
	/** The origin of the preview page that the open-link button opens. */
	pageOrigin: string;
	/** The origin of the prototype frame. The resource's `frameDomains` must list it. */
	frameOrigin: string;
}): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>mantle prototype preview</title>
<style>
:root { color-scheme: light dark; font: 14px/1.4 var(--font-sans, system-ui, sans-serif); }
body { margin: 0; color: CanvasText; }
header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.5rem 0.75rem; background: light-dark(#fef3c7, #422006); color: light-dark(#78350f, #fde68a); }
button { font: inherit; }
#status { margin: 0; padding: 1rem 0.75rem; }
iframe:not([hidden]) { display: block; width: 100%; height: 480px; border: 0; }
</style>
</head>
<body>
<header>
<strong>Prototype from generated code. Do not enter passwords or secrets.</strong>
<button type="button" id="open" hidden>Open in browser</button>
</header>
<p id="status">The preview loads when the tool call ends.</p>
<iframe id="frame" title="Prototype preview" sandbox="allow-scripts" referrerpolicy="no-referrer" hidden></iframe>
<script>
const PAGE_ORIGIN = ${scriptLiteral(pageOrigin)};
const FRAME_ORIGIN = ${scriptLiteral(frameOrigin)};
const frame = document.getElementById("frame");
const statusLine = document.getElementById("status");
const openButton = document.getElementById("open");
const pending = new Map();
let nextId = 1;
let theme = "light";
let fragment = null;
let frameAllowed = true;

function send(message) {
	window.parent.postMessage(Object.assign({ jsonrpc: "2.0" }, message), "*");
}

function request(method, params) {
	const id = nextId++;
	send({ id, method, params });
	return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

function reportSize() {
	const box = document.body.getBoundingClientRect();
	send({ method: "ui/notifications/size-changed", params: { width: Math.ceil(box.width), height: Math.ceil(box.height) } });
}

function hashWithTheme() {
	const params = new URLSearchParams(fragment);
	params.set("theme", theme);
	return "#" + params.toString();
}

function covers(domain) {
	if (domain === "*" || domain === FRAME_ORIGIN) {
		return true;
	}
	const frameUrl = new URL(FRAME_ORIGIN);
	return domain.startsWith("https://*.") && frameUrl.protocol === "https:" && frameUrl.host.endsWith(domain.slice("https://*".length));
}

function render() {
	if (fragment == null) {
		return;
	}
	openButton.hidden = false;
	if (frameAllowed) {
		frame.src = FRAME_ORIGIN + "/mcp/preview-frame" + hashWithTheme();
		frame.hidden = false;
		statusLine.hidden = true;
	} else {
		statusLine.textContent = "This chat cannot show the prototype here. Open it in your browser.";
	}
	reportSize();
}

function applyContext(context) {
	if (context == null || (context.theme !== "light" && context.theme !== "dark")) {
		return;
	}
	theme = context.theme;
	document.documentElement.style.colorScheme = theme;
	render();
}

function showResult(result) {
	const url = result == null || result.structuredContent == null ? undefined : result.structuredContent.url;
	if (typeof url === "string") {
		fragment = new URL(url).hash.slice(1);
		render();
		return;
	}
	fragment = null;
	frame.hidden = true;
	frame.removeAttribute("src");
	openButton.hidden = true;
	statusLine.hidden = false;
	const content = result == null || !Array.isArray(result.content) ? [] : result.content;
	statusLine.textContent = content.map((block) => (block.type === "text" ? block.text : "")).join("\\n") || "The preview tool returned no link.";
	reportSize();
}

// Why the source check: the prototype frame can post to this window too.
window.addEventListener("message", (event) => {
	const message = event.data;
	if (event.source !== window.parent || message == null || message.jsonrpc !== "2.0") {
		return;
	}
	if (message.method == null) {
		const waiter = pending.get(message.id);
		pending.delete(message.id);
		if (waiter != null && message.error == null) {
			waiter.resolve(message.result);
		} else if (waiter != null) {
			waiter.reject(new Error(message.error.message));
		}
		return;
	}
	// Why an empty result: \`ping\` and \`ui/resource-teardown\` need an answer, and the view keeps no state.
	if (message.id != null) {
		send({ id: message.id, result: {} });
		return;
	}
	if (message.method === "ui/notifications/tool-result") {
		showResult(message.params);
	} else if (message.method === "ui/notifications/host-context-changed") {
		applyContext(message.params);
	}
});

openButton.addEventListener("click", () => {
	request("ui/open-link", { url: PAGE_ORIGIN + "/mcp/preview" + hashWithTheme() }).catch(() => {
		statusLine.hidden = false;
		statusLine.textContent = "The chat did not open the link.";
	});
});

request("ui/initialize", {
	appInfo: { name: "mantle-preview", version: "1.0.0" },
	appCapabilities: { availableDisplayModes: ["inline"] },
	protocolVersion: "2026-01-26",
}).then(
	(result) => {
		const csp = result.hostCapabilities && result.hostCapabilities.sandbox && result.hostCapabilities.sandbox.csp;
		const domains = csp == null ? undefined : csp.frameDomains;
		frameAllowed = !Array.isArray(domains) || domains.some(covers);
		send({ method: "ui/notifications/initialized" });
		applyContext(result.hostContext);
		window.addEventListener("resize", reportSize);
		reportSize();
	},
	() => {
		statusLine.textContent = "The chat did not start the preview.";
	},
);
</script>
</body>
</html>
`;
}
