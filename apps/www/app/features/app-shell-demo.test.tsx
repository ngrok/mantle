// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShellDemo, BridgeShellDemo } from "./app-shell-demo";

afterEach(() => {
	cleanup();
});

// The settings section is pure composition: the demos derive it from their
// location and swap what Sidebar.Header and Sidebar.Body render. These cover
// the swap in both directions, since a silent break here reads as a working
// demo (the product nav simply never leaves).
describe.each([
	{ name: "AppShellDemo", Demo: AppShellDemo },
	{ name: "BridgeShellDemo", Demo: BridgeShellDemo },
])("$name settings section", ({ Demo }) => {
	it("shows the product navigation under the Main landmark by default", () => {
		render(<Demo />);

		expect(screen.getByRole("navigation", { name: "Main" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Endpoints" })).toBeDefined();
		expect(screen.queryByRole("link", { name: "Audit Logs" })).toBeNull();
	});

	it("swaps the navigation and renames the landmark when the section is entered", () => {
		render(<Demo />);

		fireEvent.click(screen.getByRole("link", { name: "Account settings" }));

		expect(screen.getByRole("navigation", { name: "Settings" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Audit Logs" })).toBeDefined();
		expect(screen.queryByRole("link", { name: "Endpoints" })).toBeNull();
		// exactly one current row across the whole panel — the settings landing
		// page — so the pinned entry link never doubles the announcement
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["General"]);
	});

	it("returns to the product page the reader left", () => {
		render(<Demo />);

		fireEvent.click(screen.getByRole("link", { name: "Agents" }));
		fireEvent.click(screen.getByRole("link", { name: "Account settings" }));
		fireEvent.click(screen.getByRole("link", { name: /settings.*back to Agents/i }));

		expect(screen.getByRole("navigation", { name: "Main" })).toBeDefined();
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["Agents"]);
	});
});
