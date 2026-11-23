import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { commands, userEvent as browserUser } from "vitest/browser";
import * as Popover from "../popover/popover-parts.js";
import * as DropdownMenu from "./dropdown-menu-parts.js";

/**
 * Mirrors the CSS Tailwind 4 emits for the one utility every item's label span
 * carries. Inlined so the test stays hermetic and needs no Tailwind build step:
 * a browser test loads no stylesheet, so without this the wrapper would report
 * its initial `display` and the assertion would pass for the wrong reason.
 */
const MENU_LAYOUT_STYLE = `
@layer utilities {
	.contents { display: contents; }
}
`;

/** The three parts that wrap the label a consumer passes. */
const wrappedParts = [
	{ slot: "dropdown-menu-sub-trigger", text: "Share" },
	{ slot: "dropdown-menu-checkbox-item", text: "Errors" },
	{ slot: "dropdown-menu-radio-item", text: "Small" },
] as const;

describe("DropdownMenu label slots (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = MENU_LAYOUT_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test.each(wrappedParts)("$slot's label span generates no box", ({ slot, text }) => {
		render(
			<DropdownMenu.Root open modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub open>
						<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Copy link</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.CheckboxItem checked>Errors</DropdownMenu.CheckboxItem>
					<DropdownMenu.RadioGroup value="small">
						<DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);

		const label = document.querySelector(`[data-slot="${slot}-label"]`);
		if (label == null) {
			throw new Error(`No element carries data-slot="${slot}-label".`);
		}

		expect(label).toHaveTextContent(text);
		expect(getComputedStyle(label).display).toBe("contents");
		expect(label.getClientRects()).toHaveLength(0);
	});
});

/** A menu with a submenu, a disabled item, and items that typeahead can tell apart. */
function FruitMenu({
	modal,
	onSelect,
	onCloseAutoFocus,
}: {
	modal?: boolean;
	onSelect?: (event: Event) => void;
	onCloseAutoFocus?: (event: Event) => void;
}) {
	return (
		<>
			<DropdownMenu.Root modal={modal}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content onCloseAutoFocus={onCloseAutoFocus}>
					<DropdownMenu.Item onSelect={onSelect}>Apple</DropdownMenu.Item>
					<DropdownMenu.Item disabled>Avocado</DropdownMenu.Item>
					<DropdownMenu.Item>Banana</DropdownMenu.Item>
					<DropdownMenu.Item>Blueberry</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item onSelect={onSelect}>Cherry</DropdownMenu.Item>
							<DropdownMenu.Item>Date</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<button type="button">Outside</button>
		</>
	);
}

const item = (name: string) => screen.getByRole("menuitem", { name });

describe("DropdownMenu keyboard (browser)", () => {
	test("ArrowDown on the trigger opens the menu on its first item, ArrowUp on its last", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		const trigger = screen.getByRole("button", { name: "Open" });
		trigger.focus();

		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Apple")).toHaveFocus());

		await user.keyboard("{Escape}");
		await waitFor(() => expect(trigger).toHaveFocus());
		await user.keyboard("{ArrowUp}");
		await waitFor(() => expect(item("More")).toHaveFocus());
	});

	test("arrow keys skip a disabled item, and Home and End move to the ends", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Apple")).toHaveFocus());

		await user.keyboard("{ArrowDown}");
		expect(item("Banana")).toHaveFocus();
		await user.keyboard("{End}");
		expect(item("More")).toHaveFocus();
		await user.keyboard("{Home}");
		expect(item("Apple")).toHaveFocus();
	});

	test("typeahead moves to the next match and steps through items on a repeated letter", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Apple")).toHaveFocus());

		await user.keyboard("b");
		expect(item("Banana")).toHaveFocus();
		await user.keyboard("b");
		expect(item("Blueberry")).toHaveFocus();
	});

	test("Escape closes the menu and returns focus to the trigger", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		await screen.findByRole("menu");

		await user.keyboard("{Escape}");

		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("onCloseAutoFocus can keep focus from returning to the trigger", async () => {
		const user = userEvent.setup();
		render(<FruitMenu onCloseAutoFocus={(event) => event.preventDefault()} />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		await screen.findByRole("menu");

		await user.keyboard("{Escape}");

		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
		expect(trigger).not.toHaveFocus();
	});
});

describe("DropdownMenu submenus (browser)", () => {
	test("ArrowRight opens a submenu on its first item and ArrowLeft returns to its trigger", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowUp}");
		await waitFor(() => expect(item("More")).toHaveFocus());

		await user.keyboard("{ArrowRight}");
		await waitFor(() => expect(item("Cherry")).toHaveFocus());
		expect(item("More")).toHaveAttribute("aria-expanded", "true");
		// The submenu takes its name from its trigger.
		expect(screen.getByRole("menu", { name: "More" })).toContainElement(item("Cherry"));

		await user.keyboard("{ArrowLeft}");
		await waitFor(() => expect(item("More")).toHaveFocus());
		expect(item("More")).toHaveAttribute("aria-expanded", "false");
	});

	test("Escape in a submenu closes the whole menu", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		const trigger = screen.getByRole("button", { name: "Open" });
		trigger.focus();
		await user.keyboard("{ArrowUp}{ArrowRight}");
		await waitFor(() => expect(item("Cherry")).toHaveFocus());

		await user.keyboard("{Escape}");

		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("a pointer that rests on a sub-trigger opens its submenu", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		await user.click(screen.getByRole("button", { name: "Open" }));
		await screen.findByRole("menu");

		await user.hover(item("More"));

		await waitFor(() => expect(item("More")).toHaveAttribute("aria-expanded", "true"));
		expect(await screen.findByRole("menuitem", { name: "Cherry" })).toBeVisible();
	});

	test("selecting an item in a submenu fires onSelect and closes the whole menu", async () => {
		const user = userEvent.setup();
		const selected: string[] = [];
		render(<FruitMenu onSelect={(event) => selected.push(event.type)} />);
		const trigger = screen.getByRole("button", { name: "Open" });
		trigger.focus();
		await user.keyboard("{ArrowUp}{ArrowRight}");
		await waitFor(() => expect(item("Cherry")).toHaveFocus());

		await user.keyboard("{Enter}");

		expect(selected).toHaveLength(1);
		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
		expect(trigger).toHaveFocus();
	});
});

describe("DropdownMenu selection (browser)", () => {
	test("onSelect calling preventDefault keeps the menu open", async () => {
		const user = userEvent.setup();
		render(<FruitMenu onSelect={(event) => event.preventDefault()} />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);

		await user.click(await screen.findByRole("menuitem", { name: "Apple" }));

		expect(trigger).toHaveAttribute("aria-expanded", "true");
	});

	test("an uncontrolled CheckboxItem toggles and reports through onCheckedChange", async () => {
		const user = userEvent.setup();
		const changes: Array<boolean | "indeterminate"> = [];
		render(
			<DropdownMenu.Root defaultOpen>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem onCheckedChange={(checked) => changes.push(checked)}>
						Errors
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const checkbox = await screen.findByRole("menuitemcheckbox", { name: "Errors" });
		expect(checkbox).toHaveAttribute("aria-checked", "false");

		await user.click(checkbox);

		expect(changes).toEqual([true]);
	});

	test("a CheckboxItem that is indeterminate reports mixed and checks on select", async () => {
		const user = userEvent.setup();
		const changes: Array<boolean | "indeterminate"> = [];
		render(
			<DropdownMenu.Root defaultOpen>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem
						checked="indeterminate"
						onCheckedChange={(checked) => changes.push(checked)}
						onSelect={(event) => event.preventDefault()}
					>
						All
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const checkbox = await screen.findByRole("menuitemcheckbox", { name: "All" });
		expect(checkbox).toHaveAttribute("aria-checked", "mixed");

		await user.click(checkbox);

		expect(changes).toEqual([true]);
		// Why still mixed: the item is controlled, so only the owner changes it.
		expect(checkbox).toHaveAttribute("aria-checked", "mixed");
	});

	test("an uncontrolled RadioGroup moves its check and reports only a new value", async () => {
		const user = userEvent.setup();
		const changes: string[] = [];
		render(
			<DropdownMenu.Root defaultOpen>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.RadioGroup
						defaultValue="small"
						onValueChange={(value) => changes.push(value)}
					>
						<DropdownMenu.RadioItem value="small" onSelect={(event) => event.preventDefault()}>
							Small
						</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem value="large" onSelect={(event) => event.preventDefault()}>
							Large
						</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const small = await screen.findByRole("menuitemradio", { name: "Small" });
		const large = screen.getByRole("menuitemradio", { name: "Large" });
		expect(small).toHaveAttribute("aria-checked", "true");

		await user.click(small);
		await user.click(large);

		expect(changes).toEqual(["large"]);
		expect(large).toHaveAttribute("aria-checked", "true");
		expect(small).toHaveAttribute("aria-checked", "false");
	});
});

describe("DropdownMenu modal (browser)", () => {
	test("a modal menu makes the rest of the page inert while it is open", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		await user.click(screen.getByRole("button", { name: "Open" }));
		await screen.findByRole("menu");

		const outside = screen.getByRole("button", { name: "Outside" });
		expect(outside.closest("[inert]")).not.toBeNull();

		await user.keyboard("{Escape}");
		await waitFor(() => expect(outside.closest("[inert]")).toBeNull());
	});

	test("a menu with modal={false} leaves the page interactive", async () => {
		const user = userEvent.setup();
		render(<FruitMenu modal={false} />);
		await user.click(screen.getByRole("button", { name: "Open" }));
		await screen.findByRole("menu");

		expect(screen.getByRole("button", { name: "Outside" }).closest("[inert]")).toBeNull();
	});

	test("a pointer down outside closes the menu and leaves focus where it lands", async () => {
		const user = userEvent.setup();
		render(<FruitMenu modal={false} />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		await screen.findByRole("menu");

		await user.click(screen.getByRole("button", { name: "Outside" }));

		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
		expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();
	});

	test("a Popover opened from a menu item takes keyboard focus and input", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<Popover.Root>
						<Popover.Trigger asChild>
							<DropdownMenu.Item onSelect={(event) => event.preventDefault()}>
								Rename
							</DropdownMenu.Item>
						</Popover.Trigger>
						<Popover.Content>
							<input aria-label="Name" />
						</Popover.Content>
					</Popover.Root>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Open" }));
		await user.click(await screen.findByRole("menuitem", { name: "Rename" }));
		const input = await screen.findByRole("textbox", { name: "Name" });

		await user.click(input);
		await user.keyboard("bb");

		expect(input).toHaveFocus();
		expect(input).toHaveValue("bb");
	});
});

/** The box of the menu that holds `element`. */
function menuBoxOf(element: HTMLElement): DOMRect {
	const menu = element.closest("[role='menu']");
	if (menu == null) {
		throw new Error("The element is not in a menu.");
	}
	return menu.getBoundingClientRect();
}

describe("DropdownMenu parity with Radix (browser)", () => {
	test("Content and SubContent with asChild render the menu on the child and forward the ref", async () => {
		const user = userEvent.setup();
		let content: HTMLElement | null = null;
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content
					asChild
					ref={(node: HTMLElement | null) => {
						content = node;
					}}
				>
					<section data-testid="content">
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent asChild>
								<section data-testid="sub-content">
									<DropdownMenu.Item>Nested</DropdownMenu.Item>
								</section>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</section>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("More")).toHaveFocus());
		expect(screen.getByTestId("content")).toHaveAttribute("role", "menu");
		expect(content).toBe(screen.getByTestId("content"));

		await user.keyboard("{ArrowRight}");
		await waitFor(() => expect(item("Nested")).toHaveFocus());
		expect(screen.getByTestId("sub-content")).toHaveAttribute("role", "menu");
	});

	test("keyboard focus scrolls the item into the visible menu", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content style={{ maxHeight: 90, overflowY: "auto", width: 180 }}>
					{Array.from({ length: 20 }, (_, index) => (
						<DropdownMenu.Item key={index} style={{ height: 30 }}>
							Item {index}
						</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Item 0")).toHaveFocus());

		await user.keyboard("{End}");

		await waitFor(() => expect(item("Item 19")).toHaveFocus());
		const menu = screen.getByRole("menu");
		expect(menu.scrollTop).toBeGreaterThan(0);
		expect(item("Item 19").getBoundingClientRect().bottom).toBeLessThanOrEqual(
			menu.getBoundingClientRect().bottom,
		);
	});

	test("a space in a typeahead search does not open a submenu", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>Alpha</DropdownMenu.Item>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>Save project</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Project option</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>Save workspace</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Workspace option</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Alpha")).toHaveFocus());

		await user.keyboard("save w");

		expect(item("Save project")).toHaveAttribute("aria-expanded", "false");
		await waitFor(() => expect(item("Save workspace")).toHaveFocus());
	});

	test("closing the menu closes a controlled Sub through onOpenChange", async () => {
		const user = userEvent.setup();
		function Fixture() {
			const [subOpen, setSubOpen] = useState(false);
			return (
				<>
					<output data-testid="sub-open">{String(subOpen)}</output>
					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Sub open={subOpen} onOpenChange={setSubOpen}>
								<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent>
									<DropdownMenu.Item>Nested</DropdownMenu.Item>
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</>
			);
		}
		render(<Fixture />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(item("Nested")).toHaveFocus());

		await user.keyboard("{Escape}");

		await waitFor(() => expect(screen.getByTestId("sub-open")).toHaveTextContent("false"));
	});

	test("ArrowLeft in a popover input inside a submenu moves the caret and keeps the submenu open", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<Popover.Root>
								<Popover.Trigger asChild>
									<DropdownMenu.Item onSelect={(event) => event.preventDefault()}>
										Edit
									</DropdownMenu.Item>
								</Popover.Trigger>
								<Popover.Content>
									<input aria-label="Name" defaultValue="abcd" />
								</Popover.Content>
							</Popover.Root>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(item("Edit")).toHaveFocus());
		await user.keyboard("{Enter}");
		const input = await screen.findByRole("textbox", { name: "Name" });
		await waitFor(() => expect(input).toHaveFocus());
		if (!(input instanceof HTMLInputElement)) {
			throw new Error("expected an input");
		}
		input.setSelectionRange(3, 3);

		await user.keyboard("{ArrowLeft}");

		expect(item("More")).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveFocus();
		expect(input.selectionStart).toBe(2);
	});

	test("a press outside a modal menu returns focus to its trigger", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		const trigger = screen.getByRole("button", { name: "Open" });
		trigger.focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Apple")).toHaveFocus());

		// Why a real click: the outside button is inert, so the press lands on the page.
		await browserUser.click(screen.getByRole("button", { name: "Outside" }), { force: true });

		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	test("closing an earlier modal menu keeps a later one's inert boundary", async () => {
		function Fixture({ first, second }: { first: boolean; second: boolean }) {
			return (
				<>
					<button type="button">Outside</button>
					<DropdownMenu.Root open={first}>
						<DropdownMenu.Trigger>First</DropdownMenu.Trigger>
						<DropdownMenu.Content onInteractOutside={(event) => event.preventDefault()}>
							<DropdownMenu.Item>A</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
					<DropdownMenu.Root open={second}>
						<DropdownMenu.Trigger>Second</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item>B</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</>
			);
		}
		const { rerender } = render(<Fixture first second={false} />);
		await screen.findByRole("menuitem", { name: "A" });
		rerender(<Fixture first second />);
		await screen.findByRole("menuitem", { name: "B" });

		rerender(<Fixture first={false} second />);
		await waitFor(() => expect(screen.queryByRole("menuitem", { name: "A" })).toBeNull());

		const outside = screen.getByRole("button", { name: "Outside" });
		outside.focus();
		expect(outside).not.toHaveFocus();
		expect(document.documentElement.style.overflow).toBe("hidden");
	});

	test("unmounting a menu stops the pointer path to its submenu", async () => {
		const user = userEvent.setup();
		const { unmount } = render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Nested</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(item("Nested")).toHaveFocus());
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const trigger = item("More");
		const box = trigger.getBoundingClientRect();
		fireEvent.pointerOut(trigger, {
			pointerType: "mouse",
			clientX: box.right,
			clientY: box.bottom,
			relatedTarget: document.body,
		});
		const added = add.mock.calls.filter(([type]) => type === "pointermove").map(([, fn]) => fn);
		expect(added).toHaveLength(1);

		unmount();

		expect(remove.mock.calls.some(([type, fn]) => type === "pointermove" && fn === added[0])).toBe(
			true,
		);
	});

	test("a pointer on its way to an open submenu can cross a sibling sub-trigger", async () => {
		render(
			<DropdownMenu.Root defaultOpen modal={false}>
				<DropdownMenu.Trigger style={{ marginLeft: 100 }}>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content style={{ width: 150 }}>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger style={{ height: 30 }}>First</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent style={{ width: 120 }}>
							{Array.from({ length: 8 }, (_, index) => (
								<DropdownMenu.Item key={index} style={{ height: 30 }}>
									Child {index}
								</DropdownMenu.Item>
							))}
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger style={{ height: 30 }}>Second</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>Other</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const first = item("First");
		const second = item("Second");
		const start = first.getBoundingClientRect();
		fireEvent.pointerMove(first, {
			pointerType: "mouse",
			clientX: start.left + 10,
			clientY: start.top + 15,
		});
		await vi.advanceTimersByTimeAsync(150);
		await waitFor(() => expect(first).toHaveAttribute("aria-expanded", "true"));
		await screen.findByRole("menuitem", { name: "Child 7" });
		const from = first.getBoundingClientRect();
		const to = second.getBoundingClientRect();
		const exit = { x: from.left + 15, y: from.bottom - 1 };

		fireEvent.pointerMove(first, { pointerType: "mouse", clientX: exit.x - 1, clientY: exit.y });
		fireEvent.pointerOut(first, {
			pointerType: "mouse",
			clientX: exit.x,
			clientY: exit.y,
			relatedTarget: second,
		});
		fireEvent.pointerMove(second, {
			pointerType: "mouse",
			clientX: to.right - 1,
			clientY: to.top + 5,
		});
		// Why advance past the hover delay: an unguarded sibling opens after 100 ms.
		await vi.advanceTimersByTimeAsync(150);

		expect(first).toHaveAttribute("aria-expanded", "true");
		expect(second).toHaveAttribute("aria-expanded", "false");
		vi.useRealTimers();
	});

	test("Root dir='rtl' aligns start to the trigger's right edge", async () => {
		render(
			<DropdownMenu.Root defaultOpen dir="rtl" modal={false}>
				<DropdownMenu.Trigger style={{ position: "absolute", left: 180, top: 20, width: 70 }}>
					Open
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="start" style={{ width: 140, boxSizing: "border-box" }}>
					<DropdownMenu.Item>Apple</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const triggerRight = screen.getByRole("button", { name: "Open" }).getBoundingClientRect().right;

		await expect
			.poll(() => Math.round(screen.getByRole("menu").getBoundingClientRect().right))
			.toBe(Math.round(triggerRight));
	});

	test("in a right-to-left document, a submenu opens with ArrowLeft on the trigger's left", async () => {
		const user = userEvent.setup();
		document.documentElement.dir = "rtl";
		try {
			render(
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger style={{ position: "fixed", left: "45%", top: 20 }}>
						Open
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item>Nested</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);
			screen.getByRole("button", { name: "Open" }).focus();
			await user.keyboard("{ArrowDown}{ArrowLeft}");
			await waitFor(() => expect(item("Nested")).toHaveFocus());
			const triggerLeft = item("More").getBoundingClientRect().left;

			await expect.poll(() => menuBoxOf(item("Nested")).right).toBeLessThanOrEqual(triggerLeft);
		} finally {
			document.documentElement.removeAttribute("dir");
		}
	});

	test("SubContent align='end' lines up its bottom edge with its trigger's", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger style={{ position: "absolute", left: 100, top: 300 }}>
					Open
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger style={{ height: 30 }}>More</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent align="end" style={{ height: 90, boxSizing: "border-box" }}>
							<DropdownMenu.Item>Nested</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(item("Nested")).toHaveFocus());

		await expect
			.poll(() => Math.round(menuBoxOf(item("Nested")).bottom))
			.toBe(Math.round(item("More").getBoundingClientRect().bottom));
	});

	test("losing window focus closes the menu", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		const trigger = screen.getByRole("button", { name: "Open" });
		await user.click(trigger);
		await screen.findByRole("menu");

		act(() => {
			window.dispatchEvent(new Event("blur"));
		});

		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
	});

	test("does not place the open menu or submenu again when they render again", async () => {
		const user = userEvent.setup();
		const tree = (label: string) => (
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent>
							<DropdownMenu.Item>{label}</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		);
		const { rerender } = render(tree("First"));
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "More" })).toHaveFocus());
		await user.keyboard("{ArrowRight}");
		await screen.findByText("First");
		const menus = screen.getAllByRole("menu");
		expect(menus).toHaveLength(2);
		await waitFor(() => {
			for (const menu of menus) {
				expect(getComputedStyle(menu).opacity).toBe("1");
			}
		});
		const observer = new MutationObserver(() => {});
		for (const menu of menus) {
			observer.observe(menu, { attributeFilter: ["style"] });
		}

		rerender(tree("Second"));
		// Why right after the render: see the same test for Popover.
		const styleWrites = observer.takeRecords();
		observer.disconnect();

		expect(screen.getByText("Second")).toBeInTheDocument();
		expect(styleWrites).toHaveLength(0);
	});

	test("a custom Content asChild component can render its own items", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content asChild>
					<PanelWithItem>
						<DropdownMenu.Item>Consumer action</DropdownMenu.Item>
					</PanelWithItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Embedded action")).toHaveFocus());
		await user.keyboard("{ArrowDown}");
		expect(item("Consumer action")).toHaveFocus();
	});

	test("a custom SubContent asChild component gives its own items the submenu", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Sub>
						<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent asChild>
							<PanelWithItem />
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(item("Embedded action")).toHaveFocus());
		const submenu = item("Embedded action").closest("[role=menu]");
		fireEvent.pointerOut(item("Embedded action"), { pointerType: "mouse", relatedTarget: submenu });

		expect(item("More")).toHaveAttribute("aria-expanded", "true");
		expect(submenu?.contains(document.activeElement)).toBe(true);
	});

	test("unmounting a controlled Sub sets its state to closed", async () => {
		const user = userEvent.setup();
		function Fixture({ show }: { show: boolean }) {
			const [sub, setSub] = useState(false);
			return (
				<>
					<output data-testid="sub-state">{String(sub)}</output>
					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							{show && (
								<DropdownMenu.Sub open={sub} onOpenChange={setSub}>
									<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent>
										<DropdownMenu.Item>Nested</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
							)}
							<DropdownMenu.Item>Sibling</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</>
			);
		}
		const { rerender } = render(<Fixture show />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(item("Nested")).toHaveFocus());

		rerender(<Fixture show={false} />);
		await waitFor(() => expect(screen.getByTestId("sub-state")).toHaveTextContent("false"));
		rerender(<Fixture show />);

		expect(item("More")).toHaveAttribute("aria-expanded", "false");
	});

	test("keyboard entry and navigation skip items that CSS hides", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item style={{ display: "none" }}>Hidden first</DropdownMenu.Item>
					<DropdownMenu.Item>Apple</DropdownMenu.Item>
					<DropdownMenu.Item style={{ display: "none" }}>Hidden middle</DropdownMenu.Item>
					<DropdownMenu.Item>Cherry</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Apple")).toHaveFocus());
		await user.keyboard("{ArrowDown}");
		expect(item("Cherry")).toHaveFocus();
	});

	test.each([false, true])(
		"changing modal from %s while open moves the focus boundary",
		async (initialModal) => {
			const tree = (modal: boolean) => (
				<>
					<button type="button">Outside</button>
					<DropdownMenu.Root open modal={modal}>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item>Apple</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</>
			);
			const { rerender } = render(tree(initialModal));
			await screen.findByRole("menu");
			rerender(tree(!initialModal));
			const outside = screen.getByText("Outside");

			await waitFor(() => expect(outside.closest("[inert]") == null).toBe(initialModal));
		},
	);

	test.each(["visibility", "disabled-button", "inert"])(
		"keyboard entry skips a first item that cannot take focus (%s)",
		async (mode) => {
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{mode === "visibility" && (
							<DropdownMenu.Item style={{ visibility: "hidden" }}>Unavailable</DropdownMenu.Item>
						)}
						{mode === "disabled-button" && (
							<DropdownMenu.Item asChild>
								<button type="button" disabled>
									Unavailable
								</button>
							</DropdownMenu.Item>
						)}
						{mode === "inert" && (
							<div inert>
								<DropdownMenu.Item>Unavailable</DropdownMenu.Item>
							</div>
						)}
						<DropdownMenu.Item>Apple</DropdownMenu.Item>
						<DropdownMenu.Item>Banana</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);
			screen.getByRole("button", { name: "Open" }).focus();
			await user.keyboard("{ArrowDown}");

			await waitFor(() => expect(item("Apple")).toHaveFocus());
		},
	);

	test("reopening the menu starts a new typeahead search", async () => {
		const user = userEvent.setup();
		const selected: string[] = [];
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item onSelect={() => selected.push("apple")}>Apple</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={() => selected.push("banana")}>Banana</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}b");
		await waitFor(() => expect(item("Banana")).toHaveFocus());
		await user.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByText("Apple")).toBeNull());
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Apple")).toHaveFocus());

		await user.keyboard(" ");

		expect(selected).toEqual(["apple"]);
	});

	test("a modified arrow key does not move focus", async () => {
		const user = userEvent.setup();
		render(<FruitMenu />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		const first = screen.getAllByRole("menuitem")[0];
		await waitFor(() => expect(first).toHaveFocus());

		await user.keyboard("{Shift>}{ArrowDown}{/Shift}");

		expect(first).toHaveFocus();
	});

	test("a new asChild host for an open modal menu keeps the page inert", async () => {
		const tree = (section: boolean) => (
			<>
				<button type="button">Outside</button>
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content asChild>
						{section ? (
							<section>
								<DropdownMenu.Item>Apple</DropdownMenu.Item>
							</section>
						) : (
							<div>
								<DropdownMenu.Item>Apple</DropdownMenu.Item>
							</div>
						)}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</>
		);
		const { rerender } = render(tree(false));
		await screen.findByRole("menu");
		const outside = screen.getByText("Outside");
		await waitFor(() => expect(outside.closest("[inert]")).not.toBeNull());

		rerender(tree(true));
		await act(async () => {});

		expect(screen.getByRole("menu").tagName).toBe("SECTION");
		expect(outside.closest("[inert]")).not.toBeNull();
	});

	test("a new trigger element for an open modal menu is not inert", async () => {
		const tree = (changed: boolean) => (
			<DropdownMenu.Root defaultOpen>
				<DropdownMenu.Trigger key={String(changed)}>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item>Apple</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		);
		const { rerender } = render(tree(false));
		await screen.findByRole("menu");

		rerender(tree(true));
		await act(async () => {});

		const trigger = screen.getByRole("button", { name: "Open" });
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(trigger.closest("[inert]")).toBeNull();
	});

	test.each(["Content", "SubContent"])(
		"a new asChild element for an open %s keeps focus in the menu",
		async (part) => {
			const user = userEvent.setup();
			const host = (changed: boolean) =>
				changed ? (
					<section>
						<DropdownMenu.Item>Apple</DropdownMenu.Item>
					</section>
				) : (
					<div>
						<DropdownMenu.Item>Apple</DropdownMenu.Item>
					</div>
				);
			const tree = (changed: boolean) => (
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					{part === "Content" ? (
						<DropdownMenu.Content asChild>{host(changed)}</DropdownMenu.Content>
					) : (
						<DropdownMenu.Content>
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent asChild>{host(changed)}</DropdownMenu.SubContent>
							</DropdownMenu.Sub>
						</DropdownMenu.Content>
					)}
				</DropdownMenu.Root>
			);
			const { rerender } = render(tree(false));
			screen.getByRole("button", { name: "Open" }).focus();
			await user.keyboard(part === "Content" ? "{ArrowDown}" : "{ArrowDown}{ArrowRight}");
			await waitFor(() => expect(item("Apple")).toHaveFocus());

			rerender(tree(true));
			await act(async () => {});

			const menu = item("Apple").closest("[role='menu']");
			expect(menu?.tagName).toBe("SECTION");
			await waitFor(() => expect(menu?.contains(document.activeElement)).toBe(true));
		},
	);

	test.each([false, true])(
		"a default-open Popover in a default-open menu mounts without an error (submenu: %s)",
		async (submenu) => {
			const editor = (
				<Popover.Root defaultOpen>
					<Popover.Trigger asChild>
						<DropdownMenu.Item onSelect={(event) => event.preventDefault()}>Edit</DropdownMenu.Item>
					</Popover.Trigger>
					<Popover.Content>
						<input aria-label="Name" />
					</Popover.Content>
				</Popover.Root>
			);
			render(
				<DropdownMenu.Root defaultOpen modal={false}>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						{submenu ? (
							<DropdownMenu.Sub defaultOpen>
								<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent>{editor}</DropdownMenu.SubContent>
							</DropdownMenu.Sub>
						) : (
							editor
						)}
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			expect(await screen.findByRole("menu", { name: "Open" })).toBeInTheDocument();
		},
	);

	test("a new asChild element for a submenu with an open Popover keeps the menus open", async () => {
		const user = userEvent.setup();
		function Fixture({ replacement }: { replacement: boolean }) {
			const [editing, setEditing] = useState(false);
			const nested = (
				<Popover.Root open={editing} onOpenChange={setEditing}>
					<Popover.Trigger asChild>
						<DropdownMenu.Item onSelect={(event) => event.preventDefault()}>Edit</DropdownMenu.Item>
					</Popover.Trigger>
					<Popover.Content>
						<input aria-label="Name" />
					</Popover.Content>
				</Popover.Root>
			);
			return (
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent asChild>
								{replacement ? <section>{nested}</section> : <div>{nested}</div>}
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			);
		}
		const { rerender } = render(<Fixture replacement={false} />);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}{ArrowRight}{Enter}");
		await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus());

		rerender(<Fixture replacement />);
		await act(async () => {});

		expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("aria-expanded", "true");
		expect(item("More")).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("menu", { name: "More" })).toBeInTheDocument();
	});

	test("a new trigger element for an earlier modal menu leaves a later modal menu live", async () => {
		const keepOpen = (event: Event) => event.preventDefault();
		const tree = ({ second, replacement }: { second: boolean; replacement: boolean }) => (
			<>
				<DropdownMenu.Root open>
					<DropdownMenu.Trigger key={String(replacement)}>First</DropdownMenu.Trigger>
					<DropdownMenu.Content onInteractOutside={keepOpen}>
						<DropdownMenu.Item>Alpha</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				<DropdownMenu.Root open={second}>
					<DropdownMenu.Trigger>Second</DropdownMenu.Trigger>
					<DropdownMenu.Content onInteractOutside={keepOpen}>
						<DropdownMenu.Item>Beta</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</>
		);
		const { rerender } = render(tree({ second: false, replacement: false }));
		await screen.findByText("Alpha");
		rerender(tree({ second: true, replacement: false }));
		const beta = await screen.findByText("Beta");
		await waitFor(() => expect(beta.closest("[inert]")).toBeNull());

		rerender(tree({ second: true, replacement: true }));
		await act(async () => {});

		expect(beta.closest("[inert]")).toBeNull();
		beta.focus();
		expect(beta).toHaveFocus();
	});
});

/** A consumer panel for `asChild` that adds an item of its own before its children. */
function PanelWithItem({ children, ...props }: ComponentProps<"section">) {
	return (
		<section {...props}>
			<DropdownMenu.Item>Embedded action</DropdownMenu.Item>
			{children}
		</section>
	);
}

describe("DropdownMenu with its CSS (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(async () => {
		styleElement = document.createElement("style");
		styleElement.textContent =
			(await commands.tailwindCss("../../utils/float/use-float.ts")) +
			(await commands.tailwindCss("./dropdown-menu.tsx"));
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("a custom asChild panel scrolls its own items into view", async () => {
		const user = userEvent.setup();
		function OwnItemsPanel(props: ComponentProps<"section">) {
			return (
				<section {...props}>
					{Array.from({ length: 20 }, (_, index) => (
						<DropdownMenu.Item key={index} style={{ height: 32, flexShrink: 0 }}>
							{`Action ${index + 1}`}
						</DropdownMenu.Item>
					))}
				</section>
			);
		}
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content asChild style={{ maxHeight: 176 }}>
					<OwnItemsPanel />
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Action 1")).toHaveFocus());

		await user.keyboard("{End}");

		const panel = screen.getByRole("menu");
		expect(item("Action 20")).toHaveFocus();
		expect(item("Action 20").getBoundingClientRect().bottom).toBeLessThanOrEqual(
			panel.getBoundingClientRect().bottom,
		);
	});

	test("a long menu cues each edge with more items, and the focused item stays clear of the cue", async () => {
		const user = userEvent.setup();
		render(
			<DropdownMenu.Root modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content style={{ maxHeight: 176 }}>
					{Array.from({ length: 20 }, (_, index) => (
						<DropdownMenu.Item key={index}>{`Action ${index + 1}`}</DropdownMenu.Item>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		screen.getByRole("button", { name: "Open" }).focus();
		await user.keyboard("{ArrowDown}");
		await waitFor(() => expect(item("Action 1")).toHaveFocus());
		const scroller = item("Action 1").parentElement as HTMLElement;
		const edges = () =>
			[
				scroller.hasAttribute("data-overflow-top"),
				scroller.hasAttribute("data-overflow-bottom"),
			].join();
		// Why wait for two frames: the cue updates in the frame after a change, and
		// WebKit in CI can render less than one frame a second, longer than a poll.
		const twoFrames = () =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
			});
		await twoFrames();
		await expect.poll(edges).toBe("false,true");
		expect(getComputedStyle(scroller, "::after").opacity).toBe("1");

		await user.keyboard("{End}");

		await twoFrames();
		await expect.poll(edges).toBe("true,false");
		expect(getComputedStyle(scroller, "::before").opacity).toBe("1");
		expect(getComputedStyle(scroller, "::after").opacity).toBe("0");
		// Why 24: the cue is 1.5rem tall, and the focused item must sit below it.
		await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}");
		await twoFrames();
		await expect.poll(edges).toBe("true,true");
		// Why: the open animation scales the menu, which shrinks the measured gap.
		await Promise.all(document.getAnimations().map((animation) => animation.finished));
		const box = scroller.getBoundingClientRect();
		const focused = item("Action 14").getBoundingClientRect();
		expect(focused.top).toBeGreaterThanOrEqual(box.top + 24 - 0.5);
	});

	test.each([false, true])(
		"a custom trigger that replaces its own element updates the open menu (modal: %s)",
		async (modal) => {
			const control = { replaceElement: () => {} };
			function CustomTrigger(props: ComponentProps<"button">) {
				const [replacement, setReplacement] = useState(false);
				useEffect(() => {
					control.replaceElement = () => setReplacement(true);
				});
				return (
					<button
						type="button"
						key={String(replacement)}
						{...props}
						style={{ position: "fixed", left: replacement ? 240 : 180, top: 200, width: 70 }}
					>
						Open
					</button>
				);
			}
			render(
				<DropdownMenu.Root open modal={modal}>
					<DropdownMenu.Trigger asChild>
						<CustomTrigger />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						align="start"
						onInteractOutside={(event) => event.preventDefault()}
						style={{ width: 140 }}
					>
						<DropdownMenu.Item>Apple</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);
			const menu = await screen.findByRole("menu");
			// Why wait for the animations: the open scale moves the box's left edge,
			// and a loaded runner can run it past a poll's timeout.
			await Promise.all(menu.getAnimations().map((animation) => animation.finished));
			await waitFor(() => expect(menu.getBoundingClientRect().left).toBeCloseTo(180, 0));
			const first = screen.getByRole("button", { name: "Open" });

			await act(async () => control.replaceElement());

			const next = screen.getByRole("button", { name: "Open" });
			expect(next).not.toBe(first);
			expect(next.closest("[inert]")).toBeNull();
			await waitFor(() => expect(menu.getBoundingClientRect().left).toBeCloseTo(240, 0));
		},
	);

	test("a custom sub-trigger that replaces its own element moves the open submenu", async () => {
		const control = { replaceElement: () => {} };
		function CustomSubTrigger(props: ComponentProps<"button">) {
			const [replacement, setReplacement] = useState(false);
			useEffect(() => {
				control.replaceElement = () => setReplacement(true);
			});
			return (
				<button
					type="button"
					key={String(replacement)}
					{...props}
					style={{ position: "fixed", left: replacement ? 140 : 80, top: 200, width: 70 }}
				/>
			);
		}
		render(
			<DropdownMenu.Root open modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content onInteractOutside={(event) => event.preventDefault()}>
					<DropdownMenu.Sub open>
						<DropdownMenu.SubTrigger asChild>
							<CustomSubTrigger>More</CustomSubTrigger>
						</DropdownMenu.SubTrigger>
						<DropdownMenu.SubContent sideOffset={2} style={{ width: 140 }}>
							<DropdownMenu.Item>Apple</DropdownMenu.Item>
						</DropdownMenu.SubContent>
					</DropdownMenu.Sub>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const submenu = await screen.findByRole("menu", { name: "More" });
		await Promise.all(submenu.getAnimations().map((animation) => animation.finished));
		await waitFor(() => expect(submenu.getBoundingClientRect().left).toBeCloseTo(152, 0));

		await act(async () => control.replaceElement());

		await waitFor(() => expect(submenu.getBoundingClientRect().left).toBeCloseTo(212, 0));
	});

	test("a long menu above its trigger is next to the trigger on its first frame", async () => {
		const firstFrame = { bottom: Number.NaN };
		const measured = new Promise<void>((resolve) => {
			const onFirstFrame = (menu: HTMLElement | null) => {
				if (menu != null && Number.isNaN(firstFrame.bottom)) {
					requestAnimationFrame(() => {
						firstFrame.bottom = menu.getBoundingClientRect().bottom;
						resolve();
					});
				}
			};
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger style={{ position: "fixed", left: 180, top: 500, height: 30 }}>
						Menu
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						side="top"
						style={{ width: 200, transition: "none" }}
						ref={onFirstFrame}
					>
						{Array.from({ length: 40 }, (_, index) => (
							<DropdownMenu.Item key={index}>{`Item ${index}`}</DropdownMenu.Item>
						))}
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);
		});

		await measured;

		// Why 492: the trigger top, 500, less the 8 px side offset.
		expect(firstFrame.bottom).toBeCloseTo(492, 0);
	});
});
