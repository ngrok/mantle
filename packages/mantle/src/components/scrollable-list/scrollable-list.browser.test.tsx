"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { ScrollableList } from "./scrollable-list.js";

const accounts = [
	{ id: "a", name: "Alpha", plan: "All Subscription" },
	{ id: "b", name: "Bravo", plan: "Enterprise Subscription" },
	{ id: "c", name: "Charlie", plan: "Free" },
];

function Harness() {
	const [activeId, setActiveId] = useState("a");
	return (
		<ScrollableList.Viewport aria-label="Accounts" className="max-h-40">
			{accounts.map((account) => (
				<ScrollableList.Item
					key={account.id}
					selected={account.id === activeId}
					onClick={() => setActiveId(account.id)}
				>
					<ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
					<ScrollableList.ItemDescription>{account.plan}</ScrollableList.ItemDescription>
				</ScrollableList.Item>
			))}
		</ScrollableList.Viewport>
	);
}

describe("ScrollableList (browser)", () => {
	test("renders a labeled list of clickable rows", async () => {
		render(<Harness />);
		await screen.findByRole("button", { name: /Alpha/ });

		expect(screen.getByRole("list", { name: "Accounts" })).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(accounts.length);
	});

	test("clicking a row selects it (drives the row's selected state)", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const bravo = await screen.findByRole("button", { name: /Bravo/ });
		expect(bravo.closest("[data-slot='list-row']")).toHaveAttribute("data-state", "unselected");

		await user.click(bravo);
		expect(bravo.closest("[data-slot='list-row']")).toHaveAttribute("data-state", "selected");
	});

	test("asChild renders rows as links", async () => {
		function LinkHarness() {
			return (
				<ScrollableList.Viewport aria-label="Providers" className="max-h-40">
					{accounts.map((account) => (
						<ScrollableList.Item key={account.id} asChild>
							<a href={`#${account.id}`}>
								<ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
							</a>
						</ScrollableList.Item>
					))}
				</ScrollableList.Viewport>
			);
		}
		render(<LinkHarness />);

		const link = await screen.findByRole("link", { name: /Bravo/ });
		expect(link).toHaveAttribute("href", "#b");
	});

	test("VirtualViewport windows the same Item children behind a labeled list", async () => {
		function VirtualHarness() {
			const [activeId, setActiveId] = useState("a");
			return (
				<ScrollableList.VirtualViewport aria-label="Accounts" className="max-h-40">
					{accounts.map((account) => (
						<ScrollableList.Item
							key={account.id}
							selected={account.id === activeId}
							onClick={() => setActiveId(account.id)}
						>
							<ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
						</ScrollableList.Item>
					))}
				</ScrollableList.VirtualViewport>
			);
		}
		const user = userEvent.setup();
		render(<VirtualHarness />);

		expect(screen.getByRole("list", { name: "Accounts" })).toBeInTheDocument();
		const alpha = await screen.findByRole("button", { name: /Alpha/ });
		await user.click(alpha);
		expect(alpha.closest("[data-slot='list-row']")).toHaveAttribute("data-state", "selected");
	});

	test("ArrowUp/ArrowDown/Home/End move focus between rows, skipping disabled ones", async () => {
		// Regression: arrow keys used to do nothing but scroll the viewport (and
		// flip the focused item's ring to :focus-visible).
		const user = userEvent.setup();
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item onClick={() => {}}>Item 0</ScrollableList.Item>
				<ScrollableList.Item onClick={() => {}}>Item 1</ScrollableList.Item>
				<ScrollableList.Item disabled>Item 2</ScrollableList.Item>
				<ScrollableList.Item onClick={() => {}}>Item 3</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);

		const item = (name: string) => screen.getByRole("button", { name });
		item("Item 0").focus();

		await user.keyboard("{ArrowDown}");
		expect(item("Item 1")).toHaveFocus();

		// Skips the disabled row in both directions.
		await user.keyboard("{ArrowDown}");
		expect(item("Item 3")).toHaveFocus();
		await user.keyboard("{ArrowDown}");
		// No wrap — holds on the last enabled row.
		expect(item("Item 3")).toHaveFocus();
		await user.keyboard("{ArrowUp}");
		expect(item("Item 1")).toHaveFocus();

		await user.keyboard("{End}");
		expect(item("Item 3")).toHaveFocus();
		await user.keyboard("{Home}");
		expect(item("Item 0")).toHaveFocus();
	});

	test("keyboard focus is conveyed by the row tint, not a focus ring on the item", async () => {
		const user = userEvent.setup();
		render(
			<ScrollableList.Viewport aria-label="Accounts">
				<ScrollableList.Item onClick={() => {}}>Item 0</ScrollableList.Item>
				<ScrollableList.Item onClick={() => {}}>Item 1</ScrollableList.Item>
			</ScrollableList.Viewport>,
		);

		screen.getByRole("button", { name: "Item 0" }).focus();
		await user.keyboard("{ArrowDown}");

		const focused = screen.getByRole("button", { name: "Item 1" });
		expect(focused).toHaveFocus();
		// The item suppresses its own ring/outline; the enclosing row lights up via
		// the has-[:focus-visible] tint instead (same treatment as hover).
		expect(focused.className).not.toContain("focus-visible:ring");
		expect(focused.className).toContain("focus-visible:outline-hidden");
		const row = focused.closest("[data-slot='list-row']");
		if (row == null) {
			throw new Error("row not found");
		}
		expect(row.matches(":has(:focus-visible)")).toBe(true);
		expect(row.className).toContain("has-[:focus-visible]:bg-active-menu-item");
	});

	test("arrow navigation crosses the virtual window (End mounts and focuses the last row)", async () => {
		const user = userEvent.setup();
		const manyAccounts = Array.from({ length: 50 }, (_unused, index) => `Account ${index}`);
		render(
			// Inline height so windowing is deterministic without the CSS bundle.
			<ScrollableList.VirtualViewport
				aria-label="Accounts"
				style={{ height: 120, overflowY: "auto" }}
			>
				{manyAccounts.map((account) => (
					<ScrollableList.Item key={account} onClick={() => {}}>
						{account}
					</ScrollableList.Item>
				))}
			</ScrollableList.VirtualViewport>,
		);
		// Let the virtualizer measure and mount the first window.
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		// The last row isn't mounted under a small window.
		expect(screen.queryByRole("button", { name: "Account 49" })).not.toBeInTheDocument();

		screen.getByRole("button", { name: "Account 0" }).focus();
		await user.keyboard("{End}");
		// End scrolls + mounts the last row, then moves focus onto it.
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
