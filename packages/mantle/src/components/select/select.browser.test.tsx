"use client";

import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, userEvent } from "vitest/browser";
import * as Dialog from "../dialog/dialog-parts.js";
import * as Select from "./select-parts.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the one utility the wrapper spans carry,
 * plus a consumer override in the shape product code uses on the trigger
 * (`[&>span]:flex [&>span]:gap-2`) to lay the value out as a row. Inlined so
 * the test stays hermetic and needs no Tailwind build step.
 */
const STYLE = `
@layer utilities {
	.contents { display: contents; }
}
[data-slot~="select-value"] { display: flex; align-items: center; gap: 8px; }
[data-slot~="select-trigger"] { display: flex; align-items: center; gap: 8px; }
`;

const GAP = 8;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

/** The horizontal distance between two elements laid out in a row. */
function horizontalDistance(left: Element, right: Element) {
	return right.getBoundingClientRect().left - left.getBoundingClientRect().right;
}

/** The wrapper span the test is about, found by its slot inside the trigger. */
function wrapper(slot: string) {
	const element = screen.getByRole("combobox").querySelector(`[data-slot="${slot}"]`);
	if (element == null) {
		throw new Error(`No element carries data-slot="${slot}".`);
	}
	return element;
}

describe("Select wrapper span layout", () => {
	test("a consumer's children inside Select.Value stay flex items of the value node", async () => {
		render(
			<Select.Root value="apple">
				<Select.Trigger>
					<Select.Value placeholder="Select a fruit">
						<span data-testid="name">Apple</span>
						<span data-testid="hint">fruit</span>
					</Select.Value>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		// The proof that the label span generates no box: both children are flex
		// items of the value node, so its `gap` separates them. With a box on the
		// span they would be one inline run, laid out flush at 0px.
		expect(
			horizontalDistance(await screen.findByTestId("name"), screen.getByTestId("hint")),
		).toBeCloseTo(GAP, 0);
		expect(wrapper("select-value-label").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-value-label")).display).toBe("contents");
	});

	test("the portaled item label keeps the item's children as flex items of the value node", async () => {
		render(
			<Select.Root defaultValue="apple">
				<Select.Trigger>
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">
						<span data-testid="name">Apple</span>
						<span data-testid="hint">fruit</span>
					</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		// Radix portals the label span into the value node, so the same contract
		// holds for the copy the trigger shows.
		const name = await screen.findByTestId("name");
		expect(horizontalDistance(name, screen.getByTestId("hint"))).toBeCloseTo(GAP, 0);
		expect(wrapper("select-item-label").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-item-label")).display).toBe("contents");
	});

	test("the trigger label span generates no box, so a consumer's children stay flex items of the trigger", () => {
		render(
			<Select.Root>
				<Select.Trigger>
					<span data-testid="name">Provider</span>
					<span data-testid="hint">required</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="openai">OpenAI</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		// Same proof as the value node: both children are flex items of the
		// trigger, so its `gap` separates them. With a box on the span they would
		// be one inline run, laid out flush at 0px.
		expect(horizontalDistance(screen.getByTestId("name"), screen.getByTestId("hint"))).toBeCloseTo(
			GAP,
			0,
		);
		expect(wrapper("select-trigger-label").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-trigger-label")).display).toBe("contents");
	});

	test("the placeholder span generates no box", () => {
		render(
			<Select.Root>
				<Select.Trigger>
					<Select.Value placeholder="Select a fruit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>,
		);

		expect(wrapper("select-placeholder").getClientRects()).toHaveLength(0);
		expect(getComputedStyle(wrapper("select-placeholder")).display).toBe("contents");
	});
});

const fruits = ["Apple", "Banana", "Blueberry", "Cherry", "Carrot"];

const FruitSelect = ({ onValueChange }: { onValueChange?: (value: string) => void }) => (
	<form aria-label="fruit form">
		<label htmlFor="fruit">Fruit</label>
		<Select.Root id="fruit" name="fruit" defaultValue="banana" onValueChange={onValueChange}>
			<Select.Trigger>
				<Select.Value placeholder="Pick a fruit" />
			</Select.Trigger>
			<Select.Content>
				{fruits.map((fruit) => (
					<Select.Item key={fruit} value={fruit.toLowerCase()} disabled={fruit === "Blueberry"}>
						{fruit}
					</Select.Item>
				))}
			</Select.Content>
		</Select.Root>
		<button type="button">After</button>
	</form>
);

const activeOption = (owner: HTMLElement) => {
	const id = owner.getAttribute("aria-activedescendant");
	return id == null ? null : document.getElementById(id);
};

const axeViolations = async () => {
	// Why WCAG tags only: `region` is a best practice for whole pages, and a test page has no landmarks.
	// Why no `target-size`: the test page loads no Tailwind, so an option is one bare line
	// of text. The styled option is 32px tall.
	const results = await axe.run(document.body, {
		resultTypes: ["violations"],
		rules: { "target-size": { enabled: false } },
		runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
	});
	return results.violations.map((violation) => violation.id);
};

describe("Select keyboard, focus, and ARIA contract", () => {
	test("an option under a group label stays live and clickable", async () => {
		render(
			<Select.Root>
				<Select.Trigger aria-label="Fruit">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Fruits</Select.Label>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Group>
				</Select.Content>
			</Select.Root>,
		);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		await userEvent.click(trigger);
		const apple = await screen.findByRole("option", { name: "Apple" });
		expect(apple.closest("[inert]")).toBeNull();
		await userEvent.click(apple);
		expect(trigger).toHaveTextContent("Apple");
	});
	test("keyboard opens on the selected option, moves, skips disabled, and picks with focus on the trigger", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<FruitSelect onValueChange={onValueChange} />);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveTextContent("Banana");

		trigger.focus();
		await userEvent.keyboard("{ArrowDown}");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		const listbox = screen.getByRole("listbox");
		expect(trigger).toHaveAttribute("aria-controls", listbox.id);
		expect(activeOption(trigger)).toHaveTextContent("Banana");
		expect(screen.getByRole("option", { name: "Banana" })).toHaveAttribute("aria-selected", "true");
		expect(document.activeElement).toBe(trigger);

		// Blueberry is disabled, so the next option after Banana is Cherry.
		await userEvent.keyboard("{ArrowDown}");
		expect(activeOption(trigger)).toHaveTextContent("Cherry");
		await userEvent.keyboard("{End}");
		expect(activeOption(trigger)).toHaveTextContent("Carrot");
		await userEvent.keyboard("{Home}");
		expect(activeOption(trigger)).toHaveTextContent("Apple");

		await userEvent.keyboard("{Enter}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
		expect(trigger).toHaveTextContent("Apple");
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith("apple");
		expect(document.activeElement).toBe(trigger);
		const form = screen.getByRole("form", { name: "fruit form" });
		expect(form instanceof HTMLFormElement && new FormData(form).get("fruit")).toBe("apple");
	});

	test("the list opens in the top layer and scrolls the highlighted option into view", async () => {
		const fruits = Array.from({ length: 40 }, (_, index) => `Fruit ${index}`);
		render(
			<Select.Root defaultValue="Fruit 30">
				<Select.Trigger aria-label="Fruit" />
				{/* Why the style: this page loads no Tailwind, and the real classes cap the list the same way. */}
				<Select.Content style={{ maxHeight: 120, overflowY: "auto", boxSizing: "border-box" }}>
					{fruits.map((fruit) => (
						<Select.Item key={fruit} value={fruit}>
							{fruit}
						</Select.Item>
					))}
				</Select.Content>
			</Select.Root>,
		);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		const inView = (option: HTMLElement) => {
			const list = screen.getByRole("listbox").getBoundingClientRect();
			const box = option.getBoundingClientRect();
			return box.top >= list.top - 0.5 && box.bottom <= list.bottom + 0.5;
		};
		await userEvent.click(trigger);
		expect(screen.getByRole("listbox").matches(":popover-open")).toBe(true);
		expect(inView(screen.getByRole("option", { name: "Fruit 30" }))).toBe(true);
		await userEvent.keyboard("{Home}");
		expect(inView(screen.getByRole("option", { name: "Fruit 0" }))).toBe(true);
		await userEvent.keyboard("{End}");
		expect(inView(screen.getByRole("option", { name: "Fruit 39" }))).toBe(true);
	});

	test("typeahead opens a closed select, matches a prefix, and cycles on a repeated letter", async () => {
		render(<FruitSelect />);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		trigger.focus();
		await userEvent.keyboard("c");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(activeOption(trigger)).toHaveTextContent("Cherry");
		await userEvent.keyboard("c");
		expect(activeOption(trigger)).toHaveTextContent("Carrot");
	});

	test("typeahead skips a disabled option", async () => {
		render(<FruitSelect />);
		screen.getByRole("combobox", { name: "Fruit" }).focus();
		await userEvent.keyboard("{Home}bl");
		// "bl" matches only Blueberry, which is disabled, so the highlight stays on Banana.
		expect(activeOption(screen.getByRole("combobox", { name: "Fruit" }))).toHaveTextContent(
			"Banana",
		);
	});

	test("Escape and an outside press close without a change", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<FruitSelect onValueChange={onValueChange} />);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		await userEvent.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{ArrowDown}");
		expect(activeOption(trigger)).toHaveRole("option");
		await userEvent.keyboard("{Escape}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).not.toHaveAttribute("aria-activedescendant");
		await userEvent.click(trigger);
		await userEvent.click(document.body);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		// Why: as with a native select and 0.94.1, a press on blank space keeps focus on the trigger.
		expect(trigger).toHaveFocus();
		expect(onValueChange).toHaveBeenCalledTimes(0);
	});

	test("the open list leaves the page live, keeps focus on Tab, and eats the click that closes it", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		const onOutside = vi.fn<() => void>();
		render(
			<>
				{/* Why first: the list opens below the trigger and would cover a later button. */}
				<button type="button" onClick={onOutside}>
					Outside
				</button>
				<FruitSelect onValueChange={onValueChange} />
			</>,
		);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		const outside = screen.getByRole("button", { name: "Outside" });
		trigger.focus();
		await userEvent.keyboard("{ArrowDown}{ArrowDown}{Tab}");
		expect(document.activeElement).toBe(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(onValueChange).toHaveBeenCalledTimes(0);
		expect(document.documentElement.style.overflow).toBe("");
		expect(document.querySelector("[inert]")).toBeNull();

		await userEvent.keyboard("{Enter}");
		expect(onValueChange).toHaveBeenLastCalledWith("cherry");

		// Why: as with a native select, the press that closes the list does not reach the page.
		await userEvent.click(trigger);
		await userEvent.click(outside);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(onOutside).toHaveBeenCalledTimes(0);
		await userEvent.click(outside);
		expect(onOutside).toHaveBeenCalledTimes(1);
	});

	test("an outside press that makes no click, or keeps focus, leaves later clicks alone", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		const onKeep = vi.fn<() => void>();
		const onNext = vi.fn<() => void>();
		render(
			<>
				{/* Why first: the list opens below the trigger and would cover a later button. */}
				<button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onKeep}>
					Keep focus
				</button>
				<button type="button" onClick={onNext}>
					Next
				</button>
				<FruitSelect onValueChange={onValueChange} />
			</>,
		);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		const keep = screen.getByRole("button", { name: "Keep focus" });

		// A secondary press arms nothing, so a keyboard pick after it still picks.
		await userEvent.click(trigger);
		await userEvent.pointer({ keys: "[MouseRight]", target: keep });
		trigger.focus();
		await userEvent.keyboard("{Escape}{ArrowDown}{ArrowDown}{Enter}");
		expect(onValueChange).toHaveBeenLastCalledWith("cherry");

		// A press that keeps focus on the trigger still closes the list, and its click stays eaten.
		await userEvent.click(trigger);
		await userEvent.click(keep);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(onKeep).toHaveBeenCalledTimes(0);

		// A keyboard click never meets the guard.
		screen.getByRole("button", { name: "Next" }).focus();
		await userEvent.keyboard("{Enter}");
		expect(onNext).toHaveBeenCalledTimes(1);
	});

	test("a pointer press on an option picks it", async () => {
		const onValueChange = vi.fn<(value: string) => void>();
		render(<FruitSelect onValueChange={onValueChange} />);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		await userEvent.click(screen.getByRole("option", { name: "Carrot" }));
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith("carrot");
		expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Carrot");
	});

	test("inside a Dialog, the first Escape closes only the select and the second closes the dialog", async () => {
		render(
			<Dialog.Root defaultOpen>
				<Dialog.Content>
					<Dialog.Title>Settings</Dialog.Title>
					<FruitSelect />
				</Dialog.Content>
			</Dialog.Root>,
		);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });
		await userEvent.click(trigger);
		expect(screen.getByRole("listbox")).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeInTheDocument();
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("dialog", { name: "Settings" })).not.toBeInTheDocument();
	});

	test("an open list that a dialog covers waits until the dialog closes", async () => {
		const { rerender } = render(
			<>
				<Select.Root open onOpenChange={() => {}}>
					<Select.Trigger aria-label="Fruit" />
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>
				<Dialog.Root open>
					<Dialog.Content>
						<Dialog.Title>Settings</Dialog.Title>
					</Dialog.Content>
				</Dialog.Root>
			</>,
		);
		expect(await screen.findByRole("dialog", { name: "Settings" })).toBeInTheDocument();
		expect(screen.queryByRole("listbox", { hidden: true })).not.toBeInTheDocument();
		rerender(
			<Select.Root open onOpenChange={() => {}}>
				<Select.Trigger aria-label="Fruit" />
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>,
		);
		expect(await screen.findByRole("listbox")).toBeInTheDocument();
	});

	test("the open list hides its scrollbar and stops overscroll", async () => {
		// Why the compiled CSS: this page loads no Tailwind, and the test checks the real utilities.
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./select.tsx");
		document.head.append(style);
		try {
			render(
				<Select.Root>
					<Select.Trigger aria-label="Fruit" />
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>,
			);
			await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
			const list = await screen.findByRole("listbox");
			expect(getComputedStyle(list)).toMatchObject({
				overflowY: "auto",
				overscrollBehaviorY: "none",
				scrollbarWidth: "none",
			});
		} finally {
			style.remove();
		}
	});

	// Why: the trigger acts like a button. Only keyboard use shows the ring, and the
	// trigger keeps DOM focus while the list is open.
	test("the trigger shows the focus ring for keyboard use only, open or closed", async () => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./select.tsx");
		document.head.append(style);
		try {
			render(<FruitSelect />);
			const trigger = screen.getByRole("combobox", { name: "Fruit" });
			const hasRing = () => getComputedStyle(trigger).boxShadow.includes(" 4px");

			await userEvent.click(trigger);
			expect(trigger).toHaveAttribute("aria-expanded", "true");
			expect(hasRing()).toBe(false);

			await userEvent.keyboard("{ArrowDown}");
			expect(trigger).toHaveFocus();
			expect(hasRing()).toBe(true);

			await userEvent.keyboard("{Escape}");
			await userEvent.click(screen.getByRole("button", { name: "After" }));
			await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
			expect(trigger).toHaveFocus();
			expect(trigger).toHaveAttribute("aria-expanded", "false");
			expect(hasRing()).toBe(true);
		} finally {
			style.remove();
		}
	});

	test("a failed required check after a mouse submit lands on the trigger with the ring", async () => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss("./select.tsx");
		document.head.append(style);
		try {
			render(
				<form aria-label="fruit form" onSubmit={(event) => event.preventDefault()}>
					<Select.Root name="fruit" required>
						<Select.Trigger aria-label="Fruit" />
						<Select.Content>
							<Select.Item value="apple">Apple</Select.Item>
						</Select.Content>
					</Select.Root>
					<button type="submit">Submit</button>
				</form>,
			);
			const trigger = screen.getByRole("combobox", { name: "Fruit" });
			await userEvent.click(screen.getByRole("button", { name: "Submit" }));

			expect(trigger).toHaveFocus();
			expect(getComputedStyle(trigger).boxShadow).toContain(" 4px");
		} finally {
			style.remove();
		}
	});

	test("has no axe violations closed or open", async () => {
		render(<FruitSelect />);
		expect(await axeViolations()).toEqual([]);
		await userEvent.click(screen.getByRole("combobox", { name: "Fruit" }));
		expect(await axeViolations()).toEqual([]);
	});
});
