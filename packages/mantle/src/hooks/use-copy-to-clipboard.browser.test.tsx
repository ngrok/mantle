import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard.js";

/**
 * Simulate a browser without the Clipboard API. `navigator.clipboard` is a
 * getter on `Navigator.prototype`, so an own property shadows it; deleting
 * that own property restores the real one.
 *
 * @returns A restore function the caller must invoke in a `finally` block.
 */
function withoutClipboardApi(): () => void {
	Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
	return () => {
		Reflect.deleteProperty(navigator, "clipboard");
	};
}

describe("useCopyToClipboard (browser)", () => {
	test("returns an async copy function", () => {
		const { result } = renderHook(() => useCopyToClipboard());
		expect(typeof result.current).toBe("function");
	});

	test("returns a stable reference across renders", () => {
		const { result, rerender } = renderHook(() => useCopyToClipboard());
		const first = result.current;
		rerender();
		expect(result.current).toBe(first);
	});

	test("writes the value to navigator.clipboard", async () => {
		const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await copyToClipboard("written to clipboard");
		});

		expect(writeTextSpy).toHaveBeenCalledTimes(1);
		expect(writeTextSpy).toHaveBeenLastCalledWith("written to clipboard");
	});

	test("calls writeText with the most recently copied value", async () => {
		const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await copyToClipboard("first value");
		});
		await act(async () => {
			await copyToClipboard("second value");
		});

		expect(writeTextSpy).toHaveBeenNthCalledWith(1, "first value");
		expect(writeTextSpy).toHaveBeenNthCalledWith(2, "second value");
	});

	test("polyfill removes the textarea from the DOM even when select() throws", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementationOnce(() => {
			throw new Error("select failed");
		});

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await expect(copyToClipboard("cleanup test")).rejects.toThrow("clipboard unavailable");
		});

		expect(document.body.querySelector("textarea")).toBeNull();
	});

	test("falls back to the polyfill when clipboard.writeText rejects", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		const execCommandSpy = vi.spyOn(document, "execCommand").mockImplementationOnce(() => true);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await copyToClipboard("polyfill value");
		});

		expect(execCommandSpy).toHaveBeenCalledTimes(1);
		expect(execCommandSpy).toHaveBeenLastCalledWith("copy");
	});

	test("falls back to the polyfill when the Clipboard API is unavailable", async () => {
		const restoreClipboardApi = withoutClipboardApi();
		const execCommandSpy = vi.spyOn(document, "execCommand").mockImplementationOnce(() => true);

		try {
			const { result } = renderHook(() => useCopyToClipboard());
			const copyToClipboard = result.current;

			await act(async () => {
				await copyToClipboard("no clipboard api");
			});

			expect(execCommandSpy).toHaveBeenCalledTimes(1);
			expect(execCommandSpy).toHaveBeenLastCalledWith("copy");
		} finally {
			restoreClipboardApi();
		}
	});

	test("rejects with the clipboard error when execCommand reports a silent failure", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		// execCommand("copy") returning false is the only signal that the polyfill
		// did nothing — the caller must not be told the copy succeeded
		const execCommandSpy = vi.spyOn(document, "execCommand").mockImplementationOnce(() => false);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await expect(copyToClipboard("silent failure")).rejects.toThrow("clipboard unavailable");
		});

		expect(execCommandSpy).toHaveBeenCalledTimes(1);
		expect(document.body.querySelector("textarea")).toBeNull();
	});

	test("awaiting copyToClipboard resolves after the clipboard write completes", async () => {
		let resolveWrite: (() => void) | undefined;
		const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					resolveWrite = resolve;
				}),
		);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		let settled = false;
		const pending = (async () => {
			await copyToClipboard("awaited value");
			settled = true;
		})();

		// the write has not completed, so the returned promise must still be pending
		expect(settled).toBe(false);
		expect(writeTextSpy).toHaveBeenLastCalledWith("awaited value");

		resolveWrite?.();
		await pending;

		expect(settled).toBe(true);
	});

	test("throws when both clipboard API and polyfill fail", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementationOnce(() => {
			throw new Error("select failed");
		});

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await expect(copyToClipboard("should throw")).rejects.toThrow("clipboard unavailable");
		});
	});
});
