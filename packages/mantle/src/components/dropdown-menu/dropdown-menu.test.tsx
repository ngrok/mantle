import { render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
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

				expect(item.querySelector("font")).toBeNull();
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
