import { copyToClipboard } from "../utils/copy-to-clipboard.js";

/**
 * React hook that returns a stable async function for copying a string to
 * the system clipboard.
 *
 * The returned function uses the Clipboard API when available and falls back
 * to a `document.execCommand("copy")` polyfill for older browsers. `await`
 * the call (or attach a `.then()` / `.catch()`) to observe whether the copy
 * succeeded — the function throws when both the Clipboard API and the
 * polyfill fail, or when called outside of a DOM environment.
 *
 * Inspired by: https://usehooks.com/usecopytoclipboard
 *
 * @returns An async function `(value: string) => Promise<void>` that writes
 *   `value` to the clipboard and rejects on failure.
 *
 * @example
 * // Copy a token on click and surface a toast on success/failure
 * const copy = useCopyToClipboard();
 *
 * async function handleCopy() {
 *   try {
 *     await copy(token);
 *     toast.success("Copied!");
 *   } catch {
 *     toast.error("Could not copy to clipboard");
 *   }
 * }
 *
 * return <button onClick={handleCopy}>Copy token</button>;
 */
function useCopyToClipboard() {
	return copyToClipboard;
}

export { useCopyToClipboard };
