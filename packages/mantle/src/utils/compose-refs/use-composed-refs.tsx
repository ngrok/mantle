"use client";

import type { RefCallback } from "react";
import { useCallback } from "react";

import { composeRefs, type PossibleRef } from "./compose-refs.js";

/**
 * A custom hook that composes up to three refs into a single callback ref.
 * Accepts callback refs and RefObject(s). The callback keeps one identity
 * while the refs it composes keep theirs, so React attaches it once per
 * mount. If you pass a new ref on a later render, React detaches the old
 * callback and attaches the new one, so the new ref receives the node at
 * once. A consumer callback ref fires once per mount when the consumer
 * passes the same function each render, and on every render when the
 * consumer passes a new function, as it does on a plain element. Any
 * cleanup the composed ref returns targets the refs it composed (see
 * {@link composeRefs} for the cleanup propagation contract).
 *
 * @example
 * function MyInput({ ref, ...props }: ComponentProps<"input">) {
 *   const internalRef = useRef<HTMLInputElement>(null);
 *   const composedRef = useComposedRefs(internalRef, ref);
 *   return <input ref={composedRef} {...props} />;
 * }
 */
function useComposedRefs<T>(
	firstRef: PossibleRef<T>,
	secondRef: PossibleRef<T>,
	thirdRef?: PossibleRef<T>,
): RefCallback<T> {
	// Why three named parameters: React Compiler memoizes a `useCallback` only
	// when its dependency list is an array literal, so the hook cannot spread a
	// rest array into it. Three slots cover every call site.
	return useCallback(
		(node: T | null) => composeRefs(firstRef, secondRef, thirdRef)(node),
		[firstRef, secondRef, thirdRef],
	);
}

export {
	//,
	useComposedRefs,
};
