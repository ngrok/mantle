// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableIframePageLoading": true}}
// (happy-dom otherwise fetches iframe src documents for real)
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Example } from "./example";

function getIframe(): HTMLIFrameElement {
	const iframe = document.querySelector("iframe");
	if (iframe == null) {
		throw new Error("expected the example to render an iframe");
	}
	return iframe;
}

describe("Example history buttons", () => {
	function backButton() {
		return screen.getByRole("button", { name: "Go back in the Breadcrumbs demo preview" });
	}

	function forwardButton() {
		return screen.getByRole("button", { name: "Go forward in the Breadcrumbs demo preview" });
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
		render(<Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs demo" />);

		expect(backButton().hasAttribute("disabled")).toBe(true);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("enables the buttons the framed document reports", () => {
		render(<Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs demo" />);

		reportFromFrame({ canGoBack: true, canGoForward: false }, getIframe().contentWindow);

		expect(backButton().hasAttribute("disabled")).toBe(false);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("ignores a report from a window that is not this frame's document", () => {
		render(<Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs demo" />);

		reportFromFrame({ canGoBack: true, canGoForward: true }, window);

		expect(backButton().hasAttribute("disabled")).toBe(true);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("asks the framed document to move by one entry when a button is pressed", () => {
		render(<Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs demo" />);
		// Why a message port: with page loading off, the frame has no window. A port is a
		// message source that receives `postMessage` the same way.
		const frameWindow = new MessageChannel().port1;
		Object.defineProperty(getIframe(), "contentWindow", { value: frameWindow });
		const postMessage = vi.spyOn(frameWindow, "postMessage").mockImplementation(() => {});
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
		render(<Example path="/preview/breadcrumbs-from-routes/endpoints" title="Breadcrumbs demo" />);
		reportFromFrame({ canGoBack: true, canGoForward: true }, getIframe().contentWindow);
		expect(backButton().hasAttribute("disabled")).toBe(false);

		fireEvent.click(screen.getByRole("button", { name: "Reload the Breadcrumbs demo preview" }));

		expect(backButton().hasAttribute("disabled")).toBe(true);
		expect(forwardButton().hasAttribute("disabled")).toBe(true);
	});

	it("shows no history buttons for an example that does not navigate", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);

		expect(screen.queryByRole("group", { name: "Preview history" })).toBeNull();
	});
});
