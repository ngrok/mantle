import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ButtonSize } from "../button/sizes.js";
import { SplitButton } from "./split-button.js";

function renderSplitButton(size?: ButtonSize) {
	const { container } = render(
		<SplitButton.Root size={size}>
			<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
			<SplitButton.MenuTrigger label="More save options" />
			<SplitButton.MenuContent>
				<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
			</SplitButton.MenuContent>
		</SplitButton.Root>,
	);

	return {
		root: container.querySelector('[data-slot="split-button"]'),
		primaryAction: screen.getByRole("button", { name: "Save" }),
		menuTrigger: screen.getByRole("button", { name: "More save options" }),
	};
}

describe("SplitButton", () => {
	describe("size", () => {
		test(`defaults both halves to size="md" when \`size\` is omitted`, () => {
			const { root, primaryAction, menuTrigger } = renderSplitButton();
			expect(root).toHaveAttribute("data-size", "md");
			expect(primaryAction).toHaveAttribute("data-size", "md");
			expect(primaryAction).toHaveClass("h-9");
			expect(menuTrigger).toHaveAttribute("data-size", "md");
			expect(menuTrigger).toHaveClass("size-9");
		});

		test("both halves render outlined + neutral", () => {
			const { primaryAction, menuTrigger } = renderSplitButton();
			expect(primaryAction).toHaveAttribute("data-appearance", "outlined");
			expect(primaryAction).toHaveAttribute("data-intent", "neutral");
			expect(menuTrigger).toHaveAttribute("data-appearance", "outlined");
			expect(menuTrigger).toHaveAttribute("data-intent", "neutral");
		});

		test.each([
			["xs", "h-6", "size-6"],
			["sm", "h-7", "size-7"],
			["md", "h-9", "size-9"],
			["lg", "h-10", "size-10"],
			["xl", "h-12", "size-12"],
		] as const)(
			`size="%s" on Root drives both halves to the same height`,
			(size, buttonHeightClass, iconButtonSizeClass) => {
				const { root, primaryAction, menuTrigger } = renderSplitButton(size);
				expect(root).toHaveAttribute("data-size", size);
				expect(primaryAction).toHaveAttribute("data-size", size);
				expect(primaryAction).toHaveClass(buttonHeightClass);
				expect(menuTrigger).toHaveAttribute("data-size", size);
				expect(menuTrigger).toHaveClass(iconButtonSizeClass);
			},
		);

		test("rejects `size` on the parts at the type level — set it on Root instead", () => {
			// Creating the elements (without rendering) pins the Omit<> contract:
			// if `size` is ever re-exposed on a part, these @ts-expect-error
			// directives become unused and typecheck fails.
			const primaryAction = (
				// @ts-expect-error -- PrimaryActionProps omits `size`
				<SplitButton.PrimaryAction size="xs">Save</SplitButton.PrimaryAction>
			);
			const menuTrigger = (
				// @ts-expect-error -- MenuTriggerProps omits `size`
				<SplitButton.MenuTrigger label="More save options" size="xs" />
			);
			expect(primaryAction).toBeDefined();
			expect(menuTrigger).toBeDefined();
		});

		test("rejects `appearance` and `intent` on the parts at the type level", () => {
			// The parts' outlined + neutral rendering is the design; the
			// required Button/IconButton props are pinned internally.
			const primaryAction = (
				// @ts-expect-error -- PrimaryActionProps omits `intent`
				<SplitButton.PrimaryAction intent="danger">Save</SplitButton.PrimaryAction>
			);
			const menuTrigger = (
				// @ts-expect-error -- MenuTriggerProps omits `appearance`
				<SplitButton.MenuTrigger label="More save options" appearance="ghost" />
			);
			expect(primaryAction).toBeDefined();
			expect(menuTrigger).toBeDefined();
		});
	});
});
