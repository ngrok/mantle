import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { SplitButton } from "./split-button.js";

function renderSplitButton(
	props?: Pick<ComponentProps<typeof SplitButton.Root>, "size" | "onOpenChange">,
) {
	const { container } = render(
		<SplitButton.Root {...props}>
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

// Why module scope: `pnpm typecheck` owns these directives, so no runtime `expect`
// stands beside them. If a part re-exposes the prop, the directive goes unused and typecheck fails.
const _sizeOnPrimaryAction = (
	// @ts-expect-error -- PrimaryActionProps omits `size`
	<SplitButton.PrimaryAction size="xs">Save</SplitButton.PrimaryAction>
);
const _sizeOnMenuTrigger = (
	// @ts-expect-error -- MenuTriggerProps omits `size`
	<SplitButton.MenuTrigger label="More save options" size="xs" />
);
const _intentOnPrimaryAction = (
	// @ts-expect-error -- PrimaryActionProps omits `intent`
	<SplitButton.PrimaryAction intent="danger">Save</SplitButton.PrimaryAction>
);
const _appearanceOnMenuTrigger = (
	// @ts-expect-error -- MenuTriggerProps omits `appearance`
	<SplitButton.MenuTrigger label="More save options" appearance="ghost" />
);

describe("SplitButton", () => {
	test(`defaults both halves to size="md" when \`size\` is omitted`, () => {
		const { root, primaryAction, menuTrigger } = renderSplitButton();
		expect(root).toHaveAttribute("data-size", "md");
		expect(primaryAction).toHaveAttribute("data-size", "md");
		expect(menuTrigger).toHaveAttribute("data-size", "md");
	});

	test("both halves render outlined + neutral", () => {
		const { primaryAction, menuTrigger } = renderSplitButton();
		expect(primaryAction).toHaveAttribute("data-appearance", "outlined");
		expect(primaryAction).toHaveAttribute("data-intent", "neutral");
		expect(menuTrigger).toHaveAttribute("data-appearance", "outlined");
		expect(menuTrigger).toHaveAttribute("data-intent", "neutral");
	});

	test(`passes size="xl" from Root to both halves`, () => {
		const { root, primaryAction, menuTrigger } = renderSplitButton({ size: "xl" });
		expect(root).toHaveAttribute("data-size", "xl");
		expect(primaryAction).toHaveAttribute("data-size", "xl");
		expect(menuTrigger).toHaveAttribute("data-size", "xl");
	});

	test("forwards `onOpenChange` from Root and opens the menu on a trigger click", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const { menuTrigger } = renderSplitButton({ onOpenChange });
		await user.click(menuTrigger);
		expect(await screen.findByRole("menu")).toBeInTheDocument();
		expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(true);
	});
});
