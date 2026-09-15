import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
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
});

/** An open, non-modal menu holding the three parts that wrap their children. */
function WrappedItems({ label = "Errors" }: { label?: ReactNode }) {
	return (
		<DropdownMenu.Root open modal={false}>
			<DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
			<DropdownMenu.Content>
				<DropdownMenu.Sub open>
					<DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<DropdownMenu.Item>Copy link</DropdownMenu.Item>
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>
				<DropdownMenu.CheckboxItem checked>{label}</DropdownMenu.CheckboxItem>
				<DropdownMenu.RadioGroup value="small">
					<DropdownMenu.RadioItem value="small">Small</DropdownMenu.RadioItem>
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

describe("DropdownMenu label slots", () => {
	test.each([
		["dropdown-menu-sub-trigger", "Share"],
		["dropdown-menu-checkbox-item", "Errors"],
		["dropdown-menu-radio-item", "Small"],
	])("%s wraps its children in a contents label span", (slot, text) => {
		render(<WrappedItems />);

		const item = document.querySelector(`[data-slot="${slot}"]`);
		const label = item?.querySelector(`[data-slot="${slot}-label"]`);
		expect(label).toHaveTextContent(text);
		expect(label).toHaveClass("contents");
		expect(label?.parentElement).toBe(item);
	});

	test("keeps rendering when a translated checkbox label unmounts", () => {
		const { rerender } = render(<WrappedItems />);
		const item = document.querySelector('[data-slot="dropdown-menu-checkbox-item"]');
		if (item == null) {
			throw new Error("expected a mounted checkbox item");
		}
		translateTextNodes(item);
		expect(item).toHaveTextContent("[Errors-es]");

		rerender(<WrappedItems label={null} />);

		expect(item).toHaveTextContent("");
	});

	test("keeps rendering when a translated checkbox label swaps to an element", () => {
		const { rerender } = render(<WrappedItems />);
		const item = document.querySelector('[data-slot="dropdown-menu-checkbox-item"]');
		if (item == null) {
			throw new Error("expected a mounted checkbox item");
		}
		translateTextNodes(item);
		expect(item).toHaveTextContent("[Errors-es]");

		rerender(
			<WrappedItems
				label={
					<span>
						Errors <span data-testid="count">12</span>
					</span>
				}
			/>,
		);

		expect(item.querySelector("font")).toBeNull();
		expect(screen.getByTestId("count")).toHaveTextContent("12");
	});
});
