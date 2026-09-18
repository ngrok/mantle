import { describe, expect, test, vi } from "vitest";
import { copyToClipboard } from "./copy-to-clipboard.js";

describe("copyToClipboard (browser)", () => {
	test("writes the value to the clipboard", async () => {
		// Why focus: when the document lacks focus, Chromium rejects `writeText` with
		// `NotAllowedError`. The test iframe has none until something inside it takes focus.
		window.focus();

		await copyToClipboard("written to clipboard");

		await expect(navigator.clipboard.readText()).resolves.toBe("written to clipboard");
	});

	test("falls back to execCommand('copy') over a selected textarea when writeText rejects", async () => {
		const text = "polyfill value";
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		// Why capture: the polyfill removes the textarea in a `finally`, so the only moment it
		// holds the selected value is inside the `execCommand` call.
		let textareaDuringCopy: { value: string; selectionStart: number; selectionEnd: number } | null =
			null;
		const execCommandSpy = vi.spyOn(document, "execCommand").mockImplementationOnce(() => {
			const textarea = document.body.querySelector("textarea");
			if (textarea != null) {
				textareaDuringCopy = {
					value: textarea.value,
					selectionStart: textarea.selectionStart,
					selectionEnd: textarea.selectionEnd,
				};
			}
			return true;
		});

		await copyToClipboard(text);

		expect(execCommandSpy).toHaveBeenCalledTimes(1);
		expect(execCommandSpy).toHaveBeenLastCalledWith("copy");
		expect(textareaDuringCopy).toEqual({
			value: text,
			selectionStart: 0,
			selectionEnd: text.length,
		});
	});

	test("rejects with the clipboard error when execCommand('copy') returns false", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		vi.spyOn(document, "execCommand").mockImplementationOnce(() => false);

		await expect(copyToClipboard("both failed")).rejects.toThrow("clipboard unavailable");
	});

	test("polyfill removes the textarea from the DOM even when select() throws", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
			new Error("clipboard unavailable"),
		);
		// Why capture: `copyToClipboard` swallows an error the polyfill throws, so an
		// `expect` inside this mock cannot fail the test.
		let textareaDuringSelect: HTMLTextAreaElement | null = null;
		vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementationOnce(() => {
			textareaDuringSelect = document.body.querySelector("textarea");
			throw new Error("select failed");
		});

		await expect(copyToClipboard("cleanup test")).rejects.toThrow("clipboard unavailable");

		expect(textareaDuringSelect).not.toBeNull();
		expect(document.body.querySelector("textarea")).toBeNull();
	});

	test("resolves after the clipboard write completes", async () => {
		const write: PromiseWithResolvers<void> = Promise.withResolvers();
		vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(write.promise);
		const settled = vi.fn<() => void>();

		const pending = copyToClipboard("awaited value").then(settled);

		await Promise.resolve();
		expect(settled).toHaveBeenCalledTimes(0);

		write.resolve();
		await pending;
		expect(settled).toHaveBeenCalledTimes(1);
	});
});
