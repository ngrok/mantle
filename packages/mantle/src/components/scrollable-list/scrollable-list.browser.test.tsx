"use client";

import { render, screen } from "@testing-library/react";
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
		<ScrollableList.Root aria-label="Accounts" className="max-h-40">
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
		</ScrollableList.Root>
	);
}

describe("ScrollableList (browser)", () => {
	test("renders a labeled list of virtualized clickable rows", async () => {
		render(<Harness />);
		await screen.findByRole("button", { name: /Alpha/ });

		expect(screen.getByRole("list", { name: "Accounts" })).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(accounts.length);
	});

	test("clicking a row selects it (drives the row's selected state)", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const bravo = await screen.findByRole("button", { name: /Bravo/ });
		expect(bravo.closest("li")).toHaveAttribute("data-state", "unselected");

		await user.click(bravo);
		expect(bravo.closest("li")).toHaveAttribute("data-state", "selected");
	});

	test("asChild renders rows as links", async () => {
		function LinkHarness() {
			return (
				<ScrollableList.Root aria-label="Providers" className="max-h-40">
					{accounts.map((account) => (
						<ScrollableList.Item key={account.id} asChild>
							<a href={`#${account.id}`}>
								<ScrollableList.ItemTitle>{account.name}</ScrollableList.ItemTitle>
							</a>
						</ScrollableList.Item>
					))}
				</ScrollableList.Root>
			);
		}
		render(<LinkHarness />);

		const link = await screen.findByRole("link", { name: /Bravo/ });
		expect(link).toHaveAttribute("href", "#b");
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
