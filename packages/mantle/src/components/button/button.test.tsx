import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { act, useState } from "react";
import { describe, expect, test } from "vitest";
import { Button } from "./button.js";

describe("Button", () => {
	test("renders a button, without `asChild`", () => {
		render(<Button type="button">click me</Button>);
		expect(screen.getByRole("button")).toHaveTextContent("click me");
	});

	test("renders a button, with `asChild`", () => {
		render(
			<Button asChild type="button">
				{/* oxlint-disable-next-line button-has-type */}
				<button>click me</button>
			</Button>,
		);
		expect(screen.getByRole("button")).toHaveTextContent("click me");
	});

	test("renders an anchor with `asChild`, doesn't pass `type` to anchor", () => {
		render(
			<Button type="button" asChild>
				<a href="#yolo">click me</a>
			</Button>,
		);
		expect(screen.getByRole("link")).toHaveTextContent("click me");

		// Ensure the `type` attribute is not passed to the anchor element
		expect(screen.getByRole("link")).not.toHaveAttribute("type");
	});

	describe("size", () => {
		test(`defaults to size="md" when \`size\` is omitted, rendering the pre-size-prop box`, () => {
			render(<Button>click me</Button>);
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
				render(<Button size={size}>click me</Button>);
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
				<Button appearance={appearance} size="xs">
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass(heightClass);
		});

		test(`has no effect when appearance="link": no data-size, no box, no typography`, () => {
			render(
				<Button appearance="link" size="xl">
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
				<Button size="sm" icon={<svg aria-hidden />}>
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("ps-2");
		});

		test(`keeps the pre-size-prop icon padding at the default size`, () => {
			render(<Button icon={<svg aria-hidden />}>click me</Button>);
			expect(screen.getByRole("button")).toHaveClass("ps-2.5");
		});

		test(`applies the end-side icon padding for the size when iconPlacement="end"`, () => {
			render(
				<Button size="xl" icon={<svg aria-hidden />} iconPlacement="end">
					click me
				</Button>,
			);
			expect(screen.getByRole("button")).toHaveClass("pe-3.5");
		});

		test("a consumer className height override still beats the size classes", () => {
			render(<Button className="h-14">click me</Button>);
			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-14");
			expect(button).not.toHaveClass("h-9");
		});

		test("forwards the size classes and data-size to an `asChild` anchor", () => {
			render(
				<Button asChild size="lg">
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
			render(<Button>click me</Button>);
			expect(screen.getByRole("button")).toHaveAttribute("type", "button");
		});

		test(`renders an explicit type="submit"`, () => {
			render(<Button type="submit">submit</Button>);
			expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
		});

		test(`renders an explicit type="reset"`, () => {
			render(<Button type="reset">reset</Button>);
			expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
		});

		test("does not leak the default `type` onto an `asChild` anchor", () => {
			render(
				<Button asChild>
					<a href="#yolo">click me</a>
				</Button>,
			);
			expect(screen.getByRole("link")).not.toHaveAttribute("type");
		});

		test("does not forward an explicit `type` to an `asChild` anchor", () => {
			render(
				<Button type="submit" asChild>
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
