"use client";

import { render, screen } from "@testing-library/react";
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
	test("virtualized rows render and clicking a row toggles its selection", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		// The whole row is a label, so the checkbox's accessible name is the row text.
		const apple = await screen.findByRole<HTMLInputElement>("checkbox", { name: /Apple/ });
		expect(apple.checked).toBe(false);

		await user.click(apple);
		expect(apple.checked).toBe(true);
	});

	test("filtering narrows the rendered rows", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		expect(await screen.findByRole("checkbox", { name: /Apple/ })).toBeInTheDocument();

		await user.type(screen.getByRole("textbox", { name: "Filter fruit" }), "Banana");

		expect(screen.queryByRole("checkbox", { name: /Apple/ })).not.toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: /Banana/ })).toBeInTheDocument();
	});

	test("clicking the row label (not just the box) toggles selection", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		// Click the description text inside the row label; native label forwarding toggles the box.
		await user.click(await screen.findByText("fruit-c"));
		expect(screen.getByRole<HTMLInputElement>("checkbox", { name: /Cherry/ }).checked).toBe(true);
	});

	test("renders a semantic list of listitems named by the viewport's aria-label", async () => {
		render(<Harness />);
		await screen.findByRole("checkbox", { name: /Apple/ });

		expect(screen.getByRole("list", { name: "Fruit" })).toBeInTheDocument();
		expect(screen.getAllByRole("listitem")).toHaveLength(options.length);
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

		// Custom content renders, and the composed Item still wires selection.
		expect(await screen.findByText("custom: fruit-a")).toBeInTheDocument();
		const apple = screen.getByRole<HTMLInputElement>("checkbox", { name: /Apple/ });
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

		const banana = await screen.findByRole<HTMLInputElement>("checkbox", { name: /Banana/ });
		expect(banana).toBeDisabled();

		await user.click(banana);
		expect(banana.checked).toBe(false);
	});

	test("has no axe accessibility violations", async () => {
		const { container } = render(<Harness />);
		await screen.findByRole("checkbox", { name: /Apple/ });

		const results = await axe.run(container, {
			// Colors aren't themed in the test DOM, so contrast results are noise here —
			// the markup/ARIA rules are what this asserts.
			rules: { "color-contrast": { enabled: false } },
		});

		expect(results.violations).toEqual([]);
	});
});
