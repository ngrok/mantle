import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands, userEvent } from "vitest/browser";
import { Combobox } from "../combobox/index.js";
import { Input, InputCapture, PasswordInput } from "../input/index.js";
import { MultiSelect } from "../multi-select/index.js";
import { Select } from "../select/index.js";
import { TextArea } from "../text-area/index.js";
import type { Validation } from "./validation.js";

/**
 * Real-browser check of the error shake on each form control. The shake is a
 * CSS animation behind `motion-safe:`, `not-focus…:`, and
 * `data-validation-error:` variants, so only a running `CSSAnimation` can show
 * whether the guards hold. happy-dom runs no animation, and
 * `prefers-reduced-motion` is a Playwright page emulation.
 *
 * The stylesheet below is Tailwind 4.3.3's output for the class lists
 * the controls use, with the `shake` keyframes from `mantle.css`. Regenerate it
 * by compiling those class names through `@tailwindcss/node`'s `compile()`.
 */
const STYLE = `
@layer theme {
	:root {
		--color-danger-600: rgb(220, 38, 38);
	}
}
@layer utilities {
	.has-\\[\\>\\[data-validation\\=error\\]\\]\\:border-danger-600:has( > [data-validation=error]) {
		border-color: var(--color-danger-600);
	}
	@media (prefers-reduced-motion: no-preference) {
		.motion-safe\\:not-focus-within\\:has-\\[\\>\\[data-validation\\=error\\]\\]\\:animate-shake:not(:focus-within):has( > [data-validation=error]) {
			animation: shake 300ms ease-in-out;
		}
		.motion-safe\\:not-focus-within\\:data-validation-error\\:animate-shake:not(:focus-within)[data-validation="error"] {
			animation: shake 300ms ease-in-out;
		}
		.motion-safe\\:not-focus-within\\:not-has-aria-expanded\\:data-validation-error\\:animate-shake:not(:focus-within):not(:has([aria-expanded="true"]))[data-validation="error"] {
			animation: shake 300ms ease-in-out;
		}
		.motion-safe\\:not-focus\\:data-validation-error\\:animate-shake:not(:focus)[data-validation="error"] {
			animation: shake 300ms ease-in-out;
		}
		.motion-safe\\:not-focus\\:not-aria-expanded\\:data-validation-error\\:animate-shake:not(:focus):not([aria-expanded="true"])[data-validation="error"] {
			animation: shake 300ms ease-in-out;
		}
	}
}
@keyframes shake {
	0% { translate: 0; animation-timing-function: ease-out; }
	20% { translate: -4px; }
	40% { translate: 3px; }
	60% { translate: -2px; }
	80% { translate: 1px; }
	100% { translate: 0; }
}
`;

let styleElement: HTMLStyleElement;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

/** The running `shake` animations on an element. */
function shakesOf(element: Element) {
	return element
		.getAnimations()
		.filter(
			(animation) => animation instanceof CSSAnimation && animation.animationName === "shake",
		);
}

/** The `Input` chrome around `from`: the element that carries `data-validation` and the shake. */
function inputChrome(from: Element = screen.getByRole("textbox")) {
	const chrome = from.closest("[data-slot~='input']");
	if (chrome == null) {
		throw new Error("No element carries data-slot~='input'.");
	}
	return chrome;
}

describe("error shake", () => {
	test("an unfocused Input shakes once when it shows an error, then settles", async () => {
		const { rerender } = render(<Input aria-label="Email" />);
		expect(shakesOf(inputChrome())).toHaveLength(0);

		rerender(<Input aria-label="Email" validation="error" />);
		const [shake] = shakesOf(inputChrome());
		expect(shake).toBeDefined();

		await shake?.finished;
		expect(shakesOf(inputChrome())).toHaveLength(0);
		expect(getComputedStyle(inputChrome()).translate).toBe("none");
	});

	test("a focused Input does not shake, shakes when focus leaves, and stops when focus comes back", async () => {
		render(<Input aria-label="Email" validation="error" />);
		const input = screen.getByRole("textbox");
		// Why: the first render has no focus, so it shakes. Wait it out.
		await Promise.all(shakesOf(inputChrome()).map((animation) => animation.finished));

		input.focus();
		expect(shakesOf(inputChrome())).toHaveLength(0);

		input.blur();
		expect(shakesOf(inputChrome())).toHaveLength(1);

		input.focus();
		expect(shakesOf(inputChrome())).toHaveLength(0);
	});

	test("an Input chrome turns red and shakes when only its InputCapture shows an error", () => {
		const Subject = ({ validation }: { validation?: Validation }) => (
			<Input>
				<InputCapture aria-label="Email" validation={validation} />
			</Input>
		);
		const { rerender } = render(<Subject />);
		expect(shakesOf(inputChrome())).toHaveLength(0);

		rerender(<Subject validation="error" />);
		expect(inputChrome()).not.toHaveAttribute("data-validation");
		expect(getComputedStyle(inputChrome()).borderColor).toBe("rgb(220, 38, 38)");
		expect(shakesOf(inputChrome())).toHaveLength(1);
		expect(shakesOf(screen.getByRole("textbox"))).toHaveLength(0);
	});

	test("a PasswordInput does not shake while its visibility toggle has focus", async () => {
		const ControlledPasswordInput = ({ validation }: { validation?: Validation }) => (
			<PasswordInput aria-label="Password" validation={validation} />
		);
		const { rerender } = render(<ControlledPasswordInput />);
		const toggle = screen.getByRole("button", { name: "Show value" });
		toggle.focus();

		rerender(<ControlledPasswordInput validation="error" />);
		expect(shakesOf(inputChrome(toggle))).toHaveLength(0);
	});

	test("an unfocused TextArea shakes when it shows an error, and a focused one does not", () => {
		const { rerender } = render(<TextArea aria-label="Notes" />);
		const textArea = screen.getByRole("textbox");

		rerender(<TextArea aria-label="Notes" validation="error" />);
		expect(shakesOf(textArea)).toHaveLength(1);

		rerender(<TextArea aria-label="Notes" />);
		textArea.focus();
		rerender(<TextArea aria-label="Notes" validation="error" />);
		expect(shakesOf(textArea)).toHaveLength(0);
	});

	test("a Select.Trigger shakes when unfocused, and does not shake while its list is open", async () => {
		const Subject = ({ validation }: { validation?: Validation }) => (
			<Select.Root>
				<Select.Trigger aria-label="Fruit" validation={validation}>
					<Select.Value placeholder="Pick a fruit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>
		);
		const { rerender } = render(<Subject />);
		const trigger = screen.getByRole("combobox", { name: "Fruit" });

		rerender(<Subject validation="error" />);
		expect(shakesOf(trigger)).toHaveLength(1);
		await Promise.all(shakesOf(trigger).map((animation) => animation.finished));

		rerender(<Subject />);
		await userEvent.click(trigger);
		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
		// Why: Radix moves focus into the list, so only the `aria-expanded` guard holds.
		expect(trigger).not.toHaveFocus();
		rerender(<Subject validation="error" />);
		expect(shakesOf(trigger)).toHaveLength(0);
	});

	test("a Combobox.Input shakes when unfocused, and does not shake while the user types", async () => {
		const Subject = ({ validation }: { validation?: Validation }) => (
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" validation={validation} />
				<Combobox.Content>
					<Combobox.Item value="Apple" />
				</Combobox.Content>
			</Combobox.Root>
		);
		const { rerender } = render(<Subject />);
		const input = screen.getByRole("combobox", { name: "Fruit" });

		rerender(<Subject validation="error" />);
		expect(shakesOf(input)).toHaveLength(1);
		await Promise.all(shakesOf(input).map((animation) => animation.finished));

		rerender(<Subject />);
		await userEvent.type(input, "A");
		rerender(<Subject validation="error" />);
		expect(shakesOf(input)).toHaveLength(0);
	});

	test("a MultiSelect.Trigger shakes when unfocused, and does not shake while its input has focus", () => {
		const Subject = ({ validation }: { validation?: Validation }) => (
			<MultiSelect.Root>
				<MultiSelect.Trigger validation={validation}>
					<MultiSelect.TagValues />
					<MultiSelect.Input aria-label="Fruits" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		);
		const { rerender } = render(<Subject />);
		const input = screen.getByRole("combobox", { name: "Fruits" });
		const trigger = input.closest("[data-slot~='multi-select-trigger']");
		if (trigger == null) {
			throw new Error("No element carries data-slot~='multi-select-trigger'.");
		}

		rerender(<Subject validation="error" />);
		expect(shakesOf(trigger)).toHaveLength(1);

		rerender(<Subject />);
		input.focus();
		rerender(<Subject validation="error" />);
		expect(shakesOf(trigger)).toHaveLength(0);
	});

	test("a MultiSelect.Trigger does not shake while focus is in its open list", async () => {
		const Subject = ({ validation }: { validation?: Validation }) => (
			<MultiSelect.Root>
				<MultiSelect.Trigger validation={validation}>
					<MultiSelect.TagValues />
					<MultiSelect.Input aria-label="Fruits" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
					<MultiSelect.ContentFooter>
						<button type="button">Add fruit</button>
					</MultiSelect.ContentFooter>
				</MultiSelect.Content>
			</MultiSelect.Root>
		);
		const { rerender } = render(<Subject />);
		const input = screen.getByRole("combobox", { name: "Fruits" });
		const trigger = input.closest("[data-slot~='multi-select-trigger']");
		if (trigger == null) {
			throw new Error("No element carries data-slot~='multi-select-trigger'.");
		}

		await userEvent.click(input);
		const footerButton = await screen.findByRole("button", { name: "Add fruit" });
		footerButton.focus();
		// Why: the list is portaled, so focus in it leaves the trigger. Only the
		// `aria-expanded` guard holds.
		expect(trigger).not.toContainElement(document.activeElement as HTMLElement);
		expect(input).toHaveAttribute("aria-expanded", "true");

		rerender(<Subject validation="error" />);
		expect(shakesOf(trigger)).toHaveLength(0);
	});

	test("with reduced motion, an unfocused Input shows the error and does not shake", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);

		const { rerender } = render(<Input aria-label="Email" />);
		rerender(<Input aria-label="Email" validation="error" />);

		expect(inputChrome()).toHaveAttribute("data-validation", "error");
		expect(shakesOf(inputChrome())).toHaveLength(0);
	});
});
