import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { act, useEffect, useRef, useState } from "react";
import type { ComponentRef } from "react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { Input, InputCapture } from "./input.js";

describe("Input", () => {
	test('without children or validation="error", renders an input with aria-invalid="false" and placeholder="Testy McTestface"', () => {
		render(<Input placeholder="Testy McTestface" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByRole("textbox")).toHaveAttribute("placeholder", "Testy McTestface");
	});

	test('without children, with validation="error", renders an input with aria-invalid="true"', () => {
		render(<Input validation="error" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
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

	test('given aria-invalid="true" and validation="warning", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<Input aria-invalid="true" validation="warning" />);
		expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByRole("textbox")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<Input aria-invalid="true" validation="error" />);
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
});
