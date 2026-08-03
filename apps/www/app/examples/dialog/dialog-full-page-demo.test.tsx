// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FullPageDialogDemo } from "./dialog-full-page-demo";

afterEach(() => {
	cleanup();
});

function openDialog(): HTMLElement {
	render(<FullPageDialogDemo />);
	fireEvent.click(screen.getByRole("button", { name: "Open full-page dialog" }));

	const content = document.querySelector('[data-slot="dialog-content"]');
	if (!(content instanceof HTMLElement)) {
		throw new Error("dialog content not found");
	}
	return content;
}

describe("FullPageDialogDemo", () => {
	it("names the switch through the label so a click on the caption reaches it", () => {
		openDialog();

		const toggle = screen.getByRole("switch");
		const label = document.querySelector('[data-slot="dialog-body"] [data-slot="label"]');

		expect(toggle.id).not.toBe("");
		expect(label?.getAttribute("for")).toBe(toggle.id);
	});

	it("fills the wrapper at full width and full height, and leaves the gutter alone", () => {
		const content = openDialog();

		// tailwind-merge override contract: `max-w-none` has to replace the
		// `max-w-lg` default, or the dialog stays narrow at full height.
		expect(content.className).toContain("max-w-none");
		expect(content.className).not.toContain("max-w-lg");
		expect(content.className).toContain("h-full");
		// `Dialog.Content`'s own wrapper owns the 16px gutter, so the content must
		// not re-position itself while the switch is off.
		expect(content.className).not.toContain("inset-0");
	});

	it("replaces the rounded, bordered, wrapper-bound defaults when the switch goes on", () => {
		const content = openDialog();
		const toggle = screen.getByRole("switch");

		expect(toggle.getAttribute("aria-checked")).toBe("false");
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("true");

		// tailwind-merge override contract: edge to edge only works if each of these
		// replaces its default instead of landing beside it, where source order
		// would pick the winner.
		expect(content.className).toContain("fixed");
		expect(content.className).toContain("inset-0");
		expect(content.className).toContain("rounded-none");
		expect(content.className).not.toContain("rounded-xl");
		expect(content.className).toContain("border-0");
		// The base cap stays on purpose. A fixed element measures against the
		// viewport, so `max-h-full` already resolves to the full viewport height —
		// and `cx` cannot merge `max-h-none` over it, because the vendored
		// tailwind-merge config omits `none` from its `max-h` group.
		expect(content.className).toContain("max-h-full");
	});

	it("restores the gutter and the rounded corners when the switch goes off again", () => {
		const content = openDialog();
		const toggle = screen.getByRole("switch");

		fireEvent.click(toggle);
		fireEvent.click(toggle);

		expect(toggle.getAttribute("aria-checked")).toBe("false");
		expect(content.className).toContain("rounded-xl");
		expect(content.className).not.toContain("rounded-none");
		expect(content.className).not.toContain("inset-0");
		expect(content.className).toContain("max-h-full");
	});
});
