import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { act, useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { Input, InputCapture } from "./input.js";

/**
 * The `data-slot="input"` chrome `Input` renders around the capture element.
 * Narrowing instead of casting also pins the slot: a rename throws here.
 */
const getInputContainer = () => {
	const container = document.querySelector('[data-slot="input"]');
	if (!(container instanceof HTMLElement)) {
		throw new Error('expected an element with data-slot="input"');
	}
	return container;
};

describe("Input", () => {
	test("keyboard activation of an adornment button keeps focus on the button", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn<() => void>();
		render(
			<Input placeholder="test">
				<InputCapture />
				<button type="button" onClick={handleClick}>
					Copy
				</button>
			</Input>,
		);

		const button = screen.getByRole("button", { name: "Copy" });
		await user.tab();
		await user.tab();
		expect(button).toHaveFocus();

		await user.keyboard("{Enter}");
		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(button).toHaveFocus();

		await user.keyboard("[Space]");
		expect(handleClick).toHaveBeenCalledTimes(2);
		expect(button).toHaveFocus();
	});

	test("a pointer click on an adornment button focuses the input", async () => {
		const user = userEvent.setup();
		render(
			<Input placeholder="test">
				<InputCapture />
				<button type="button">Copy</button>
			</Input>,
		);

		await user.click(screen.getByRole("button", { name: "Copy" }));
		expect(screen.getByPlaceholderText("test")).toHaveFocus();
	});

	test("a pointer click on an adornment button that already has focus moves focus to the input", async () => {
		const user = userEvent.setup();
		render(
			<Input placeholder="test">
				<InputCapture />
				<button type="button">Copy</button>
			</Input>,
		);

		const button = screen.getByRole("button", { name: "Copy" });
		await user.tab();
		await user.tab();
		expect(button).toHaveFocus();

		await user.click(button);
		expect(screen.getByPlaceholderText("test")).toHaveFocus();
	});

	test('without children or validation="error", renders an input with aria-invalid="false" and placeholder="Testy McTestface"', () => {
		render(<Input placeholder="Testy McTestface" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
	});

	test('with children, without validation="error", renders an input with aria-invalid="false" and placeholder="Testy McTestface"', () => {
		render(
			<Input placeholder="Testy McTestface">
				<InputCapture />
			</Input>,
		);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
	});

	test('with children, with validation="error" on <Input>, renders an input with aria-invalid="true"', () => {
		render(
			<Input validation="error">
				<InputCapture />
			</Input>,
		);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
	});

	test("with children, sends disabled, required, and readOnly on <Input> to the capture", () => {
		render(
			<Input disabled required readOnly aria-label="Email">
				<InputCapture />
			</Input>,
		);
		const input = screen.getByRole("textbox", { name: "Email" });
		expect(input).toBeDisabled();
		expect(input).toBeRequired();
		expect(input).toHaveAttribute("readonly");
		expect(getInputContainer()).toHaveAttribute("data-disabled");
	});

	test('with children, with validation="error" on <InputCapture>, renders an input with aria-invalid="true"', () => {
		render(
			<Input>
				<InputCapture validation="error" placeholder="Testy McTestface" />
			</Input>,
		);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
	});

	test('given validation={false}, renders an input with aria-invalid="false" and not have data-validation', () => {
		render(<Input validation={false} />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).not.toHaveAttribute("data-validation");
	});

	test("with children, validation={false} on <Input> overrides inherited Field validation", () => {
		render(
			<Field.Item name="example" validation="error">
				<Input validation={false}>
					<InputCapture aria-label="Email" />
				</Input>
			</Field.Item>,
		);

		expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox", { name: "Email" })).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders an input with aria-invalid="false" and data-validation="success"', () => {
		render(<Input validation="success" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders an input with aria-invalid="false" and data-validation="warning"', () => {
		render(<Input validation="warning" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "warning");
		// Why a class: the glyph wrapper emits no data attribute, so the class is
		// the only observable output of the `ValidationFeedback` lookup for this key.
		expect(screen.getByRole("textbox").nextElementSibling).toHaveClass("text-warning-600");
	});

	test('given validation="error", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<Input validation="error" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<Input aria-invalid="true" validation="success" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test("without children, passes ref through and allows focus on mount", async () => {
		const Subject = () => {
			const inputRef = useRef<ComponentRef<"input">>(null);

			useEffect(() => {
				inputRef.current?.focus();
			}, []);

			return <Input ref={inputRef} placeholder="Testy McTestface" />;
		};

		await act(() => render(<Subject />));

		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
		expect(document.activeElement).toBe(screen.getByRole("textbox"));
	});

	test("with children, passes ref through from Input and allows focus on mount", async () => {
		const Subject = () => {
			const inputRef = useRef<ComponentRef<"input">>(null);

			useEffect(() => {
				inputRef.current?.focus();
			}, []);

			return (
				<Input ref={inputRef} placeholder="Testy McTestface">
					<InputCapture />
				</Input>
			);
		};

		await act(() => render(<Subject />));

		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
		expect(document.activeElement).toBe(screen.getByRole("textbox"));
	});

	test("with children, passes ref through from InputCapture and allows focus on mount", async () => {
		const Subject = () => {
			const inputRef = useRef<ComponentRef<"input">>(null);

			useEffect(() => {
				inputRef.current?.focus();
			}, []);

			return (
				<Input placeholder="Testy McTestface">
					<InputCapture ref={inputRef} />
				</Input>
			);
		};

		await act(() => render(<Subject />));

		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
		expect(document.activeElement).toBe(screen.getByRole("textbox"));
	});

	test("without children, works as a controlled input", async () => {
		const Subject = () => {
			const [value, setValue] = useState("");

			return (
				<Input
					placeholder="Testy McTestface"
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
					}}
				/>
			);
		};

		render(<Subject />);

		await act(() => userEvent.type(screen.getByRole("textbox"), "ello govna"));

		expect(screen.getByRole("textbox")).toHaveValue("ello govna");
	});

	test("with children, works as a controlled input (props on Input)", async () => {
		const Subject = () => {
			const [value, setValue] = useState("");

			return (
				<Input
					placeholder="Testy McTestface"
					value={value}
					onChange={(event) => {
						setValue(event.target.value);
					}}
				>
					<InputCapture />
				</Input>
			);
		};

		render(<Subject />);

		await act(() => userEvent.type(screen.getByRole("textbox"), "ello govna"));

		expect(screen.getByRole("textbox")).toHaveValue("ello govna");
	});

	test("with children, works as a controlled input (props on InputCapture)", async () => {
		const Subject = () => {
			const [value, setValue] = useState("");

			return (
				<Input>
					<InputCapture
						placeholder="Testy McTestface"
						value={value}
						onChange={(event) => {
							setValue(event.target.value);
						}}
					/>
				</Input>
			);
		};

		render(<Subject />);

		await act(() => userEvent.type(screen.getByRole("textbox"), "ello govna"));

		expect(screen.getByRole("textbox")).toHaveValue("ello govna");
	});

	// Regression: `InputCapture` composed its refs with a fresh closure on every
	// render. React then detached and re-attached the `<input>` ref on each
	// re-render, so a consumer callback ref saw `null`, then the element again.
	describe("callback ref", () => {
		test("without children, fires once on mount and not again on re-render", () => {
			const ref = vi.fn<(node: HTMLInputElement | null) => void>();
			const { rerender } = render(<Input ref={ref} placeholder="first" />);
			expect(ref).toHaveBeenCalledTimes(1);
			expect(ref).toHaveBeenLastCalledWith(screen.getByRole("textbox"));

			rerender(<Input ref={ref} placeholder="second" />);
			expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "second");
			expect(ref).toHaveBeenCalledTimes(1);
		});

		test("with children, a ref on Input fires once on mount and not again on re-render", () => {
			const ref = vi.fn<(node: HTMLInputElement | null) => void>();
			const { rerender } = render(
				<Input ref={ref} placeholder="first">
					<InputCapture />
				</Input>,
			);
			expect(ref).toHaveBeenCalledTimes(1);
			expect(ref).toHaveBeenLastCalledWith(screen.getByRole("textbox"));

			rerender(
				<Input ref={ref} placeholder="second">
					<InputCapture />
				</Input>,
			);
			expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "second");
			expect(ref).toHaveBeenCalledTimes(1);
		});

		test("with children, a ref on InputCapture fires once on mount and not again on re-render", () => {
			const ref = vi.fn<(node: HTMLInputElement | null) => void>();
			const { rerender } = render(
				<Input placeholder="first">
					<InputCapture ref={ref} />
				</Input>,
			);
			expect(ref).toHaveBeenCalledTimes(1);
			expect(ref).toHaveBeenLastCalledWith(screen.getByRole("textbox"));

			rerender(
				<Input placeholder="second">
					<InputCapture ref={ref} />
				</Input>,
			);
			expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "second");
			expect(ref).toHaveBeenCalledTimes(1);
		});
	});

	describe("data-disabled", () => {
		test("stamps data-disabled when disabled and disables the input", () => {
			render(<Input disabled placeholder="test" />);
			expect(getInputContainer()).toHaveAttribute("data-disabled", "true");
			expect(screen.getByRole("textbox")).toBeDisabled();
		});

		// The `data-disabled:` variant matches attribute presence, so a stamped
		// "false" would dim an enabled control.
		test('does not stamp data-disabled for aria-disabled="false"', () => {
			const { container } = render(<Input aria-disabled="false" placeholder="test" />);
			expect(container.querySelector('[data-slot="input"]')).not.toHaveAttribute("data-disabled");
		});

		test('stamps data-disabled for aria-disabled="true"', () => {
			const { container } = render(<Input aria-disabled="true" placeholder="test" />);
			expect(container.querySelector('[data-slot="input"]')).toHaveAttribute(
				"data-disabled",
				"true",
			);
		});
	});

	describe("container", () => {
		test("wraps the capture element in the data-slot=input chrome", () => {
			render(
				<Input>
					<InputCapture aria-label="Search" />
				</Input>,
			);

			const capture = screen.getByRole("textbox", { name: "Search" });
			expect(capture).toHaveAttribute("data-slot", "input-capture");
			expect(getInputContainer()).toContainElement(capture);
		});

		test("prevents mousedown on non-input children so the input never blurs", () => {
			render(
				<Input>
					<InputCapture aria-label="Search" />
					<span data-testid="trailing">icon</span>
				</Input>,
			);

			// `fireEvent` returns false when a handler called `preventDefault`.
			expect(fireEvent.mouseDown(screen.getByTestId("trailing"))).toBe(false);
			expect(fireEvent.mouseDown(getInputContainer())).toBe(false);
			// The input keeps its native mousedown, which places the caret.
			expect(fireEvent.mouseDown(screen.getByRole("textbox", { name: "Search" }))).toBe(true);
		});

		test("omits data-validation and renders no feedback icon when neutral", () => {
			render(<Input aria-label="Email" />);

			expect(getInputContainer()).not.toHaveAttribute("data-validation");
			expect(document.querySelectorAll('[data-slot~="icon"]')).toHaveLength(0);
		});

		test('validation="error" announces the failure and names the field', () => {
			render(<Input aria-label="Email" name="email" validation="error" />);

			expect(getInputContainer()).toHaveAttribute("data-validation", "error");
			expect(
				screen.getByText("The value entered for the email input has failed validation."),
			).toBeInTheDocument();
		});

		test('validation="error" without a name still announces the failure', () => {
			render(<Input aria-label="Email" validation="error" />);

			expect(
				screen.getByText("The value entered for the input has failed validation."),
			).toBeInTheDocument();
		});

		test.each(["success", "warning"] as const)(
			'validation="%s" renders one decorative icon and announces nothing',
			(validation) => {
				render(<Input aria-label="Email" name="email" validation={validation} />);

				expect(getInputContainer()).toHaveAttribute("data-validation", validation);
				expect(screen.queryByText(/has failed validation/)).toBeNull();
				const icons = document.querySelectorAll('[data-slot~="icon"]');
				expect(icons).toHaveLength(1);
				expect(icons[0]).toHaveAttribute("aria-hidden", "true");
			},
		);
	});
});
