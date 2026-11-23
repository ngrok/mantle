import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { commands } from "vitest/browser";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

/**
 * Runs the floats in a browser with no popover API and no CSS anchor
 * positioning, such as Safari 16 or Chrome 113. Why a dynamic import: the
 * float reads both features once, when its module loads, so the test removes
 * them first. The test hides each `[popover]` that is not open, as jsdom
 * does, so a float with the attribute would not show.
 */
const popoverMethods = ["showPopover", "hidePopover", "togglePopover"] as const;
const savedMethods = popoverMethods.map((name) =>
	Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
);
for (const name of popoverMethods) {
	Reflect.deleteProperty(HTMLElement.prototype, name);
}
const supports = vi.spyOn(CSS, "supports").mockReturnValue(false);

const Popover = await import("../../components/popover/popover-parts.js");
const Tooltip = await import("../../components/tooltip/tooltip-parts.js");
const DropdownMenu = await import("../../components/dropdown-menu/dropdown-menu-parts.js");
const HoverCard = await import("../../components/hover-card/hover-card-parts.js");
const Select = await import("../../components/select/select-parts.js");
const Combobox = await import("../../components/combobox/combobox-parts.js");
const MultiSelect = await import("../../components/multi-select/multi-select-parts.js");

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	styleElement.textContent = [
		// Why: Tailwind's preflight sets it.
		"*, ::before, ::after { box-sizing: border-box; border: 0 solid; }",
		// Why `!important`: a `display` class on a float, such as the menu's `flex`, would show it.
		"[popover]:not(:popover-open) { display: none !important; }",
		await commands.tailwindCss("./use-float.ts"),
		await commands.tailwindCss("../../components/popover/popover.tsx"),
		await commands.tailwindCss("../../components/tooltip/tooltip.tsx"),
		await commands.tailwindCss("../../components/dropdown-menu/dropdown-menu.tsx"),
	].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
	supports.mockRestore();
	popoverMethods.forEach((name, index) => {
		const descriptor = savedMethods[index];
		if (descriptor != null) {
			Object.defineProperty(HTMLElement.prototype, name, descriptor);
		}
	});
});

describe("a browser with no popover API and no anchor positioning", () => {
	test("shows a popover as a fixed box at the float tier, next to its trigger", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<button type="button">Inside</button>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		expect(content.checkVisibility()).toBe(true);
		const style = getComputedStyle(content);
		expect(style.position).toBe("fixed");
		expect(style.zIndex).toBe("50");
		await waitFor(() => expect(style.opacity).toBe("1"));
		// Below the trigger, `sideOffset` away, centered on it.
		const anchor = trigger.getBoundingClientRect();
		const box = content.getBoundingClientRect();
		expect(box.top).toBeCloseTo(anchor.bottom + 4, 0);
		expect((box.left + box.right) / 2).toBeCloseTo((anchor.left + anchor.right) / 2, 0);
		expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
	});

	test("places a popover inside a popover next to its own trigger", async () => {
		// The outer content's transform, like a centered dialog's, makes it the
		// containing block of the fixed inner content, because no top layer lifts
		// the inner one out.
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<Popover.Root>
					<Popover.Trigger>Outer</Popover.Trigger>
					<Popover.Content style={{ transform: "translateX(10px)" }}>
						<Popover.Root>
							<Popover.Trigger>Inner</Popover.Trigger>
							<Popover.Content>Inner content</Popover.Content>
						</Popover.Root>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);

		await user.click(screen.getByRole("button", { name: "Outer" }));
		const inner = await screen.findByRole("button", { name: "Inner" });
		await user.click(inner);
		const content = (await screen.findByText("Inner content")).closest<HTMLElement>(
			"[data-slot='popover-content']",
		);
		await waitFor(() => expect(content?.getBoundingClientRect().width).toBeGreaterThan(0));

		await waitFor(() => {
			const anchor = inner.getBoundingClientRect();
			const box = content?.getBoundingClientRect();
			expect(box?.top).toBeCloseTo(anchor.bottom + 4, 0);
		});
	});

	test("places a popover inside a scrolled, transformed popover next to its own trigger", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<Popover.Root>
					<Popover.Trigger>Outer</Popover.Trigger>
					<Popover.Content
						data-testid="outer"
						style={{ transform: "translateX(10px)", height: 160, overflow: "auto" }}
					>
						<div style={{ height: 80 }} />
						<Popover.Root>
							<Popover.Trigger>Inner</Popover.Trigger>
							<Popover.Content>Inner content</Popover.Content>
						</Popover.Root>
						<div style={{ height: 500 }} />
					</Popover.Content>
				</Popover.Root>
			</div>,
		);

		await user.click(screen.getByRole("button", { name: "Outer" }));
		const outer = await screen.findByTestId("outer");
		outer.scrollTop = 50;
		const inner = screen.getByRole("button", { name: "Inner" });
		await user.click(inner);
		const content = (await screen.findByText("Inner content")).closest<HTMLElement>(
			"[data-slot='popover-content']",
		);

		await waitFor(() => {
			const anchor = inner.getBoundingClientRect();
			expect(content?.getBoundingClientRect().top).toBeCloseTo(anchor.bottom + 4, 0);
		});
	});

	test("flips a popover above its trigger when only that side fits", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ position: "fixed", bottom: 10, left: 100 }}>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>
						<p style={{ height: 120 }}>Tall content</p>
					</Popover.Content>
				</Popover.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		const content = await screen.findByRole("dialog");

		await waitFor(() => expect(content).toHaveAttribute("data-side", "top"));
		expect(content.getBoundingClientRect().bottom).toBeCloseTo(
			trigger.getBoundingClientRect().top - 4,
			0,
		);
	});

	test("closes a popover on Escape and on a press outside", async () => {
		const user = userEvent.setup();
		render(
			<>
				<button type="button">Elsewhere</button>
				<Popover.Root>
					<Popover.Trigger>Open</Popover.Trigger>
					<Popover.Content>Products</Popover.Content>
				</Popover.Root>
			</>,
		);
		const trigger = screen.getByRole("button", { name: "Open" });

		await user.click(trigger);
		await screen.findByRole("dialog");
		await user.keyboard("{Escape}");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		await waitFor(() => expect(trigger).toHaveFocus());

		await user.click(trigger);
		await screen.findByRole("dialog");
		await user.click(screen.getByRole("button", { name: "Elsewhere" }));
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("shows a tooltip on hover, above its trigger", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<Tooltip.Root>
					<Tooltip.Trigger>Help</Tooltip.Trigger>
					<Tooltip.Content>Opens the docs</Tooltip.Content>
				</Tooltip.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Help" });

		await user.hover(trigger);
		const tooltip = await screen.findByRole("tooltip");

		expect(tooltip.checkVisibility()).toBe(true);
		expect(getComputedStyle(tooltip).position).toBe("fixed");
		expect(tooltip).toHaveAttribute("data-side", "top");
		expect(tooltip.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			trigger.getBoundingClientRect().top,
		);
	});

	test("opens a dropdown menu and its submenu next to their triggers, with keyboard focus", async () => {
		const user = userEvent.setup();
		render(
			<div style={{ padding: 100 }}>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>Actions</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>Rename</DropdownMenu.Item>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item>Copy link</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: "Actions" });
		trigger.focus();

		await user.keyboard("{ArrowDown}");
		const menu = await screen.findByRole("menu");
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "Rename" })).toHaveFocus());
		expect(menu.checkVisibility()).toBe(true);
		expect(getComputedStyle(menu).position).toBe("fixed");
		expect(menu.getBoundingClientRect().top).toBeCloseTo(
			trigger.getBoundingClientRect().bottom + 8,
			0,
		);

		await user.keyboard("{ArrowDown}{ArrowRight}");
		await waitFor(() => expect(screen.getByRole("menuitem", { name: "Copy link" })).toHaveFocus());
		const subTrigger = screen.getByRole("menuitem", { name: "Share" });
		const subMenu = screen.getByRole("menu", { name: "Share" });
		expect(subMenu.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			subTrigger.getBoundingClientRect().right,
		);

		await user.keyboard("{Escape}");
		await waitFor(() => expect(trigger).toHaveFocus());
		expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("shows a hover card on hover", async () => {
		const user = userEvent.setup();
		render(
			<HoverCard.Root openDelay={0}>
				<HoverCard.Trigger href="/docs">Docs</HoverCard.Trigger>
				<HoverCard.Content>Read the guides</HoverCard.Content>
			</HoverCard.Root>,
		);

		await user.hover(screen.getByRole("link", { name: "Docs" }));

		await waitFor(() => expect(screen.getByText("Read the guides").checkVisibility()).toBe(true));
	});

	test("opens the list of each picker and picks an option by its role", async () => {
		const user = userEvent.setup();
		render(
			<>
				<Select.Root>
					<Select.Trigger aria-label="Fruit">
						<Select.Value />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="apple">Apple</Select.Item>
					</Select.Content>
				</Select.Root>
				<Combobox.Root>
					<Combobox.Input aria-label="Color" />
					<Combobox.Content>
						<Combobox.Item value="Red">Red</Combobox.Item>
					</Combobox.Content>
				</Combobox.Root>
				<MultiSelect.Root>
					<MultiSelect.Trigger>
						<MultiSelect.Input aria-label="Tags" />
					</MultiSelect.Trigger>
					<MultiSelect.Content>
						<MultiSelect.Item value="urgent">Urgent</MultiSelect.Item>
					</MultiSelect.Content>
				</MultiSelect.Root>
			</>,
		);

		await user.click(screen.getByRole("combobox", { name: "Fruit" }));
		await user.click(await screen.findByRole("option", { name: "Apple" }));
		expect(screen.getByRole("combobox", { name: "Fruit" })).toHaveTextContent("Apple");

		await user.click(screen.getByRole("combobox", { name: "Color" }));
		await user.click(await screen.findByRole("option", { name: "Red" }));
		expect(screen.getByRole("combobox", { name: "Color" })).toHaveValue("Red");

		await user.click(screen.getByRole("combobox", { name: "Tags" }));
		await user.click(await screen.findByRole("option", { name: "Urgent" }));
		expect(screen.getByRole("option", { name: "Urgent" })).toHaveAttribute("aria-selected", "true");
	});
});
