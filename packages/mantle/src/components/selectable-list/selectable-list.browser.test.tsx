"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
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
	test("renders a labeled multi-select grid of rows; clicking the checkbox toggles selection", async () => {
		const user = userEvent.setup();
		render(<Harness />);

		// The grid is named by the viewport's aria-label; one row per option.
		const grid = await screen.findByRole("grid", { name: "Fruit" });
		expect(grid).toBeInTheDocument();
		// A multi-select grid must advertise multi-selection to assistive tech.
		expect(grid).toHaveAttribute("aria-multiselectable", "true");
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

	test("blurring the grid clears the active-row tint and aria-activedescendant", async () => {
		// Regression: the active index / tint / activedescendant were derived from
		// state that never reset, so a row stayed lit after focus left the grid.
		render(
			<>
				<button type="button">outside</button>
				<Harness />
			</>,
		);

		const grid = await screen.findByRole("grid", { name: "Fruit" });
		grid.focus();
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant"));
		const appleRow = screen.getByRole("checkbox", { name: "Apple" }).closest("[role='row']");
		expect(appleRow).toHaveAttribute("data-active");

		screen.getByRole("button", { name: "outside" }).focus();
		await waitFor(() => expect(grid).not.toHaveAttribute("aria-activedescendant"));
		expect(appleRow).not.toHaveAttribute("data-active");
	});

	test("clicking a disabled row does not arm the first enabled row", async () => {
		// Regression: a pointer press on a disabled row still focused the collection,
		// whose Tab-in default lit up the first enabled row the user never pointed at.
		const user = userEvent.setup();
		const withDisabled = [
			{ value: "a", label: "Apple" },
			{ value: "b", label: "Banana", description: "fruit-b", disabled: true },
		];
		function DisabledHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root options={withDisabled} value={selected} onValueChange={setSelected}>
					<SelectableList.Viewport aria-label="Fruit" />
				</SelectableList.Root>
			);
		}
		render(<DisabledHarness />);

		const grid = await screen.findByRole("grid", { name: "Fruit" });
		// Press the disabled row's bare content (not a control) — this focuses the grid.
		await user.click(screen.getByText("fruit-b"));
		expect(grid).not.toHaveAttribute("aria-activedescendant");
		expect(
			screen.getByRole("checkbox", { name: "Apple" }).closest("[role='row']"),
		).not.toHaveAttribute("data-active");
	});

	test("holding Space (auto-repeat) toggles the active row only once", async () => {
		// Regression: activation fired on every keydown with no event.repeat guard,
		// so holding the key flip-flopped the active row's selection.
		render(<Harness />);

		const grid = await screen.findByRole("grid", { name: "Fruit" });
		grid.focus();
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant"));

		const apple = screen.getByRole<HTMLInputElement>("checkbox", { name: "Apple" });
		fireEvent.keyDown(grid, { key: " " });
		expect(apple.checked).toBe(true);
		// Auto-repeats must be ignored, not toggle the row back off.
		fireEvent.keyDown(grid, { key: " ", repeat: true });
		fireEvent.keyDown(grid, { key: " ", repeat: true });
		expect(apple.checked).toBe(true);
	});

	test("encodes option values with whitespace into a valid, resolvable activedescendant id", async () => {
		function SpacedHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			// A value with whitespace would otherwise produce an invalid HTML id and an
			// aria-activedescendant IDREF the grid can't resolve.
			const spacedOptions = [{ value: "with space", label: "Spaced" }];
			return (
				<SelectableList.Root options={spacedOptions} value={selected} onValueChange={setSelected}>
					<SelectableList.Viewport aria-label="Spaced" />
				</SelectableList.Root>
			);
		}
		render(<SpacedHarness />);

		const grid = await screen.findByRole("grid", { name: "Spaced" });
		const checkbox = screen.getByRole("checkbox", { name: "Spaced" });
		// The checkbox id must be a single whitespace-free token so it is a valid IDREF.
		expect(checkbox.id).not.toMatch(/\s/);

		// Focusing the grid points aria-activedescendant at that id — the association holds.
		grid.focus();
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant", checkbox.id));
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

	test("Item composes a consumer onClick with the row's click-to-toggle", async () => {
		const user = userEvent.setup();
		const onItemClick = vi.fn<() => void>();
		function ComposeHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root options={options} value={selected} onValueChange={setSelected}>
					<SelectableList.Viewport aria-label="Fruit">
						{(option) => (
							<SelectableList.Item value={option.value} onClick={onItemClick}>
								<SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
								<span>bare: {option.description}</span>
							</SelectableList.Item>
						)}
					</SelectableList.Viewport>
				</SelectableList.Root>
			);
		}
		render(<ComposeHarness />);

		// Click bare row content (not the checkbox/label): the consumer handler runs
		// AND selection still toggles — the built-in onClick isn't silently replaced.
		await user.click(await screen.findByText("bare: fruit-a"));
		expect(onItemClick).toHaveBeenCalledOnce();
		expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Apple" }).checked).toBe(true);
	});

	test("a render-prop that drops a row keeps keyboard activation aligned with the visible rows", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(values: string[]) => void>();
		function SparseHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root
					options={options}
					value={selected}
					onValueChange={(next) => {
						onValueChange(next);
						setSelected(next);
					}}
				>
					<SelectableList.Viewport aria-label="Fruit">
						{/* Drop the middle option (Banana) — rendered rows are Apple, then Cherry. */}
						{(option) =>
							option.value === "b" ? null : (
								<SelectableList.Item value={option.value}>
									<SelectableList.ItemTitle>{option.label}</SelectableList.ItemTitle>
								</SelectableList.Item>
							)
						}
					</SelectableList.Viewport>
				</SelectableList.Root>
			);
		}
		render(<SparseHarness />);

		const grid = await screen.findByRole("grid", { name: "Fruit" });
		expect(screen.getAllByRole("row")).toHaveLength(2);
		expect(screen.queryByRole("checkbox", { name: "Banana" })).not.toBeInTheDocument();

		// Focus activates the first visible row (Apple); ArrowDown moves to the second
		// visible row (Cherry). Space must toggle Cherry — the row it visibly lands on —
		// not the dropped Banana that previously sat at that index.
		grid.focus();
		await user.keyboard("{ArrowDown}");
		await user.keyboard(" ");
		await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(["c"]));
		expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Cherry" }).checked).toBe(true);
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

	test("clicking bare row content makes that row active — a following Space toggles the same row", async () => {
		// Regression: clicking non-focusable content (the description) focuses the
		// grid directly, and the active row used to default to row 0 — so the click
		// toggled Cherry while Space then toggled Apple.
		const user = userEvent.setup();
		render(<Harness />);

		const cherry = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Cherry" });
		const apple = screen.getByRole<HTMLInputElement>("checkbox", { name: "Apple" });

		await user.click(screen.getByText("fruit-c"));
		expect(cherry.checked).toBe(true);

		const grid = screen.getByRole("grid", { name: "Fruit" });
		await waitFor(() => expect(grid).toHaveAttribute("aria-activedescendant", cherry.id));

		await user.keyboard(" ");
		expect(cherry.checked).toBe(false);
		expect(apple.checked).toBe(false);
	});

	test("keyboard navigation reveals the whole active row, not just its checkbox", async () => {
		// Regression: the plain grid's scrollToIndex used to scrollIntoView the
		// checkbox (the aria-activedescendant target), which could leave the taller
		// row partially clipped below the viewport edge.
		const user = userEvent.setup();
		const tallOptions = Array.from({ length: 20 }, (_unused, index) => ({
			value: `t${index}`,
			label: `Item ${index}`,
			description: `description ${index}`,
		}));
		function TallHarness() {
			const [selected, setSelected] = useState<string[]>([]);
			return (
				<SelectableList.Root options={tallOptions} value={selected} onValueChange={setSelected}>
					{/* Inline height so scrolling is deterministic without the CSS bundle. */}
					<SelectableList.Viewport aria-label="Tall" style={{ height: 150, overflowY: "auto" }} />
				</SelectableList.Root>
			);
		}
		render(<TallHarness />);

		const grid = await screen.findByRole("grid", { name: "Tall" });
		grid.focus();
		for (let step = 0; step < 6; step++) {
			await user.keyboard("{ArrowDown}");
		}

		const viewport = grid.closest("[data-slot='selectable-list-viewport']");
		const activeRow = document.querySelector("[role='row'][data-active]");
		if (viewport == null || activeRow == null) {
			throw new Error("viewport or active row not found");
		}
		const viewportRect = viewport.getBoundingClientRect();
		const rowRect = activeRow.getBoundingClientRect();
		expect(rowRect.top).toBeGreaterThanOrEqual(viewportRect.top - 1);
		expect(rowRect.bottom).toBeLessThanOrEqual(viewportRect.bottom + 1);
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
