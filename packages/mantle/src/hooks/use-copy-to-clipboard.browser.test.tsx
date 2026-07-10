import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard.js";

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

		expect(writeTextSpy).toHaveBeenCalledWith("written to clipboard");

		vi.restoreAllMocks();
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

		vi.restoreAllMocks();
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

		vi.restoreAllMocks();
	});

	test("falls back to the polyfill when clipboard.writeText is unavailable", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		const execCommandSpy = vi.spyOn(document, "execCommand").mockImplementationOnce(() => true);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await copyToClipboard("polyfill value");
		});

		expect(execCommandSpy).toHaveBeenCalledWith("copy");

		vi.restoreAllMocks();
	});

	test("awaiting copyToClipboard resolves after the clipboard write completes", async () => {
		const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

		const { result } = renderHook(() => useCopyToClipboard());
		const copyToClipboard = result.current;

		await act(async () => {
			await copyToClipboard("awaited value");
		});

		expect(writeTextSpy).toHaveBeenCalledWith("awaited value");

		vi.restoreAllMocks();
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

		vi.restoreAllMocks();
	});
});
