import { useEffect, useMemo, useRef } from "react";

/**
 * Returns a memoized callback that always invokes the latest version of the
 * provided callback, while preserving a stable function identity across
 * renders.
 *
 * Use this when you need to pass a callback to a child component, an event
 * handler, or a hook dependency array, but the consumer should not re-run /
 * re-render simply because the callback's identity changed. The returned
 * function never changes reference, but internally always calls through to
 * the latest `callback` passed in.
 *
 * Most commonly used as an internal building block for other hooks (for
 * example, {@link useDebouncedCallback}). It is also re-exported publicly
 * for consumers that need the same pattern.
 *
 * @param callback - The callback to wrap. May be `undefined`, in which case
 *   invoking the returned function is a no-op until a callback is provided
 *   on a subsequent render.
 * @returns A stable function with the same signature as `callback` that
 *   forwards its arguments to the most recent `callback` value.
 *
 * @example
 * // Pass a stable handler to a memoized child without re-rendering it
 * const onSelect = useCallbackRef((id: string) => {
 *   // reads the latest `props.items` without being in deps
 *   props.onSelectItem(id, props.items);
 * });
 *
 * return <MemoizedList onSelect={onSelect} />;
 */
function useCallbackRef<T extends (...args: unknown[]) => unknown>(callback: T | undefined): T {
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	});

	return useMemo(() => ((...args) => callbackRef.current?.(...args)) as T, []);
}

export {
	//,
	useCallbackRef,
};
