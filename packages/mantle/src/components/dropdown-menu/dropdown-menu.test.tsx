import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { findTranslatedFont, translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { DropdownMenu } from "./dropdown-menu.js";

describe("DropdownMenu", () => {
	test('Shortcut locks translate="no" even when a wider props object carries translate', () => {
		const wideProps: Record<string, string> = { translate: "yes" };
		render(<DropdownMenu.Shortcut {...wideProps}>⌘S</DropdownMenu.Shortcut>);
		expect(screen.getByText("⌘S")).toHaveAttribute("translate", "no");
	});

	describe("asChild", () => {
		test("Trigger renders the child and merges class, data-*, and ref", () => {
			const ref = createRef<HTMLButtonElement>();
			render(
				<DropdownMenu.Root modal={false}>
					<DropdownMenu.Trigger asChild>
						<button type="button" className="mine" data-testid="custom" ref={ref}>
							Open
						</button>
					</DropdownMenu.Trigger>
				</DropdownMenu.Root>,
			);

			const trigger = screen.getByRole("button", { name: "Open" });
			expect(trigger.tagName).toBe("BUTTON");
			expect(trigger).toHaveClass("mine");
			expect(trigger).toHaveAttribute("data-testid", "custom");
			expect(trigger).toHaveAttribute("data-slot", "dropdown-menu-trigger");
			expect(ref.current).toBe(trigger);
		});

		test("Item renders the child anchor and merges class, data-*, and ref", () => {
			const ref = createRef<HTMLAnchorElement>();
			render(
				<DropdownMenu.Root open modal={false}>
					<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item asChild>
							<a href="/endpoints" className="mine" data-testid="custom" ref={ref}>
								Endpoints
							</a>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>,
			);

			const item = screen.getByRole("menuitem", { name: "Endpoints" });
			expect(item.tagName).toBe("A");
			expect(item).toHaveAttribute("href", "/endpoints");
			expect(item).toHaveClass("mine");
			expect(item).toHaveAttribute("data-testid", "custom");
			expect(item).toHaveAttribute("data-slot", "dropdown-menu-item");
			expect(ref.current).toBe(item);
		});
	});

	describe("data-slot", () => {
		/**
		 * Every part, with the menu and its submenu open so the structural
		 * assertions need no hover-intent timing. A modal menu hides the rest of
		 * the page behind `aria-hidden`, so the trigger is queried with `hidden`.
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

		test.each([
			{ slot: "dropdown-menu-content", role: "menu" },
			{ slot: "dropdown-menu-group", role: "group" },
			{ slot: "dropdown-menu-item", role: "menuitem" },
			{ slot: "dropdown-menu-checkbox-item", role: "menuitemcheckbox" },
			{ slot: "dropdown-menu-radio-group", role: "group" },
			{ slot: "dropdown-menu-radio-item", role: "menuitemradio" },
			{ slot: "dropdown-menu-separator", role: "none" },
			{ slot: "dropdown-menu-sub-trigger", role: "menuitem" },
			{ slot: "dropdown-menu-sub-content", role: "menu" },
		])("$slot lands on the element with role $role", ({ slot, role }) => {
			renderFullMenu();

			// Why `~=`: `Separator` joins its own slot after the part's, so the value is a chain.
			const elements = document.querySelectorAll(`[data-slot~="${slot}"]`);
			expect(elements).toHaveLength(1);
			expect(elements[0]).toHaveAttribute("role", role);
		});

		test.each([
			{ slot: "dropdown-menu-label", text: "Account" },
			{ slot: "dropdown-menu-label", text: "Destinations" },
			{ slot: "dropdown-menu-shortcut", text: "⌘P" },
		])("$slot lands on the element rendering $text", ({ slot, text }) => {
			renderFullMenu();

			expect(screen.getByText(text)).toHaveAttribute("data-slot", slot);
		});

		test("dropdown-menu-trigger lands on the trigger button", () => {
			renderFullMenu();

			expect(screen.getByRole("button", { name: "Open", hidden: true })).toHaveAttribute(
				"data-slot",
				"dropdown-menu-trigger",
			);
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

	describe("click propagation guard", () => {
		test("a click inside the menu does not reach an ancestor onClick", async () => {
			// React routes portaled events through the React tree, so without
			// Content's `stopPropagation` an item click would also fire the
			// row or card handler the menu is rendered inside.
			const onAncestorClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
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

			expect(onAncestorClick).toHaveBeenCalledTimes(0);
		});

		test("Content still runs a consumer onClick after stopping propagation", async () => {
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
		// Radix defaults `loop` to false; the wrap-around is mantle's default.
		test("ArrowDown from the last item wraps to the first", async () => {
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

		test("ArrowDown wraps inside a submenu too", async () => {
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

	describe("width", () => {
		// Why the class assertion: `width="trigger"` emits no data attribute. Its only
		// observable is the utility that reads the `--radix-dropdown-menu-trigger-width`
		// variable Radix publishes on the positioner.
		const triggerWidthClass = "w-(--radix-dropdown-menu-trigger-width)";

		test('width="trigger" sizes the content from the trigger width variable', () => {
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
			"width=%s leaves the content at its intrinsic width",
			(width) => {
				render(
					<DropdownMenu.Root defaultOpen>
						<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
						<DropdownMenu.Content width={width}>
							<DropdownMenu.Item>Profile</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>,
				);

				// Why every width utility: a negated match on one class passes when the
				// regression returns under another width class.
				const widthClasses = Array.from(screen.getByRole("menu").classList).filter((name) =>
					name.startsWith("w-"),
				);
				expect(widthClasses).toEqual([]);
			},
		);
	});
});

type ItemLabels = {
	subTrigger: ReactNode;
	checkboxItem: ReactNode;
	radioItem: ReactNode;
};

const defaultLabels: ItemLabels = {
	subTrigger: "Share",
	checkboxItem: "Errors",
	radioItem: "Small",
};

/**
 * An open, non-modal menu holding the three parts that wrap their children.
 * With `asChild`, each label rides inside a consumer `<a>` the part slots onto.
 */
function WrappedItems({
	labels = defaultLabels,
	asChild = false,
}: {
	labels?: ItemLabels;
	asChild?: boolean;
}) {
	const wrap = (label: ReactNode, href: string) => (asChild ? <a href={href}>{label}</a> : label);
	return (
		<DropdownMenu.Root open modal={false}>
			<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Sub open>
					<DropdownMenu.SubTrigger asChild={asChild}>
						{wrap(labels.subTrigger, "#share")}
					</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<DropdownMenu.Item>Copy link</DropdownMenu.Item>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
				<DropdownMenu.CheckboxItem checked asChild={asChild}>
					{wrap(labels.checkboxItem, "#errors")}
				</DropdownMenu.CheckboxItem>
				<DropdownMenu.RadioGroup value="small">
					<DropdownMenu.RadioItem value="small" asChild={asChild}>
						{wrap(labels.radioItem, "#small")}
					</DropdownMenu.RadioItem>
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

/**
 * The three parts that render a permanent element beside the label a consumer
 * passes: the sub-trigger's caret, and the check indicator each selection item
 * keeps mounted while it is checked.
 */
const wrappedParts = [
	{ part: "subTrigger", slot: "dropdown-menu-sub-trigger", text: "Share" },
	{ part: "checkboxItem", slot: "dropdown-menu-checkbox-item", text: "Errors" },
	{ part: "radioItem", slot: "dropdown-menu-radio-item", text: "Small" },
] as const;

function getItem(slot: string): HTMLElement {
	const item = document.querySelector(`[data-slot="${slot}"]`);
	if (!(item instanceof HTMLElement)) {
		throw new Error(`expected a mounted ${slot}`);
	}
	return item;
}

describe.each([{ asChild: false }, { asChild: true }])(
	"DropdownMenu label slots (asChild: $asChild)",
	({ asChild }) => {
		test.each(wrappedParts)("$slot wraps its children in a label span", ({ slot, text }) => {
			render(<WrappedItems asChild={asChild} />);

			const item = getItem(slot);
			const label = item.querySelector(`[data-slot="${slot}-label"]`);
			expect(label).toHaveTextContent(text);
			expect(label?.parentElement).toBe(item);
		});

		test.each(wrappedParts)(
			"$slot keeps rendering when a translated label unmounts",
			({ part, slot, text }) => {
				const { rerender } = render(<WrappedItems asChild={asChild} />);
				const item = getItem(slot);
				translateTextNodes(item);
				expect(item).toHaveTextContent(`[${text}-es]`);

				// The indicator beside the label stays mounted, so React deletes the
				// label on its own. Without the span that deletion names a text node the
				// engine reparented, and `removeChild` throws.
				rerender(<WrappedItems asChild={asChild} labels={{ ...defaultLabels, [part]: null }} />);

				expect(item).toHaveTextContent("");
			},
		);

		test.each(wrappedParts)(
			"$slot keeps rendering when a translated label swaps to an element",
			({ part, slot, text }) => {
				const { rerender } = render(<WrappedItems asChild={asChild} />);
				const item = getItem(slot);
				translateTextNodes(item);
				expect(item).toHaveTextContent(`[${text}-es]`);

				rerender(
					<WrappedItems
						asChild={asChild}
						labels={{
							...defaultLabels,
							[part]: (
								<span>
									{text} <span data-testid="count">12</span>
								</span>
							),
						}}
					/>,
				);

				expect(findTranslatedFont(item)).toBeNull();
				expect(screen.getByTestId("count")).toHaveTextContent("12");
			},
		);
	},
);

describe("asChild on the parts that wrap their children", () => {
	test.each([
		{ slot: "dropdown-menu-sub-trigger", role: "menuitem", href: "#share", text: "Share" },
		{
			slot: "dropdown-menu-checkbox-item",
			role: "menuitemcheckbox",
			href: "#errors",
			text: "Errors",
		},
		{ slot: "dropdown-menu-radio-item", role: "menuitemradio", href: "#small", text: "Small" },
	])(
		"$slot slots onto the anchor and leaves no bare text node inside it",
		({ slot, role, href, text }) => {
			render(<WrappedItems asChild />);

			const item = screen.getByRole(role, { name: text });
			expect(item.tagName).toBe("A");
			expect(item).toHaveAttribute("href", href);
			expect(item).toHaveAttribute("data-slot", slot);
			expect(getItem(slot)).toBe(item);
			// The caret or indicator moved inside the anchor beside the span, and no
			// bare text node sits at the anchor's top level for a translation engine to reparent.
			expect(item.childElementCount).toBe(2);
			expect(Array.from(item.childNodes).every((node) => node instanceof Element)).toBe(true);
		},
	);

	test("CheckboxItem asChild merges class, data-*, and ref onto the anchor", () => {
		const ref = createRef<HTMLAnchorElement>();
		render(
			<DropdownMenu.Root open modal={false}>
				<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.CheckboxItem checked asChild className="mine" data-testid="custom">
						<a href="#errors" className="theirs" ref={ref}>
							Errors
						</a>
					</DropdownMenu.CheckboxItem>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);

		const item = screen.getByRole("menuitemcheckbox", { name: "Errors" });
		expect(item).toHaveAttribute("aria-checked", "true");
		expect(item).toHaveClass("mine", "theirs");
		expect(item).toHaveAttribute("data-testid", "custom");
		expect(ref.current).toBe(item);
	});
});
