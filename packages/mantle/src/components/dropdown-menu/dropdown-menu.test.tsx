import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { DropdownMenu } from "./dropdown-menu.js";

/**
 * Renders every part of the composition with both the menu and its submenu
 * open, so structural assertions (`data-slot`, roles, portal placement) can be
 * made without driving hover-intent timing that happy-dom cannot model. A modal
 * menu hides the rest of the page behind `aria-hidden`, so the trigger is only
 * reachable via `{ hidden: true }` while the menu is open.
 */
function renderFullMenu() {
	return render(
		<DropdownMenu.Root defaultOpen>
			<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Group>
					<DropdownMenu.Label>Account</DropdownMenu.Label>
					<DropdownMenu.Item>
						Profile
						<DropdownMenu.Shortcut>⌘P</DropdownMenu.Shortcut>
					</DropdownMenu.Item>
					<DropdownMenu.CheckboxItem checked>Notifications</DropdownMenu.CheckboxItem>
					<DropdownMenu.RadioGroup value="small">
						<DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Group>
				<DropdownMenu.Separator />
				<DropdownMenu.Sub open>
					<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<DropdownMenu.Label>Destinations</DropdownMenu.Label>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
			</DropdownMenu.Content>
		</DropdownMenu.Root>,
	);
}

function slotElements(slot: string) {
	return Array.from(document.querySelectorAll<HTMLElement>(`[data-slot="${slot}"]`));
}

describe("DropdownMenu", () => {
	describe("auto-portal", () => {
		test("Content renders outside the Root's DOM subtree", async () => {
			// Mantle portals Content for the consumer — Radix requires an explicit
			// `Portal`. Without it every menu inside an `overflow: hidden` ancestor
			// (table cell, card, sidebar) gets clipped.
			const user = userEvent.setup();
			const { container } = render(
				<div style={{ overflow: "hidden" }}>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item>Profile</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>,
			);

			const trigger = screen.getByRole("button", { name: "Open" });
			expect(container).toContainElement(trigger);

			await user.click(trigger);

			const menu = screen.getByRole("menu");
			expect(container).not.toContainElement(menu);
			expect(document.body).toContainElement(menu);
		});

		test("SubContent renders outside the Root's DOM subtree", () => {
			const { container } = renderFullMenu();

			const subContent = document.querySelector<HTMLElement>(
				'[data-slot="dropdown-menu-sub-content"]',
			);
			expect(subContent).toHaveAttribute("role", "menu");
			expect(container).not.toContainElement(subContent);
			expect(document.body).toContainElement(subContent);
		});
	});

	describe("open state wiring", () => {
		test("clicking the trigger opens the menu and points aria-controls at it", async () => {
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const trigger = screen.getByRole("button", { name: "Open" });
			expect(trigger).toHaveAttribute("aria-haspopup", "menu");
			expect(trigger).toHaveAttribute("aria-expanded", "false");
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();

			await user.click(trigger);

			const menu = screen.getByRole("menu");
			expect(trigger).toHaveAttribute("aria-expanded", "true");
			expect(trigger).toHaveAttribute("aria-controls", menu.id);
			expect(screen.getByRole("menuitem", { name: "Profile" })).toBeInTheDocument();
		});

		test("keyboard opens the menu from the focused trigger and reports it to onOpenChange", async () => {
			const onOpenChange = vi.fn<(open: boolean) => void>();
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root onOpenChange={onOpenChange}>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			await user.tab();
			expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();

			await user.keyboard("{Enter}");

			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenLastCalledWith(true);
			expect(await screen.findByRole("menu")).toBeInTheDocument();

			await user.keyboard("{Escape}");

			expect(onOpenChange).toHaveBeenCalledTimes(2);
			expect(onOpenChange).toHaveBeenLastCalledWith(false);
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});

	describe("click propagation guard", () => {
		test("a click inside the menu does not reach an ancestor onClick", async () => {
			// React routes portaled events through the React tree, so without
			// Content's `stopPropagation` a menu item click would also fire the
			// row/card handler the menu is rendered inside.
			const onAncestorClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
				// A stand-in for the clickable table row / card a menu is nested in.
				<div role="button" tabIndex={0} onClick={onAncestorClick} onKeyDown={onAncestorClick}>
					<DropdownMenu.Root defaultOpen>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item>Profile</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>,
			);

			await user.click(screen.getByRole("menuitem", { name: "Profile" }));

			expect(onAncestorClick).not.toHaveBeenCalled();
		});

		test("Content still invokes a consumer onClick after stopping propagation", async () => {
			const onContentClick = vi.fn<(event: { target: EventTarget | null }) => void>();
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content onClick={onContentClick}>
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const item = screen.getByRole("menuitem", { name: "Profile" });
			await user.click(item);

			expect(onContentClick).toHaveBeenCalledTimes(1);
			expect(onContentClick.mock.calls[0]?.[0].target).toBe(item);
		});
	});

	describe("loop", () => {
		test("arrow-down from the last item wraps to the first — Content defaults loop to true", async () => {
			// Radix's own default is `loop={false}`; the wrap-around is mantle's.
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>First</DropdownMenu.Item>
						<DropdownMenu.Item>Last</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			await user.keyboard("{ArrowDown}{ArrowDown}");
			expect(screen.getByRole("menuitem", { name: "Last" })).toHaveFocus();

			await user.keyboard("{ArrowDown}");
			expect(screen.getByRole("menuitem", { name: "First" })).toHaveFocus();
		});

		test("arrow-down wraps inside a submenu too — SubContent defaults loop to true", async () => {
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent>
								<DropdownMenu.Item>Email</DropdownMenu.Item>
								<DropdownMenu.Item>Copy link</DropdownMenu.Item>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			await user.keyboard("{ArrowDown}");
			expect(screen.getByRole("menuitem", { name: "Share" })).toHaveFocus();

			// ArrowRight opens the submenu and focuses its first item.
			await user.keyboard("{ArrowRight}");
			expect(await screen.findByRole("menuitem", { name: "Email" })).toHaveFocus();

			await user.keyboard("{ArrowDown}");
			expect(screen.getByRole("menuitem", { name: "Copy link" })).toHaveFocus();

			await user.keyboard("{ArrowDown}");
			expect(screen.getByRole("menuitem", { name: "Email" })).toHaveFocus();
		});

		test("an explicit loop={false} on Content wins over the default", async () => {
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content loop={false}>
						<DropdownMenu.Item>First</DropdownMenu.Item>
						<DropdownMenu.Item>Last</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");

			expect(screen.getByRole("menuitem", { name: "Last" })).toHaveFocus();
		});
	});

	describe("CheckboxItem", () => {
		test("renders the check indicator only while checked", () => {
			const { rerender } = render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.CheckboxItem checked={false}>Notifications</DropdownMenu.CheckboxItem>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const unchecked = screen.getByRole("menuitemcheckbox", { name: "Notifications" });
			expect(unchecked).toHaveAttribute("aria-checked", "false");
			expect(unchecked.querySelectorAll("svg")).toHaveLength(0);

			rerender(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.CheckboxItem checked>Notifications</DropdownMenu.CheckboxItem>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const checked = screen.getByRole("menuitemcheckbox", { name: "Notifications" });
			expect(checked).toHaveAttribute("aria-checked", "true");
			expect(checked.querySelectorAll("svg")).toHaveLength(1);
		});

		test("reports the next state to onCheckedChange without changing itself", async () => {
			// The item is fully controlled — the consumer owns `checked`, so a click
			// must not flip the indicator on its own.
			const onCheckedChange = vi.fn<(checked: boolean) => void>();
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.CheckboxItem
							checked={false}
							onCheckedChange={onCheckedChange}
							onSelect={(event) => event.preventDefault()}
						>
							Notifications
						</DropdownMenu.CheckboxItem>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const item = screen.getByRole("menuitemcheckbox", { name: "Notifications" });
			await user.click(item);

			expect(onCheckedChange).toHaveBeenCalledTimes(1);
			expect(onCheckedChange).toHaveBeenLastCalledWith(true);
			expect(item).toHaveAttribute("aria-checked", "false");
			expect(item.querySelectorAll("svg")).toHaveLength(0);
		});

		test("a consumer that stores onCheckedChange gets the indicator on the next render", async () => {
			const user = userEvent.setup();
			const ControlledMenu = () => {
				const [checked, setChecked] = useState(false);
				return (
					<DropdownMenu.Root defaultOpen>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.CheckboxItem
								checked={checked}
								onCheckedChange={setChecked}
								onSelect={(event) => event.preventDefault()}
							>
								Notifications
							</DropdownMenu.CheckboxItem>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				);
			};
			render(<ControlledMenu />);

			const item = screen.getByRole("menuitemcheckbox", { name: "Notifications" });
			await user.click(item);

			expect(item).toHaveAttribute("aria-checked", "true");
			expect(item.querySelectorAll("svg")).toHaveLength(1);
		});
	});

	describe("RadioItem", () => {
		test("only the selected item is aria-checked and renders the indicator", () => {
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.RadioGroup value="medium">
							<DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="medium">Medium</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const small = screen.getByRole("menuitemradio", { name: "Small" });
			const medium = screen.getByRole("menuitemradio", { name: "Medium" });
			expect(small).toHaveAttribute("aria-checked", "false");
			expect(small.querySelectorAll("svg")).toHaveLength(0);
			expect(medium).toHaveAttribute("aria-checked", "true");
			expect(medium.querySelectorAll("svg")).toHaveLength(1);
		});

		test("selecting a radio item reports its value to the group", async () => {
			const onValueChange = vi.fn<(value: string) => void>();
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.RadioGroup value="medium" onValueChange={onValueChange}>
							<DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="medium">Medium</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			await user.click(screen.getByRole("menuitemradio", { name: "Small" }));

			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(onValueChange).toHaveBeenLastCalledWith("small");
		});
	});

	describe("data-slot", () => {
		test.each([
			["dropdown-menu-content", "menu"],
			["dropdown-menu-group", "group"],
			["dropdown-menu-item", "menuitem"],
			["dropdown-menu-checkbox-item", "menuitemcheckbox"],
			["dropdown-menu-radio-group", "group"],
			["dropdown-menu-radio-item", "menuitemradio"],
			["dropdown-menu-separator", "none"],
			["dropdown-menu-sub-trigger", "menuitem"],
			["dropdown-menu-sub-content", "menu"],
		] as const)(`renders data-slot="%s" on the element with role="%s"`, (slot, role) => {
			renderFullMenu();

			const elements = slotElements(slot);
			expect(elements).not.toHaveLength(0);
			for (const element of elements) {
				expect(element).toHaveAttribute("role", role);
			}
		});

		test(`renders data-slot="dropdown-menu-trigger" on the trigger button`, () => {
			renderFullMenu();

			expect(slotElements("dropdown-menu-trigger")).toHaveLength(1);
			expect(screen.getByRole("button", { name: "Open", hidden: true })).toHaveAttribute(
				"data-slot",
				"dropdown-menu-trigger",
			);
		});

		test.each([
			["dropdown-menu-label", "Account"],
			["dropdown-menu-label", "Destinations"],
			["dropdown-menu-shortcut", "⌘P"],
		] as const)(`renders data-slot="%s" on the element rendering "%s"`, (slot, text) => {
			renderFullMenu();

			expect(screen.getByText(text)).toHaveAttribute("data-slot", slot);
		});

		test("Content joins an incoming data-slot chain ahead of its own slot name", () => {
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content data-slot="row-actions">
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			expect(screen.getByRole("menu")).toHaveAttribute(
				"data-slot",
				"row-actions dropdown-menu-content",
			);
		});
	});

	describe("width", () => {
		// `width="trigger"` has no data attribute; its only observable is the
		// `--radix-dropdown-menu-trigger-width` custom property Radix publishes on
		// the positioner, which the utility class consumes.
		const triggerWidthClass = "w-(--radix-dropdown-menu-trigger-width)";

		test(`width="trigger" sizes the content from the trigger width variable`, () => {
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content width="trigger">
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			expect(screen.getByRole("menu")).toHaveClass(triggerWidthClass);
		});

		test.each(["content", undefined] as const)(
			`width=%s leaves the content at its intrinsic width`,
			(width) => {
				render(
					<DropdownMenu.Root defaultOpen>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content width={width}>
							<DropdownMenu.Item>Profile</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>,
				);

				expect(screen.getByRole("menu")).not.toHaveClass(triggerWidthClass);
			},
		);
	});

	describe("className", () => {
		test("a consumer className overrides the part's own padding", () => {
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content className="p-4">
						<DropdownMenu.Item className="px-6">Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const menu = screen.getByRole("menu");
			expect(menu).toHaveClass("p-4");
			expect(menu).not.toHaveClass("p-1.25");

			const item = screen.getByRole("menuitem", { name: "Profile" });
			expect(item).toHaveClass("px-6");
			expect(item).not.toHaveClass("px-2");
		});
	});

	describe("composition contracts", () => {
		test("Trigger asChild moves the menu wiring onto the consumer's element", async () => {
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button type="button" className="custom-trigger">
							Open
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const trigger = screen.getByRole("button", { name: "Open" });
			expect(screen.getAllByRole("button")).toHaveLength(1);
			expect(trigger).toHaveClass("custom-trigger");
			expect(trigger).toHaveAttribute("data-slot", "dropdown-menu-trigger");
			expect(trigger).toHaveAttribute("aria-haspopup", "menu");

			await user.click(trigger);

			expect(screen.getByRole("menu")).toBeInTheDocument();
		});

		test("Trigger, Content and Item forward refs to their rendered elements", () => {
			const triggerRef = createRef<HTMLButtonElement>();
			const contentRef = createRef<HTMLDivElement>();
			const itemRef = createRef<HTMLDivElement>();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger ref={triggerRef}>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content ref={contentRef}>
						<DropdownMenu.Item ref={itemRef}>Profile</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			expect(triggerRef.current).toBe(screen.getByRole("button", { name: "Open", hidden: true }));
			expect(contentRef.current).toBe(screen.getByRole("menu"));
			expect(itemRef.current).toBe(screen.getByRole("menuitem", { name: "Profile" }));
		});

		test("Item onSelect fires with the item's own event and closes the menu", async () => {
			const onSelect = vi.fn<(event: Event) => void>();
			const user = userEvent.setup();
			render(
				<DropdownMenu.Root defaultOpen>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item onSelect={onSelect}>Profile</DropdownMenu.Item>
						<DropdownMenu.Item disabled onSelect={onSelect}>
							Delete
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			await user.click(screen.getByRole("menuitem", { name: "Delete" }));
			expect(onSelect).not.toHaveBeenCalled();
			expect(screen.getByRole("menu")).toBeInTheDocument();

			await user.click(screen.getByRole("menuitem", { name: "Profile" }));
			expect(onSelect).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});
	});
});
