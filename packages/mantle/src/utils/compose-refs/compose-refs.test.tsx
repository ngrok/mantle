import { renderHook } from "@testing-library/react";
import { createRef } from "react";
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
});
