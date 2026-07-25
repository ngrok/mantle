"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { List } from "./list.js";

/**
 * The three utilities the item's focus + disabled contracts are implemented
 * with, spelled exactly as Tailwind 4 emits them, so the tests below can assert
 * the *rendered* outcome (computed style) instead of the class string. Inlined
 * rather than loading the mantle stylesheet so the test stays hermetic; the
 * color is a literal so it doesn't depend on the theme being loaded.
 *
 * These selectors are a deliberate spelling pin on `list.tsx` / `primitive.tsx`:
 * if a utility there is renamed, this shim must be renamed with it.
 */
const TINT = "rgb(9, 105, 218)";
const STYLE = `
	.focus-visible\\:outline-hidden:focus-visible { outline-style: none; }
	.has-\\[\\:focus-visible\\]\\:bg-active-menu-item:has(:focus-visible) { background-color: ${TINT}; }
	.aria-disabled\\:pointer-events-none[aria-disabled="true"] { pointer-events: none; }
`;

let styleElement: HTMLStyleElement;
beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});
afterAll(() => {
	styleElement.remove();
});

/** The `role="listitem"` pill wrapping an item's control. */
function pillOf(control: HTMLElement): HTMLElement {
	const pill = control.closest("[data-slot='list-item']");
	if (!(pill instanceof HTMLElement)) {
		throw new Error("list item pill not found");
	}
	return pill;
}

const accounts = [
	{ id: "a", name: "Alpha", plan: "All Subscription" },
	{ id: "b", name: "Bravo", plan: "Enterprise Subscription" },
	{ id: "c", name: "Charlie", plan: "Free" },
];

function Harness() {
	const [activeId, setActiveId] = useState("a");
	return (
		<List.Root aria-label="Accounts" className="max-h-40">
			{accounts.map((account) => (
				<List.Item
					key={account.id}
					current={account.id === activeId}
					onClick={() => setActiveId(account.id)}
				>
					<List.ItemTitle>{account.name}</List.ItemTitle>
					<List.ItemDescription>{account.plan}</List.ItemDescription>
				</List.Item>
			))}
		</List.Root>
	);
}

describe("List (browser)", () => {
	test("renders a labeled list of clickable items", async () => {
		render(<Harness />);
		await screen.findByRole("button", { name: /Alpha/ });

		expect(screen.getByRole("list", { name: "Accounts" })).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(accounts.length);
	});

	test("clicking an item makes it current (drives the pill's selected state)", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const bravo = await screen.findByRole("button", { name: /Bravo/ });
		expect(bravo.closest("[data-slot='list-item']")).toHaveAttribute("data-state", "unselected");

		await user.click(bravo);
		expect(bravo.closest("[data-slot='list-item']")).toHaveAttribute("data-state", "selected");
	});

	test("asChild renders items as links", async () => {
		function LinkHarness() {
			return (
				<List.Root aria-label="Providers" className="max-h-40">
					{accounts.map((account) => (
						<List.Item key={account.id} asChild>
							<a href={`#${account.id}`}>
								<List.ItemTitle>{account.name}</List.ItemTitle>
							</a>
						</List.Item>
					))}
				</List.Root>
			);
		}
		render(<LinkHarness />);

		const link = await screen.findByRole("link", { name: /Bravo/ });
		expect(link).toHaveAttribute("href", "#b");
	});

	test("VirtualRoot windows the same Item children behind a labeled list", async () => {
		function VirtualHarness() {
			const [activeId, setActiveId] = useState("a");
			return (
				<List.VirtualRoot aria-label="Accounts" className="max-h-40">
					{accounts.map((account) => (
						<List.Item
							key={account.id}
							current={account.id === activeId}
							onClick={() => setActiveId(account.id)}
						>
							<List.ItemTitle>{account.name}</List.ItemTitle>
						</List.Item>
					))}
				</List.VirtualRoot>
			);
		}
		const user = userEvent.setup();
		render(<VirtualHarness />);

		expect(screen.getByRole("list", { name: "Accounts" })).toBeInTheDocument();
		const alpha = await screen.findByRole("button", { name: /Alpha/ });
		await user.click(alpha);
		expect(alpha.closest("[data-slot='list-item']")).toHaveAttribute("data-state", "selected");
	});

	test("ArrowUp/ArrowDown/Home/End move focus between items, skipping disabled ones", async () => {
		// Regression: arrow keys used to do nothing but scroll the viewport (and
		// flip the focused item's ring to :focus-visible).
		const user = userEvent.setup();
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>Item 0</List.Item>
				<List.Item onClick={() => {}}>Item 1</List.Item>
				<List.Item disabled>Item 2</List.Item>
				<List.Item onClick={() => {}}>Item 3</List.Item>
			</List.Root>,
		);

		const item = (name: string) => screen.getByRole("button", { name });
		item("Item 0").focus();

		await user.keyboard("{ArrowDown}");
		expect(item("Item 1")).toHaveFocus();

		// Skips the disabled item in both directions.
		await user.keyboard("{ArrowDown}");
		expect(item("Item 3")).toHaveFocus();
		await user.keyboard("{ArrowDown}");
		// No wrap — holds on the last enabled item.
		expect(item("Item 3")).toHaveFocus();
		await user.keyboard("{ArrowUp}");
		expect(item("Item 1")).toHaveFocus();

		await user.keyboard("{End}");
		expect(item("Item 3")).toHaveFocus();
		await user.keyboard("{Home}");
		expect(item("Item 0")).toHaveFocus();
	});

	test("arrow navigation skips a row that hosts no focusable control instead of dead-ending on it", async () => {
		// Regression: a static row (a bare divider, or an asChild link with no href)
		// was counted as a navigable index, so arrow nav targeted it, found no
		// control to focus, and silently stuck there — leaving every row past it
		// unreachable by the keyboard.
		const user = userEvent.setup();
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>Item 0</List.Item>
				{/* A static row with no focusable control (e.g. a visual divider):
				    asChild renders the bare span, so there's no button to focus. */}
				<List.Item asChild>
					<span>Divider</span>
				</List.Item>
				<List.Item onClick={() => {}}>Item 2</List.Item>
			</List.Root>,
		);

		screen.getByRole("button", { name: "Item 0" }).focus();
		await user.keyboard("{ArrowDown}");
		// Steps past the control-less middle row to the next real stop.
		expect(screen.getByRole("button", { name: "Item 2" })).toHaveFocus();
		await user.keyboard("{ArrowUp}");
		expect(screen.getByRole("button", { name: "Item 0" })).toHaveFocus();
	});

	test("Ctrl/Meta + Arrow is left to the browser, not hijacked into row navigation", async () => {
		// Regression: modifier chords (Ctrl+Home to jump to top of page, etc.) were
		// preventDefault-ed and reinterpreted as plain row moves.
		const user = userEvent.setup();
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>Item 0</List.Item>
				<List.Item onClick={() => {}}>Item 1</List.Item>
			</List.Root>,
		);

		screen.getByRole("button", { name: "Item 0" }).focus();
		await user.keyboard("{Control>}{ArrowDown}{/Control}");
		// Focus stays put — the chord belongs to the browser/OS.
		expect(screen.getByRole("button", { name: "Item 0" })).toHaveFocus();
	});

	test("a disabled asChild link cannot navigate or act, even on a programmatic click", async () => {
		// Regression: the disabled swallow ran in the bubble phase, after the
		// slotted child's own onClick (Radix Slot composes it first), so a
		// screen-reader / programmatic click still fired the child handler.
		let activated = 0;
		render(
			<List.Root aria-label="Providers">
				<List.Item asChild disabled>
					<a
						href="#nav"
						onClick={() => {
							activated += 1;
						}}
					>
						Disabled provider
					</a>
				</List.Item>
			</List.Root>,
		);

		const link = await screen.findByRole("link", { name: "Disabled provider" });
		// Hit-tested pointer input is blocked outright...
		expect(getComputedStyle(link).pointerEvents).toBe("none");
		// ...and a directly-dispatched click (assistive tech / `.click()`, which
		// bypasses hit testing) is swallowed too.
		link.click();
		expect(activated).toBe(0);
	});

	test("keyboard focus is conveyed by the pill tint, not a focus ring on the item", async () => {
		const user = userEvent.setup();
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>Item 0</List.Item>
				<List.Item onClick={() => {}}>Item 1</List.Item>
			</List.Root>,
		);

		const first = screen.getByRole("button", { name: "Item 0" });
		const second = screen.getByRole("button", { name: "Item 1" });
		first.focus();
		await user.keyboard("{ArrowDown}");

		expect(second).toHaveFocus();
		// The control draws no outline of its own (without the suppression the UA
		// paints its `auto` focus ring here)...
		expect(getComputedStyle(second).outlineStyle).toBe("none");
		// ...and the enclosing pill lights up instead, via the real `:focus-visible`
		// a keyboard move produces — only the focused row's pill.
		expect(pillOf(second).matches(":has(:focus-visible)")).toBe(true);
		expect(getComputedStyle(pillOf(second)).backgroundColor).toBe(TINT);
		expect(pillOf(first).matches(":has(:focus-visible)")).toBe(false);
		expect(getComputedStyle(pillOf(first)).backgroundColor).not.toBe(TINT);

		// The tint follows focus back up rather than sticking to the row it left.
		await user.keyboard("{ArrowUp}");
		expect(first).toHaveFocus();
		expect(getComputedStyle(pillOf(first)).backgroundColor).toBe(TINT);
		expect(getComputedStyle(pillOf(second)).backgroundColor).not.toBe(TINT);
	});

	test("arrow navigation crosses the virtual window (End mounts and focuses the last item)", async () => {
		const user = userEvent.setup();
		const manyAccounts = Array.from({ length: 50 }, (_unused, index) => `Account ${index}`);
		render(
			// Inline height so windowing is deterministic without the CSS bundle.
			<List.VirtualRoot aria-label="Accounts" style={{ height: 120, overflowY: "auto" }}>
				{manyAccounts.map((account) => (
					<List.Item key={account} onClick={() => {}}>
						{account}
					</List.Item>
				))}
			</List.VirtualRoot>,
		);
		// The virtualizer mounts nothing until it has measured the viewport.
		const firstItem = await screen.findByRole("button", { name: "Account 0" });

		// The last item isn't mounted under a small window.
		expect(screen.queryByRole("button", { name: "Account 49" })).not.toBeInTheDocument();

		firstItem.focus();
		await user.keyboard("{End}");
		// End scrolls + mounts the last item, then moves focus onto it.
		await waitFor(() => expect(screen.getByRole("button", { name: "Account 49" })).toHaveFocus());

		await user.keyboard("{ArrowUp}");
		await waitFor(() => expect(screen.getByRole("button", { name: "Account 48" })).toHaveFocus());
	});

	test("has no axe accessibility violations", async () => {
		const { container } = render(<Harness />);
		await screen.findByRole("button", { name: /Alpha/ });

		const results = await axe.run(container, {
			// Colors aren't themed in the test DOM, so contrast results are noise here.
			rules: { "color-contrast": { enabled: false } },
		});
		expect(results.violations).toEqual([]);
	});
});
