import type { Ref, RefCallback } from "react";
import { useCallback } from "react";

type PossibleRef<T> = Ref<T> | undefined;

/**
 * Write a node to a single ref. Returns the cleanup function when a callback
 * ref produces one (React 19 ref-cleanup semantics), otherwise `undefined`.
 */
function setRef<T>(ref: PossibleRef<T>, node: T | null) {
	if (typeof ref === "function") {
		return ref(node);
	}
	if (ref != null) {
		ref.current = node;
	}
}

/**
 * A utility that composes multiple refs into a single callback ref. Accepts
 * callback refs and RefObject(s); the returned ref writes the node to every
 * given ref.
 *
 * Cleanup propagation: if any inner callback ref returns a cleanup function,
 * the composed ref returns a cleanup which invokes each inner cleanup and
 * runs the legacy `null` write for inner refs that did not return one.
 * If no inner ref returns a cleanup, the composed ref returns `undefined`
 * and React calls it again with `null` on unmount (legacy behavior).
 *
 * Prefer {@link useComposedRefs} inside components — it keeps a stable
 * function identity across renders.
 *
 * @example
 * const setRefs = composeRefs(internalRef, props.ref);
 * return <input ref={setRefs} />;
 */
function composeRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
	return (node) => {
		let hasCleanup = false;
		const cleanups = refs.map((ref) => {
			const cleanup = setRef(ref, node);
			if (typeof cleanup === "function") {
				hasCleanup = true;
			}
			return cleanup;
		});

		if (!hasCleanup) {
			return undefined;
		}

		return () => {
			for (let index = 0; index < cleanups.length; index++) {
				const cleanup = cleanups[index];
				if (typeof cleanup === "function") {
					cleanup();
				} else {
					setRef(refs[index], null);
				}
			}
		};
	};
}

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

export { composeRefs, useComposedRefs };
