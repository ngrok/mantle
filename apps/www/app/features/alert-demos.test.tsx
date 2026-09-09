// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DynamicAlertDemo } from "./alert-demos";

afterEach(() => {
	cleanup();
});

describe("DynamicAlertDemo", () => {
	it("renders no alert until the form submits", () => {
		render(<DynamicAlertDemo />);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("mounts the alert after submit and moves focus to it", async () => {
		const user = userEvent.setup();
		render(<DynamicAlertDemo />);

		await user.click(screen.getByRole("button", { name: "Sign in" }));

		const alert = screen.getByRole("alert");
		expect(alert.textContent).toBe("Invalid email or password.");
		expect(alert.getAttribute("tabindex")).toBe("-1");
		expect(document.activeElement).toBe(alert);
	});

	it("remounts the alert on a repeated attempt so focus returns to it", async () => {
		const user = userEvent.setup();
		render(<DynamicAlertDemo />);
		const submit = screen.getByRole("button", { name: "Sign in" });

		await user.click(submit);
		const firstAlert = screen.getByRole("alert");
		await user.click(submit);

		const secondAlert = screen.getByRole("alert");
		expect(secondAlert).not.toBe(firstAlert);
		expect(document.activeElement).toBe(secondAlert);
	});
});
