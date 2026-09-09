// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DismissibleAlertDemo, DynamicAlertDemo } from "./alert-demos";

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

describe("DismissibleAlertDemo", () => {
	it("unmounts the alert and moves focus to the button after it", async () => {
		const user = userEvent.setup();
		render(<DismissibleAlertDemo />);

		await user.tab();
		expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dismiss Alert" }));

		await user.keyboard("{Enter}");

		expect(screen.queryByRole("button", { name: "Dismiss Alert" })).toBeNull();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Show the alert again" }),
		);
	});

	it("shows the alert again from the button that received focus", async () => {
		const user = userEvent.setup();
		render(<DismissibleAlertDemo />);
		await user.click(screen.getByRole("button", { name: "Dismiss Alert" }));
		expect(screen.queryByRole("button", { name: "Dismiss Alert" })).toBeNull();

		await user.keyboard("{Enter}");

		expect(screen.queryByRole("button", { name: "Dismiss Alert" })).not.toBeNull();
	});
});
