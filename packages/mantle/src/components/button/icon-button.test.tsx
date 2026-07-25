import { GlobeIcon } from "@phosphor-icons/react/Globe";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { IconButton } from "./icon-button.js";

describe("IconButton", () => {
	test("renders a button with an accessible label", () => {
		render(
			<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
		);
		expect(screen.getByRole("button", { name: "globe" })).toBeInTheDocument();
	});

	test("renders the icon beside the visually hidden label", () => {
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
		expect(button).toContainElement(icon);
		// The icon is decorated by `Icon`, so it carries the icon slot.
		expect(icon).toHaveAttribute("data-slot", "icon");
		// The label is rendered, but only for screen readers: `sr-only` is the
		// entire implementation of "announced but not visible", and happy-dom
		// loads no Tailwind to observe it any other way.
		expect(button).toHaveTextContent("globe");
		expect(button.firstChild).toHaveClass("sr-only");
	});

	test("exposes the styling hooks other components select on", () => {
		render(
			<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
		);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("data-slot", "icon-button");
		expect(button).toHaveAttribute("data-appearance", "outlined");
		// Spelling pins. `data-icon-button` is selected by toast.tsx's
		// `data-icon-button:*` variants; the `icon-button` class is selected by
		// dialog.tsx / sheet.tsx (`has-[.icon-button]:pr-4`) and the
		// `--icon-button-border-radius` variable is set by button-group.tsx's
		// panel appearance and documented in icon-button.mdx.
		expect(button).toHaveAttribute("data-icon-button", "true");
		expect(button).toHaveClass("icon-button");
		expect(button).toHaveClass("rounded-[var(--icon-button-border-radius,0.375rem)]");
	});

	describe("disabled", () => {
		test("an idle icon button is enabled and reports its disabled state as false", async () => {
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="globe"
					icon={<GlobeIcon />}
					onClick={onClick}
				/>,
			);
			const button = screen.getByRole("button");
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "false");
			expect(button).toHaveAttribute("data-disabled", "false");
			expect(button).toHaveAttribute("data-loading", "false");
			await user.click(button);
			expect(onClick).toHaveBeenCalledTimes(1);
		});

		test.each([
			["disabled", { disabled: true }],
			["aria-disabled", { "aria-disabled": true }],
			["isLoading", { isLoading: true }],
		] as const)("`%s` disables the button and suppresses clicks", async (_name, disablingProps) => {
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="globe"
					icon={<GlobeIcon />}
					onClick={onClick}
					{...disablingProps}
				/>,
			);
			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "true");
			expect(button).toHaveAttribute("data-disabled", "true");
			await user.click(button);
			expect(onClick).not.toHaveBeenCalled();
		});

		test(`aria-disabled="false" wins over a \`disabled\` prop`, async () => {
			// Pins the `aria-disabled ?? disabled ?? isLoading` precedence: the
			// explicit ARIA value is the caller's most specific statement, so it
			// re-enables the button rather than being overridden by `disabled`.
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="globe"
					icon={<GlobeIcon />}
					disabled
					aria-disabled="false"
					onClick={onClick}
				/>,
			);
			const button = screen.getByRole("button");
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("data-disabled", "false");
			await user.click(button);
			expect(onClick).toHaveBeenCalledTimes(1);
		});
	});

	describe("isLoading", () => {
		test("replaces the given icon with a single spinner and keeps the label", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="save"
					icon={<svg data-testid="icon" />}
					isLoading
				/>,
			);
			const button = screen.getByRole("button", { name: "save" });
			expect(button).toHaveAttribute("data-loading", "true");
			// The consumer's icon is gone and exactly one icon remains, so the one
			// that remains is the spinner the loading state substituted.
			expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
			expect(button.querySelectorAll("svg")).toHaveLength(1);
		});

		test("keeps the given icon when isLoading={false}", () => {
			render(
				<IconButton
					appearance="ghost"
					intent="neutral"
					label="save"
					icon={<svg data-testid="icon" />}
					isLoading={false}
				/>,
			);
			const button = screen.getByRole("button", { name: "save" });
			expect(button).toHaveAttribute("data-loading", "false");
			expect(button).not.toBeDisabled();
			// The consumer's icon is the only icon — no spinner was substituted.
			const icons = button.querySelectorAll("svg");
			expect(icons).toHaveLength(1);
			expect(icons[0]).toBe(screen.getByTestId("icon"));
		});

		test("forwards the loading state and spinner to an `asChild` child", () => {
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
			expect(link).toHaveAttribute("data-loading", "true");
			expect(link).toHaveAttribute("aria-disabled", "true");
			expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
			expect(link.querySelectorAll("svg")).toHaveLength(1);
		});
	});

	describe("intent", () => {
		// The tone classes asserted in this block are the whole implementation of
		// the `intent` axis (cva compoundVariants). `data-intent` reports which
		// tone was requested, but only the class says the button renders in that
		// tone, and no Vitest project loads Tailwind to observe it any other way.
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
			// appearance rendered these neutral-toned classes. The matrix above
			// covers ghost, so this is the only cover for the outlined + neutral
			// compoundVariant.
			render(
				<IconButton appearance="outlined" intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("border-form", "bg-form", "text-strong");
		});

		test("`intent` is required, and an untyped omission still renders neutral", () => {
			// `pnpm typecheck` owns the @ts-expect-error directive: if `intent`
			// regains optionality it becomes unused and typecheck fails. The render
			// pins the deliberate cva `defaultVariants.intent` fallback — an
			// untyped call site that omits `intent` must keep the pre-intent
			// neutral tone, not flip to the accent tone the ghost base carries.
			render(
				// @ts-expect-error -- intent is required on IconButton
				<IconButton appearance="ghost" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button", { name: "globe" });
			expect(button).not.toHaveAttribute("data-intent");
			expect(button).toHaveClass("text-strong");
		});

		test("`appearance` is required, with no runtime default", () => {
			render(
				// @ts-expect-error -- appearance is required on IconButton
				<IconButton intent="neutral" label="globe" icon={<GlobeIcon />} />,
			);
			const button = screen.getByRole("button", { name: "globe" });
			expect(button).not.toHaveAttribute("data-appearance");
			expect(button).toHaveAttribute("data-intent", "neutral");
		});
	});

	describe("size", () => {
		// The `size-N` classes asserted in this block are the whole implementation
		// of the `size` axis. `data-size` reports the requested size, but only the
		// class says the box is actually that big — happy-dom has no layout and no
		// Vitest project loads Tailwind, so there is nothing else to observe. The
		// numbers must stay in step with `Button`'s `h-N` scale: the shared scale
		// is what lets a Button and an IconButton sit side by side (see
		// split-button.test.tsx).
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

		test("forwards the icon-button slot and variant attributes to an `asChild` anchor", () => {
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
