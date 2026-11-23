import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { commands } from "vitest/browser";
import * as Combobox from "../combobox/combobox-parts.js";
import { Input, InputCapture } from "../input/index.js";
import * as MultiSelect from "../multi-select/multi-select-parts.js";
import * as Select from "../select/select-parts.js";
import { shakesOf } from "../../test-utils/shake-style.js";
import { TextArea } from "../text-area/index.js";
import type { Validation } from "./validation.js";

/**
 * Real-browser check of the error shake on each form control. The shake is a
 * CSS animation behind `motion-safe:` and an error-state variant. It must run
 * once when the control enters the error state, and not again while the error
 * stays. Only a running `CSSAnimation` can show that. happy-dom runs no
 * animation, and `prefers-reduced-motion` is a Playwright page emulation.
 *
 * The shake rules come from Tailwind's own output for each control, so the
 * `motion-safe:` gate is the one the component writes. Tailwind's default theme
 * has no `danger` color, so the border rule below is hand-written.
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
}
`;

let styleElement: HTMLStyleElement;

beforeAll(async () => {
	styleElement = document.createElement("style");
	const controls = [
		"../input/input.tsx",
		"../text-area/text-area.tsx",
		"../select/select.tsx",
		"../combobox/combobox.tsx",
		"../multi-select/multi-select.tsx",
	];
	const compiled = await Promise.all(controls.map((file) => commands.tailwindCss(file)));
	styleElement.textContent = [...compiled, STYLE].join("\n");
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

/** Waits until each running shake on an element ends. */
async function settle(element: Element) {
	await Promise.all(shakesOf(element).map((animation) => animation.finished));
}

/** The closest element that carries a `data-slot` token. */
function closestSlot(from: Element, slot: string) {
	const element = from.closest(`[data-slot~='${slot}']`);
	if (element == null) {
		throw new Error(`No element carries data-slot~='${slot}'.`);
	}
	return element;
}

/**
 * One case per control: how to render it with a validation state, the element
 * that takes focus, and the element that shakes.
 */
type ControlCase = {
	name: string;
	render: (validation?: Validation) => ReactElement;
	focusTarget: () => HTMLElement;
	shakeTarget: () => Element;
};

const controlCases: ControlCase[] = [
	{
		name: "Input",
		render: (validation) => <Input aria-label="Email" validation={validation} />,
		focusTarget: () => screen.getByRole("textbox", { name: "Email" }),
		shakeTarget: () => closestSlot(screen.getByRole("textbox", { name: "Email" }), "input"),
	},
	{
		name: "TextArea",
		render: (validation) => <TextArea aria-label="Notes" validation={validation} />,
		focusTarget: () => screen.getByRole("textbox", { name: "Notes" }),
		shakeTarget: () => screen.getByRole("textbox", { name: "Notes" }),
	},
	{
		name: "Select.Trigger",
		render: (validation) => (
			<Select.Root>
				<Select.Trigger aria-label="Fruit" validation={validation}>
					<Select.Value placeholder="Pick a fruit" />
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="apple">Apple</Select.Item>
				</Select.Content>
			</Select.Root>
		),
		focusTarget: () => screen.getByRole("combobox", { name: "Fruit" }),
		shakeTarget: () => screen.getByRole("combobox", { name: "Fruit" }),
	},
	{
		name: "Combobox.Input",
		render: (validation) => (
			<Combobox.Root>
				<Combobox.Input aria-label="Fruit" validation={validation} />
				<Combobox.Content>
					<Combobox.Item value="Apple" />
				</Combobox.Content>
			</Combobox.Root>
		),
		focusTarget: () => screen.getByRole("combobox", { name: "Fruit" }),
		shakeTarget: () => screen.getByRole("combobox", { name: "Fruit" }),
	},
	{
		name: "MultiSelect.Trigger",
		render: (validation) => (
			<MultiSelect.Root>
				<MultiSelect.Trigger validation={validation}>
					<MultiSelect.TagValues />
					<MultiSelect.Input aria-label="Fruits" />
				</MultiSelect.Trigger>
				<MultiSelect.Content>
					<MultiSelect.Item value="apple">Apple</MultiSelect.Item>
				</MultiSelect.Content>
			</MultiSelect.Root>
		),
		focusTarget: () => screen.getByRole("combobox", { name: "Fruits" }),
		shakeTarget: () =>
			closestSlot(screen.getByRole("combobox", { name: "Fruits" }), "multi-select-trigger"),
	},
];

describe("error shake", () => {
	describe.each(controlCases)("$name", ({ render: renderControl, focusTarget, shakeTarget }) => {
		test("shakes once when it enters the error state, then settles", async () => {
			const { rerender } = render(renderControl());
			expect(shakesOf(shakeTarget())).toHaveLength(0);

			rerender(renderControl("error"));
			expect(shakesOf(shakeTarget())).toHaveLength(1);

			await settle(shakeTarget());
			expect(shakesOf(shakeTarget())).toHaveLength(0);
			expect(getComputedStyle(shakeTarget()).translate).toBe("none");
		});

		test("does not shake again while the error stays, on focus, or on blur", async () => {
			const { rerender } = render(renderControl("error"));
			await settle(shakeTarget());

			rerender(renderControl("error"));
			expect(shakesOf(shakeTarget())).toHaveLength(0);

			focusTarget().focus();
			expect(shakesOf(shakeTarget())).toHaveLength(0);

			focusTarget().blur();
			expect(shakesOf(shakeTarget())).toHaveLength(0);
		});

		test("shakes while it has focus, and focus does not cut the shake short", () => {
			const { rerender } = render(renderControl());
			focusTarget().focus();

			rerender(renderControl("error"));
			const [shake] = shakesOf(shakeTarget());
			expect(shake?.playState).toBe("running");

			focusTarget().blur();
			focusTarget().focus();
			expect(shakesOf(shakeTarget())).toEqual([shake]);
		});

		test("shakes again when the error clears and comes back", async () => {
			const { rerender } = render(renderControl("error"));
			await settle(shakeTarget());

			rerender(renderControl());
			// Why: a read forces a style recalc. Without it, the browser never sees the
			// cleared state between the two commits. In a form, an event sits between them.
			expect(getComputedStyle(shakeTarget()).animationName).toBe("none");
			rerender(renderControl("error"));
			expect(shakesOf(shakeTarget())).toHaveLength(1);
		});
	});

	test("an Input chrome turns red and shakes when only its InputCapture shows an error", () => {
		const Subject = ({ validation }: { validation?: Validation }) => (
			<Input>
				<InputCapture aria-label="Email" validation={validation} />
			</Input>
		);
		const { rerender } = render(<Subject />);
		const chrome = closestSlot(screen.getByRole("textbox"), "input");
		expect(shakesOf(chrome)).toHaveLength(0);

		rerender(<Subject validation="error" />);
		expect(chrome).not.toHaveAttribute("data-validation");
		expect(getComputedStyle(chrome).borderColor).toBe("rgb(220, 38, 38)");
		expect(shakesOf(chrome)).toHaveLength(1);
		expect(shakesOf(screen.getByRole("textbox"))).toHaveLength(0);
	});

	test("with reduced motion, an Input shows the error and does not shake", async () => {
		await commands.emulateMedia({ reducedMotion: "reduce" });
		expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);

		const { rerender } = render(<Input aria-label="Email" />);
		rerender(<Input aria-label="Email" validation="error" />);

		const input = screen.getByRole("textbox", { name: "Email" });
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(shakesOf(closestSlot(input, "input"))).toHaveLength(0);
	});
});
