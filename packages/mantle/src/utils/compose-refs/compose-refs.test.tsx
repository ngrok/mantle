import { render, renderHook } from "@testing-library/react";
import { createRef } from "react";
import type { Ref } from "react";
import { describe, expect, test, vi } from "vitest";
import { composeRefs, useComposedRefs } from "./compose-refs.js";

describe("composeRefs", () => {
	test("writes the node to callback refs and ref objects", () => {
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const objectRef = createRef<HTMLDivElement>();
		const node = document.createElement("div");

		composeRefs<HTMLDivElement>(callbackRef, objectRef)(node);

		expect(callbackRef).toHaveBeenCalledWith(node);
		expect(objectRef.current).toBe(node);
	});

	test("skips null and undefined refs", () => {
		const objectRef = createRef<HTMLDivElement>();
		const node = document.createElement("div");

		expect(() => composeRefs<HTMLDivElement>(undefined, null, objectRef)(node)).not.toThrow();
		expect(objectRef.current).toBe(node);
	});

	test("returns undefined when no inner ref returns a cleanup", () => {
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const node = document.createElement("div");

		expect(
			composeRefs<HTMLDivElement>(callbackRef, createRef<HTMLDivElement>())(node),
		).toBeUndefined();
	});

	test("invokes an inner ref's cleanup on unmount instead of calling it with null", () => {
		const cleanup = vi.fn<() => void>();
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);

		const { unmount } = render(<div ref={composeRefs<HTMLDivElement>(callbackRef)} />);

		expect(callbackRef).toHaveBeenCalledTimes(1);
		expect(callbackRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
		expect(cleanup).not.toHaveBeenCalled();

		unmount();

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(callbackRef).toHaveBeenCalledTimes(1);
		expect(callbackRef).not.toHaveBeenCalledWith(null);
	});

	test("with mixed refs, null-writes non-cleanup refs and invokes cleanups on unmount", () => {
		const cleanup = vi.fn<() => void>();
		const cleanupRef = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);
		const plainCallbackRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const objectRef = createRef<HTMLDivElement>();

		const { unmount } = render(
			<div ref={composeRefs<HTMLDivElement>(cleanupRef, plainCallbackRef, objectRef)} />,
		);

		expect(objectRef.current).toBeInstanceOf(HTMLDivElement);

		unmount();

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanupRef).toHaveBeenCalledTimes(1);
		expect(cleanupRef).not.toHaveBeenCalledWith(null);
		expect(plainCallbackRef).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();
	});

	test("legacy path: calls callback refs with null on unmount when no inner ref returns a cleanup", () => {
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const objectRef = createRef<HTMLDivElement>();

		const { unmount } = render(<div ref={composeRefs<HTMLDivElement>(callbackRef, objectRef)} />);

		expect(objectRef.current).toBeInstanceOf(HTMLDivElement);

		unmount();

		expect(callbackRef).toHaveBeenCalledTimes(2);
		expect(callbackRef).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();
	});
});

describe("useComposedRefs", () => {
	test("returns a stable ref identity across re-renders", () => {
		const { result, rerender } = renderHook(
			({ refs }) => useComposedRefs<HTMLDivElement>(...refs),
			{ initialProps: { refs: [createRef<HTMLDivElement>()] } },
		);
		const first = result.current;

		rerender({ refs: [createRef<HTMLDivElement>()] });

		expect(result.current).toBe(first);
	});

	test("writes to the latest refs passed on the most recent render", () => {
		const initialRef = createRef<HTMLDivElement>();
		const latestRef = createRef<HTMLDivElement>();
		const node = document.createElement("div");

		const { result, rerender } = renderHook(
			({ refs }) => useComposedRefs<HTMLDivElement>(...refs),
			{ initialProps: { refs: [initialRef] } },
		);

		rerender({ refs: [latestRef] });
		result.current(node);

		expect(latestRef.current).toBe(node);
		expect(initialRef.current).toBeNull();
	});

	test("propagates inner ref cleanups and null-writes non-cleanup refs on unmount", () => {
		const cleanup = vi.fn<() => void>();
		const cleanupRef = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);
		const objectRef = createRef<HTMLDivElement>();

		function TestComponent(props: {
			cleanupRef: Ref<HTMLDivElement>;
			objectRef: Ref<HTMLDivElement>;
		}) {
			const composedRef = useComposedRefs(props.cleanupRef, props.objectRef);
			return <div ref={composedRef} />;
		}

		const { unmount } = render(<TestComponent cleanupRef={cleanupRef} objectRef={objectRef} />);

		expect(objectRef.current).toBeInstanceOf(HTMLDivElement);
		expect(cleanup).not.toHaveBeenCalled();

		unmount();

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(cleanupRef).toHaveBeenCalledTimes(1);
		expect(cleanupRef).not.toHaveBeenCalledWith(null);
		expect(objectRef.current).toBeNull();
	});
});
