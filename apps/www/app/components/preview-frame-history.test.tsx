// @vitest-environment happy-dom
// (iframe page loading stays on here, so the frame has a `contentWindow` to
// attribute messages to; `about:blank` keeps happy-dom from fetching anything)
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreviewFrame } from "./preview-frame";

afterEach(() => {
	cleanup();
});

function getIframe(): HTMLIFrameElement {
	const iframe = document.querySelector("iframe");
	if (iframe == null) {
		throw new Error("expected the preview frame to render an iframe");
	}
	return iframe;
}

describe("PreviewFrame history buttons", () => {
	function backButton() {
		return screen.getByRole("button", { name: "Go back in the Centered layout demo preview" });
	}

	function forwardButton() {
		return screen.getByRole("button", { name: "Go forward in the Centered layout demo preview" });
	}

	/** What the framed document posts after a navigation, as the window receives it. */
	function reportFromFrame(
		report: { canGoBack: boolean; canGoForward: boolean },
		source: MessageEventSource | null,
	) {
		// a window event is outside React's event system, so flush its state update by hand
		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: "mantle-preview-history", ...report },
					origin: window.location.origin,
					source,
				}),
			);
		});
	}

	it("starts with both buttons disabled: a fresh document has nowhere to go", () => {
		render(<PreviewFrame src="about:blank" title="Centered layout demo" />);

		expect(backButton().hasAttribute("disabled")).toBe(true);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("enables the buttons the framed document reports", () => {
		render(<PreviewFrame src="about:blank" title="Centered layout demo" />);

		reportFromFrame({ canGoBack: true, canGoForward: false }, getIframe().contentWindow);

		expect(backButton().hasAttribute("disabled")).toBe(false);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("ignores a report from a window that is not this frame's document", () => {
		render(<PreviewFrame src="about:blank" title="Centered layout demo" />);

		reportFromFrame({ canGoBack: true, canGoForward: true }, window);

		expect(backButton().hasAttribute("disabled")).toBe(true);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("asks the framed document to move by one entry when a button is pressed", () => {
		render(<PreviewFrame src="about:blank" title="Centered layout demo" />);
		const frameWindow = getIframe().contentWindow;
		if (frameWindow == null) {
			throw new Error("expected the iframe to have a window");
		}
		const postMessage = vi.spyOn(frameWindow, "postMessage");
		reportFromFrame({ canGoBack: true, canGoForward: true }, frameWindow);

		fireEvent.click(backButton());
		fireEvent.click(forwardButton());

		expect(postMessage).toHaveBeenCalledTimes(2);
		expect(postMessage).toHaveBeenNthCalledWith(
			1,
			{ type: "mantle-preview-history-go", delta: -1 },
			window.location.origin,
		);
		expect(postMessage).toHaveBeenLastCalledWith(
			{ type: "mantle-preview-history-go", delta: 1 },
			window.location.origin,
		);
	});

	it("disables the buttons again on reload, until the new document reports", () => {
		render(<PreviewFrame src="about:blank" title="Centered layout demo" />);
		reportFromFrame({ canGoBack: true, canGoForward: true }, getIframe().contentWindow);
		expect(backButton().hasAttribute("disabled")).toBe(false);

		fireEvent.click(
			screen.getByRole("button", { name: "Reload the Centered layout demo preview" }),
		);

		expect(backButton().hasAttribute("disabled")).toBe(true);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});
});
