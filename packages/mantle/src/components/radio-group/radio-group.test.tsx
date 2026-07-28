import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { Field } from "../field/field.js";
import { RadioGroup } from "./radio-group.js";

describe("RadioGroup", () => {
	test("Field.Control wrapping RadioGroup.Root applies field ARIA wiring to each radio item", () => {
		render(
			<Field.Item name="plan">
				<Field.Control>
					<RadioGroup.Root>
						<RadioGroup.Item
							aria-errormessage="ignored-error"
							aria-invalid="false"
							value="basic"
							data-testid="basic"
						>
							<RadioGroup.Indicator />
							<span>Basic</span>
						</RadioGroup.Item>
						<RadioGroup.Item value="pro" data-testid="pro">
							<RadioGroup.Indicator />
							<span>Pro</span>
						</RadioGroup.Item>
					</RadioGroup.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Pick a plan.</Field.Description>
			</Field.Item>,
		);

		const basic = screen.getByTestId("basic");
		const errors = screen.getByTestId("errors");
		expect(basic).toHaveAttribute("aria-invalid", "true");
		expect(basic).toHaveAttribute("aria-errormessage", errors.id);
		// `aria-describedby` is owned by Headless UI's Radio primitive (it
		// reserves the attribute for its own Description tracking and strips
		// caller-provided values), so `Field.Description` / `Field.Errors`
		// IDREFs can't flow onto the radio. `aria-invalid` and
		// `aria-errormessage` still wire through.
	});
});

/**
 * Render a two-option radio group whose "custom" option nests a control inside a
 * `RadioGroup.InputSandbox`. `onItemContentKeyDown` sits on the `ItemContent`
 * *between* the radio item and the sandbox, so it only fires for keydowns the
 * sandbox lets propagate.
 */
function renderSandbox({
	control,
	defaultValue,
	disabled = false,
	onItemContentKeyDown,
	onSandboxClick,
	onSandboxKeyDown,
}: {
	control: ReactNode;
	defaultValue?: string;
	disabled?: boolean;
	onItemContentKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
	onSandboxClick?: (event: MouseEvent<HTMLDivElement>) => void;
	onSandboxKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
	render(
		<RadioGroup.Root aria-label="Amount" defaultValue={defaultValue}>
			<RadioGroup.Item aria-label="Fixed" value="fixed">
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent>Fixed</RadioGroup.ItemContent>
			</RadioGroup.Item>
			<RadioGroup.Item aria-label="Custom" disabled={disabled} value="custom">
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent onKeyDown={onItemContentKeyDown}>
					<RadioGroup.InputSandbox onClick={onSandboxClick} onKeyDown={onSandboxKeyDown}>
						{control}
					</RadioGroup.InputSandbox>
				</RadioGroup.ItemContent>
			</RadioGroup.Item>
		</RadioGroup.Root>,
	);

	const input = screen.getByLabelText<HTMLInputElement>("Custom amount");
	const sandbox = input.closest('[data-slot="radio-group-input-sandbox"]');

	return { input, sandbox };
}

describe("RadioGroup.InputSandbox", () => {
	test("takes the nested control out of the tab order until its radio item is checked", async () => {
		const user = userEvent.setup();
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" tabIndex={0} />,
			defaultValue: "fixed",
		});

		// Unchecked: the control must not be tab-reachable, otherwise Tab lands
		// inside an option the user has not selected.
		expect(input).toHaveAttribute("tabindex", "-1");

		await user.click(screen.getByRole("radio", { name: "Custom" }));

		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		// Checked: the control's own tabIndex is restored, not overwritten.
		expect(input).toHaveAttribute("tabindex", "0");
	});

	test("keeps the control out of the tab order when its item is checked but disabled", () => {
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" tabIndex={0} />,
			defaultValue: "custom",
			disabled: true,
		});

		expect(input).toHaveAttribute("tabindex", "-1");
	});

	test("inherits disabled from the radio item", () => {
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "custom",
			disabled: true,
		});

		expect(input).toBeDisabled();
	});

	test("does not clobber a control that disables itself inside an enabled item", () => {
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" disabled />,
			defaultValue: "custom",
		});

		expect(input).toBeDisabled();
	});

	test("leaves a control enabled inside an enabled, checked item", () => {
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "custom",
		});

		expect(input).toBeEnabled();
	});

	test("stops character keydowns from reaching the radio item but lets Enter through", async () => {
		const user = userEvent.setup();
		const onItemContentKeyDown = vi.fn<(event: KeyboardEvent<HTMLDivElement>) => void>();
		const onSandboxKeyDown = vi.fn<(event: KeyboardEvent<HTMLDivElement>) => void>();
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "custom",
			onItemContentKeyDown,
			onSandboxKeyDown,
		});

		await user.click(input);
		await user.keyboard("a");

		// The character reaches the control, but not the radio item — otherwise
		// the group's type-ahead would hijack it and change the selection.
		expect(input).toHaveValue("a");
		expect(onItemContentKeyDown).not.toHaveBeenCalled();
		expect(screen.getByRole("radio", { name: "Fixed" })).not.toBeChecked();
		// The sandbox still forwards every key to its own handler.
		expect(onSandboxKeyDown.mock.calls.map(([event]) => event.key)).toEqual(["a"]);

		await user.keyboard("{Enter}");

		// Enter is the group's "submit / confirm" key and must still bubble.
		expect(onItemContentKeyDown.mock.calls.map(([event]) => event.key)).toEqual(["Enter"]);
	});

	test("swallows keydown and click before the caller's handlers when the item is disabled", async () => {
		const user = userEvent.setup();
		const onItemContentKeyDown = vi.fn<(event: KeyboardEvent<HTMLDivElement>) => void>();
		const onSandboxClick = vi.fn<(event: MouseEvent<HTMLDivElement>) => void>();
		const onSandboxKeyDown = vi.fn<(event: KeyboardEvent<HTMLDivElement>) => void>();
		const { sandbox } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "custom",
			disabled: true,
			onItemContentKeyDown,
			onSandboxClick,
			onSandboxKeyDown,
		});
		expect(sandbox).not.toBeNull();

		if (sandbox instanceof HTMLElement) {
			await user.click(sandbox);
			// The sandbox itself isn't focusable and its control is disabled, so
			// the keydown has to be dispatched at the sandbox directly.
			fireEvent.keyDown(sandbox, { key: "Enter" });
		}

		expect(onSandboxClick).not.toHaveBeenCalled();
		expect(onSandboxKeyDown).not.toHaveBeenCalled();
		expect(onItemContentKeyDown).not.toHaveBeenCalled();
	});

	test("forwards a click on the nested control to the caller's onClick", async () => {
		const user = userEvent.setup();
		const onSandboxClick = vi.fn<(event: MouseEvent<HTMLDivElement>) => void>();
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "custom",
			onSandboxClick,
		});

		await user.click(input);

		expect(onSandboxClick).toHaveBeenCalledTimes(1);
	});
});

describe("RadioGroup.ItemContent", () => {
	test("asChild renders the supplied element, keeping data-slot and merging className", () => {
		render(
			<RadioGroup.Root aria-label="Plan">
				<RadioGroup.Item value="basic">
					<RadioGroup.Indicator />
					<RadioGroup.ItemContent asChild className="text-left">
						<a data-testid="content" href="/plans/basic">
							Basic
						</a>
					</RadioGroup.ItemContent>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		const content = screen.getByRole("link", { name: "Basic" });
		expect(content.tagName).toBe("A");
		expect(content).toHaveAttribute("data-slot", "radio-group-item-content");
		expect(content).toHaveAttribute("href", "/plans/basic");
		expect(content).toHaveClass("text-left");
	});

	test("renders a div when asChild is not set", () => {
		render(
			<RadioGroup.Root aria-label="Plan">
				<RadioGroup.Item value="basic">
					<RadioGroup.Indicator />
					<RadioGroup.ItemContent data-testid="content">Basic</RadioGroup.ItemContent>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		expect(screen.getByTestId("content").tagName).toBe("DIV");
	});
});
