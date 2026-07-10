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
