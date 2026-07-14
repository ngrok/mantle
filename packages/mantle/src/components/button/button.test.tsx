import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { act, useState } from "react";
import { describe, expect, test } from "vitest";
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

		test("`appearance` and `intent` are required at the type level", () => {
			// Creating the elements (without rendering) pins the required-props
			// contract: if either prop regains a default/optionality, the
			// expect-error directives below become unused and typecheck fails.
			const missingIntent = (
				// @ts-expect-error -- intent is required on Button
				<Button appearance="outlined">click me</Button>
			);
			const missingAppearance = (
				// @ts-expect-error -- appearance is required on Button
				<Button intent="accent">click me</Button>
			);
			expect(missingIntent).toBeDefined();
			expect(missingAppearance).toBeDefined();
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

		test.each([
			["filled", "h-6"],
			["ghost", "h-6"],
			["outlined", "h-6"],
		] as const)(`sizes appearance="%s" buttons`, (appearance, heightClass) => {
			render(
				<Button appearance={appearance} intent="accent" size="xs">
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass(heightClass);
		});

		test(`has no effect when appearance="link": no data-size, no box, no typography`, () => {
			render(
				<Button appearance="link" intent="accent" size="xl">
					click me
				</Button>,
			);
			const button = screen.getByRole("button");
			expect(button).not.toHaveAttribute("data-size");
			expect(button).not.toHaveClass("h-12");
			expect(button).not.toHaveClass("px-4");
			expect(button).not.toHaveClass("text-sm");
			expect(button).not.toHaveClass("font-medium");
		});

		test("reduces the icon-side padding for the size when an icon is present", () => {
			render(
				<Button appearance="outlined" intent="accent" size="sm" icon={<svg aria-hidden />}>
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("ps-2");
		});

		test(`keeps the pre-size-prop icon padding at the default size`, () => {
			render(
				<Button appearance="outlined" intent="accent" icon={<svg aria-hidden />}>
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("ps-2.5");
		});

		test(`applies the end-side icon padding for the size when iconPlacement="end"`, () => {
			render(
				<Button
					appearance="outlined"
					intent="accent"
					size="xl"
					icon={<svg aria-hidden />}
					iconPlacement="end"
				>
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("pe-3.5");
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

		test("forwards the size classes and data-size to an `asChild` anchor", () => {
			render(
				<Button appearance="outlined" intent="accent" asChild size="lg">
					<a href="#yolo">click me</a>
				</Button>,
			);
			const link = screen.getByRole("link");
			expect(link).toHaveAttribute("data-size", "lg");
			expect(link).toHaveClass("h-10");
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
});
