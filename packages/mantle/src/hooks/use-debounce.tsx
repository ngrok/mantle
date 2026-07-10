import { useEffect, useState } from "react";

/**
 * Options for {@link useDebounce}.
 */
type Options = {
	/**
	 * The delay in milliseconds to wait after the last change to `value`
	 * before the debounced copy updates.
	 */
	waitMs: number;
};

/**
 * Returns a debounced copy of `value`: it only updates after `value` has
 * stopped changing for `options.waitMs` milliseconds. Each change restarts
 * the timer, so rapid successive changes collapse into a single trailing
 * update.
 *
 * SSR-safe: the server render simply returns the current value (timers
 * never run there). To debounce a function instead of a value, use
 * {@link useDebouncedCallback}.
 *
 * @param value - The value to debounce. The returned copy lags behind it.
 * @param options - Debounce options.
 * @param options.waitMs - Milliseconds of inactivity to wait before the
 *   debounced copy updates.
 * @returns The debounced copy of `value`.
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState("");
 * const debouncedSearchQuery = useDebounce(searchQuery, { waitMs: 300 });
 * // debouncedSearchQuery lags searchQuery until typing pauses for 300ms,
 * // so queries keyed on it fire once per pause instead of per keystroke
 * ```
 */
function useDebounce<T>(value: T, options: Options): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedValue(value);
		}, options.waitMs);

		return () => {
			window.clearTimeout(timeout);
		};
	}, [value, options.waitMs]);

	return debouncedValue;
}

export {
	//,
	useDebounce,
};
