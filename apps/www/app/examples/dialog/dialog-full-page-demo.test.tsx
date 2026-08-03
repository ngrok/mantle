// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { FullPageDialogDemo } from "./dialog-full-page-demo";

afterEach(() => {
	cleanup();
});

async function openDialog() {
	const user = userEvent.setup();
	render(<FullPageDialogDemo />);
	await user.click(screen.getByRole("button", { name: "Open full-page dialog" }));

	const content = await screen.findByRole("dialog");
	return { content, user };
}

describe("FullPageDialogDemo", () => {
	it("names the switch through the label so a click on the caption reaches it", async () => {
		await openDialog();

		const toggle = screen.getByRole("switch");
		const label = document.querySelector('[data-slot="dialog-body"] [data-slot="label"]');

		expect(toggle.id).not.toBe("");
		expect(label?.getAttribute("for")).toBe(toggle.id);
	});

	it("opens as a full-page dialog, keeping the 16px gutter", async () => {
		const { content } = await openDialog();

		expect(content.dataset.appearance).toBe("full-page");
	});

	it("swaps to full-bleed when the switch goes on, and back when it goes off", async () => {
		const { content, user } = await openDialog();
		const toggle = screen.getByRole("switch");

		expect(toggle.getAttribute("aria-checked")).toBe("false");

		await user.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("true");
		expect(content.dataset.appearance).toBe("full-bleed");

		await user.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("false");
		expect(content.dataset.appearance).toBe("full-page");
	});

	it("toggles from a click on the label, not just the switch", async () => {
		const { content, user } = await openDialog();
		const label = screen.getByText("Full bleed");

		await user.click(label);

		expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
		expect(content.dataset.appearance).toBe("full-bleed");
	});
});
