"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { List } from "./list.js";

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

	test("keyboard focus is conveyed by the pill tint, not a focus ring on the item", async () => {
		const user = userEvent.setup();
		render(
			<List.Root aria-label="Accounts">
				<List.Item onClick={() => {}}>Item 0</List.Item>
				<List.Item onClick={() => {}}>Item 1</List.Item>
			</List.Root>,
		);

		screen.getByRole("button", { name: "Item 0" }).focus();
		await user.keyboard("{ArrowDown}");

		const focused = screen.getByRole("button", { name: "Item 1" });
		expect(focused).toHaveFocus();
		// The control suppresses its own ring/outline; the enclosing pill lights up
		// via the has-[:focus-visible] tint instead (same treatment as hover).
		expect(focused.className).not.toContain("focus-visible:ring");
		expect(focused.className).toContain("focus-visible:outline-hidden");
		const pill = focused.closest("[data-slot='list-item']");
		if (pill == null) {
			throw new Error("list item pill not found");
		}
		expect(pill.matches(":has(:focus-visible)")).toBe(true);
		expect(pill.className).toContain("has-[:focus-visible]:bg-active-menu-item");
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
		// Let the virtualizer measure and mount the first window.
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		// The last item isn't mounted under a small window.
		expect(screen.queryByRole("button", { name: "Account 49" })).not.toBeInTheDocument();

		screen.getByRole("button", { name: "Account 0" }).focus();
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
