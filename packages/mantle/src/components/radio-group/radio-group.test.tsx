import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import * as Choice from "../choice/choice-parts.js";
import * as Field from "../field/field-parts.js";
import * as RadioGroup from "./radio-group-parts.js";

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
		const description = screen.getByTestId("desc");
		expect(basic).toHaveAttribute("aria-invalid", "true");
		expect(basic).toHaveAttribute("aria-errormessage", errors.id);
		expect(basic).toHaveAttribute("aria-describedby", `${description.id} ${errors.id}`);
		expect(screen.getByTestId("pro")).toHaveAttribute(
			"aria-describedby",
			`${description.id} ${errors.id}`,
		);
	});

	test("plain content leaves aria-labelledby and aria-describedby off the radio", () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="basic">
				<RadioGroup.Item value="basic">
					<RadioGroup.Indicator />
					<span>Basic</span>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);
		const radio = screen.getByRole("radio", { name: "Basic" });
		expect(radio).not.toHaveAttribute("aria-labelledby");
		expect(radio).not.toHaveAttribute("aria-describedby");
	});

	test("`as` still picks the rendered element, with the Choice wiring intact", () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="free">
				<RadioGroup.Item as="span" value="free">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Free</Choice.Title>
							<Choice.Description>Up to 3 projects and 1 member.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);
		const radio = screen.getByRole("radio", { name: "Free" });
		// Why tagName: the `as` swap renders the named element in place of the default.
		expect(radio.tagName).toBe("SPAN");
		expect(radio).toHaveAccessibleDescription("Up to 3 projects and 1 member.");
	});

	test("inside Field.Control, the radio lists the field's ids before the Choice description", () => {
		render(
			<Field.Item name="plan">
				<Field.Control>
					<RadioGroup.Root defaultValue="free">
						<RadioGroup.Item value="free">
							<Choice.Root>
								<Choice.Indicator>
									<RadioGroup.Indicator />
								</Choice.Indicator>
								<Choice.Content>
									<Choice.Title>Free</Choice.Title>
									<Choice.Description>Up to 3 projects and 1 member.</Choice.Description>
								</Choice.Content>
							</Choice.Root>
						</RadioGroup.Item>
					</RadioGroup.Root>
				</Field.Control>
				<Field.Description data-testid="desc">Pick a plan.</Field.Description>
				<Field.Errors data-testid="errors" messages={["Required."]} />
			</Field.Item>,
		);
		const radio = screen.getByRole("radio", { name: "Free" });
		const fieldDescription = screen.getByTestId("desc");
		const errors = screen.getByTestId("errors");
		const choiceDescription = screen.getByText("Up to 3 projects and 1 member.");
		expect(radio).toHaveAttribute(
			"aria-describedby",
			`${fieldDescription.id} ${errors.id} ${choiceDescription.id}`,
		);
	});

	test("a consumer id on Choice.Title is the id aria-labelledby points at", () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="free">
				<RadioGroup.Item value="free">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title id="free-title">Free</Choice.Title>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);
		expect(screen.getByRole("radio", { name: "Free" })).toHaveAttribute(
			"aria-labelledby",
			"free-title",
		);
	});

	test("removing the description removes its id from aria-describedby", () => {
		const option = (withDescription: boolean) => (
			<RadioGroup.Root aria-label="Plan" defaultValue="free">
				<RadioGroup.Item value="free">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Free</Choice.Title>
							{withDescription && (
								<Choice.Description>Up to 3 projects and 1 member.</Choice.Description>
							)}
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>
		);
		const { rerender } = render(option(true));
		expect(screen.getByRole("radio", { name: "Free" })).toHaveAccessibleDescription(
			"Up to 3 projects and 1 member.",
		);

		rerender(option(false));
		expect(screen.getByRole("radio", { name: "Free" })).not.toHaveAttribute("aria-describedby");
	});

	test("RadioGroup.Indicator inside Choice.Indicator drops the injected name", () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="pro">
				<RadioGroup.Item value="pro">
					<Choice.Root name="plan">
						<Choice.Indicator>
							<RadioGroup.Indicator data-testid="indicator" />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Pro</Choice.Title>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		expect(screen.getByTestId("indicator")).not.toHaveAttribute("name");
	});

	test("InputSandbox keeps its input out of the tab order until a click checks the item", async () => {
		const user = userEvent.setup();
		render(
			<RadioGroup.Root aria-label="Amount" defaultValue="fixed">
				<RadioGroup.Item value="fixed">
					<RadioGroup.Indicator />
					<span>Fixed</span>
				</RadioGroup.Item>
				<RadioGroup.Item value="custom">
					<RadioGroup.Indicator />
					<span>Custom</span>
					<RadioGroup.InputSandbox>
						<input aria-label="Custom amount" />
					</RadioGroup.InputSandbox>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);
		const input = screen.getByRole("textbox", { name: "Custom amount" });
		expect(input).toHaveAttribute("tabindex", "-1");

		await user.click(screen.getByRole("radio", { name: "Custom" }));
		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		expect(input).not.toHaveAttribute("tabindex");
	});
});

const variants = [
	{ variant: "Item", Group: RadioGroup.Root, Option: RadioGroup.Item },
	{ variant: "ListItem", Group: RadioGroup.List, Option: RadioGroup.ListItem },
	{ variant: "Card", Group: RadioGroup.Root, Option: RadioGroup.Card },
] as const;

test.each(variants)(
	"RadioGroup.$variant: the title names the radio and the description describes it",
	({ Group, Option }) => {
		render(
			<Group aria-label="Plan" defaultValue="free">
				<Option value="free">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Free</Choice.Title>
							<Choice.Description>Up to 3 projects and 1 member.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Option>
				<Option value="pro">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Pro</Choice.Title>
							<Choice.Description>Unlimited projects and up to 25 members.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Option>
			</Group>,
		);

		// An exact `name` match proves the description text stayed out of the name.
		const free = screen.getByRole("radio", { name: "Free" });
		expect(free).toHaveAccessibleDescription("Up to 3 projects and 1 member.");
		expect(screen.getByRole("radio", { name: "Pro" })).toHaveAccessibleDescription(
			"Unlimited projects and up to 25 members.",
		);
	},
);

/**
 * Render a two-option group whose "custom" option nests a control inside a
 * `RadioGroup.InputSandbox`. `onItemContentKeyDown` sits on the `ItemContent`
 * between the radio item and the sandbox, so it fires only for keydowns the
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
					<RadioGroup.InputSandbox
						data-testid="sandbox"
						onClick={onSandboxClick}
						onKeyDown={onSandboxKeyDown}
					>
						{control}
					</RadioGroup.InputSandbox>
				</RadioGroup.ItemContent>
			</RadioGroup.Item>
		</RadioGroup.Root>,
	);

	return {
		input: screen.getByLabelText<HTMLInputElement>("Custom amount"),
		sandbox: screen.getByTestId("sandbox"),
	};
}

describe("RadioGroup.InputSandbox", () => {
	test("restores the control's own tabIndex once a click checks its item", async () => {
		const user = userEvent.setup();
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" tabIndex={0} />,
			defaultValue: "fixed",
		});

		// Unchecked: Tab must not land inside an option the user has not selected.
		expect(input).toHaveAttribute("tabindex", "-1");

		await user.click(screen.getByRole("radio", { name: "Custom" }));

		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		// Checked: the control's own tabIndex comes back, not an overwrite.
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

		// The character reaches the control but not the radio item, or the group's
		// type-ahead would move the selection.
		expect(input).toHaveValue("a");
		expect(onItemContentKeyDown).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("radio", { name: "Fixed" })).not.toBeChecked();
		// The sandbox still forwards every key to its own handler.
		expect(onSandboxKeyDown.mock.calls.map(([event]) => event.key)).toEqual(["a"]);

		await user.keyboard("{Enter}");

		// Enter is the group's confirm key and must still bubble.
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

		await user.click(sandbox);
		// Why fireEvent: the sandbox is not focusable and its control is disabled,
		// so no keyboard path reaches it.
		fireEvent.keyDown(sandbox, { key: "Enter" });

		expect(onSandboxClick).toHaveBeenCalledTimes(0);
		expect(onSandboxKeyDown).toHaveBeenCalledTimes(0);
		expect(onItemContentKeyDown).toHaveBeenCalledTimes(0);
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
						<a href="/plans/basic">Basic</a>
					</RadioGroup.ItemContent>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		const content = screen.getByRole("link", { name: "Basic" });
		expect(content.tagName).toBe("A");
		expect(content).toHaveAttribute("data-slot", "radio-group-item-content");
		expect(content).toHaveAttribute("href", "/plans/basic");
		// The tailwind-merge contract: the consumer's class survives the merge.
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

		const content = screen.getByTestId("content");
		// Why tagName: the JSDoc documents a <div>, and the slot cannot tell the elements apart.
		expect(content.tagName).toBe("DIV");
		expect(content).toHaveAttribute("data-slot", "radio-group-item-content");
	});
});

describe("RadioGroup keyboard and focus contract", () => {
	const Plans = ({
		defaultValue,
		onChange,
	}: {
		defaultValue?: string;
		onChange?: (value: string) => void;
	}) => (
		<form aria-label="Plan form">
			<RadioGroup.Root
				aria-label="Plan"
				name="plan"
				defaultValue={defaultValue}
				onChange={onChange}
			>
				<RadioGroup.Item value="free" aria-label="Free" />
				<RadioGroup.Item value="team" aria-label="Team" disabled />
				<RadioGroup.Item value="pro" aria-label="Pro" />
				<RadioGroup.Item value="enterprise" aria-label="Enterprise" />
			</RadioGroup.Root>
			<button type="reset">Reset</button>
		</form>
	);

	const tabStops = () =>
		screen
			.getAllByRole("radio")
			.filter((radio) => radio.tabIndex === 0)
			.map((radio) => radio.getAttribute("aria-label"));

	test("with nothing checked, only the first enabled item takes Tab; once checked, only that item does", async () => {
		const user = userEvent.setup();
		render(<Plans />);
		expect(tabStops()).toEqual(["Free"]);
		await user.click(screen.getByRole("radio", { name: "Pro" }));
		expect(tabStops()).toEqual(["Pro"]);
	});

	test("arrow keys move focus and check, skip a disabled item, and wrap at both ends", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(value: string) => void>();
		render(<Plans defaultValue="free" onChange={onChange} />);
		screen.getByRole("radio", { name: "Free" }).focus();

		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("radio", { name: "Pro" })).toHaveFocus();
		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
		expect(onChange).toHaveBeenLastCalledWith("pro");

		await user.keyboard("{ArrowRight}{ArrowRight}");
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();

		await user.keyboard("{ArrowUp}");
		expect(screen.getByRole("radio", { name: "Enterprise" })).toHaveFocus();
		expect(screen.getByRole("radio", { name: "Enterprise" })).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(4);
	});

	test("Space checks the focused item when nothing is checked yet", async () => {
		const user = userEvent.setup();
		render(<Plans />);
		screen.getByRole("radio", { name: "Free" }).focus();
		await user.keyboard(" ");
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();
	});

	test("submits the checked value under name, and a form reset returns to defaultValue", async () => {
		const user = userEvent.setup();
		render(<Plans defaultValue="free" />);
		const form = screen.getByRole("form", { name: "Plan form" });
		const plan = () => (form instanceof HTMLFormElement ? new FormData(form).get("plan") : null);
		expect(plan()).toBe("free");
		await user.click(screen.getByRole("radio", { name: "Enterprise" }));
		expect(plan()).toBe("enterprise");
		await user.click(screen.getByRole("button", { name: "Reset" }));
		expect(screen.getByRole("radio", { name: "Free" })).toBeChecked();
		expect(plan()).toBe("free");
	});

	test("hydrates server markup with no mismatch, then gives the first enabled item the Tab stop", () => {
		const element = <Plans />;
		const container = document.createElement("div");
		container.innerHTML = renderToString(element);
		document.body.append(container);
		// Why: before hydration, the server markup has no Tab stop yet, because the DOM decides it.
		expect(container.querySelectorAll('[role="radio"][tabindex="0"]')).toHaveLength(0);
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onRecoverableError = vi.fn<(error: unknown) => void>();
		let root: ReturnType<typeof hydrateRoot> | undefined;
		act(() => {
			root = hydrateRoot(container, element, { onRecoverableError });
		});
		expect(onRecoverableError).toHaveBeenCalledTimes(0);
		expect(consoleError).toHaveBeenCalledTimes(0);
		expect(tabStops()).toEqual(["Free"]);
		act(() => {
			root?.unmount();
		});
		container.remove();
	});
});
