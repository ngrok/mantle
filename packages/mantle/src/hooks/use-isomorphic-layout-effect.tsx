import { useEffect, useLayoutEffect } from "react";

/**
 * A drop-in replacement for `useLayoutEffect` that does not warn during
 * server-side rendering.
 *
 * Resolves to `useLayoutEffect` in the browser (where it can read layout and
 * synchronously re-render before paint) and to `useEffect` on the server
 * (where layout effects are a no-op and React would otherwise log a
 * "useLayoutEffect does nothing on the server" warning).
 *
 * Use this whenever you need the timing semantics of `useLayoutEffect` in
 * code that may also execute during SSR. It is most often used internally
 * by other Mantle hooks and components.
 *
 * @param effect - The imperative function that may return a cleanup
 *   function — same signature as React's `useLayoutEffect` / `useEffect`.
 * @param deps - Optional dependency list, same semantics as
 *   `useLayoutEffect`.
 * @returns Nothing.
 *
 * @example
 * // Measure an element synchronously after layout
 * const ref = useRef<HTMLDivElement>(null);
 * const [width, setWidth] = useState(0);
 *
 * useIsomorphicLayoutEffect(() => {
 *   if (ref.current) {
 *     setWidth(ref.current.getBoundingClientRect().width);
 *   }
 * }, []);
 *
 * return <div ref={ref}>Width: {width}</div>;
 */
export const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;
