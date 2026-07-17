// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableIframePageLoading": true}}
// (happy-dom otherwise fetches iframe src documents for real — these tests
// only assert attributes and remounting, never framed content)
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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

describe("PreviewFrame", () => {
	it("renders an iframe pointed at the example's chrome-less preview route", () => {
		render(<PreviewFrame example="centered-layout" title="Centered layout demo" />);

		const iframe = getIframe();
		expect(iframe.getAttribute("src")).toBe("/preview/centered-layout");
		expect(iframe.getAttribute("title")).toBe("Preview of the Centered layout demo");
	});

	it("defaults to the desktop viewport", () => {
		render(<PreviewFrame example="centered-layout" title="Centered layout demo" />);

		expect(
			screen.getByRole("radio", { name: "Desktop viewport" }).getAttribute("aria-checked"),
		).toBe("true");
		expect(getIframe().parentElement?.className).toContain("w-full");
	});

	it("resizes the frame when a viewport preset is picked", () => {
		render(<PreviewFrame example="centered-layout" title="Centered layout demo" />);

		fireEvent.click(screen.getByRole("radio", { name: "Tablet viewport" }));
		expect(getIframe().parentElement?.className).toContain("w-192");

		fireEvent.click(screen.getByRole("radio", { name: "Mobile viewport" }));
		expect(getIframe().parentElement?.className).toContain("w-[375px]");
	});

	it("reloads the preview by remounting the iframe", () => {
		render(<PreviewFrame example="centered-layout" title="Centered layout demo" />);

		const before = getIframe();
		fireEvent.click(
			screen.getByRole("button", { name: "Reload the Centered layout demo preview" }),
		);
		const after = getIframe();

		expect(after).not.toBe(before);
		expect(after.getAttribute("src")).toBe("/preview/centered-layout");
	});

	it("links to the preview route in a new tab", () => {
		render(<PreviewFrame example="centered-layout" title="Centered layout demo" />);

		const link = screen.getByRole("link", {
			name: "Open the Centered layout demo preview in a new tab",
		});
		expect(link.getAttribute("href")).toBe("/preview/centered-layout");
		expect(link.getAttribute("target")).toBe("_blank");
	});
});
