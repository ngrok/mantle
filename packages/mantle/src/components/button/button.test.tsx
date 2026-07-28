import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { act, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { Button } from "./button.js";

describe("Button", () => {
	test("renders a button, without `asChild`", () => {
		render(
			<Button appearance="outlined" intent="accent" type="button">
				click me
			</Button>,
		);
		expect(screen.getByRole("button")).toHaveTextContent("click me");
	});

	test("renders a button, with `asChild`", () => {
		render(
			<Button appearance="outlined" intent="accent" asChild type="button">
				{/* oxlint-disable-next-line button-has-type */}
				<button>click me</button>
			</Button>,
		);
		expect(screen.getByRole("button")).toHaveTextContent("click me");
	});

	test("renders an anchor with `asChild`, doesn't pass `type` to anchor", () => {
		render(
			<Button appearance="outlined" intent="accent" type="button" asChild>
				<a href="#yolo">click me</a>
			</Button>,
		);
		expect(screen.getByRole("link")).toHaveTextContent("click me");

		// Ensure the `type` attribute is not passed to the anchor element
		expect(screen.getByRole("link")).not.toHaveAttribute("type");
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
			render(
				<Button appearance="outlined" intent={intent}>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-intent", intent);
			expect(button).toHaveClass(toneClass);
		});

		test(`renders filled danger with the danger fill`, () => {
			render(
				<Button appearance="filled" intent="danger">
					delete
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("bg-filled-danger");
		});

		test("`appearance` and `intent` are required, with no runtime default", () => {
			// `pnpm typecheck` owns the @ts-expect-error directives: if either prop
			// regains a default or optionality they become unused and typecheck
			// fails. The renders pin the runtime half of the same contract — an
			// untyped call site that omits one gets no attribute for it, rather
			// than a silently substituted default.
			render(
				// @ts-expect-error -- intent is required on Button
				<Button appearance="outlined">missing intent</Button>,
			);
			render(
				// @ts-expect-error -- appearance is required on Button
				<Button intent="accent">missing appearance</Button>,
			);
			expect(screen.getByRole("button", { name: "missing intent" })).not.toHaveAttribute(
				"data-intent",
			);
			expect(screen.getByRole("button", { name: "missing appearance" })).not.toHaveAttribute(
				"data-appearance",
			);
		});

		test("forwards data-intent to an `asChild` anchor", () => {
			render(
				<Button appearance="outlined" intent="danger" asChild>
					<a href="#yolo">click me</a>
				</Button>,
			);
			expect(screen.getByRole("link")).toHaveAttribute("data-intent", "danger");
		});
	});

	describe("size", () => {
		// The box classes asserted in this block are the whole implementation of
		// the `size` axis (cva compoundVariants) and of the icon-side padding.
		// `data-size` reports the requested size, but only the class says the
		// button is actually that tall — happy-dom has no layout and no Vitest
		// project loads Tailwind, so there is nothing else to observe.
		test(`defaults to size="md" when \`size\` is omitted, rendering the pre-size-prop box`, () => {
			render(
				<Button appearance="outlined" intent="accent">
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", "md");
			expect(button).toHaveClass("h-9", "px-3");
		});

		test.each([
			["xs", "h-6", "px-2"],
			["sm", "h-7", "px-2.5"],
			["md", "h-9", "px-3"],
			["lg", "h-10", "px-3.5"],
			["xl", "h-12", "px-4"],
		] as const)(
			`renders size="%s" with box height %s and padding %s`,
			(size, heightClass, paddingClass) => {
				render(
					<Button appearance="outlined" intent="accent" size={size}>
						click me
					</Button>,
				);
				const button = screen.getByRole("button");
				expect(button).toHaveAttribute("data-size", size);
				expect(button).toHaveClass(heightClass, paddingClass);
			},
		);

		test.each(["filled", "ghost", "outlined"] as const)(
			`sizes appearance="%s" buttons and reports the appearance`,
			(appearance) => {
				render(
					<Button appearance={appearance} intent="accent" size="xs">
						click me
					</Button>,
				);
				const button = screen.getByRole("button");
				expect(button).toHaveAttribute("data-appearance", appearance);
				expect(button).toHaveAttribute("data-size", "xs");
				expect(button).toHaveClass("h-6");
			},
		);

		test(`has no effect when appearance="link": no data-size, no box, no typography`, () => {
			render(
				<Button appearance="link" intent="accent" size="xl">
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-appearance", "link");
			expect(button).not.toHaveAttribute("data-size");
			expect(button).not.toHaveClass("h-12");
			expect(button).not.toHaveClass("px-4");
			expect(button).not.toHaveClass("text-sm");
			expect(button).not.toHaveClass("font-medium");
		});

		test("reduces the icon-side padding for the size when an icon is present", () => {
			render(
				<Button
					appearance="outlined"
					intent="accent"
					size="sm"
					icon={<svg aria-hidden data-testid="icon" />}
				>
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("ps-2");
			expect(screen.getByRole("button")).toContainElement(screen.getByTestId("icon"));
		});

		test(`keeps the pre-size-prop icon padding at the default size`, () => {
			render(
				<Button appearance="outlined" intent="accent" icon={<svg aria-hidden data-testid="icon" />}>
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("ps-2.5");
			expect(screen.getByRole("button")).toContainElement(screen.getByTestId("icon"));
		});

		test(`applies the end-side icon padding for the size when iconPlacement="end"`, () => {
			render(
				<Button
					appearance="outlined"
					intent="accent"
					size="xl"
					icon={<svg aria-hidden data-testid="icon" />}
					iconPlacement="end"
				>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("pe-3.5");
			expect(button).not.toHaveClass("ps-3.5");
			expect(button).toContainElement(screen.getByTestId("icon"));
		});

		test(`applies no special icon padding to appearance="link"`, () => {
			render(
				<Button appearance="link" intent="accent" icon={<svg aria-hidden data-testid="icon" />}>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).not.toHaveClass("ps-2.5");
			expect(button).toContainElement(screen.getByTestId("icon"));
		});

		test("a consumer className height override still beats the size classes", () => {
			render(
				<Button appearance="outlined" intent="accent" className="h-14">
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-14");
			expect(button).not.toHaveClass("h-9");
		});

		test("forwards the button slot and variant attributes to an `asChild` anchor", () => {
			render(
				<Button appearance="outlined" intent="accent" asChild size="lg">
					<a href="#yolo">click me</a>
				</Button>,
			);
			const link = screen.getByRole("link", { name: "click me" });
			expect(link).toHaveAttribute("data-slot", "button");
			expect(link).toHaveAttribute("data-size", "lg");
			expect(link).toHaveAttribute("data-appearance", "outlined");
			expect(link).toHaveAttribute("href", "#yolo");
		});
	});

	describe("icon", () => {
		test("renders the icon as a mantle Icon before the button text", () => {
			render(
				<Button appearance="outlined" intent="accent" icon={<svg data-testid="icon" />}>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			const icon = screen.getByTestId("icon");
			expect(button.firstChild).toBe(icon);
			// The icon is decorated by `Icon`, so it carries the icon slot.
			expect(icon).toHaveAttribute("data-slot", "icon");
			expect(button).toHaveTextContent("click me");
		});

		test(`iconPlacement="end" moves the icon to the visual end of the flex row`, () => {
			render(
				<Button
					appearance="outlined"
					intent="accent"
					icon={<svg data-testid="icon" />}
					iconPlacement="end"
				>
					click me
				</Button>,
			);
			const icon = screen.getByTestId("icon");
			// The icon stays first in the DOM (so it keeps its reading order for
			// AT); `order-last` is the mechanism that paints it after the text.
			expect(screen.getByRole("button").firstChild).toBe(icon);
			expect(icon).toHaveClass("order-last");
		});

		test("does not order the icon last for the default placement", () => {
			render(
				<Button appearance="outlined" intent="accent" icon={<svg data-testid="icon" />}>
					click me
				</Button>,
			);
			expect(screen.getByTestId("icon")).not.toHaveClass("order-last");
		});

		test("injects the icon into an `asChild` child alongside its own children", () => {
			render(
				<Button appearance="outlined" intent="accent" asChild icon={<svg data-testid="icon" />}>
					<a href="#yolo">click me</a>
				</Button>,
			);
			const link = screen.getByRole("link", { name: "click me" });
			const icon = screen.getByTestId("icon");
			expect(link).toContainElement(icon);
			expect(link.firstChild).toBe(icon);
			expect(link).toHaveTextContent("click me");
		});
	});

	describe("disabled", () => {
		test("an idle button is enabled and reports its disabled state as false", async () => {
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
				<Button appearance="outlined" intent="accent" onClick={onClick}>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-slot", "button");
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "false");
			// `data-disabled` mirrors the resolved state in both directions, so
			// the `[data-disabled]` variant needs the attribute *value*.
			expect(button).toHaveAttribute("data-disabled", "false");
			await user.click(button);
			expect(onClick).toHaveBeenCalledTimes(1);
		});

		test.each([
			["disabled", { disabled: true }],
			["aria-disabled", { "aria-disabled": true }],
			[`aria-disabled="true"`, { "aria-disabled": "true" }],
			["isLoading", { isLoading: true }],
		] as const)("`%s` disables the button and suppresses clicks", async (_name, disablingProps) => {
			const onClick = vi.fn<() => void>();
			const user = userEvent.setup();
			render(
				<Button appearance="outlined" intent="accent" onClick={onClick} {...disablingProps}>
					click me
				</Button>,
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
				<Button
					appearance="outlined"
					intent="accent"
					disabled
					aria-disabled="false"
					onClick={onClick}
				>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).not.toBeDisabled();
			expect(button).toHaveAttribute("aria-disabled", "false");
			expect(button).toHaveAttribute("data-disabled", "false");
			await user.click(button);
			expect(onClick).toHaveBeenCalledTimes(1);
		});

		test("`disabled` wins over isLoading={false}", () => {
			render(
				<Button appearance="outlined" intent="accent" disabled isLoading={false}>
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
			expect(button).toHaveAttribute("data-disabled", "true");
			// Only `isLoading` drives the loading state, never `disabled`.
			expect(button).toHaveAttribute("data-loading", "false");
		});

		test("forwards the resolved disabled state to an `asChild` child", () => {
			render(
				<Button appearance="outlined" intent="accent" asChild isLoading>
					<a href="#yolo">click me</a>
				</Button>,
			);
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("aria-disabled", "true");
			expect(link).toHaveAttribute("data-disabled", "true");
			expect(link).toHaveAttribute("data-loading", "true");
		});
	});

	describe("type", () => {
		test(`defaults to type="button" when \`type\` is omitted`, () => {
			render(
				<Button appearance="outlined" intent="accent">
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("type", "button");
		});

		test(`renders an explicit type="submit"`, () => {
			render(
				<Button appearance="outlined" intent="accent" type="submit">
					submit
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
		});

		test(`renders an explicit type="reset"`, () => {
			render(
				<Button appearance="outlined" intent="accent" type="reset">
					reset
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
		});

		test("does not leak the default `type` onto an `asChild` anchor", () => {
			render(
				<Button appearance="outlined" intent="accent" asChild>
					<a href="#yolo">click me</a>
				</Button>,
			);
			expect(screen.getByRole("link")).not.toHaveAttribute("type");
		});

		test("does not forward an explicit `type` to an `asChild` anchor", () => {
			render(
				<Button appearance="outlined" intent="accent" type="submit" asChild>
					<a href="#yolo">click me</a>
				</Button>,
			);
			expect(screen.getByRole("link")).not.toHaveAttribute("type");
		});
	});

	test("when isLoading={false}, allows click and submit events to propagate", async () => {
		const Subject = () => {
			const [submitState, setSubmitState] = useState<"submitting" | "idle">("idle");
			const [clickState, setClickState] = useState<"clicked" | "idle">("idle");

			return (
				<div>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							setSubmitState("submitting");
						}}
					>
						<Button
							appearance="outlined"
							intent="accent"
							isLoading={false}
							type="submit"
							onClick={() => {
								setClickState("clicked");
							}}
						>
							submit
						</Button>
					</form>
					<span data-testid="submit-state">{submitState}</span>
					<span data-testid="click-state">{clickState}</span>
				</div>
			);
		};

		render(<Subject />);
		await act(() => userEvent.click(screen.getByRole("button")));
		expect(screen.getByTestId("submit-state")).toHaveTextContent("submitting");
		expect(screen.getByTestId("click-state")).toHaveTextContent("clicked");
	});

	test(`when isLoading={true}, doesn't allow click or submit events to propagate`, async () => {
		const Subject = () => {
			const [submitState, setSubmitState] = useState<"submitting" | "idle">("idle");
			const [clickState, setClickState] = useState<"clicked" | "idle">("idle");

			return (
				<div>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							setSubmitState("submitting");
						}}
					>
						<Button
							appearance="outlined"
							intent="accent"
							isLoading
							type="submit"
							onClick={() => {
								setClickState("clicked");
							}}
						>
							submit
						</Button>
					</form>
					<span data-testid="submit-state">{submitState}</span>
					<span data-testid="click-state">{clickState}</span>
				</div>
			);
		};

		render(<Subject />);
		await act(() => userEvent.click(screen.getByRole("button")));
		expect(screen.getByRole("button")).toHaveAttribute("data-loading", "true");
		expect(screen.getByTestId("submit-state")).toHaveTextContent("idle");
		expect(screen.getByTestId("click-state")).toHaveTextContent("idle");
	});

	test("when isLoading={true}, replaces the consumer's icon with a single spinner", () => {
		render(
			<Button appearance="outlined" intent="accent" isLoading icon={<svg data-testid="icon" />}>
				submit
			</Button>,
		);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("data-loading", "true");
		// The consumer's icon is gone and exactly one icon remains, so the one
		// that remains is the spinner the loading state substituted.
		expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
		expect(button.querySelectorAll("svg")).toHaveLength(1);
		expect(button).toHaveTextContent("submit");
	});

	test("when isLoading={true} and no icon was given, adds the spinner", () => {
		render(
			<Button appearance="outlined" intent="accent" isLoading>
				submit
			</Button>,
		);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("data-loading", "true");
		expect(button.querySelectorAll("svg")).toHaveLength(1);
	});

	test("when isLoading={false}, renders no spinner", () => {
		render(
			<Button appearance="outlined" intent="accent" isLoading={false}>
				submit
			</Button>,
		);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("data-loading", "false");
		expect(button.querySelectorAll("svg")).toHaveLength(0);
	});

	test("when isLoading={true} with `asChild`, the child renders the spinner", () => {
		render(
			<Button
				appearance="outlined"
				intent="accent"
				asChild
				isLoading
				icon={<svg data-testid="icon" />}
			>
				<a href="#yolo">continue</a>
			</Button>,
		);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("data-loading", "true");
		expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
		expect(link.querySelectorAll("svg")).toHaveLength(1);
		expect(link).toHaveTextContent("continue");
	});
});
