// @vitest-environment happy-dom
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { forwardPreviewShortcutsScript } from "~/features/preview-shortcuts";
import PreviewExamplePage from "~/routes/preview";

// Why a second document: the frame element lives in the docs page, and the docs
// page's `useHotkeys` listens on that page's `document`, so the copy must bubble there.
const docsPage = document.implementation.createHTMLDocument();
const frame = docsPage.createElement("div");
docsPage.body.append(frame);
// Why cancel: the docs page's `useHotkeys("mod+k", …, { preventDefault: true })` does.
const docsPageListener = vi.fn<(event: Event) => void>((event) => {
	event.preventDefault();
});
docsPage.addEventListener("keydown", docsPageListener);
// Why stop at the docs page's `document`: happy-dom bubbles a created document's
// events on to the test window, and a browser does not.
docsPage.addEventListener("keydown", (event) => event.stopPropagation());

beforeAll(() => {
	vi.stubGlobal("frameElement", frame);
	new Function(forwardPreviewShortcutsScript)();
});

/** Presses ⌘K on `target` and returns the keypress. */
function pressModK(target: Element, init: KeyboardEventInit = { metaKey: true }) {
	const event = new KeyboardEvent("keydown", {
		key: "k",
		code: "KeyK",
		bubbles: true,
		cancelable: true,
		...init,
	});
	target.dispatchEvent(event);
	return event;
}

describe("forwardPreviewShortcutsScript", () => {
	it("sends ⌘K to the docs page and cancels the keypress when the docs page handles it", () => {
		const event = pressModK(document.body);

		expect(docsPageListener).toHaveBeenCalledTimes(1);
		expect(docsPageListener).toHaveBeenLastCalledWith(
			expect.objectContaining({ type: "keydown", key: "k", code: "KeyK", metaKey: true }),
		);
		expect(event.defaultPrevented).toBe(true);
	});

	it("leaves the keypress alone when the docs page does not handle it", () => {
		docsPageListener.mockImplementationOnce(() => {});

		const event = pressModK(document.body, { ctrlKey: true });

		expect(docsPageListener).toHaveBeenCalledTimes(1);
		expect(docsPageListener).toHaveBeenLastCalledWith(
			expect.objectContaining({ key: "k", ctrlKey: true, metaKey: false }),
		);
		expect(event.defaultPrevented).toBe(false);
	});

	// Why a listener added after the script: a demo's `Command.DialogRoot` binds
	// ⌘K on `window` after the script runs, and the demo's palette must win.
	it("does not send a keypress that a later preview listener handles", () => {
		window.addEventListener("keydown", (event) => event.preventDefault(), { once: true });

		pressModK(document.body);

		expect(docsPageListener).not.toHaveBeenCalled();
	});

	it.each([
		{ name: "a keypress with no modifier", html: "<button>Open</button>", init: {} },
		{ name: "a held ⌘K", html: "<button>Open</button>", init: { metaKey: true, repeat: true } },
		{ name: "a form field", html: "<input />", init: { metaKey: true } },
		{
			name: "a field role",
			html: '<div role="textbox" tabindex="0"></div>',
			init: { metaKey: true },
		},
		{ name: "an editor", html: '<div contenteditable="true"></div>', init: { metaKey: true } },
	])("keeps $name in the preview", ({ html, init }) => {
		document.body.innerHTML = html;
		const target = document.body.firstElementChild;
		if (target == null) {
			throw new Error("The fixture renders no element.");
		}

		const event = pressModK(target, init);

		expect(docsPageListener).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it("is in the preview document the docs page frames", () => {
		const html = renderToString(
			createElement(PreviewExamplePage, {
				loaderData: { kind: "registry", title: "App shell demo", key: "app-shell" },
			} as Parameters<typeof PreviewExamplePage>[0]),
		);

		expect(html).toContain(forwardPreviewShortcutsScript);
	});
});
