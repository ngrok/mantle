import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Choice } from "../choice/choice.js";
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
		const description = screen.getByTestId("desc");
		expect(basic).toHaveAttribute("aria-invalid", "true");
		expect(basic).toHaveAttribute("aria-errormessage", errors.id);
		// Headless UI's Radio writes its own `aria-describedby` over the caller's
		// props, so the item stamps the field's ids on the element it renders.
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

		const indicator = screen.getByTestId("indicator");
		expect(indicator.tagName).toBe("DIV");
		expect(indicator).not.toHaveAttribute("name");
	});
});

const variants = [
	{ variant: "Item", Group: RadioGroup.Root, Option: RadioGroup.Item },
	{ variant: "ListItem", Group: RadioGroup.List, Option: RadioGroup.ListItem },
	{ variant: "Card", Group: RadioGroup.Root, Option: RadioGroup.Card },
	{ variant: "Button", Group: RadioGroup.ButtonGroup, Option: RadioGroup.Button },
] as const;

describe.each(variants)("RadioGroup.$variant with Choice", ({ Group, Option }) => {
	test("the title names the radio and the description describes it", () => {
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
	});

	test("a consumer id on Choice.Title is the id aria-labelledby points at", () => {
		render(
			<Group aria-label="Plan" defaultValue="free">
				<Option value="free">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title id="free-title">Free</Choice.Title>
						</Choice.Content>
					</Choice.Root>
				</Option>
			</Group>,
		);
		expect(screen.getByRole("radio", { name: "Free" })).toHaveAttribute(
			"aria-labelledby",
			"free-title",
		);
	});

	test("removing the description removes its id from aria-describedby", () => {
		const option = (withDescription: boolean) => (
			<Group aria-label="Plan" defaultValue="free">
				<Option value="free">
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
				</Option>
			</Group>
		);
		const { rerender } = render(option(true));
		expect(screen.getByRole("radio", { name: "Free" })).toHaveAccessibleDescription(
			"Up to 3 projects and 1 member.",
		);

		rerender(option(false));
		expect(screen.getByRole("radio", { name: "Free" })).not.toHaveAttribute("aria-describedby");
	});
});
