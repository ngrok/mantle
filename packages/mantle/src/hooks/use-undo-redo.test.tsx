import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { useUndoRedo } from "./use-undo-redo.js";

describe("useUndoRedo", () => {
	test("starts with empty history", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		expect(result.current.canUndo).toBe(false);
		expect(result.current.canRedo).toBe(false);
	});

	test("undo returns undefined and does not touch the redo stack when the undo stack is empty", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		let value: string | undefined;
		act(() => {
			value = result.current.undo("current");
		});

		expect(value).toBeUndefined();
		expect(result.current.canRedo).toBe(false);
	});

	test("redo returns undefined and does not touch the undo stack when the redo stack is empty", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		let value: string | undefined;
		act(() => {
			value = result.current.redo("current");
		});

		expect(value).toBeUndefined();
		expect(result.current.canUndo).toBe(false);
	});

	test("push enables undo", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		act(() => {
			result.current.push("v1");
		});

		expect(result.current.canUndo).toBe(true);
		expect(result.current.canRedo).toBe(false);
	});

	test("undo returns the last snapshot and moves the current value onto the redo stack", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		act(() => {
			result.current.push("v1");
		});

		let previous: string | undefined;
		act(() => {
			previous = result.current.undo("v2");
		});

		expect(previous).toBe("v1");
		expect(result.current.canUndo).toBe(false);
		expect(result.current.canRedo).toBe(true);
	});

	test("redo returns the value that was current at undo time", () => {
		const { result } = renderHook(() => useUndoRedo<number>());

		act(() => {
			result.current.push(1);
		});
		act(() => {
			result.current.undo(2);
		});

		let next: number | undefined;
		act(() => {
			next = result.current.redo(1);
		});

		expect(next).toBe(2);
		expect(result.current.canUndo).toBe(true);
		expect(result.current.canRedo).toBe(false);
	});

	test("push clears the redo stack", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		act(() => {
			result.current.push("v1");
		});
		act(() => {
			result.current.undo("v2");
		});
		expect(result.current.canRedo).toBe(true);

		act(() => {
			result.current.push("v3");
		});

		expect(result.current.canRedo).toBe(false);
		expect(result.current.canUndo).toBe(true);
	});

	test("walks back through history across separate events", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		act(() => {
			result.current.push("v1");
		});
		act(() => {
			result.current.push("v2");
		});

		let first: string | undefined;
		act(() => {
			first = result.current.undo("v3");
		});
		let second: string | undefined;
		act(() => {
			second = result.current.undo("v2");
		});

		expect(first).toBe("v2");
		expect(second).toBe("v1");
		expect(result.current.canUndo).toBe(false);
	});

	// Regression: with reducer-state-backed stacks, both undo calls read the
	// same committed render's stack, so the second call returned the same
	// snapshot as the first and corrupted the history.
	test("two undo calls within the same event handler return successive snapshots", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		act(() => {
			result.current.push("v1");
			result.current.push("v2");
		});

		let first: string | undefined;
		let second: string | undefined;
		act(() => {
			first = result.current.undo("v3");
			second = result.current.undo("v2");
		});

		expect(first).toBe("v2");
		expect(second).toBe("v1");
		expect(result.current.canUndo).toBe(false);
		expect(result.current.canRedo).toBe(true);
	});

	test("undo immediately followed by redo within the same event handler round-trips", () => {
		const { result } = renderHook(() => useUndoRedo<string>());

		act(() => {
			result.current.push("v1");
		});

		let previous: string | undefined;
		let next: string | undefined;
		act(() => {
			previous = result.current.undo("v2");
			next = result.current.redo(previous === undefined ? "missing" : previous);
		});

		expect(previous).toBe("v1");
		expect(next).toBe("v2");
		expect(result.current.canUndo).toBe(true);
		expect(result.current.canRedo).toBe(false);
	});

	test("supports full undo/redo round trip restoring every value", () => {
		const { result } = renderHook(() => useUndoRedo<number>());

		// simulate edits: 1 → 2 → 3, snapshotting before each mutation
		act(() => {
			result.current.push(1);
		});
		act(() => {
			result.current.push(2);
		});

		// undo back to the start
		let value: number | undefined;
		act(() => {
			value = result.current.undo(3);
		});
		expect(value).toBe(2);
		act(() => {
			value = result.current.undo(2);
		});
		expect(value).toBe(1);
		expect(result.current.canUndo).toBe(false);

		// redo forward to the end
		act(() => {
			value = result.current.redo(1);
		});
		expect(value).toBe(2);
		act(() => {
			value = result.current.redo(2);
		});
		expect(value).toBe(3);
		expect(result.current.canRedo).toBe(false);
		expect(result.current.canUndo).toBe(true);
	});
});
