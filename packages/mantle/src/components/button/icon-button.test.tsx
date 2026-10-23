import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Button } from "./button.js";
import { IconButton } from "./icon-button.js";

describe("IconButton", () => {
	describe("label", () => {
		// Regression: voice-control tools (e.g. Rango) treat DOM text as a
		// visible label, so a hidden label span suppressed their hints on every
		// icon button. The name must be the `aria-label` attribute, with no text
		// node in the button.
		test("renders the label as aria-label with no text content", () => {
			render(<IconButton appearance="ghost" intent="neutral" label="globe" icon={<GlobeIcon />} />);
			const button = screen.getByRole("button", { name: "globe" });
			expect(button).toHaveAttribute("aria-label", "globe");
			expect(button.textContent).toBe("");
		});

		test("stamps the label as aria-label onto an asChild anchor", () => {
			render(
				<IconButton appearance="ghost" intent="neutral" asChild label="home" icon={<GlobeIcon />}>
					<a href="#home" />
				</IconButton>,
			);
			const link = screen.getByRole("link", { name: "home" });
			expect(link).toHaveAttribute("aria-label", "home");
			expect(link.textContent).toBe("");
		});
	});

	test("stamps the slot and the hooks other components select on", () => {
		render(
			<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
		);
		const button = screen.getByRole("button", { name: "globe" });
		expect(button).toHaveAttribute("data-slot", "icon-button");
		// toast.tsx keys its `data-icon-button:` variants on this attribute.
		expect(button).toHaveAttribute("data-icon-button", "true");
		// Cross-file spelling pins: dialog.tsx and sheet.tsx select `has-[.icon-button]`,
		// and button-group.tsx sets `--icon-button-border-radius` for its panel appearance.
		expect(button).toHaveClass("icon-button");
		expect(button).toHaveClass("rounded-[var(--icon-button-border-radius,0.375rem)]");
	});

	test("renders the icon through Icon in the button's only child", () => {
		render(
			<IconButton
				appearance="outlined"
				intent="neutral"
				label="globe"
				icon={<svg data-testid="icon" />}
			/>,
		);
		const button = screen.getByRole("button", { name: "globe" });
		const icon = screen.getByTestId("icon");
		expect(button.childNodes).toHaveLength(1);
		expect(button.firstChild).toContainElement(icon);
		expect(icon).toHaveAttribute("data-slot", "icon svg-only");
		expect(icon.parentElement).toHaveAttribute("data-state", "active");
	});

	describe("appearance", () => {
		// Parity pin: each class below is the one `Button` draws for the same
		// appearance at the neutral tone, so a permuted lookup table on either
		// component splits the two apart. IconButton has no `link` appearance.
		test.each([
			["filled", "bg-filled-neutral"],
			["ghost", "text-strong"],
			["outlined", "border-form"],
		] as const)(
			`appearance="%s" stamps data-appearance and matches Button's %s`,
			(appearance, toneClass) => {
				render(
					<>
						<IconButton
							appearance={appearance}
							intent="neutral"
							label="icon button"
							icon={<GlobeIcon />}
						/>
						<Button appearance={appearance} intent="neutral">
							button
						</Button>
					</>,
				);
				// Each query names the button it wants, so a third button in the
				// tree throws here rather than shifting a positional index and
				// asserting the pair against the wrong element.
				const iconButton = screen.getByRole("button", { name: "icon button" });
				expect(iconButton).toHaveAttribute("data-appearance", appearance);
				expect(iconButton).toHaveClass(toneClass);
				expect(screen.getByRole("button", { name: "button" })).toHaveClass(toneClass);
			},
		);
	});

	test(`stamps data-intent="neutral"`, () => {
		render(<IconButton appearance="ghost" intent="neutral" label="globe" icon={<GlobeIcon />} />);
		expect(screen.getByRole("button")).toHaveAttribute("data-intent", "neutral");
	});

	describe("size", () => {
		// Size pin: `data-size` stamps the prop whatever the lookup returns, so the
		// class is the only observable of the `size` table.
		test(`defaults to size="md" when \`size\` is omitted`, () => {
			render(
				<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", "md");
			expect(button).toHaveClass("size-9");
		});

		test.each([
			["2xs", "size-5"],
			["xs", "size-6"],
			["sm", "size-7"],
			["lg", "size-10"],
			["xl", "size-12"],
		] as const)(`renders size="%s" with box size class %s`, (size, sizeClass) => {
			render(
				<IconButton
					appearance="outlined"
					intent="neutral"
					size={size}
					label="globe"
					icon={<GlobeIcon />}
				/>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", size);
			expect(button).toHaveClass(sizeClass);
		});

		test("forwards data-slot, data-size, and data-appearance to an `asChild` anchor", () => {
			render(
				<IconButton
					appearance="outlined"
					intent="neutral"
					asChild
					size="xl"
					label="home"
					icon={<GlobeIcon />}
				>
					<a href="#yolo" />
				</IconButton>,
			);
			const link = screen.getByRole("link", { name: "home" });
			expect(link).toHaveAttribute("data-slot", "icon-button");
			expect(link).toHaveAttribute("data-size", "xl");
			expect(link).toHaveAttribute("data-appearance", "outlined");
			expect(link).toHaveAttribute("href", "#yolo");
		});
	});

	describe("disabled", () => {
		test("isLoading sets the native disabled attribute and aria-disabled", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					isLoading
					label="Save"
					icon={<GlobeIcon />}
				/>,
			);
			const button = screen.getByRole("button", { name: "Save" });
			expect(button).toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "true");
			expect(button).toHaveAttribute("data-disabled", "");
		});

		test("aria-disabled={false} cannot re-enable a disabled button", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					disabled
					aria-disabled={false}
					label="Save"
					icon={<GlobeIcon />}
				/>,
			);
			const button = screen.getByRole("button", { name: "Save" });
			expect(button).toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "true");
		});

		test("data-disabled is present while disabled and absent once enabled", () => {
			// Why presence: the `data-disabled:` variant matches the attribute, so
			// a `"false"` value fires it on every enabled button.
			const { rerender } = render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					disabled
					label="Save"
					icon={<GlobeIcon />}
				/>,
			);
			const button = screen.getByRole("button", { name: "Save" });
			expect(button).toHaveAttribute("data-disabled", "");

			rerender(
				<IconButton appearance="ghost" intent="neutral" label="Save" icon={<GlobeIcon />} />,
			);
			expect(button).not.toHaveAttribute("data-disabled");
		});

		test("aria-disabled=true stamps data-disabled", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					aria-disabled="true"
					label="Save"
					icon={<GlobeIcon />}
				/>,
			);
			const button = screen.getByRole("button", { name: "Save" });
			expect(button).toHaveAttribute("data-disabled", "");
		});

		test.each([
			["aria-disabled", { "aria-disabled": true }],
			[`aria-disabled="true"`, { "aria-disabled": "true" }],
		] as const)(
			"`%s` alone disables the button natively and suppresses clicks",
			async (_name, disablingProps) => {
				const user = userEvent.setup();
				const handleClick = vi.fn<() => void>();
				render(
					<IconButton
						appearance="ghost"
						intent="neutral"
						label="Save"
						icon={<GlobeIcon />}
						onClick={handleClick}
						{...disablingProps}
					/>,
				);
				const button = screen.getByRole("button", { name: "Save" });
				// The ARIA state alone would leave the button clickable, so it resolves to the
				// native attribute as well.
				expect(button).toBeDisabled();
				expect(button).toHaveAttribute("aria-disabled", "true");
				expect(button).toHaveAttribute("data-disabled", "");

				await user.click(button);
				expect(handleClick).toHaveBeenCalledTimes(0);
			},
		);

		test("data-loading is present while loading and absent once idle", () => {
			const { rerender } = render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					isLoading
					label="Save"
					icon={<GlobeIcon />}
				/>,
			);
			const button = screen.getByRole("button", { name: "Save" });
			expect(button).toHaveAttribute("data-loading", "");

			rerender(
				<IconButton appearance="ghost" intent="neutral" label="Save" icon={<GlobeIcon />} />,
			);
			expect(button).not.toHaveAttribute("data-loading");
		});

		test("a disabled asChild anchor drops its own onClickCapture, which Radix would run first", async () => {
			const user = userEvent.setup();
			const handleClickCapture = vi.fn<() => void>();
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					asChild
					disabled
					label="Open"
					icon={<GlobeIcon />}
				>
					<a href="#yolo" onClickCapture={handleClickCapture}>
						Open
					</a>
				</IconButton>,
			);

			await user.click(screen.getByRole("link", { name: "Open" }));

			expect(handleClickCapture).toHaveBeenCalledTimes(0);
			expect(window.location.hash).toBe("");
		});

		test("a disabled asChild anchor is inert: aria-disabled, out of the tab order, click cancelled", async () => {
			const user = userEvent.setup();
			const handleClick = vi.fn<() => void>();
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					asChild
					disabled
					label="Home"
					icon={<GlobeIcon />}
				>
					<a href="#home" onClick={handleClick} />
				</IconButton>,
			);
			const link = screen.getByRole("link", { name: "Home" });
			expect(link).not.toHaveAttribute("disabled");
			expect(link).toHaveAttribute("aria-disabled", "true");
			expect(link).toHaveAttribute("tabindex", "-1");

			await user.click(link);
			expect(handleClick).toHaveBeenCalledTimes(0);
			expect(window.location.hash).toBe("");
		});

		test("the loading spinner is hidden from assistive technology", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					isLoading
					label="Save"
					icon={<GlobeIcon />}
				/>,
			);
			const spinner = screen.getByRole("button").querySelector("[data-state='active'] > svg");
			expect(spinner).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("isLoading", () => {
		test("swaps the consumer's icon for a spinner, keeps the label, and swaps back once idle", () => {
			const { rerender } = render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="save"
					icon={<svg data-testid="icon" />}
					isLoading
				/>,
			);
			const button = screen.getByRole("button", { name: "save" });
			const icon = screen.getByTestId("icon");
			expect(button).toHaveAttribute("data-loading", "");
			// The consumer's icon stays mounted for the transition, hidden behind the spinner.
			expect(icon.parentElement).toHaveAttribute("data-state", "inactive");
			expect(icon.parentElement).toHaveAttribute("aria-hidden", "true");
			const spinner = button.querySelector("[data-state='active'] > svg");
			expect(spinner).toBeInTheDocument();
			expect(spinner).not.toBe(icon);

			rerender(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="save"
					icon={<svg data-testid="icon" />}
					isLoading={false}
				/>,
			);
			expect(button).not.toHaveAttribute("data-loading");
			expect(button).toBeEnabled();
			// The same nodes swap state, so a CSS transition can carry the swap.
			expect(screen.getByTestId("icon")).toBe(icon);
			expect(icon.parentElement).toHaveAttribute("data-state", "active");
			expect(spinner?.parentElement).toHaveAttribute("data-state", "inactive");
		});

		test("forwards the loading state and the spinner to an `asChild` child", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					asChild
					label="save"
					icon={<svg data-testid="icon" />}
					isLoading
				>
					<a href="#yolo" />
				</IconButton>,
			);
			const link = screen.getByRole("link", { name: "save" });
			expect(link).toHaveAttribute("data-loading", "");
			expect(link).toHaveAttribute("aria-disabled", "true");
			expect(link).toHaveAttribute("tabindex", "-1");
			expect(screen.getByTestId("icon").parentElement).toHaveAttribute("data-state", "inactive");
			const spinner = link.querySelector("[data-state='active'] > svg");
			expect(spinner).toBeInTheDocument();
			expect(spinner).not.toBe(screen.getByTestId("icon"));
		});
	});

	describe("type", () => {
		test(`defaults to type="button" when \`type\` is omitted`, () => {
			render(
				<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			expect(screen.getByRole("button")).toHaveAttribute("type", "button");
		});

		test(`renders an explicit type="submit"`, () => {
			render(
				<IconButton
					appearance="outlined"
					intent="neutral"
					type="submit"
					label="search"
					icon={<GlobeIcon />}
				/>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
		});

		test("does not forward an explicit `type` to an `asChild` anchor", () => {
			render(
				<IconButton
					appearance="outlined"
					intent="neutral"
					type="submit"
					asChild
					label="home"
					icon={<GlobeIcon />}
				>
					<a href="#yolo" />
				</IconButton>,
			);
			expect(screen.getByRole("link")).not.toHaveAttribute("type");
		});
	});
});

/**
 * Type-level contracts, owned by `pnpm typecheck` rather than by a `test()`: a
 * `@ts-expect-error` that compiles is the assertion, and pairing it with a runtime
 * `expect` would read as coverage the vitest run does not have.
 *
 * `appearance` and `intent` are both required, so no call site inherits a weight or
 * a tone it did not state. `intent` takes `"neutral"` alone — `IconButton` draws no
 * accent or danger tone, and a call site that asks for one would otherwise compile
 * and then render neutral. `aria-label` is typed `never`, so `label` is the single
 * naming interface — TypeScript skips excess-attribute checks for hyphenated JSX
 * attributes, and the `never` type is what makes the call site an error anyway.
 */
export function typeLevelContracts() {
	return (
		<>
			{/* @ts-expect-error -- appearance is required on IconButton */}
			<IconButton intent="neutral" label="globe" icon={<GlobeIcon />} />
			{/* @ts-expect-error -- intent is required on IconButton */}
			<IconButton appearance="ghost" label="globe" icon={<GlobeIcon />} />
			{/* @ts-expect-error -- IconButton draws the neutral tone only */}
			<IconButton appearance="ghost" intent="accent" label="globe" icon={<GlobeIcon />} />
			{/* @ts-expect-error -- IconButton draws the neutral tone only */}
			<IconButton appearance="filled" intent="danger" label="globe" icon={<GlobeIcon />} />
			{/* @ts-expect-error -- aria-label is typed never; `label` is the single naming interface */}
			<IconButton
				appearance="ghost"
				intent="neutral"
				label="globe"
				aria-label="globe"
				icon={<GlobeIcon />}
			/>
		</>
	);
}
