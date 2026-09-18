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
	it("names the switch by its caption", async () => {
		await openDialog();

		const toggle = screen.queryByRole("switch", { name: "Full bleed" });
		expect(toggle).not.toBeNull();
		// Why the `for` pin: a wrapping label names the switch even when `for` points
		// at nothing. Only a matching id shows that `Field.Control` reached the switch.
		expect(screen.getByText("Full bleed").getAttribute("for")).toBe(toggle?.id);
	});

	it("swaps to full-bleed when the switch goes on, and back when it goes off", async () => {
		const { content, user } = await openDialog();
		const toggle = screen.getByRole("switch");

		expect(toggle.getAttribute("aria-checked")).toBe("false");
		expect(content.dataset.appearance).toBe("full-page");

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
