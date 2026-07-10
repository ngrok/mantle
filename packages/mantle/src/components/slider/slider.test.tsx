import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { Slider } from "./slider.js";

describe("Slider", () => {
	describe("showTicks", () => {
		test("does not render ticks by default", () => {
			render(<Slider aria-label="Volume" defaultValue={50} max={100} step={10} />);
			expect(screen.queryByRole("slider")).toBeInTheDocument();
			expect(document.querySelector("[data-slot='slider-ticks']")).not.toBeInTheDocument();
		});

		test("renders ticks when showTicks is true", () => {
			render(<Slider defaultValue={50} max={100} step={10} showTicks />);
			expect(document.querySelector("[data-slot='slider-ticks']")).toBeInTheDocument();
		});

		test("renders the correct number of ticks for step=10, min=0, max=100", () => {
			render(<Slider defaultValue={50} max={100} step={10} showTicks />);
			const ticks = document.querySelectorAll("[data-slot='slider-tick']");
			expect(ticks).toHaveLength(11);
		});

		test("renders the correct number of ticks for step=25, min=0, max=100", () => {
			render(<Slider defaultValue={50} max={100} step={25} showTicks />);
			const ticks = document.querySelectorAll("[data-slot='slider-tick']");
			expect(ticks).toHaveLength(5);
		});

		test("renders the correct number of ticks with custom min", () => {
			render(<Slider defaultValue={50} min={20} max={100} step={20} showTicks />);
			const ticks = document.querySelectorAll("[data-slot='slider-tick']");
			expect(ticks).toHaveLength(5);
		});

		test("does not render ticks when showTicks is false", () => {
			render(<Slider defaultValue={50} max={100} step={10} showTicks={false} />);
			expect(document.querySelector("[data-slot='slider-ticks']")).not.toBeInTheDocument();
		});

		test("ticks container has aria-hidden", () => {
			render(<Slider defaultValue={50} max={100} step={10} showTicks />);
			expect(document.querySelector("[data-slot='slider-ticks']")).toHaveAttribute(
				"aria-hidden",
				"true",
			);
		});
	});

	describe("Field integration", () => {
		test("Field.Control wrapping Slider applies field ARIA wiring to the thumb", () => {
			render(
				<form>
					<Field.Item name="volume">
						<Field.Label>Volume</Field.Label>
						<Field.Control>
							<Slider aria-label="Volume" defaultValue={50} max={100} step={1} />
						</Field.Control>
						<Field.Errors data-testid="errors" messages={["Required."]} />
						<Field.Description data-testid="desc">Adjust volume.</Field.Description>
					</Field.Item>
				</form>,
			);

			const thumb = screen.getByRole("slider", { name: "Volume" });
			const errors = screen.getByTestId("errors");
			const description = screen.getByTestId("desc");
			expect(thumb).toHaveAttribute("aria-invalid", "true");
			expect(thumb.getAttribute("aria-describedby")).toContain(errors.id);
			expect(thumb.getAttribute("aria-describedby")).toContain(description.id);
			expect(thumb).toHaveAttribute("aria-errormessage", errors.id);
			expect(thumb).toHaveAttribute("id");
			expect(
				Array.from(document.querySelectorAll("[id]")).filter((node) => node.id === thumb.id),
			).toHaveLength(1);
			expect(document.querySelector('input[name="volume"]')).toBeInTheDocument();
		});

		test("forwards slider aria-label to each thumb with range context", () => {
			render(<Slider aria-label="Price" defaultValue={[25, 50]} max={100} step={1} />);

			expect(screen.getByRole("slider", { name: "Minimum Price" })).toBeInTheDocument();
			expect(screen.getByRole("slider", { name: "Maximum Price" })).toBeInTheDocument();
		});
	});

	describe("color", () => {
		test("applies the default accent color to the range", () => {
			render(<Slider defaultValue={50} max={100} step={1} />);
			const range = document.querySelector("[data-slot='slider-range']");
			expect(range).toHaveClass("bg-accent-600");
		});

		test("applies a custom color to the range", () => {
			render(<Slider defaultValue={50} max={100} step={1} color="bg-blue-500" />);
			const range = document.querySelector("[data-slot='slider-range']");
			expect(range).toHaveClass("bg-blue-500");
		});
	});
});
