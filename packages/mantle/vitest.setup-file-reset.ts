import { BrowserWindow, type DetachedWindowAPI, PropertySymbol } from "happy-dom";
import WindowBrowserContext from "happy-dom/lib/window/WindowBrowserContext.js";
import { createRoot } from "react-dom/client";
import { afterAll, vi } from "vitest";

declare global {
	interface Window {
		/** The happy-dom control API, which the unit project's environment sets. */
		happyDOM: DetachedWindowAPI;
	}
}

// The unit project runs with `isolate: false`. The test files in one worker share
// one module registry and one happy-dom window, so this setup file puts both back
// in their first state around each file.

// Why: a module that an earlier file loaded keeps that file's `vi.mock` doubles and
// its module state. This setup file runs before each test file imports anything.
vi.resetModules();

/** The window's URL before the first file in this worker ran. */
const INITIAL_URL_KEY = Symbol.for("@ngrok/mantle/vitest-initial-url");
const scope = globalThis as typeof globalThis & { [INITIAL_URL_KEY]?: string };
scope[INITIAL_URL_KEY] ??= globalThis.location.href;

// Why: `react-dom` loads once per worker, and its `onSelect` keeps a pressed mouse
// button in module state. A press whose target unmounts before its `mouseup` blocks
// every later `onSelect`, so a `mouseup` through a root releases it.
const container = document.createElement("div");
const root = createRoot(container);
container.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
root.unmount();

afterAll(async () => {
	// Why: `unstubGlobals`, `unstubEnvs`, and `restoreMocks` undo a stub before the
	// next test, so the last stub of a file reaches the next file's imports.
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	vi.useRealTimers();
	await resetWindow();
});

/** Cancels the window's timers and requests, and empties its document, storage, and cookies. */
async function resetWindow() {
	await window.happyDOM.abort();
	document.head.replaceChildren();
	document.body.replaceChildren();
	for (const element of [document.documentElement, document.head, document.body]) {
		for (const name of element.getAttributeNames()) {
			element.removeAttribute(name);
		}
	}
	window.localStorage.clear();
	window.sessionStorage.clear();
	clearCookies();
	const initialUrl = scope[INITIAL_URL_KEY];
	if (initialUrl != null) {
		window.happyDOM.setURL(initialUrl);
	}
}

/**
 * Deletes every cookie in the happy-dom browser context.
 *
 * Why the context: `document.cookie` shows only the cookies for the current URL,
 * so an expiry write misses a cookie on another path. Vitest sets
 * `document.defaultView` to the Node global, so the happy-dom window comes from
 * the document's internal reference.
 */
function clearCookies() {
	const happyDomWindow: unknown = Reflect.get(document, PropertySymbol.window);
	const context =
		happyDomWindow instanceof BrowserWindow
			? new WindowBrowserContext(happyDomWindow).getBrowserContext()
			: null;
	if (context == null) {
		throw new Error("The happy-dom browser context is missing. Check the happy-dom internals.");
	}
	context.cookieContainer.clearCookies();
}
