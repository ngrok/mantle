import type { Ref } from "react";
import { useCallback, useRef } from "react";

type PossibleRef<T> = Ref<T> | undefined;

/**
 * A utility that composes multiple refs into a single callback ref. Accepts
 * callback refs and RefObject(s); the returned ref writes the node to every
 * given ref.
 *
 * Prefer {@link useComposedRefs} inside components — it keeps a stable
 * function identity across renders.
 *
 * @example
 * const setRefs = composeRefs(internalRef, forwardedRef);
 * return <input ref={setRefs} />;
 */
function composeRefs<T>(...refs: PossibleRef<T>[]) {
	return (node: T | null) => {
		for (const ref of refs) {
			if (typeof ref === "function") {
				ref(node);
			} else if (ref != null) {
				ref.current = node;
			}
		}
	};
}

/**
 * A custom hook that composes multiple refs into a single stable callback
 * ref. Accepts callback refs and RefObject(s); the latest refs passed on
 * each render are the ones written to.
 *
 * @example
 * const MyInput = forwardRef<HTMLInputElement>((props, forwardedRef) => {
 *   const internalRef = useRef<HTMLInputElement>(null);
 *   const ref = useComposedRefs(internalRef, forwardedRef);
 *   return <input ref={ref} {...props} />;
 * });
 */
function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
	const latestRefs = useRef(refs);
	latestRefs.current = refs;
	return useCallback((node: T | null) => {
		for (const ref of latestRefs.current) {
			if (typeof ref === "function") {
				ref(node);
			} else if (ref != null) {
				ref.current = node;
			}
		}
	}, []);
}

export { composeRefs, useComposedRefs };
