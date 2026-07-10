import { useCallback, useEffect, useRef } from "react";
import { useCallbackRef } from "./use-callback-ref.js";

/**
 * Options for {@link useDebouncedCallback}.
 */
type Options = {
	/**
	 * The delay in milliseconds to wait between the last invocation and
	 * actually running the callback.
	 */
	waitMs: number;
};

/**
 * Returns a debounced version of the provided callback. Each call resets a
 * timer; the underlying callback only runs after `options.waitMs` of
 * inactivity has elapsed.
 *
 * Useful for limiting rapid invocations such as search-as-you-type inputs,
 * window resize handlers, or expensive button-press handlers. The pending
 * timer is automatically cleared on unmount.
 *
 * The debounced function always invokes the latest version of `callbackFn`,
 * so callers do not need to memoize it. The returned function's identity
 * only changes when `options.waitMs` changes, so it is safe to include in
 * dependency arrays.
 *
 * @param callbackFn - The function to debounce. The latest reference passed
 *   on each render is always used when the timer fires.
 * @param options - Debounce options.
 * @param options.waitMs - Milliseconds of inactivity to wait before calling
 *   `callbackFn`.
 * @returns A function with the same parameter list as `callbackFn` that
 *   schedules (or reschedules) the underlying call.
 *
 * @example
 * // Debounce a search input by 300ms
 * const [query, setQuery] = useState("");
 * const search = useDebouncedCallback((value: string) => {
 *   fetchResults(value);
 * }, { waitMs: 300 });
 *
 * return (
 *   <input
 *     value={query}
 *     onChange={(event) => {
 *       setQuery(event.target.value);
 *       search(event.target.value);
 *     }}
 *   />
 * );
 */
function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
	callbackFn: T,
	options: Options,
) {
	const stableCallbackFn = useCallbackRef(callbackFn);
	const debounceTimerRef = useRef(0);
	useEffect(() => () => window.clearTimeout(debounceTimerRef.current), []);

	return useCallback(
		(...args: Parameters<T>) => {
			window.clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = window.setTimeout(() => stableCallbackFn(...args), options.waitMs);
		},
		[stableCallbackFn, options.waitMs],
	);
}

export {
	//,
	useDebouncedCallback,
};
