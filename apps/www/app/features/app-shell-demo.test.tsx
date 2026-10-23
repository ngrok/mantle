// @vitest-environment happy-dom
import { ThemeProvider } from "@ngrok/mantle/theme";
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShellDemo } from "./app-shell-demo";

afterEach(() => {
	cleanup();
});

/**
 * Renders a shell demo the way the app does. The providers are not optional
 * scaffolding: every sidebar row is wrapped in `Sidebar.Tooltip`, which
 * composes `Tooltip.Root` and throws without a `TooltipProvider` ancestor, and
 * the account menu's `ThemeDropdownMenuRadioGroup` throws without a `ThemeProvider`.
 * The docs site mounts both in `root.tsx`, so a bare `render()` here would be
 * testing a composition no page actually ships.
 */
function renderShell(Demo: ComponentType) {
	return render(
		<ThemeProvider>
			<TooltipProvider>
				<Demo />
			</TooltipProvider>
		</ThemeProvider>,
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

		expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeNull();
		expect(screen.queryByRole("link", { name: "Endpoints" })).not.toBeNull();
		expect(screen.queryByRole("link", { name: "Audit Logs" })).toBeNull();
	});

	it("swaps the navigation and renames the landmark when the section is entered", () => {
		renderShell(AppShellDemo);

		enterSettings();

		expect(screen.queryByRole("navigation", { name: "Settings" })).not.toBeNull();
		expect(screen.queryByRole("link", { name: "Audit Logs" })).not.toBeNull();
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

		expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeNull();
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["Agents"]);
	});
});

// The footer's Help row: a Sidebar.ItemButton composed as a
// DropdownMenu.Trigger. The row is a menu button, not a link, and its items are
// menu items — a regression here (a plain row, or items that stop rendering)
// reads as a working demo until a reader clicks it.
it("opens a menu of help destinations from the footer Help row", () => {
	renderShell(AppShellDemo);

	openMenu(screen.getByRole("button", { name: "Help" }));

	expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
		"Request early access",
		"Documentation",
		"Give feedback",
		"Contact support",
		"System status",
	]);
});

// The multi-product shell's footer switcher row: one row, one menu, two scopes
// (account and user). The row names the account, and the menu is the only way
// into the settings section from this shell.
describe("AppShellDemo header actions", () => {
	it("runs an action from the collapsed More actions menu", () => {
		renderShell(AppShellDemo);
		expect(screen.queryByText("Preview notice")).toBeNull();

		openMenu(screen.getByRole("button", { name: "More actions" }));
		fireEvent.click(screen.getByRole("menuitem", { name: "Toggle notice" }));

		expect(screen.queryByText("Preview notice")).not.toBeNull();
	});
});

describe("AppShellDemo footer account switcher", () => {
	it("switches accounts from the menu's submenu", () => {
		renderShell(AppShellDemo);

		openMenu(screen.getByRole("button", { name: /Acme Corp/ }));
		// ArrowRight opens a submenu from its trigger row
		fireEvent.keyDown(screen.getByRole("menuitem", { name: "Switch accounts" }), {
			key: "ArrowRight",
		});
		fireEvent.click(screen.getByRole("menuitemradio", { name: "Skunkworks" }));

		expect(screen.queryByRole("button", { name: /Skunkworks/ })).not.toBeNull();
		expect(screen.queryByRole("button", { name: /Acme Corp/ })).toBeNull();
	});

	it("deep-links into the settings section from Billing", () => {
		renderShell(AppShellDemo);

		openMenu(screen.getByRole("button", { name: /Acme Corp/ }));
		fireEvent.click(screen.getByRole("menuitem", { name: "Billing" }));

		expect(screen.queryByRole("navigation", { name: "Settings" })).not.toBeNull();
		expect(
			screen.getAllByRole("link", { current: "page" }).map((link) => link.textContent),
		).toEqual(["Billing"]);
	});
});

// The product switcher's card list is the only hand-rolled keyboard contract in
// the shell demos: `handleProductOptionKeyDown` rolls focus over the cards with
// ArrowDown/ArrowUp (wrapping at both ends) and Home/End, and the dialog hands
// focus to the *current* product's card instead of the first one. A break here
// (a container query that matches nothing, a dropped wrap) leaves the demo
// looking fine while being unusable from the keyboard.
describe("AppShellDemo product switcher", () => {
	const productLabels = ["Gateway", "Shrimp", "AI Gateway"];

	/** Opens the switcher dialog from the named trigger and returns its cards. */
	function openProductSwitcher(currentProduct: string): HTMLElement[] {
		fireEvent.click(screen.getByRole("button", { name: currentProduct }));
		const dialog = screen.getByRole("dialog", { name: "Choose a product" });
		return within(dialog).getAllByRole("button");
	}

	/** The card at `index`; indexing an array is unchecked, so fail loudly here. */
	function cardAt(cards: readonly HTMLElement[], index: number): HTMLElement {
		const card = cards[index];
		if (card == null) {
			throw new Error(`expected a product card at index ${index}`);
		}
		return card;
	}

	/** The index of the card that currently holds DOM focus, or -1. */
	function focusedIndex(cards: readonly HTMLElement[]): number {
		return cards.findIndex((card) => card === document.activeElement);
	}

	it("opens on the current product's card", () => {
		renderShell(AppShellDemo);

		const cards = openProductSwitcher("Gateway");

		expect(
			cards.map((card) => productLabels.find((label) => card.textContent?.startsWith(label))),
		).toEqual(productLabels);
		// Gateway is the initial product, so focus lands on its card — not the
		// first tabbable node Radix's own auto-focus would have picked
		expect(focusedIndex(cards)).toBe(0);
	});

	it("wraps ArrowDown past the last card and ArrowUp past the first", () => {
		renderShell(AppShellDemo);

		const cards = openProductSwitcher("Gateway");

		fireEvent.keyDown(cardAt(cards, 0), { key: "ArrowDown" });
		expect(focusedIndex(cards)).toBe(1);

		fireEvent.keyDown(cardAt(cards, 1), { key: "ArrowDown" });
		expect(focusedIndex(cards)).toBe(2);

		fireEvent.keyDown(cardAt(cards, 2), { key: "ArrowDown" });
		expect(focusedIndex(cards)).toBe(0);

		fireEvent.keyDown(cardAt(cards, 0), { key: "ArrowUp" });
		expect(focusedIndex(cards)).toBe(2);

		fireEvent.keyDown(cardAt(cards, 2), { key: "ArrowUp" });
		expect(focusedIndex(cards)).toBe(1);
	});

	it("jumps to the edges with Home and End", () => {
		renderShell(AppShellDemo);

		const cards = openProductSwitcher("Gateway");

		fireEvent.keyDown(cardAt(cards, 0), { key: "End" });
		expect(focusedIndex(cards)).toBe(2);

		fireEvent.keyDown(cardAt(cards, 2), { key: "Home" });
		expect(focusedIndex(cards)).toBe(0);
	});

	it("preventDefaults only the keys it owns", () => {
		renderShell(AppShellDemo);

		const cards = openProductSwitcher("Gateway");

		// Home/End would otherwise scroll the dialog instead of moving focus
		for (const key of ["ArrowDown", "ArrowUp", "Home", "End"]) {
			expect(fireEvent.keyDown(cardAt(cards, 0), { key })).toBe(false);
		}
		// Enter and Space activate the card natively, so they must pass through
		for (const key of ["Enter", " "]) {
			expect(fireEvent.keyDown(cardAt(cards, 0), { key })).toBe(true);
		}
	});

	it("switches the product and closes the dialog when a card is chosen", () => {
		renderShell(AppShellDemo);

		const cards = openProductSwitcher("Gateway");
		fireEvent.click(cardAt(cards, 1));

		expect(screen.queryByRole("dialog", { name: "Choose a product" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Shrimp" })).not.toBeNull();
		expect(screen.queryByRole("button", { name: "Gateway" })).toBeNull();

		// reopening highlights the new current product by focusing its card
		expect(focusedIndex(openProductSwitcher("Shrimp"))).toBe(1);
	});
});
