import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
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

		// The tick count feeds `Array.from({ length })`, so a non-positive or
		// non-finite step/range must resolve to zero rather than an invalid array
		// length (which throws and unmounts the tree).
		test.each([
			{ label: "step={0}", min: 0, max: 100, step: 0 },
			{ label: "step={-5}", min: 0, max: 100, step: -5 },
			{ label: "step={NaN}", min: 0, max: 100, step: Number.NaN },
			{ label: "step={Infinity}", min: 0, max: 100, step: Number.POSITIVE_INFINITY },
			{ label: "min === max", min: 100, max: 100, step: 10 },
			{ label: "min > max", min: 50, max: 10, step: 10 },
			{ label: "a non-finite range", min: 0, max: Number.POSITIVE_INFINITY, step: 10 },
		])("renders no ticks and does not throw for $label", ({ min, max, step }) => {
			render(<Slider aria-label="Volume" max={max} min={min} showTicks step={step} />);

			expect(screen.getAllByRole("slider")).toHaveLength(1);
			expect(document.querySelectorAll("[data-slot='slider-tick']")).toHaveLength(0);
			expect(document.querySelector("[data-slot='slider-ticks']")).not.toBeInTheDocument();
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

	describe("aria-label per thumb", () => {
		test("a single thumb uses the aria-label verbatim", () => {
			render(<Slider aria-label="Volume" defaultValue={75} max={100} step={1} />);

			expect(
				screen.getAllByRole("slider").map((thumb) => thumb.getAttribute("aria-label")),
			).toEqual(["Volume"]);
		});

		test("three or more thumbs are numbered", () => {
			render(<Slider aria-label="Breakpoint" defaultValue={[10, 20, 70]} max={100} step={10} />);

			expect(
				screen.getAllByRole("slider").map((thumb) => thumb.getAttribute("aria-label")),
			).toEqual(["Breakpoint 1 of 3", "Breakpoint 2 of 3", "Breakpoint 3 of 3"]);
		});

		test("without an aria-label no thumb invents one", () => {
			render(
				<Slider aria-labelledby="volume-label" defaultValue={[10, 20, 70]} max={100} step={10} />,
			);

			for (const thumb of screen.getAllByRole("slider")) {
				expect(thumb).not.toHaveAttribute("aria-label");
				expect(thumb).toHaveAttribute("aria-labelledby", "volume-label");
			}
		});
	});

	describe("value", () => {
		test("a controlled value renders one thumb at that value and does not self-update", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: number[]) => void>();
			render(
				<Slider aria-label="Volume" max={100} onValueChange={onValueChange} step={1} value={30} />,
			);

			const thumb = screen.getByRole("slider", { name: "Volume" });
			expect(thumb).toHaveAttribute("aria-valuenow", "30");

			thumb.focus();
			await user.keyboard("{ArrowRight}");

			// Controlled: the caller owns the value, so the thumb stays at 30 and
			// only reports the requested next value.
			expect(onValueChange).toHaveBeenCalledExactlyOnceWith([31]);
			expect(thumb).toHaveAttribute("aria-valuenow", "30");
		});

		test("with neither value nor defaultValue, a single thumb sits at min", () => {
			render(<Slider aria-label="Volume" max={100} min={7} step={1} />);

			const thumbs = screen.getAllByRole("slider");
			expect(thumbs).toHaveLength(1);
			expect(thumbs[0]).toHaveAttribute("aria-valuenow", "7");
		});
	});

	// `color` is typed as `bg-${string}`: the prop's entire implementation is the
	// Tailwind class it lands on the range, so the class IS the contract here and
	// there is no data attribute or CSS variable behind it. Tailwind is not loaded
	// in either project, so these assert the class set rather than paint.
	describe("color", () => {
		test("applies the default accent color to the range", () => {
			render(<Slider defaultValue={50} max={100} step={1} />);
			const range = document.querySelector("[data-slot='slider-range']");
			expect(range).toHaveClass("bg-accent-600");
		});

		test("a custom color replaces the default rather than landing beside it", () => {
			render(<Slider defaultValue={50} max={100} step={1} color="bg-blue-500" />);
			const range = document.querySelector("[data-slot='slider-range']");
			expect(range).toHaveClass("bg-blue-500");
			// Two `bg-*` utilities on one element would leave source order to pick
			// the winner, so the default has to be gone, not merely outranked.
			expect(range).not.toHaveClass("bg-accent-600");
		});
	});
});
