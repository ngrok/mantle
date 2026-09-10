import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Profiler, useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { PasswordInput } from "./password-input.js";

describe("PasswordInput", () => {
	test('given validation={false}, renders an input with aria-invalid="false" and not have data-validation', () => {
		render(<PasswordInput placeholder="test" validation={false} />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByPlaceholderText("test")).not.toHaveAttribute("data-validation");
	});

	test('given validation="success", renders an input with aria-invalid="false" and data-validation="success"', () => {
		render(<PasswordInput placeholder="test" validation="success" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "success");
	});

	test('given validation="warning", renders an input with aria-invalid="false" and data-validation="warning"', () => {
		render(<PasswordInput placeholder="test" validation="warning" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "false");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "warning");
	});

	test('given validation="error", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" validation="error" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="success", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" aria-invalid="true" validation="success" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="warning", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" aria-invalid="true" validation="warning" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	test('given aria-invalid="true" and validation="error", renders an input with aria-invalid="true" and data-validation="error"', () => {
		render(<PasswordInput placeholder="test" aria-invalid="true" validation="error" />);
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("aria-invalid", "true");
		expect(screen.getByPlaceholderText("test")).toHaveAttribute("data-validation", "error");
	});

	// Regression: voice-control tools (e.g. Rango) treat DOM text as a visible
	// label, so a hidden label span suppressed their hints on the toggle. The
	// name must be the `aria-label` attribute, with no text node in the button.
	test("names the visibility toggle with aria-label and no text content", () => {
		render(<PasswordInput placeholder="test" />);
		const toggle = screen.getByRole("button", { name: "Show value" });
		expect(toggle).toHaveAttribute("aria-label", "Show value");
		expect(toggle.textContent).toBe("");
	});

	// Regression: the toggle's name once contained "password", so a substring
	// label query for the input ("Password") matched the toggle too.
	test("the toggle's name does not contain the input's label", () => {
		render(
			<Field.Item name="password">
				<Field.Label>Password</Field.Label>
				<Field.Control>
					<PasswordInput />
				</Field.Control>
			</Field.Item>,
		);

		expect(screen.getAllByLabelText(/password/i)).toHaveLength(1);
	});

	test("uses the id you pass for the input and the toggle's aria-controls", () => {
		render(<PasswordInput id="login-password" placeholder="test" />);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Show value" });
		expect(input).toHaveAttribute("id", "login-password");
		expect(toggle).toHaveAttribute("aria-controls", "login-password");
	});

	test("generates an id when none is passed and points aria-controls at it", () => {
		render(<PasswordInput placeholder="test" />);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Show value" });
		const id = input.getAttribute("id");
		expect(id).toBeTruthy();
		expect(toggle).toHaveAttribute("aria-controls", id ?? "");
	});

	test("inside Field.Item, its id sets the input id, the label htmlFor, and aria-controls", () => {
		render(
			<Field.Item name="password" id="login-password">
				<Field.Label>Password</Field.Label>
				<Field.Control>
					<PasswordInput />
				</Field.Control>
			</Field.Item>,
		);

		const input = screen.getByLabelText("Password");
		expect(input).toHaveAttribute("id", "login-password");
		expect(screen.getByText("Password")).toHaveAttribute("for", "login-password");
		expect(screen.getByRole("button", { name: "Show value" })).toHaveAttribute(
			"aria-controls",
			"login-password",
		);
	});

	test("the toggle is in the tab order after the input", async () => {
		const user = userEvent.setup();
		render(<PasswordInput placeholder="test" />);

		await user.tab();
		expect(screen.getByPlaceholderText("test")).toHaveFocus();

		await user.tab();
		expect(screen.getByRole("button", { name: "Show value" })).toHaveFocus();
	});

	test("keyboard activation toggles visibility, flips aria-pressed, and keeps focus on the toggle", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn<(visible: boolean) => void>();
		render(<PasswordInput placeholder="test" onValueVisibilityChange={handleChange} />);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Show value" });
		expect(toggle).toHaveAttribute("aria-pressed", "false");

		await user.tab();
		await user.tab();
		expect(toggle).toHaveFocus();

		await user.keyboard("[Space]");
		expect(input).toHaveAttribute("type", "text");
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		expect(toggle).toHaveFocus();
		expect(handleChange).toHaveBeenCalledTimes(1);
		expect(handleChange).toHaveBeenLastCalledWith(true);

		await user.keyboard("{Enter}");
		expect(input).toHaveAttribute("type", "password");
		expect(toggle).toHaveAttribute("aria-pressed", "false");
		expect(toggle).toHaveFocus();
		expect(handleChange).toHaveBeenCalledTimes(2);
		expect(handleChange).toHaveBeenLastCalledWith(false);
	});

	// Regression: the toggle left `tabIndex={-1}` without taking `disabled`, so
	// Tab entered a disabled PasswordInput and Space revealed its value.
	test("given disabled, the toggle is disabled, Tab skips it, and it cannot reveal the value", async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn<(visible: boolean) => void>();
		render(
			<>
				<PasswordInput placeholder="test" disabled onValueVisibilityChange={handleChange} />
				<button type="button">after</button>
			</>,
		);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Show value" });
		expect(toggle).toBeDisabled();

		await user.tab();
		expect(screen.getByRole("button", { name: "after" })).toHaveFocus();

		await user.click(toggle);
		await user.keyboard("[Space]{Enter}");
		expect(input).toHaveAttribute("type", "password");
		expect(toggle).toHaveAttribute("aria-pressed", "false");
		expect(handleChange).toHaveBeenCalledTimes(0);
	});

	test("a pointer click on the toggle reveals the value and focuses the input", async () => {
		const user = userEvent.setup();
		render(<PasswordInput placeholder="test" />);

		const input = screen.getByPlaceholderText("test");
		const toggle = screen.getByRole("button", { name: "Show value" });

		await user.click(toggle);
		expect(input).toHaveAttribute("type", "text");
		expect(toggle).toHaveAttribute("aria-pressed", "true");
		expect(input).toHaveFocus();
	});

	// Regression: an effect mirrored `showValue` into local state. The click
	// handler flipped that state without a controlled check, so a static
	// `showValue={false}` still revealed the value on click.
	describe("controlled showValue", () => {
		test("given showValue={false} and a consumer that does not echo, a click keeps the value hidden", async () => {
			const user = userEvent.setup();
			const handleChange = vi.fn<(visible: boolean) => void>();
			const handleRender = vi.fn<() => void>();
			render(
				<Profiler id="password-input" onRender={handleRender}>
					<PasswordInput
						placeholder="test"
						showValue={false}
						onValueVisibilityChange={handleChange}
					/>
				</Profiler>,
			);

			const input = screen.getByPlaceholderText("test");
			const toggle = screen.getByRole("button", { name: "Show value" });
			expect(handleRender).toHaveBeenCalledTimes(1);

			await user.click(toggle);
			expect(handleChange).toHaveBeenCalledTimes(1);
			expect(handleChange).toHaveBeenLastCalledWith(true);
			expect(input).toHaveAttribute("type", "password");
			expect(toggle).toHaveAttribute("aria-pressed", "false");
			// Why the commit count: a controlled click must not write the internal
			// state. A write there commits a second time and leaves stale state
			// behind for a consumer who later drops `showValue`.
			expect(handleRender).toHaveBeenCalledTimes(1);

			await user.click(toggle);
			expect(handleChange).toHaveBeenCalledTimes(2);
			expect(handleChange).toHaveBeenLastCalledWith(true);
			expect(input).toHaveAttribute("type", "password");
			expect(toggle).toHaveAttribute("aria-pressed", "false");
		});

		test("given a consumer that echoes the toggle, a click reveals the value and animates the icon now in the DOM", async () => {
			const user = userEvent.setup();
			const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");
			const Subject = () => {
				const [show, setShow] = useState(false);
				return (
					<PasswordInput placeholder="test" showValue={show} onValueVisibilityChange={setShow} />
				);
			};
			render(<Subject />);

			const input = screen.getByPlaceholderText("test");
			const toggle = screen.getByRole("button", { name: "Show value" });

			await user.click(toggle);
			expect(input).toHaveAttribute("type", "text");
			expect(toggle).toHaveAttribute("aria-pressed", "true");
			// The parent's setState is the render that swaps the icon, so the
			// animation must target the `<svg>` in the toggle after the click, not
			// the one the click removed.
			expect(animateSpy).toHaveBeenCalledTimes(1);
			expect(animateSpy.mock.contexts[0]).toBe(toggle.querySelector("svg"));

			await user.click(toggle);
			expect(input).toHaveAttribute("type", "password");
			expect(toggle).toHaveAttribute("aria-pressed", "false");
			expect(animateSpy).toHaveBeenCalledTimes(2);
			expect(animateSpy.mock.contexts[1]).toBe(toggle.querySelector("svg"));
		});

		// Regression: the animation ran inside the toggle's click handler, so a
		// `showValue` change from another control swapped the icon with no motion.
		test("a showValue change from outside animates the icon now in the DOM", () => {
			const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");
			const { rerender } = render(<PasswordInput placeholder="test" showValue={false} />);
			const toggle = screen.getByRole("button", { name: "Show value" });

			// The first paint is not a change, so it does not animate.
			expect(animateSpy).not.toHaveBeenCalled();

			rerender(<PasswordInput placeholder="test" showValue />);
			expect(animateSpy).toHaveBeenCalledTimes(1);
			expect(animateSpy.mock.contexts[0]).toBe(toggle.querySelector("svg"));

			rerender(<PasswordInput placeholder="test" showValue={false} />);
			expect(animateSpy).toHaveBeenCalledTimes(2);
			expect(animateSpy.mock.contexts[1]).toBe(toggle.querySelector("svg"));
		});

		// The icon did not change, so motion would claim a reveal that did not happen.
		test("given a consumer that does not echo, a click does not animate the icon", async () => {
			const user = userEvent.setup();
			const animateSpy = vi.spyOn(SVGSVGElement.prototype, "animate");
			render(
				<PasswordInput placeholder="test" showValue={false} onValueVisibilityChange={() => {}} />,
			);

			await user.click(screen.getByRole("button", { name: "Show value" }));

			expect(animateSpy).not.toHaveBeenCalled();
		});

		// `Profiler` counts commits. A mirror effect commits the stale `type`
		// first and the corrected one second; derivation commits once.
		test("a showValue change swaps the type and aria-pressed in one commit", () => {
			const handleRender = vi.fn<() => void>();
			const { rerender } = render(
				<Profiler id="password-input" onRender={handleRender}>
					<PasswordInput placeholder="test" showValue={false} />
				</Profiler>,
			);

			const input = screen.getByPlaceholderText("test");
			const toggle = screen.getByRole("button", { name: "Show value" });
			expect(input).toHaveAttribute("type", "password");
			expect(handleRender).toHaveBeenCalledTimes(1);

			rerender(
				<Profiler id="password-input" onRender={handleRender}>
					<PasswordInput placeholder="test" showValue />
				</Profiler>,
			);
			expect(input).toHaveAttribute("type", "text");
			expect(toggle).toHaveAttribute("aria-pressed", "true");
			expect(handleRender).toHaveBeenCalledTimes(2);

			rerender(
				<Profiler id="password-input" onRender={handleRender}>
					<PasswordInput placeholder="test" showValue={false} />
				</Profiler>,
			);
			expect(input).toHaveAttribute("type", "password");
			expect(toggle).toHaveAttribute("aria-pressed", "false");
			expect(handleRender).toHaveBeenCalledTimes(3);
		});
	});

	test("forwards className to the chrome, and ref and data-* to the input", () => {
		const ref = vi.fn<(node: HTMLInputElement | null) => void>();
		const { container } = render(
			<PasswordInput className="custom" data-testid="secret" placeholder="test" ref={ref} />,
		);

		const input = screen.getByPlaceholderText("test");
		expect(container.querySelector('[data-slot="password-input"]')).toHaveClass("custom");
		// Why the input: `Input` routes every unclaimed prop to the `<input>`
		// through context, so `data-*` lands beside `name` and `placeholder`.
		expect(input).toHaveAttribute("data-testid", "secret");
		expect(ref).toHaveBeenCalledTimes(1);
		expect(ref).toHaveBeenLastCalledWith(input);
	});

	test("stamps data-slot on the chrome, the input, and the toggle", () => {
		const { container } = render(<PasswordInput placeholder="test" />);

		const input = screen.getByPlaceholderText("test");
		expect(container.querySelector('[data-slot="password-input"]')).toContainElement(input);
		expect(input).toHaveAttribute("data-slot", "input-capture");
		expect(screen.getByRole("button", { name: "Show value" })).toHaveAttribute(
			"data-slot",
			"password-input-toggle",
		);
	});

	test("stamps data-disabled and data-validation on the chrome, and omits them when unset", () => {
		const { container, rerender } = render(<PasswordInput placeholder="test" />);
		const chrome = container.querySelector('[data-slot="password-input"]');

		expect(chrome).not.toHaveAttribute("data-disabled");
		expect(chrome).not.toHaveAttribute("data-validation");

		rerender(<PasswordInput placeholder="test" disabled validation="warning" />);
		expect(chrome).toHaveAttribute("data-disabled");
		expect(chrome).toHaveAttribute("data-validation", "warning");
	});
});
