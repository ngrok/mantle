// @vitest-environment happy-dom
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShellDemo } from "./app-shell-demo";

afterEach(() => {
	cleanup();
});

/**
 * Renders a shell demo the way the app does. The `TooltipProvider` is not
 * optional scaffolding: every sidebar row is wrapped in `Sidebar.Tooltip`,
 * which composes `Tooltip.Root` and throws without a provider ancestor. The docs
 * site mounts one in `root.tsx`, so a bare `render()` here would be testing a
 * composition no page actually ships.
 */
function renderShell(Demo: ComponentType) {
	return render(
		<TooltipProvider>
			<Demo />
		</TooltipProvider>,
	);
}

/** Opens a footer menu row (Help, the account switcher) the way a pointer does. */
function openMenu(trigger: HTMLElement) {
	fireEvent.pointerDown(trigger);
}

// The settings section is pure composition: the demo derives it from its
// location and swaps what Sidebar.Header and Sidebar.Body render. These cover
// the swap in both directions, since a silent break here reads as a working
// demo (the product nav never leaves). The shell offers the section where its
// information architecture puts it — the footer's account menu.
describe("AppShellDemo settings section", () => {
	function enterSettings() {
		openMenu(screen.getByRole("button", { name: /Acme Corp/ }));
		fireEvent.click(screen.getByRole("menuitem", { name: "Account settings" }));
	}

	it("shows the product navigation under the Main landmark by default", () => {
		renderShell(AppShellDemo);

		expect(screen.getByRole("navigation", { name: "Main" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Endpoints" })).toBeDefined();
		expect(screen.queryByRole("link", { name: "Audit Logs" })).toBeNull();
	});

	it("swaps the navigation and renames the landmark when the section is entered", () => {
		renderShell(AppShellDemo);

		enterSettings();

		expect(screen.getByRole("navigation", { name: "Settings" })).toBeDefined();
		expect(screen.getByRole("link", { name: "Audit Logs" })).toBeDefined();
		expect(screen.queryByRole("link", { name: "Endpoints" })).toBeNull();
		// exactly one current row across the whole panel — the settings landing
		// page — so neither the pinned entry link nor a footer row doubles the
		// announcement
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["General"]);
	});

	it("returns to the product page the reader left", () => {
		renderShell(AppShellDemo);

		fireEvent.click(screen.getByRole("link", { name: "Agents" }));
		enterSettings();
		fireEvent.click(screen.getByRole("link", { name: /settings.*back to Agents/i }));

		expect(screen.getByRole("navigation", { name: "Main" })).toBeDefined();
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["Agents"]);
	});
});

// The footer's Help row: a Sidebar.ItemButton composed as a
// DropdownMenu.Trigger. The row is a menu button, not a link, and its items are
// menu items — a regression here (a plain row, or items that stop rendering)
// reads as a working demo until a reader clicks it.
describe("AppShellDemo footer help menu", () => {
	it("opens a menu of help destinations from the footer row", () => {
		renderShell(AppShellDemo);

		openMenu(screen.getByRole("button", { name: "Help" }));

		expect(screen.getByRole("menu")).toBeDefined();
		expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
			"Request early access",
			"Documentation",
			"Give feedback",
			"Contact support",
			"System status",
		]);
	});
});

// The multi-product shell's footer switcher row: one row, one menu, two scopes
// (account and user). The row names the account, and the menu is the only way
// into the settings section from this shell.
describe("AppShellDemo footer account switcher", () => {
	it("switches accounts from the menu's submenu", () => {
		renderShell(AppShellDemo);

		openMenu(screen.getByRole("button", { name: /Acme Corp/ }));
		// ArrowRight opens a submenu from its trigger row
		fireEvent.keyDown(screen.getByRole("menuitem", { name: "Switch accounts" }), {
			key: "ArrowRight",
		});
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Skunkworks" }));

		expect(screen.getByRole("button", { name: /Skunkworks/ })).toBeDefined();
		expect(screen.queryByRole("button", { name: /Acme Corp/ })).toBeNull();
	});

	it("deep-links into the settings section from Billing", () => {
		renderShell(AppShellDemo);

		openMenu(screen.getByRole("button", { name: /Acme Corp/ }));
		fireEvent.click(screen.getByRole("menuitem", { name: "Billing" }));

		expect(screen.getByRole("navigation", { name: "Settings" })).toBeDefined();
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["Billing"]);
	});
});
