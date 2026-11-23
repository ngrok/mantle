import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { translateTextNodes } from "../../test-utils/translate-text-nodes.js";
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

		const basic = screen.getByRole("radio", { name: "Basic" });
		const errors = screen.getByTestId("errors");
		expect(basic).toHaveAttribute("aria-invalid", "true");
		expect(basic).toHaveAttribute("aria-errormessage", errors.id);
		expect(basic).toHaveAccessibleDescription("Pick a plan. Required.");
		expect(screen.getByRole("radio", { name: "Pro" })).toHaveAccessibleDescription(
			"Pick a plan. Required.",
		);
	});

	test("plain content names the radio by the item text and adds no description", () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="basic">
				<RadioGroup.Item value="basic">
					<RadioGroup.Indicator />
					<span>Basic</span>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);
		expect(screen.getByRole("radio", { name: "Basic" })).toHaveAccessibleDescription("");
	});

	test("a label title line names the radio alone, and no label wraps the radio", () => {
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="basic">
				<RadioGroup.Item value="basic" id="plan-basic">
					<RadioGroup.Indicator />
					<RadioGroup.ItemContent>
						<label htmlFor="plan-basic">Basic</label>
						<p>For side projects.</p>
					</RadioGroup.ItemContent>
				</RadioGroup.Item>
				<RadioGroup.Item value="pro">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Pro</Choice.Label>
							<Choice.Description>For teams.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		const basic = screen.getByRole("radio", { name: "Basic" });
		const pro = screen.getByRole("radio", { name: "Pro" });
		expect(pro).toHaveAccessibleDescription("For teams.");
		for (const radio of [basic, pro]) {
			expect(radio.closest("label")).toBeNull();
			expect(radio.parentElement?.querySelectorAll("label")).toHaveLength(1);
		}
	});

	test("aria-label on an item names its radio", () => {
		render(
			<RadioGroup.Root aria-label="Plan">
				<RadioGroup.Item value="basic" aria-label="Basic plan">
					Basic
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		expect(screen.getByRole("radio", { name: "Basic plan" })).toBeInTheDocument();
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
		expect(screen.getByRole("radio", { name: "Free" })).toHaveAccessibleDescription("");
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
 * `RadioGroup.InputSandbox`.
 */
function renderSandbox({
	control,
	defaultValue,
	disabled = false,
	onSandboxClick,
}: {
	control: ReactNode;
	defaultValue?: string;
	disabled?: boolean;
	onSandboxClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
	render(
		<RadioGroup.Root aria-label="Amount" defaultValue={defaultValue}>
			<RadioGroup.Item aria-label="Fixed" value="fixed">
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent>Fixed</RadioGroup.ItemContent>
			</RadioGroup.Item>
			<RadioGroup.Item aria-label="Custom" disabled={disabled} value="custom">
				<RadioGroup.Indicator />
				<RadioGroup.ItemContent>
					<RadioGroup.InputSandbox data-testid="sandbox" onClick={onSandboxClick}>
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

describe("RadioGroup forms", () => {
	/** Renders a "plan" group of Basic and Pro radios inside a form, and returns the form. */
	function renderPlanForm(groupProps: ComponentProps<typeof RadioGroup.Root> = {}) {
		render(
			<form aria-label="Plan form">
				<RadioGroup.Root aria-label="Plan" {...groupProps}>
					<RadioGroup.Item value="basic">
						<RadioGroup.Indicator>{({ checked }) => (checked ? "on" : "off")}</RadioGroup.Indicator>
						<span>Basic</span>
					</RadioGroup.Item>
					<RadioGroup.Item value="pro">
						<RadioGroup.Indicator>{({ checked }) => (checked ? "on" : "off")}</RadioGroup.Indicator>
						<span>Pro</span>
					</RadioGroup.Item>
				</RadioGroup.Root>
			</form>,
		);
		const form = screen.getByRole("form", { name: "Plan form" });
		if (!(form instanceof HTMLFormElement)) {
			throw new Error("The plan form did not render a <form>.");
		}
		return form;
	}

	test("with a name, the form submits the checked value", async () => {
		const user = userEvent.setup();
		const form = renderPlanForm({ name: "plan", defaultValue: "basic" });
		expect(new FormData(form).getAll("plan")).toEqual(["basic"]);

		await user.click(screen.getByText("Pro"));

		expect(new FormData(form).getAll("plan")).toEqual(["pro"]);
	});

	test("a form reset returns the group and its item state to defaultValue", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(value: string) => void>();
		const form = renderPlanForm({ name: "plan", defaultValue: "basic", onValueChange: onChange });
		await user.click(screen.getByText("Pro"));
		expect(screen.getAllByText(/^(on|off)$/).map((node) => node.textContent)).toEqual([
			"off",
			"on",
		]);

		form.reset();

		await vi.waitFor(() => {
			expect(screen.getAllByText(/^(on|off)$/).map((node) => node.textContent)).toEqual([
				"on",
				"off",
			]);
		});
		expect(screen.getByRole("radio", { name: /Basic/ })).toBeChecked();
		expect(new FormData(form).getAll("plan")).toEqual(["basic"]);
		expect(onChange).toHaveBeenLastCalledWith("basic");
	});

	test("a form reset with no defaultValue clears the item state", async () => {
		const user = userEvent.setup();
		const form = renderPlanForm({ name: "plan" });
		await user.click(screen.getByText("Pro"));

		form.reset();

		await vi.waitFor(() => {
			expect(screen.getAllByText(/^(on|off)$/).map((node) => node.textContent)).toEqual([
				"off",
				"off",
			]);
		});
		expect(screen.getByRole("radio", { name: /Pro/ })).not.toBeChecked();
	});

	test("a choice made before hydration becomes the value", async () => {
		const onChange = vi.fn<(value: string) => void>();
		const plans = (
			<RadioGroup.Root aria-label="Plan" name="plan" defaultValue="basic" onValueChange={onChange}>
				<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
				<RadioGroup.Item value="pro">
					<RadioGroup.Indicator>{({ checked }) => (checked ? "on" : "off")}</RadioGroup.Indicator>
					Pro
				</RadioGroup.Item>
			</RadioGroup.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(plans);
		document.body.append(container);
		const pro = container.querySelector<HTMLInputElement>("input[value=pro]");
		if (pro == null) {
			throw new Error("The server HTML has no Pro radio.");
		}
		pro.checked = true;

		await act(async () => {
			hydrateRoot(container, plans);
		});

		expect(onChange).toHaveBeenCalledWith("pro");
		expect(pro).toBeChecked();
		expect(container).toHaveTextContent("on");
		container.remove();
	});

	test("the server HTML keeps a link in an item reachable, and hydration hides only text that names a radio", async () => {
		const plans = (
			<RadioGroup.Root aria-label="Plan" defaultValue="basic">
				<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
				<RadioGroup.Item value="pro">
					Pro <a href="#pro">details</a>
				</RadioGroup.Item>
			</RadioGroup.Root>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(plans);
		document.body.append(container);
		expect(container.querySelector("[aria-hidden]")).toBeNull();

		await act(async () => {
			hydrateRoot(container, plans);
		});

		expect(screen.getByRole("radio", { name: "Basic" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "details" })).toBeInTheDocument();
		expect(container.querySelectorAll("[aria-hidden=true]")).toHaveLength(1);
		container.remove();
	});

	test("required and disabled reach every radio", () => {
		renderPlanForm({ name: "plan", required: true, disabled: true });

		for (const radio of screen.getAllByRole("radio")) {
			expect(radio).toBeRequired();
			expect(radio).toBeDisabled();
		}
	});
});

describe("RadioGroup value", () => {
	test("controlled: a click reports the value, and the checked radio follows the value prop", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(value: string) => void>();
		function Plan({ accept }: { accept: boolean }) {
			const [value, setValue] = useState("basic");
			return (
				<RadioGroup.Root
					aria-label="Plan"
					value={value}
					onValueChange={(next) => {
						onChange(next);
						if (accept) {
							setValue(next);
						}
					}}
				>
					<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
					<RadioGroup.Item value="pro">Pro</RadioGroup.Item>
				</RadioGroup.Root>
			);
		}
		const { unmount } = render(<Plan accept={false} />);

		await user.click(screen.getByText("Pro"));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenLastCalledWith("pro");
		expect(screen.getByRole("radio", { name: "Basic" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Pro" })).not.toBeChecked();
		unmount();

		render(<Plan accept />);
		await user.click(screen.getByText("Pro"));

		expect(screen.getByRole("radio", { name: "Pro" })).toBeChecked();
	});

	test("a click on a checked or disabled item reports nothing", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn<(value: string) => void>();
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="basic" onValueChange={onChange}>
				<RadioGroup.Item value="basic">Basic</RadioGroup.Item>
				<RadioGroup.Item value="pro" disabled>
					Pro
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		await user.click(screen.getByText("Basic"));
		await user.click(screen.getByText("Pro"));

		expect(onChange).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("radio", { name: "Basic" })).toBeChecked();
	});

	test("Indicator render props receive the item's checked and disabled state", async () => {
		const user = userEvent.setup();
		render(
			<RadioGroup.Root aria-label="Plan" defaultValue="basic">
				{["basic", "pro"].map((value) => (
					<RadioGroup.Item key={value} value={value} disabled={value === "pro"}>
						<RadioGroup.Indicator data-testid={value}>
							{({ checked, disabled }) =>
								`${checked ? "checked" : "unchecked"} ${disabled ? "disabled" : "enabled"}`
							}
						</RadioGroup.Indicator>
					</RadioGroup.Item>
				))}
			</RadioGroup.Root>,
		);

		expect(screen.getByTestId("basic")).toHaveTextContent("checked enabled");
		expect(screen.getByTestId("pro")).toHaveTextContent("unchecked disabled");
		await user.click(screen.getByTestId("pro"));
		expect(screen.getByTestId("pro")).toHaveTextContent("unchecked disabled");
	});

	test("an item's text survives a browser translation and a later swap", () => {
		function Option({ label }: { label: ReactNode }) {
			return (
				<RadioGroup.Root aria-label="Plan" defaultValue="basic">
					<RadioGroup.Item value="basic" data-testid="item">
						{label}
					</RadioGroup.Item>
				</RadioGroup.Root>
			);
		}
		const { rerender } = render(<Option label="Basic" />);
		translateTextNodes(screen.getByTestId("item"));

		rerender(<Option label="Starter" />);
		expect(screen.getByRole("radio", { name: "Starter" })).toBeChecked();

		rerender(<Option label={<strong>Team</strong>} />);
		expect(screen.getByRole("radio", { name: "Team" })).toBeChecked();
	});
});

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

	test("swallows a click before the caller's handler when the item is disabled", async () => {
		const user = userEvent.setup();
		const onSandboxClick = vi.fn<(event: MouseEvent<HTMLDivElement>) => void>();
		const { sandbox } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "fixed",
			disabled: true,
			onSandboxClick,
		});

		await user.click(sandbox);

		expect(onSandboxClick).toHaveBeenCalledTimes(0);
		expect(screen.getByRole("radio", { name: "Fixed" })).toBeChecked();
	});

	test("a click on the nested control checks its radio and keeps focus on the control", async () => {
		const user = userEvent.setup();
		const { input } = renderSandbox({
			control: <input aria-label="Custom amount" />,
			defaultValue: "fixed",
		});

		await user.click(input);

		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		expect(input).toHaveFocus();
	});

	test("a click on a nested textarea checks its radio", async () => {
		const user = userEvent.setup();
		const { input } = renderSandbox({
			control: <textarea aria-label="Custom amount" />,
			defaultValue: "fixed",
		});

		await user.click(input);

		expect(screen.getByRole("radio", { name: "Custom" })).toBeChecked();
		expect(input).toHaveFocus();
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
