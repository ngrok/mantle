// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UserOverlayDemo } from "./overlay-async-demo";

/** Renders the demo inside the QueryClientProvider it expects from the app root. */
function renderDemo() {
	const queryClient = new QueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<UserOverlayDemo />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	cleanup();
});

// Regression: the overlay picker originally nested RadioGroup.ButtonGroup
// inside RadioGroup.Root, so the buttons bound to an inner, uncontrolled
// group — nothing was selected by default and every scenario opened a Sheet
// regardless of the picked overlay.
describe("UserOverlayDemo", () => {
	it("defaults the overlay picker to Sheet", () => {
		renderDemo();

		expect(screen.getByRole("radio", { name: "Sheet" }).getAttribute("aria-checked")).toBe("true");
		expect(screen.getByRole("radio", { name: "Dialog" }).getAttribute("aria-checked")).toBe(
			"false",
		);
	});

	it("opens an overlay immediately on scenario click, before data resolves", () => {
		renderDemo();

		fireEvent.click(screen.getByRole("button", { name: "Happy path" }));

		// The shell mounts synchronously with the pending body — that is the
		// recipe's core claim. (Sheet renders role="dialog".)
		expect(screen.getByRole("dialog", { name: "User details" })).toBeDefined();
	});

	it("opens the alert dialog when Alert Dialog is picked", () => {
		renderDemo();

		fireEvent.click(screen.getByRole("radio", { name: "Alert Dialog" }));
		fireEvent.click(screen.getByRole("button", { name: "Happy path" }));

		// The alert-dialog shell is distinguishable by its confirmation title and
		// its gated destructive action (disabled while the query is pending).
		expect(screen.getByRole("dialog", { name: "Remove this user?" })).toBeDefined();
		expect(screen.getByRole("button", { name: "Remove user" }).hasAttribute("disabled")).toBe(true);
	});

	it("opens the dialog when Dialog is picked", () => {
		renderDemo();

		fireEvent.click(screen.getByRole("radio", { name: "Dialog" }));
		fireEvent.click(screen.getByRole("button", { name: "404 error" }));

		expect(screen.getByRole("dialog", { name: "User details" })).toBeDefined();
		expect(screen.queryByRole("dialog", { name: "Remove this user?" })).toBeNull();
	});
});
