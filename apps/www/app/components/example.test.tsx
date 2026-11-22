// @vitest-environment happy-dom
// @vitest-environment-options {"settings": {"disableIframePageLoading": true}}
// (happy-dom otherwise fetches iframe src documents for real; these tests
// only assert attributes and remounting, never framed content)
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { previewHeightMessage } from "~/features/example-heights";
import { Example, ExampleHeightsContext } from "./example";

function getIframe(): HTMLIFrameElement {
	const iframe = document.querySelector("iframe");
	if (iframe == null) {
		throw new Error("expected the example to render an iframe");
	}
	return iframe;
}

describe("Example", () => {
	it("renders an iframe pointed at the example's chrome-less preview route", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);

		const iframe = getIframe();
		expect(iframe.getAttribute("src")).toBe("/preview/centered-layout");
		expect(iframe.getAttribute("title")).toBe("Preview of the Centered layout demo");
	});

	it("defaults to the desktop viewport", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);

		expect(screen.getByRole("radio", { name: "Desktop viewport" })).toHaveProperty("checked", true);
		// Why a class-token check: the wrapper emits no data attribute, so the width class is the
		// only observable of the `viewportWidthClasses` lookup. `max-w-full` contains `w-full`, so a
		// substring match cannot tell the presets apart.
		expect(getIframe().parentElement?.classList.contains("w-full")).toBe(true);
	});

	it("resizes the frame when a viewport preset is picked", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);

		fireEvent.click(screen.getByRole("radio", { name: "Tablet viewport" }));
		// Why a class-token check: the wrapper emits no data attribute, so the width class is the
		// only observable of the `viewportWidthClasses` lookup. The previous preset must also be
		// gone, or a component that appends classes instead of swapping them would pass.
		expect(getIframe().parentElement?.classList.contains("w-192")).toBe(true);
		expect(getIframe().parentElement?.classList.contains("w-full")).toBe(false);

		fireEvent.click(screen.getByRole("radio", { name: "Mobile viewport" }));
		expect(getIframe().parentElement?.classList.contains("w-80")).toBe(true);
		expect(getIframe().parentElement?.classList.contains("w-192")).toBe(false);

		fireEvent.click(screen.getByRole("radio", { name: "Desktop viewport" }));
		expect(getIframe().parentElement?.classList.contains("w-full")).toBe(true);
		expect(getIframe().parentElement?.classList.contains("w-80")).toBe(false);
	});

	it("shows a shell demo in a fixed-height frame and a page example at its content height", () => {
		const { container, unmount } = render(
			<Example name="centered-layout" title="Centered layout demo" />,
		);
		// Why a class check: the height mode has no other observable in happy-dom, which lays out nothing.
		expect(container.querySelector(".h-160")).not.toBeNull();
		unmount();

		render(<Example name="components/actions/button/size" title="Button size example" />);
		expect(document.querySelector(".h-160")).toBeNull();
		expect(getIframe().getAttribute("src")).toBe("/preview/components/actions/button/size");
	});

	it("starts a page example at its measured height", () => {
		render(
			<ExampleHeightsContext
				value={{ "components/actions/button/size": { wide: 240, narrow: 236 } }}
			>
				<Example name="components/actions/button/size" title="Button size example" />
			</ExampleHeightsContext>,
		);

		const iframe = getIframe();
		expect(iframe.style.getPropertyValue("--example-height-wide")).toBe("240px");
		expect(iframe.style.getPropertyValue("--example-height-narrow")).toBe("236px");
		// Why a class check: happy-dom runs no container queries, so the classes that read the
		// heights are the only observable of which height the frame starts at.
		expect(iframe.classList.contains("@3xl:h-(--example-height-wide)")).toBe(true);
		expect(iframe.classList.contains("h-40")).toBe(false);
	});

	function report(source: MessageEventSource | null, height: number, hydrated = true) {
		act(() => {
			window.dispatchEvent(
				new MessageEvent("message", {
					data: { type: previewHeightMessage, height, hydrated },
					origin: window.location.origin,
					source,
				}),
			);
		});
	}

	it("grows a page example to the height its preview reports", () => {
		render(<Example name="components/actions/button/size" title="Button size example" />);
		const iframe = getIframe();

		report(window, 900);
		expect(iframe.style.height).toBe("");

		report(iframe.contentWindow, 160, false);
		expect(iframe.style.height).toBe("160px");

		report(iframe.contentWindow, 312);
		expect(iframe.style.height).toBe("312px");
	});

	it("stops the scroll of a content-height frame when the frame has a height", () => {
		const { unmount } = render(
			<Example name="components/actions/button/size" title="Button size example" />,
		);
		// A preview with no canvas, such as an error page, reports no height and must still scroll.
		expect(getIframe().hasAttribute("scrolling")).toBe(false);
		report(getIframe().contentWindow, 312);
		expect(getIframe().getAttribute("scrolling")).toBe("no");
		unmount();

		render(
			<ExampleHeightsContext
				value={{ "components/actions/button/size": { wide: 240, narrow: 236 } }}
			>
				<Example name="components/actions/button/size" title="Button size example" />
			</ExampleHeightsContext>,
		);
		expect(getIframe().getAttribute("scrolling")).toBe("no");
	});

	it("lets a fixed-height frame scroll", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);
		expect(getIframe().hasAttribute("scrolling")).toBe(false);
	});

	it("keeps its measured height until the preview hydrates", () => {
		render(
			<ExampleHeightsContext
				value={{ "components/actions/button/size": { wide: 226, narrow: 226 } }}
			>
				<Example name="components/actions/button/size" title="Button size example" />
			</ExampleHeightsContext>,
		);
		const iframe = getIframe();

		report(iframe.contentWindow, 160, false);
		expect(iframe.style.height).toBe("");

		report(iframe.contentWindow, 230);
		expect(iframe.style.height).toBe("230px");
	});

	it("puts its code in a Code tab and keeps the preview mounted", () => {
		render(
			<Example name="components/actions/button/size" title="Button size example">
				<pre>const answer = 42;</pre>
			</Example>,
		);

		const iframe = getIframe();
		const codeTab = screen.getByRole("tab", { name: "Code" });
		fireEvent.mouseDown(codeTab);
		expect(codeTab.getAttribute("aria-selected")).toBe("true");
		expect(screen.getByText("const answer = 42;").tagName).toBe("PRE");
		expect(getIframe()).toBe(iframe);
	});

	it("reloads the preview by remounting the iframe", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);

		const before = getIframe();
		fireEvent.click(
			screen.getByRole("button", { name: "Reload the Centered layout demo preview" }),
		);
		const after = getIframe();

		expect(after).not.toBe(before);
		expect(after.getAttribute("src")).toBe("/preview/centered-layout");
	});

	it("links to the preview route in a new tab", () => {
		render(<Example name="centered-layout" title="Centered layout demo" />);

		const link = screen.getByRole("link", {
			name: "Open the Centered layout demo preview in a new tab",
		});
		expect(link.getAttribute("href")).toBe("/preview/centered-layout");
		expect(link.getAttribute("target")).toBe("_blank");
	});
});
