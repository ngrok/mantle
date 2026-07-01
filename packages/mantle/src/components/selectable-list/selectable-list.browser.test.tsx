"use client";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { SelectableList } from "./selectable-list.js";

const options = [
	{ value: "a", label: "Apple", description: "fruit-a" },
	{ value: "b", label: "Banana", description: "fruit-b" },
	{ value: "c", label: "Cherry", description: "fruit-c" },
];

function Harness() {
	const [selected, setSelected] = useState<string[]>([]);
	return (
		<SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
			<SelectableList.Filter aria-label="Filter fruit" />
			<SelectableList.SelectAll>Select all</SelectableList.SelectAll>
			<SelectableList.Viewport aria-label="Fruit" className="max-h-40" />
			<SelectableList.Empty>No fruit found.</SelectableList.Empty>
		</SelectableList.Root>
	);
}

describe("SelectableList (browser)", () => {
	test("renders a labeled grid of rows; clicking the checkbox toggles selection", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		// The grid is named by the viewport's aria-label; one row per option.
		expect(await screen.findByRole("grid", { name: "Fruit" })).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(options.length);

		// The checkbox's accessible name is its title (Choice.Label), not the description.
		const apple = screen.getByRole<HTMLInputElement>("checkbox", { name: "Apple" });
		expect(apple.checked).toBe(false);
		await user.click(apple);
		expect(apple.checked).toBe(true);
	});

	test("rows expose grid selection state via aria-selected", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const banana = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Banana" });
		const row = banana.closest("[role='row']");
		expect(row).toHaveAttribute("aria-selected", "false");

		await user.click(banana);
		expect(row).toHaveAttribute("aria-selected", "true");
	});

	test("clicking bare row content (the description) toggles selection", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		// The description isn't a control or label, so the row's click-forwarder toggles.
		await user.click(await screen.findByText("fruit-c"));
		expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Cherry" }).checked).toBe(true);
	});

	test("Arrow keys drive aria-activedescendant across rows; Space toggles the active row", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		const grid = await screen.findByRole("grid", { name: "Fruit" });
		// aria-activedescendant resolves to the active row's checkbox id (the row
		// element, a Choice.Root, reserves `id` for the control).
		const checkboxId = (name: string) => screen.getByRole("checkbox", { name }).id;

		// Focusing the grid activates the first row (single tab stop + activedescendant).
		grid.focus();
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant", checkboxId("Apple")));

		await user.keyboard("{ArrowDown}");
		expect(grid).toHaveAttribute("aria-activedescendant", checkboxId("Banana"));

		// Space toggles the active row (Banana) — the checkbox never holds focus.
		await user.keyboard(" ");
		expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Banana" }).checked).toBe(true);

		await user.keyboard("{ArrowUp}");
		expect(grid).toHaveAttribute("aria-activedescendant", checkboxId("Apple"));
	});

	test("VirtualViewport arrow nav crosses the mounted window", async () => {
		const user = userEvent.setup();
		const manyOptions = Array.from({ length: 50 }, (_unused, index) => ({
			value: `v${index}`,
			label: `Item ${index}`,
		}));
		function VirtualHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root options={manyOptions} value={selected} onValueChange={setSelected}>
					{/* Inline height so windowing is deterministic without relying on the CSS bundle in the test env. */}
					<SelectableList.VirtualViewport
						aria-label="Items"
						style={{ height: 96, overflowY: "auto" }}
					/>
				</SelectableList.Root>
			);
		}
		render(<VirtualHarness />);

		const grid = await screen.findByRole("grid", { name: "Items" });
		// A far row isn't in the DOM under a small window.
		expect(screen.queryByRole("checkbox", { name: "Item 49" })).not.toBeInTheDocument();

		// End jumps the active index to the last row, which scrolls + mounts it.
		grid.focus();
		await user.keyboard("{End}");
		await waitFor(() =>
			expect(screen.getByRole("checkbox", { name: "Item 49" })).toBeInTheDocument(),
		);

		// Space toggles that active (previously off-screen) row.
		await user.keyboard(" ");
		await waitFor(() =>
			expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Item 49" }).checked).toBe(
				true,
			),
		);
	});

	test("filtering narrows the rendered rows", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		expect(await screen.findByRole("checkbox", { name: "Apple" })).toBeInTheDocument();

		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "Banana");

		expect(screen.queryByRole("checkbox", { name: "Apple" })).not.toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Banana" })).toBeInTheDocument();
	});

	test("supports custom row layout via the Viewport render-prop", async () => {
		const user = userEvent.setup();
		function CustomHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
					<SelectableList.Viewport aria-label="Fruit">
						{(option) => (
							<SelectableList.Item value={option.value}>
								<SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
								<span>custom: {option.description}</span>
							</SelectableList.Item>
						)}
					</SelectableList.Viewport>
				</SelectableList.Root>
			);
		}
		render(<CustomHarness />);

		expect(await screen.findByText("custom: fruit-a")).toBeInTheDocument();
		const apple = screen.getByRole<HTMLInputElement>("checkbox", { name: "Apple" });
		await user.click(apple);
		expect(apple.checked).toBe(true);
	});

	test("VirtualViewport renders the same grid, windowed", async () => {
		const user = userEvent.setup();
		function VirtualHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
					<SelectableList.VirtualViewport aria-label="Fruit" className="max-h-40" />
				</SelectableList.Root>
			);
		}
		render(<VirtualHarness />);

		expect(await screen.findByRole("grid", { name: "Fruit" })).toBeInTheDocument();
		const apple = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Apple" });
		await user.click(apple);
		expect(apple.checked).toBe(true);
	});

	test("a disabled option renders disabled and cannot be toggled", async () => {
		const user = userEvent.setup();
		function DisabledHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			const disabledOptions = [
				{ value: "a", label: "Apple" },
				{ value: "b", label: "Banana", disabled: true },
			];
			return (
				<SelectableList.Root options={disabledOptions} value={selected} onValueChange={setSelected}>
					<SelectableList.Viewport aria-label="Fruit" />
				</SelectableList.Root>
			);
		}
		render(<DisabledHarness />);

		const banana = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Banana" });
		expect(banana).toBeDisabled();

		await user.click(banana);
		expect(banana.checked).toBe(false);
	});

	test("has no axe accessibility violations", async () => {
		const { container } = render(<Harness />);
		await screen.findByRole("checkbox", { name: "Apple" });

		const results = await axe.run(container, {
			// Colors aren't themed in the test DOM, so contrast results are noise here —
			// the markup/ARIA rules are what this asserts.
			rules: { "color-contrast": { enabled: false } },
		});

		expect(results.violations).toEqual([]);
	});
});
