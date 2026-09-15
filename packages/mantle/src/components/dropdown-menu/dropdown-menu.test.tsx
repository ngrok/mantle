import { render, screen } from "@testing-library/react";
import { createRef, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
import { DropdownMenu } from "./dropdown-menu.js";

describe("DropdownMenu", () => {
	describe("Shortcut", () => {
		test('locks translate="no" so a key name is never translated', () => {
			render(<DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>);
			expect(screen.getByText("⌘S")).toHaveAttribute("translate", "no");
		});

		test("a wider props object cannot carry translate past the type", () => {
			const wideProps: Record<string, string> = { translate: "yes" };
			render(<DropdownMenu.Shortcut {...wideProps}>⌘S</DropdownMenu.Shortcut>);
			expect(screen.getByText("⌘S")).toHaveAttribute("translate", "no");
		});
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

/** An open, non-modal menu holding the three parts that wrap their children. */
function WrappedItems({ labels = defaultLabels }: { labels?: ItemLabels }) {
	return (
		<DropdownMenu.Root open modal={false}>
			<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Sub open>
					<DropdownMenu.SubTrigger>{labels.subTrigger}</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<DropdownMenu.Item>Copy link</DropdownMenu.Item>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
				<DropdownMenu.CheckboxItem checked>{labels.checkboxItem}</DropdownMenu.CheckboxItem>
				<DropdownMenu.RadioGroup value="small">
					<DropdownMenu.RadioItem value="small">{labels.radioItem}</DropdownMenu.RadioItem>
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

describe("DropdownMenu label slots", () => {
	test.each(wrappedParts)("$slot wraps its children in a contents label span", ({ slot, text }) => {
		render(<WrappedItems />);

		const item = getItem(slot);
		const label = item.querySelector(`[data-slot="${slot}-label"]`);
		expect(label).toHaveTextContent(text);
		expect(label).toHaveClass("contents");
		expect(label?.parentElement).toBe(item);
	});

	test.each(wrappedParts)(
		"$slot keeps rendering when a translated label unmounts",
		({ part, slot, text }) => {
			const { rerender } = render(<WrappedItems />);
			const item = getItem(slot);
			translateTextNodes(item);
			expect(item).toHaveTextContent(`[${text}-es]`);

			// The indicator beside the label stays mounted, so React deletes the
			// label on its own. Without the span that deletion names a text node the
			// engine reparented, and `removeChild` throws.
			rerender(<WrappedItems labels={{ ...defaultLabels, [part]: null }} />);

			expect(item).toHaveTextContent("");
		},
	);

	test.each(wrappedParts)(
		"$slot keeps rendering when a translated label swaps to an element",
		({ part, slot, text }) => {
			const { rerender } = render(<WrappedItems />);
			const item = getItem(slot);
			translateTextNodes(item);
			expect(item).toHaveTextContent(`[${text}-es]`);

			rerender(
				<WrappedItems
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
});
