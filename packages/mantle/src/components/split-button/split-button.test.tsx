import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
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
			expect(menuTrigger).toHaveAttribute("data-size", "md");
		});

		// The two halves must render at the same box height, and that is a
		// cross-component contract: the `Button` half sizes itself with `h-<n>`
		// and the `IconButton` half with `size-<n>`, so the composite only lines
		// up while both pick the same `<n>` for a given size name. happy-dom has
		// no layout and no Vitest project loads Tailwind, so the paired classes
		// are the only observable form of that contract — a divergent scale in
		// either variants file turns this red.
		test.each([
			["xs", "6"],
			["sm", "7"],
			["md", "9"],
			["lg", "10"],
			["xl", "12"],
		] as const)(`size="%s" on Root drives both halves to box height %s`, (size, scale) => {
			const { root, primaryAction, menuTrigger } = renderSplitButton(size);
			expect(root).toHaveAttribute("data-size", size);
			expect(primaryAction).toHaveAttribute("data-size", size);
			expect(primaryAction).toHaveClass(`h-${scale}`);
			expect(menuTrigger).toHaveAttribute("data-size", size);
			expect(menuTrigger).toHaveClass(`size-${scale}`);
		});

		test("rejects `size` on the parts at the type level — set it on Root instead", () => {
			// `pnpm typecheck` owns the @ts-expect-error directives: if `size` is
			// ever re-exposed on a part they become unused and typecheck fails. The
			// render shows why the type has to be the guard — each part spreads
			// caller props after its own, so a forced `size` is not sanitized at
			// runtime and the two halves would silently disagree.
			render(
				<SplitButton.Root size="lg">
					<SplitButton.PrimaryAction
						// @ts-expect-error -- PrimaryActionProps omits `size`
						size="xs"
					>
						Save
					</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger
						label="More save options"
						// @ts-expect-error -- MenuTriggerProps omits `size`
						size="xs"
					/>
				</SplitButton.Root>,
			);
			expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-size", "xs");
			expect(screen.getByRole("button", { name: "More save options" })).toHaveAttribute(
				"data-size",
				"xs",
			);
		});
	});

	describe("appearance and intent", () => {
		test("both halves render outlined + neutral", () => {
			const { primaryAction, menuTrigger } = renderSplitButton();
			expect(primaryAction).toHaveAttribute("data-appearance", "outlined");
			expect(primaryAction).toHaveAttribute("data-intent", "neutral");
			expect(menuTrigger).toHaveAttribute("data-appearance", "outlined");
			expect(menuTrigger).toHaveAttribute("data-intent", "neutral");
		});

		test("rejects `appearance` and `intent` on the parts at the type level", () => {
			// The parts' outlined + neutral rendering is the design, and the type is
			// what enforces it: `pnpm typecheck` owns the @ts-expect-error
			// directives, and if a part re-exposes either prop they become unused
			// and typecheck fails. The render shows there is no runtime guard —
			// each part spreads caller props after its own, so a forced tone or
			// weight reaches the DOM and breaks the composite's single look.
			render(
				<SplitButton.Root>
					<SplitButton.PrimaryAction
						// @ts-expect-error -- PrimaryActionProps omits `intent`
						intent="danger"
					>
						Save
					</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger
						label="More save options"
						// @ts-expect-error -- MenuTriggerProps omits `appearance`
						appearance="ghost"
					/>
				</SplitButton.Root>,
			);
			expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("data-intent", "danger");
			expect(screen.getByRole("button", { name: "More save options" })).toHaveAttribute(
				"data-appearance",
				"ghost",
			);
		});
	});

	describe("primary action", () => {
		test("clicking the primary action fires its onClick without opening the menu", async () => {
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
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
	});

	describe("menu", () => {
		test("the trigger opens the menu and reports its expanded state", async () => {
			const user = userEvent.setup();
			renderSplitButton();
			const menuTrigger = screen.getByRole("button", { name: "More save options" });
			expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();

			await user.click(menuTrigger);

			expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
			expect(screen.getByRole("menu")).toBeInTheDocument();
			expect(screen.getByRole("menuitem", { name: "Save as draft" })).toBeInTheDocument();
		});

		test("Escape closes the menu and returns focus to the trigger", async () => {
			const user = userEvent.setup();
			renderSplitButton();
			const menuTrigger = screen.getByRole("button", { name: "More save options" });

			await user.click(menuTrigger);
			expect(screen.getByRole("menu")).toBeInTheDocument();

			await user.keyboard("{Escape}");

			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
			expect(menuTrigger).toHaveFocus();
		});

		test("Root forwards `onOpenChange` to the underlying menu", async () => {
			const onOpenChange = vi.fn<(open: boolean) => void>();
			const user = userEvent.setup();
			render(
				<SplitButton.Root onOpenChange={onOpenChange}>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			await user.click(screen.getByRole("button", { name: "More save options" }));
			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenLastCalledWith(true);

			await user.keyboard("{Escape}");
			expect(onOpenChange).toHaveBeenCalledTimes(2);
			expect(onOpenChange).toHaveBeenLastCalledWith(false);
		});

		test("Root forwards a controlled `open` to the underlying menu", () => {
			render(
				<SplitButton.Root open>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			expect(screen.getByRole("menu")).toBeInTheDocument();
			expect(screen.getByRole("menuitem", { name: "Save as draft" })).toBeInTheDocument();
		});

		test("Root forwards `defaultOpen` to the underlying menu", () => {
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
		});

		test("a controlled open={false} keeps the menu closed when the trigger is clicked", async () => {
			const onOpenChange = vi.fn<(open: boolean) => void>();
			const user = userEvent.setup();
			render(
				<SplitButton.Root open={false} onOpenChange={onOpenChange}>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			await user.click(screen.getByRole("button", { name: "More save options" }));
			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenLastCalledWith(true);
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
			// The controlled value still governs the trigger's reported state.
			expect(screen.getByRole("button", { name: "More save options" })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		});

		test("Root forwards `dir` to the underlying menu", () => {
			render(
				<SplitButton.Root dir="rtl" open>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			expect(screen.getByRole("menu")).toHaveAttribute("dir", "rtl");
		});

		test("Root forwards `modal` to the underlying menu", () => {
			render(
				<SplitButton.Root open modal={false}>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			// A non-modal menu leaves the rest of the composite in the
			// accessibility tree; the default modal menu hides it behind
			// `aria-hidden`, so this only passes while `modal` is forwarded.
			expect(screen.getByRole("menu")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
		});

		test("selecting a menu item fires its handler and closes the menu", async () => {
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
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
			await user.click(screen.getByRole("menuitem", { name: "Save as draft" }));

			expect(onClick).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole("menu")).not.toBeInTheDocument();
		});

		test("MenuContent aligns to the end of the trigger by default", () => {
			render(
				<SplitButton.Root open>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent>
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			expect(screen.getByRole("menu")).toHaveAttribute("data-align", "end");
		});

		test("an explicit `align` on MenuContent wins over the default", () => {
			render(
				<SplitButton.Root open>
					<SplitButton.PrimaryAction>Save</SplitButton.PrimaryAction>
					<SplitButton.MenuTrigger label="More save options" />
					<SplitButton.MenuContent align="start">
						<SplitButton.MenuItem>Save as draft</SplitButton.MenuItem>
					</SplitButton.MenuContent>
				</SplitButton.Root>,
			);

			expect(screen.getByRole("menu")).toHaveAttribute("data-align", "start");
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

			const menuItem = screen.getByRole("menuitem", { name: "Save as draft" });
			expect(menuItem).toHaveClass("gap-4");
			expect(menuItem).not.toHaveClass("gap-2");
		});
	});

	describe("menu trigger", () => {
		test("renders a caret icon by default", () => {
			const { menuTrigger } = renderSplitButton();
			expect(menuTrigger.querySelectorAll("svg")).toHaveLength(1);
			expect(menuTrigger).toHaveAccessibleName("More save options");
		});

		test("a custom `icon` replaces the default caret", () => {
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
			const icons = menuTrigger.querySelectorAll("svg");
			expect(icons).toHaveLength(1);
			expect(icons[0]).toBe(screen.getByTestId("custom-icon"));
		});
	});
});
