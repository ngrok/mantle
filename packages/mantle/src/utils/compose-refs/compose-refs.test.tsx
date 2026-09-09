import { render, renderHook, screen } from "@testing-library/react";
import { createRef, useRef } from "react";
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
	test("returns a stable ref identity across re-renders with the same refs", () => {
		const objectRef = createRef<HTMLDivElement>();
		const callbackRef = vi.fn<(node: HTMLDivElement | null) => void>();
		const { result, rerender } = renderHook(
			({ first, second }) => useComposedRefs<HTMLDivElement>(first, second),
			{ initialProps: { first: objectRef, second: callbackRef } },
		);
		const initialIdentity = result.current;

		rerender({ first: objectRef, second: callbackRef });

		expect(result.current).toBe(initialIdentity);
	});

	test("returns a new ref identity when one composed ref changes", () => {
		const objectRef = createRef<HTMLDivElement>();
		const { result, rerender } = renderHook(
			({ first, second }) => useComposedRefs<HTMLDivElement>(first, second),
			{ initialProps: { first: objectRef, second: createRef<HTMLDivElement>() } },
		);
		const initialIdentity = result.current;

		rerender({ first: objectRef, second: createRef<HTMLDivElement>() });

		expect(result.current).not.toBe(initialIdentity);
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

	// Why a keyed node: `key` forces a remount, so a test can tell a re-attach
	// that a ref swap causes from one that a remount causes.
	function KeyedInput({ nodeKey, ref }: { nodeKey: string; ref: Ref<HTMLInputElement> }) {
		const internalRef = useRef<HTMLInputElement>(null);
		const composedRef = useComposedRefs(internalRef, ref);
		return <input key={nodeKey} ref={composedRef} />;
	}

	test("a stable callback ref fires once per mount across re-renders", () => {
		const callbackRef = vi.fn<(node: HTMLInputElement | null) => void>();

		const { rerender } = render(<KeyedInput nodeKey="first" ref={callbackRef} />);
		rerender(<KeyedInput nodeKey="first" ref={callbackRef} />);
		rerender(<KeyedInput nodeKey="first" ref={callbackRef} />);

		expect(callbackRef).toHaveBeenCalledTimes(1);
		expect(callbackRef.mock.calls[0]?.[0]).toBe(screen.getByRole("textbox"));
	});

	test("a ref object swapped on a render receives the node in that render", () => {
		const initialRef = createRef<HTMLInputElement>();
		const latestRef = createRef<HTMLInputElement>();

		const { rerender } = render(<KeyedInput nodeKey="first" ref={initialRef} />);
		const input = screen.getByRole("textbox");
		expect(initialRef.current).toBe(input);

		rerender(<KeyedInput nodeKey="first" ref={latestRef} />);

		// React detaches the old composed callback, which null-writes the old
		// ref, then attaches the new one.
		expect(initialRef.current).toBeNull();
		expect(latestRef.current).toBe(input);
	});

	test("a callback ref swapped on a render detaches the old one and attaches the new one", () => {
		const firstRef = vi.fn<(node: HTMLInputElement | null) => void>();
		const secondRef = vi.fn<(node: HTMLInputElement | null) => void>();

		const { rerender } = render(<KeyedInput nodeKey="first" ref={firstRef} />);
		const input = screen.getByRole("textbox");
		expect(firstRef).toHaveBeenCalledTimes(1);

		rerender(<KeyedInput nodeKey="first" ref={secondRef} />);

		expect(firstRef).toHaveBeenCalledTimes(2);
		expect(firstRef.mock.calls[1]?.[0]).toBeNull();
		expect(secondRef).toHaveBeenCalledTimes(1);
		// Why identity: vitest compares DOM nodes with `isEqualNode`. Two empty
		// inputs are equal, so `toHaveBeenCalledWith` cannot tell them apart.
		expect(secondRef.mock.calls[0]?.[0]).toBe(input);
	});

	test("a remount in the same render that swaps the refs writes the new refs", () => {
		const firstRef = vi.fn<(node: HTMLInputElement | null) => void>();
		const secondRef = vi.fn<(node: HTMLInputElement | null) => void>();

		const { rerender } = render(<KeyedInput nodeKey="first" ref={firstRef} />);
		const firstInput = screen.getByRole("textbox");
		expect(firstRef).toHaveBeenCalledTimes(1);
		expect(firstRef.mock.calls[0]?.[0]).toBe(firstInput);

		rerender(<KeyedInput nodeKey="second" ref={secondRef} />);
		const secondInput = screen.getByRole("textbox");
		// The old node detaches through the old composed callback, so the first
		// ref gets the `null`. The new node attaches through the new one.
		expect(firstRef).toHaveBeenCalledTimes(2);
		expect(firstRef.mock.calls[1]?.[0]).toBeNull();
		expect(secondRef).toHaveBeenCalledTimes(1);
		expect(secondRef.mock.calls[0]?.[0]).toBe(secondInput);

		rerender(<KeyedInput nodeKey="third" ref={secondRef} />);
		const thirdInput = screen.getByRole("textbox");
		expect(secondRef).toHaveBeenCalledTimes(3);
		expect(secondRef.mock.calls[1]?.[0]).toBeNull();
		expect(secondRef.mock.calls[2]?.[0]).toBe(thirdInput);
		expect(firstRef).toHaveBeenCalledTimes(2);
	});
});
