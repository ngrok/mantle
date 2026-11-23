import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import * as Field from "../field/field-parts.js";
import { renderToString } from "react-dom/server";
import { Slider, SliderValue } from "./slider.js";
import type { SliderProps } from "./slider.js";

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

		test("rounds the tick count down when the range is not a multiple of step", () => {
			render(<Slider defaultValue={50} max={100} step={40} showTicks />);
			const ticks = document.querySelectorAll("[data-slot='slider-tick']");
			expect(ticks).toHaveLength(3);
		});

		test("renders the correct number of ticks with custom min", () => {
			render(<Slider defaultValue={50} min={20} max={100} step={20} showTicks />);
			const ticks = document.querySelectorAll("[data-slot='slider-tick']");
			expect(ticks).toHaveLength(5);
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

		test("names each thumb by position when the slider has three or more thumbs", () => {
			render(<Slider aria-label="Breakpoint" defaultValue={[10, 20, 70]} max={100} step={10} />);

			expect(screen.getByRole("slider", { name: "Breakpoint 1 of 3" })).toBeInTheDocument();
			expect(screen.getByRole("slider", { name: "Breakpoint 3 of 3" })).toBeInTheDocument();
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
			expect(thumb).toHaveValue("30");

			thumb.focus();
			await user.keyboard("{ArrowRight}");

			// Controlled: the caller owns the value, so the thumb stays at 30 and
			// only reports the requested next value.
			expect(onValueChange).toHaveBeenCalledExactlyOnceWith([31]);
			expect(thumb).toHaveValue("30");
		});

		test("with neither value nor defaultValue, a single thumb sits at min", () => {
			render(<Slider aria-label="Volume" max={100} min={7} step={1} />);

			const thumbs = screen.getAllByRole("slider");
			expect(thumbs).toHaveLength(1);
			expect(thumbs[0]).toHaveValue("7");
		});
	});

	describe("keyboard", () => {
		type PressProps = Omit<SliderProps, "defaultValue" | "value"> & {
			defaultValue?: number | number[];
		};

		/** Renders an uncontrolled slider, focuses its thumb at `index`, and presses `keys`. */
		async function press(
			keys: string,
			{ defaultValue = 50, ...props }: PressProps = {},
			index = 0,
		) {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: number[]) => void>();
			const onValueCommit = vi.fn<(value: number[]) => void>();
			render(
				<Slider
					aria-label="Level"
					onValueChange={onValueChange}
					onValueCommit={onValueCommit}
					{...props}
					defaultValue={[defaultValue].flat()}
				/>,
			);
			screen.getAllByRole("slider")[index]?.focus();
			await user.keyboard(keys);
			const values = screen
				.getAllByRole("slider")
				.map((thumb) => (thumb instanceof HTMLInputElement ? thumb.valueAsNumber : Number.NaN));
			return { onValueChange, onValueCommit, values };
		}

		test.each([
			{ keys: "{ArrowRight}", props: {}, expected: 51 },
			{ keys: "{ArrowUp}", props: {}, expected: 51 },
			{ keys: "{ArrowLeft}", props: {}, expected: 49 },
			{ keys: "{ArrowDown}", props: {}, expected: 49 },
			{ keys: "{PageUp}", props: {}, expected: 60 },
			{ keys: "{PageDown}", props: {}, expected: 40 },
			{ keys: "{Shift>}{ArrowRight}{/Shift}", props: {}, expected: 60 },
			{ keys: "{Home}", props: {}, expected: 0 },
			{ keys: "{End}", props: {}, expected: 100 },
			{ keys: "{ArrowRight}", props: { step: 5 }, expected: 55 },
			{ keys: "{ArrowRight}", props: { dir: "rtl" }, expected: 49 },
			{ keys: "{ArrowLeft}", props: { dir: "rtl" }, expected: 51 },
			{ keys: "{ArrowRight}", props: { inverted: true }, expected: 49 },
			{ keys: "{ArrowLeft}", props: { dir: "rtl", inverted: true }, expected: 49 },
			{ keys: "{ArrowUp}", props: { orientation: "vertical" }, expected: 51 },
			{ keys: "{ArrowUp}", props: { orientation: "vertical", inverted: true }, expected: 49 },
			{ keys: "{ArrowRight}", props: { defaultValue: 100 }, expected: 100 },
			{ keys: "{ArrowLeft}", props: { defaultValue: 0 }, expected: 0 },
			{ keys: "{ArrowRight}", props: { defaultValue: 53, step: 10 }, expected: 60 },
			{ keys: "{ArrowRight}", props: { defaultValue: 0.2, max: 1, step: 0.1 }, expected: 0.3 },
			{ keys: "{ArrowRight}", props: { defaultValue: 0.5, min: 0.5, step: 1 }, expected: 1.5 },
		] satisfies { keys: string; props: PressProps; expected: number }[])(
			"$keys with $props moves the thumb to $expected",
			async ({ keys, props, expected }) => {
				const { values } = await press(keys, props);
				expect(values).toEqual([expected]);
			},
		);

		test("each key press reports the new value and commits it", async () => {
			const { onValueChange, onValueCommit } = await press("{ArrowRight}{ArrowRight}");

			expect(onValueChange).toHaveBeenCalledTimes(2);
			expect(onValueChange).toHaveBeenLastCalledWith([52]);
			expect(onValueCommit).toHaveBeenCalledTimes(2);
			expect(onValueCommit).toHaveBeenLastCalledWith([52]);
		});

		test("a thumb stops minStepsBetweenThumbs short of its neighbor", async () => {
			const { values, onValueChange } = await press(
				"{ArrowRight}{ArrowRight}",
				{ defaultValue: [40, 43], minStepsBetweenThumbs: 2 },
				0,
			);

			expect(values).toEqual([41, 43]);
			expect(onValueChange).toHaveBeenCalledExactlyOnceWith([41, 43]);
		});

		test("a page step past a neighbor swaps the thumbs, and focus follows the moved value", async () => {
			const { values } = await press("{PageUp}", { defaultValue: [40, 45] }, 0);

			expect(values).toEqual([45, 50]);
			expect(screen.getByRole("slider", { name: "Maximum Level" })).toHaveFocus();
		});

		test("with preserveThumbOrder, a page step stops at the neighbor", async () => {
			const { values } = await press(
				"{PageUp}",
				{ defaultValue: [40, 45], preserveThumbOrder: true },
				0,
			);

			expect(values).toEqual([44, 45]);
			expect(screen.getByRole("slider", { name: "Minimum Level" })).toHaveFocus();
		});

		test("Home and End move the focused thumb as far as its neighbors allow", async () => {
			const home = await press("{Home}", { defaultValue: [20, 80] }, 1);
			expect(home.values).toEqual([20, 21]);
			expect(screen.getByRole("slider", { name: "Maximum Level" })).toHaveFocus();
		});

		test("End on the lower thumb stops one step under the upper thumb", async () => {
			const { values } = await press("{End}", { defaultValue: [20, 80] }, 0);
			expect(values).toEqual([79, 80]);
		});
	});

	describe("disabled", () => {
		test("a disabled slider disables each thumb, so no key moves it", async () => {
			const user = userEvent.setup();
			const onValueChange = vi.fn<(value: number[]) => void>();
			render(
				<Slider
					aria-label="Price"
					defaultValue={[20, 80]}
					disabled
					onValueChange={onValueChange}
				/>,
			);

			const thumbs = screen.getAllByRole("slider");
			for (const thumb of thumbs) {
				expect(thumb).toBeDisabled();
			}
			await user.tab();
			expect(document.body).toHaveFocus();
			expect(onValueChange).toHaveBeenCalledTimes(0);
			expect(document.querySelector("[data-slot='slider']")).toHaveAttribute("data-disabled", "");
		});
	});

	describe("forms", () => {
		test("a single thumb submits under name, and more thumbs submit under name[]", () => {
			render(
				<form data-testid="form">
					<Slider aria-label="Volume" defaultValue={40} name="volume" />
					<Slider aria-label="Price" defaultValue={[10, 90]} name="price" />
				</form>,
			);
			const form = screen.getByTestId("form");
			if (!(form instanceof HTMLFormElement)) {
				throw new Error("expected a form");
			}

			const data = new FormData(form);
			expect(data.getAll("volume")).toEqual(["40"]);
			expect(data.getAll("price[]")).toEqual(["10", "90"]);
		});

		test("a new defaultValue after a change leaves an uncontrolled slider where the user put it", async () => {
			const user = userEvent.setup();
			const { rerender } = render(<Slider aria-label="Volume" defaultValue={40} />);
			const input = screen.getByRole("slider");
			input.focus();
			await user.keyboard("{PageUp}");

			rerender(<Slider aria-label="Volume" defaultValue={60} />);

			expect(input).toHaveValue("50");
			// Why the custom property: CSS places the thumb from it.
			expect(
				input
					.closest<HTMLElement>("[data-slot='slider-thumb']")
					?.style.getPropertyValue("--_value"),
			).toBe("50");
		});

		test("a key press sends one change to a form onChange", async () => {
			const user = userEvent.setup();
			const onFormChange = vi.fn<(name: string, value: string) => void>();
			render(
				<form
					onChange={(event) => {
						if (event.target instanceof HTMLInputElement) {
							onFormChange(event.target.name, event.target.value);
						}
					}}
				>
					<Slider aria-label="Volume" defaultValue={40} name="volume" />
				</form>,
			);
			screen.getByRole("slider").focus();
			await user.keyboard("{ArrowRight}");

			expect(onFormChange).toHaveBeenCalledExactlyOnceWith("volume", "41");
		});

		test("assistive technology that sets the input value moves the thumb within its limits", () => {
			const onValueChange = vi.fn<(value: number[]) => void>();
			render(<Slider aria-label="Price" defaultValue={[20, 30]} onValueChange={onValueChange} />);
			const [lower] = screen.getAllByRole("slider");
			if (!(lower instanceof HTMLInputElement)) {
				throw new Error("expected a range input");
			}

			fireEvent.change(lower, { target: { value: "25" } });
			expect(onValueChange).toHaveBeenLastCalledWith([25, 30]);
			fireEvent.change(lower, { target: { value: "30" } });

			// Why: 30 leaves no step between the thumbs, so the input keeps 25.
			expect(onValueChange).toHaveBeenCalledTimes(1);
			expect(lower).toHaveValue("25");
		});
	});

	test("a value off the step grid reads out and submits as rendered", () => {
		render(
			<form data-testid="form">
				<Slider aria-label="Volume" defaultValue={53} name="volume" step={10} />
			</form>,
		);
		const form = screen.getByTestId("form");
		if (!(form instanceof HTMLFormElement)) {
			throw new Error("expected a form");
		}

		expect(screen.getByRole("slider")).toHaveValue("53");
		expect(new FormData(form).get("volume")).toBe("53");
	});

	test("an id lands on the first thumb, so a label names it", () => {
		render(
			<>
				<label htmlFor="price">Price</label>
				<Slider defaultValue={[10, 90]} id="price" />
			</>,
		);

		expect(screen.getAllByRole("slider")[0]).toHaveAccessibleName("Price");
	});

	test("the root carries data-orientation, and each thumb its aria-orientation", () => {
		render(<Slider aria-label="Height" defaultValue={30} orientation="vertical" />);

		expect(document.querySelector("[data-slot='slider']")).toHaveAttribute(
			"data-orientation",
			"vertical",
		);
		expect(screen.getByRole("slider")).toHaveAttribute("aria-orientation", "vertical");
	});

	// Why a class assertion: `color` is typed `bg-${string}` and the range carries no
	// data attribute for it, so the class is the prop's only observable.
	describe("color", () => {
		test("applies the default accent color to the range", () => {
			render(<Slider defaultValue={50} max={100} step={1} />);
			const range = document.querySelector("[data-slot='slider-range']");
			expect(range).toHaveClass("bg-accent-600");
		});

		test("a custom color replaces the default rather than landing beside it", () => {
			render(<Slider defaultValue={50} max={100} step={1} color="bg-blue-500" />);
			const range = document.querySelector("[data-slot='slider-range']");
			// Two `bg-*` utilities on one element would leave source order to pick
			// the winner, so the custom color must be the only one.
			const colors = Array.from(range?.classList ?? []).filter((name) => name.startsWith("bg-"));
			expect(colors).toEqual(["bg-blue-500"]);
		});
	});
});

describe("SliderValue", () => {
	test("the server HTML holds each thumb's value text, and each label writes its text on mount", () => {
		const slider = (
			<Slider aria-label="Price" defaultValue={[20, 80]} formatValue={(value) => `$${value}`}>
				<SliderValue />
				<SliderValue placement="track" />
			</Slider>
		);
		const page = document.createElement("div");
		page.innerHTML = renderToString(slider);
		render(slider);

		expect(
			[...page.querySelectorAll("input")].map((input) => input.getAttribute("aria-valuetext")),
		).toEqual(["$20", "$80"]);
		expect(
			[...document.body.querySelectorAll("[data-slot='slider-value']")].map(
				(label) => label.textContent,
			),
		).toEqual(["$20", "$80", "$20 – $80"]);
	});

	test("a key press on an uncontrolled slider updates the labels and the value text", async () => {
		const user = userEvent.setup();
		render(
			<Slider aria-label="Volume" defaultValue={40} formatValue={(value) => `${value}%`}>
				<SliderValue placement="track" />
			</Slider>,
		);
		screen.getByRole("slider").focus();
		await user.keyboard("{ArrowRight}");

		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "41%");
		await waitFor(() =>
			expect(document.querySelector("[data-slot='slider-value']")).toHaveTextContent("41%"),
		);
	});

	test("outside a Slider, it throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => render(<SliderValue />)).toThrow("SliderValue must be rendered inside a Slider.");
	});
});
