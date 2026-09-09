import type { Ref, RefCallback } from "react";
import { useCallback, useInsertionEffect, useRef } from "react";

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
 * A custom hook that composes multiple refs into a single stable callback
 * ref. Accepts callback refs and RefObject(s). The callback keeps one
 * identity for the life of the component, so React attaches it once. A
 * consumer callback ref fires once per mount, not once per render. A later
 * attach or detach writes the refs passed on the latest render. Any cleanup
 * the composed ref returns targets the refs captured when React attached the
 * node (see {@link composeRefs} for the cleanup propagation contract).
 *
 * React runs the write before it attaches any ref in the commit, so a node
 * that remounts in the same commit that changes the refs writes the new refs.
 *
 * @example
 * function MyInput({ ref, ...props }: ComponentProps<"input">) {
 *   const internalRef = useRef<HTMLInputElement>(null);
 *   const composedRef = useComposedRefs(internalRef, ref);
 *   return <input ref={composedRef} {...props} />;
 * }
 */
function useComposedRefs<T>(...refs: PossibleRef<T>[]): RefCallback<T> {
	const latestRefs = useRef(refs);
	// Why an insertion effect: React Compiler skips a hook that writes a ref
	// during render. A render write also publishes the refs of a render that
	// React discards. React runs insertion effects before it attaches any ref
	// in the commit, so a node that remounts in the same commit that changes
	// the refs reads the new refs. A layout effect runs after that attach.
	useInsertionEffect(() => {
		latestRefs.current = refs;
	});
	return useCallback((node: T | null) => composeRefs(...latestRefs.current)(node), []);
}

export { composeRefs, useComposedRefs };
