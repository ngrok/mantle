import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { IconButton } from "./icon-button.js";

describe("IconButton", () => {
	test("renders a button with an accessible label", () => {
		render(
			<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
		);
		expect(screen.getByRole("button", { name: "globe" })).toBeInTheDocument();
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
