import { canUseDOM } from "../components/browser-only/browser-only.js";

/**
 * Copy the given string to the clipboard. Uses the Clipboard API when
 * available and falls back to an `execCommand("copy")` polyfill for older
 * browsers.
 *
 * Throws when called outside a DOM environment, or when both the Clipboard
 * API and the polyfill fail — `await` the call to observe success.
 */
async function copyToClipboard(value: string) {
	if (!canUseDOM()) {
		throw new Error("copyToClipboard requires a DOM environment");
	}
	try {
		if (typeof navigator.clipboard?.writeText === "function") {
			await navigator.clipboard.writeText(value);
		} else {
			throw new Error("writeText not supported");
		}
	} catch (clipboardError) {
		try {
			copyToClipboardPolyfill(value);
		} catch {
			throw clipboardError; // both approaches failed; propagate
		}
	}
}

/**
 * A fallback copy to clipboard function for older browsers that lack the
 * Clipboard API. Creates a temporary `<textarea>`, selects it, and invokes
 * the deprecated `document.execCommand("copy")` API.
 *
 * Throws when `execCommand("copy")` returns `false` (the call failed but
 * did not throw) so the caller can fall through to another strategy.
 */
function copyToClipboardPolyfill(text: string) {
	const tempTextArea = document.createElement("textarea");
	tempTextArea.value = text;
	document.body.appendChild(tempTextArea);
	try {
		tempTextArea.select();
		const copied = document.execCommand("copy");
		if (!copied) {
			throw new Error('document.execCommand("copy") failed');
		}
	} finally {
		document.body.removeChild(tempTextArea);
	}
}

export { copyToClipboard };
