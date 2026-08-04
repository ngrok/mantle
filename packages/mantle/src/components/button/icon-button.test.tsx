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
		test.each([
			["filled", "bg-filled-accent"],
			["ghost", "text-accent-600"],
			["outlined", "border-accent-600"],
		] as const)(
			`renders appearance="%s" with data-appearance and weight class %s`,
			(appearance, weightClass) => {
				render(
					<IconButton appearance={appearance} intent="accent" label="globe" icon={<GlobeIcon />} />,
				);
				const button = screen.getByRole("button");
				expect(button).toHaveAttribute("data-appearance", appearance);
				expect(button).toHaveClass(weightClass);
			},
		);

		// Parity pin: every appearance/intent pair below is the class `Button`
		// draws for the same pair, so a permuted lookup table on either component
		// splits the two apart. IconButton has no `link` appearance.
		test.each([
			["filled", "accent", "bg-filled-accent"],
			["filled", "danger", "bg-filled-danger"],
			["filled", "neutral", "bg-filled-neutral"],
			["ghost", "accent", "text-accent-600"],
			["ghost", "danger", "text-danger-600"],
			["ghost", "neutral", "text-strong"],
			["outlined", "accent", "border-accent-600"],
			["outlined", "danger", "border-danger-600"],
			["outlined", "neutral", "border-form"],
		] as const)(
			`appearance="%s" intent="%s" matches Button's %s`,
			(appearance, intent, toneClass) => {
				render(
					<>
						<IconButton
							appearance={appearance}
							intent={intent}
							label="icon button"
							icon={<GlobeIcon />}
						/>
						<Button appearance={appearance} intent={intent}>
							button
						</Button>
					</>,
				);
				// Each query names the button it wants, so a third button in the
				// tree throws here rather than shifting a positional index and
				// asserting the pair against the wrong element.
				expect(screen.getByRole("button", { name: "icon button" })).toHaveClass(toneClass);
				expect(screen.getByRole("button", { name: "button" })).toHaveClass(toneClass);
			},
		);
	});

	describe("intent", () => {
		test.each([
			["accent", "text-accent-600"],
			["danger", "text-danger-600"],
			["neutral", "text-strong"],
		] as const)(`renders intent="%s" with data-intent and tone class %s`, (intent, toneClass) => {
			render(<IconButton appearance="ghost" intent={intent} label="globe" icon={<GlobeIcon />} />);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-intent", intent);
			expect(button).toHaveClass(toneClass);
		});

		test(`intent="neutral" filled renders the neutral fill, not the accent fill`, () => {
			render(
				<IconButton appearance="filled" intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-filled-neutral", "text-neutral-50");
			expect(button).not.toHaveClass("bg-filled-accent");
		});

		test(`intent="neutral" outlined renders the pre-intent IconButton box`, () => {
			// Parity pin: before IconButton had an intent axis, its outlined
			// appearance rendered these neutral-toned classes.
			render(
				<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("border-form", "bg-form", "text-strong");
		});

		test("`appearance` and `intent` are required at the type level", () => {
			const missingIntent = (
				// @ts-expect-error -- intent is required on IconButton
				<IconButton appearance="ghost" label="globe" icon={<GlobeIcon />} />
			);
			const missingAppearance = (
				// @ts-expect-error -- appearance is required on IconButton
				<IconButton intent="neutral" label="globe" icon={<GlobeIcon />} />
			);
			expect(missingIntent).toBeDefined();
			expect(missingAppearance).toBeDefined();
		});
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
