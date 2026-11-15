// Why a module of its own, with no "use client": server code calls this guard.
// A client module would turn it into a client reference that throws there.

/**
 * Detects whether DOM APIs are available.
 *
 * @description
 * Returns `true` when running in a windowed browser context where both
 * `window` and a real `document` exist. This will be `false` in SSR/Node.
 *
 * Note: In a test environment with a DOM shim (e.g. JSDOM), this returns `true`.
 *
 * @returns {boolean} `true` if DOM APIs are available; otherwise `false`.
 *
 * @example
 * if (canUseDOM()) {
 *   localStorage.setItem("foo", "bar");
 * }
 */
function canUseDOM(): boolean {
	// oxlint-disable-next-line mantle/prefer-can-use-dom -- Why: this is the check the rule asks for.
	return typeof window !== "undefined" && typeof document !== "undefined";
}

export {
	//,
	canUseDOM,
};
