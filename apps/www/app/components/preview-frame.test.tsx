// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableIframePageLoading": true}}
// (happy-dom otherwise fetches iframe src documents for real — these tests
// only assert attributes and remounting, never framed content)
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewFrame } from "./preview-frame";

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
		// Why a class-token check: the wrapper emits no data attribute, so the width class is the
		// only observable of the `viewportWidthClasses` lookup. `max-w-full` contains `w-full`, so a
		// substring match cannot tell the presets apart.
		expect(getIframe().parentElement?.classList.contains("w-full")).toBe(true);
	});

	it("resizes the frame when a viewport preset is picked", () => {
		render(<PreviewFrame example="centered-layout" title="Centered layout demo" />);

		fireEvent.click(screen.getByRole("radio", { name: "Tablet viewport" }));
		// Why a class-token check: the wrapper emits no data attribute, so the width class is the
		// only observable of the `viewportWidthClasses` lookup. The previous preset must also be
		// gone, or a component that appends classes instead of swapping them would pass.
		expect(getIframe().parentElement?.classList.contains("w-192")).toBe(true);
		expect(getIframe().parentElement?.classList.contains("w-full")).toBe(false);

		fireEvent.click(screen.getByRole("radio", { name: "Mobile viewport" }));
		expect(getIframe().parentElement?.classList.contains("w-[375px]")).toBe(true);
		expect(getIframe().parentElement?.classList.contains("w-192")).toBe(false);

		fireEvent.click(screen.getByRole("radio", { name: "Desktop viewport" }));
		expect(getIframe().parentElement?.classList.contains("w-full")).toBe(true);
		expect(getIframe().parentElement?.classList.contains("w-[375px]")).toBe(false);
	});

	// Why a class assertion: the tailwind-merge override contract. `className` is documented as
	// merged onto the outer frame so a caller can replace the default `h-160` canvas height.
	it("merges className onto the outer frame, overriding the default height", () => {
		const { container } = render(
			<PreviewFrame example="centered-layout" title="Centered layout demo" className="h-96" />,
		);

		const frame = container.firstElementChild;
		if (!(frame instanceof HTMLElement)) {
			throw new Error("expected the preview frame to render an outer frame element");
		}
		expect(frame.classList.contains("h-96")).toBe(true);
		expect(frame.classList.contains("h-160")).toBe(false);
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
