/**
 * Type guard for an `HTMLInputElement`. On the server, where `HTMLInputElement`
 * is not defined, it returns `false`.
 *
 * @example
 * ```tsx
 * function handleElement(element: HTMLElement) {
 *   if (isInput(element)) {
 *     // TypeScript now knows element is HTMLInputElement
 *     element.value = "new value";
 *     element.focus();
 *   }
 * }
 * ```
 */
export function isInput(value: unknown): value is HTMLInputElement {
	// Why the typeof guard: a loader or an action can call this on the server.
	// Node declares no `HTMLInputElement`, so a bare `instanceof` throws.
	return typeof HTMLInputElement !== "undefined" && value instanceof HTMLInputElement;
}
