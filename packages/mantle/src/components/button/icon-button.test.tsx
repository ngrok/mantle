import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Button } from "./button.js";
import { IconButton } from "./icon-button.js";

describe("IconButton", () => {
	test("renders a button with an accessible label", () => {
		render(
			<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
		);
		expect(screen.getByRole("button", { name: "globe" })).toBeInTheDocument();
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

	describe("intent", () => {
		test.each(["filled", "ghost", "outlined"] as const)(
			`appearance="%s" stamps data-intent="neutral"`,
			(appearance) => {
				render(
					<IconButton
						appearance={appearance}
						intent="neutral"
						label="globe"
						icon={<GlobeIcon />}
					/>,
				);
				expect(screen.getByRole("button")).toHaveAttribute("data-intent", "neutral");
			},
		);

		// Tone pin: the accent and danger tones are off the `intent` union, so
		// no appearance may draw one. `data-intent` cannot catch that — it
		// stamps `"neutral"` whatever the classes say — so the class is the
		// only observable difference.
		test.each([
			[
				"filled",
				["bg-filled-neutral", "text-neutral-50"],
				["bg-filled-accent", "bg-filled-danger"],
			],
			["ghost", ["text-strong"], ["text-accent-600", "text-danger-600"]],
			[
				"outlined",
				["border-form", "bg-form", "text-strong"],
				["border-accent-600", "border-danger-600"],
			],
		] as const)(
			`appearance="%s" draws the neutral tone and no other`,
			(appearance, neutral, others) => {
				render(
					<IconButton
						appearance={appearance}
						intent="neutral"
						label="globe"
						icon={<GlobeIcon />}
					/>,
				);
				const button = screen.getByRole("button");
				expect(button).toHaveClass(...neutral);
				for (const toneClass of others) {
					expect(button).not.toHaveClass(toneClass);
				}
			},
		);
	});

	describe("size", () => {
		test(`defaults to size="md" when \`size\` is omitted`, () => {
			render(
				<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", "md");
			expect(button).toHaveClass("size-9");
		});

		test.each([
			["xs", "size-6"],
			["sm", "size-7"],
			["md", "size-9"],
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

		test("forwards the size class and data-size to an `asChild` anchor", () => {
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
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("data-size", "xl");
			expect(link).toHaveClass("size-12");
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

		test(`renders an explicit type="reset"`, () => {
			render(
				<IconButton
					appearance="outlined"
					intent="neutral"
					type="reset"
					label="reset"
					icon={<GlobeIcon />}
				/>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
		});

		test("does not leak the default `type` onto an `asChild` anchor", () => {
			render(
				<IconButton
					appearance="outlined"
					intent="neutral"
					asChild
					label="home"
					icon={<GlobeIcon />}
				>
					<a href="#yolo" />
				</IconButton>,
			);
			const link = screen.getByRole("link");
			expect(link).toHaveAccessibleName("home");
			expect(link).not.toHaveAttribute("type");
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
 * and then render neutral.
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
		</>
	);
}
