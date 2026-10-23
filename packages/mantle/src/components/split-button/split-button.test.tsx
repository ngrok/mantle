import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { SplitButton } from "./split-button.js";

function renderSplitButton(
	props?: Pick<ComponentProps<typeof SplitButton.Root>, "size" | "open" | "onOpenChange">,
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

	test("clicking the primary action fires its onClick without opening the menu", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<SplitButton.Root>
				<SplitButton.PrimaryAction onClick={onClick}>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Save" }));

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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

	test("Escape closes the menu and reports `false` through `onOpenChange`", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const { menuTrigger } = renderSplitButton({ onOpenChange });
		await user.click(menuTrigger);
		expect(await screen.findByRole("menu")).toBeInTheDocument();

		await user.keyboard("{Escape}");

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
		expect(onOpenChange).toHaveBeenCalledTimes(2);
		expect(onOpenChange).toHaveBeenLastCalledWith(false);
	});

	test("a controlled open={false} keeps the menu closed on a trigger click and still reports the request", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const { menuTrigger } = renderSplitButton({ open: false, onOpenChange });

		await user.click(menuTrigger);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenLastCalledWith(true);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
	});

	test("forwards `defaultOpen` from Root so the menu starts open", () => {
		render(
			<SplitButton.Root defaultOpen>
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		expect(screen.getByRole("menu")).toBeInTheDocument();
		// Why `hidden`: the open modal menu removes the trigger from the accessibility tree.
		expect(screen.getByRole("button", { name: "More save options", hidden: true })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});

	test("forwards `dir` from Root to the menu", () => {
		render(
			<SplitButton.Root open dir="rtl">
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		expect(screen.getByRole("menu")).toHaveAttribute("dir", "rtl");
	});

	test("forwards `modal` from Root so a non-modal menu leaves the primary action reachable", () => {
		render(
			<SplitButton.Root open modal={false}>
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		// Why the primary action: a modal menu hides the rest of the page behind
		// `aria-hidden`, so the button is only queryable while `modal` reaches Radix.
		expect(screen.getByRole("menu")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
	});

	test("selecting a menu item fires its onClick and closes the menu", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn<() => void>();
		render(
			<SplitButton.Root>
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem onClick={onClick}>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		await user.click(screen.getByRole("button", { name: "More save options" }));
		await user.click(await screen.findByRole("menuitem", { name: "Save as draft" }));

		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	test.each([
		{ align: undefined, expected: "end" },
		{ align: "start", expected: "start" },
	] as const)("MenuContent align=$align places the menu at $expected", ({ align, expected }) => {
		render(
			<SplitButton.Root open>
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent align={align}>
					<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		expect(screen.getByRole("menu")).toHaveAttribute("data-align", expected);
	});

	test("a consumer className on MenuItem overrides the part's gap", () => {
		render(
			<SplitButton.Root open>
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger label="More save options" />
				<SplitButton.MenuContent>
					<SplitButton.MenuItem className="gap-4">Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		// Why the class check: the tailwind-merge contract drops the part's `gap-2` for the consumer's `gap-4`.
		const menuItem = screen.getByRole("menuitem", { name: "Save as draft" });
		expect(Array.from(menuItem.classList).filter((name) => name.startsWith("gap-"))).toEqual([
			"gap-4",
		]);
	});

	test("a custom `icon` on MenuTrigger replaces the default caret", () => {
		render(
			<SplitButton.Root>
				<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
				<SplitButton.MenuTrigger
					label="More save options"
					icon={<svg data-testid="custom-icon" />}
				/>
				<SplitButton.MenuContent>
					<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
				</SplitButton.MenuContent>
			</SplitButton.Root>,
		);

		const menuTrigger = screen.getByRole("button", { name: "More save options" });
		const shownIcons = menuTrigger.querySelectorAll("[data-state='active'] > svg");
		expect(shownIcons).toHaveLength(1);
		expect(shownIcons[0]).toBe(screen.getByTestId("custom-icon"));
	});
});
