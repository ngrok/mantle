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

	it("opens as a full-page dialog, keeping the 16px gutter", () => {
		const content = openDialog();

		expect(content.dataset.appearance).toBe("full-page");
	});

	it("swaps to full-bleed when the switch goes on, and back when it goes off", () => {
		const content = openDialog();
		const toggle = screen.getByRole("switch");

		expect(toggle.getAttribute("aria-checked")).toBe("false");

		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("true");
		expect(content.dataset.appearance).toBe("full-bleed");

		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("false");
		expect(content.dataset.appearance).toBe("full-page");
	});
});
