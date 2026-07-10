"use client";

import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, test } from "vitest";
import { Checkbox } from "../checkbox/checkbox.js";
import { Field } from "../field/field.js";
import { RadioGroup } from "../radio-group/radio-group.js";
import { Switch } from "../switch/switch.js";
import { Choice } from "./choice.js";

/**
 * Run axe against a rendered container and return its violations. Color contrast
 * is disabled because the test DOM has no theme tokens applied, so contrast
 * results are noise — every other WCAG / best-practice rule stays on.
 */
async function axeViolations(container: HTMLElement) {
	const results = await axe.run(container, {
		rules: { "color-contrast": { enabled: false } },
	});
	return results.violations;
}

describe("Choice (browser) — clicking the label toggles the control", () => {
	test("checkbox, standalone", async () => {
		const user = userEvent.setup();
		render(
			<Choice.Root name="terms">
				<Choice.Indicator>
					<Checkbox />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>I agree to the terms</Choice.Label>
					<Choice.Description>You can change this later.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
		await user.click(screen.getByText("I agree to the terms"));
		expect(checkbox).toBeChecked();
	});

	test("checkbox, inside a Field", async () => {
		const user = userEvent.setup();
		render(
			<Field.Item name="notify">
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<Checkbox />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Email</Choice.Label>
							<Choice.Description>Sent to your primary address.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
			</Field.Item>,
		);

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();
		// The title slot inside a Field is a real label for the field's control.
		await user.click(screen.getByText("Email"));
		expect(checkbox).toBeChecked();
	});

	test("switch, standalone", async () => {
		const user = userEvent.setup();
		render(
			<Choice.Root name="airplane-mode">
				<Choice.Indicator>
					<Switch />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Airplane mode</Choice.Label>
					<Choice.Description>Disables wireless radios while in flight.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);

		// A <button role="switch"> is a labelable element, so the Choice.Label's
		// htmlFor association forwards the click to the switch.
		const toggle = screen.getByRole("switch");
		expect(toggle).not.toBeChecked();
		await user.click(screen.getByText("Airplane mode"));
		expect(toggle).toBeChecked();
	});

	test("switch, inside a Field", async () => {
		const user = userEvent.setup();
		render(
			<Field.Item name="airplane-mode">
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<Switch />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Airplane mode</Choice.Label>
							<Choice.Description>Disables wireless radios while in flight.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
			</Field.Item>,
		);

		const toggle = screen.getByRole("switch");
		expect(toggle).not.toBeChecked();
		await user.click(screen.getByText("Airplane mode"));
		expect(toggle).toBeChecked();
	});
});

describe("Choice (browser) — radio options", () => {
	test("clicking an option selects that radio, and the description is part of its accessible name", async () => {
		const user = userEvent.setup();
		render(
			<RadioGroup.Root defaultValue="free" aria-label="Plan">
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
				<RadioGroup.Item value="pro">
					<Choice.Root>
						<Choice.Indicator>
							<RadioGroup.Indicator />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Title>Pro</Choice.Title>
							<Choice.Description>Unlimited projects and up to 25 members.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</RadioGroup.Item>
			</RadioGroup.Root>,
		);

		// role="radio" flattens its children, so the title + description text becomes
		// the radio's accessible name (announced as the name, not a separate description).
		const pro = screen.getByRole("radio", { name: /Pro.*Unlimited projects/ });
		expect(pro).not.toBeChecked();
		await user.click(screen.getByText("Pro"));
		expect(pro).toBeChecked();
	});
});

describe("Choice accessibility (axe) — no violations across the control matrix", () => {
	test("checkbox — standalone", async () => {
		const { container } = render(
			<Choice.Root name="terms">
				<Choice.Indicator>
					<Checkbox />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>I agree to the terms</Choice.Label>
					<Choice.Description>You can change this later.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(await axeViolations(container)).toEqual([]);
	});

	test("checkbox — inside a Field with description and error", async () => {
		const { container } = render(
			<Field.Item name="notify" validation="error">
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<Checkbox />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Email</Choice.Label>
							<Choice.Description>Sent to your primary address.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
				<Field.Description>Choose how we reach you.</Field.Description>
				<Field.Errors messages={["You must pick at least one channel."]} />
			</Field.Item>,
		);
		expect(await axeViolations(container)).toEqual([]);
	});

	test("switch — standalone", async () => {
		const { container } = render(
			<Choice.Root name="airplane-mode">
				<Choice.Indicator>
					<Switch />
				</Choice.Indicator>
				<Choice.Content>
					<Choice.Label>Airplane mode</Choice.Label>
					<Choice.Description>Disables wireless radios while in flight.</Choice.Description>
				</Choice.Content>
			</Choice.Root>,
		);
		expect(await axeViolations(container)).toEqual([]);
	});

	test("switch — inside a Field", async () => {
		const { container } = render(
			<Field.Item name="airplane-mode">
				<Field.Control>
					<Choice.Root>
						<Choice.Indicator>
							<Switch />
						</Choice.Indicator>
						<Choice.Content>
							<Choice.Label>Airplane mode</Choice.Label>
							<Choice.Description>Disables wireless radios while in flight.</Choice.Description>
						</Choice.Content>
					</Choice.Root>
				</Field.Control>
				<Field.Description>Affects all wireless connections.</Field.Description>
			</Field.Item>,
		);
		expect(await axeViolations(container)).toEqual([]);
	});

	test("radio options inside a labeled RadioGroup", async () => {
		const { container } = render(
			<Field.Set>
				<Field.Legend>Plan</Field.Legend>
				<RadioGroup.Root defaultValue="pro" aria-label="Plan">
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
					<RadioGroup.Item value="pro">
						<Choice.Root>
							<Choice.Indicator>
								<RadioGroup.Indicator />
							</Choice.Indicator>
							<Choice.Content>
								<Choice.Title>Pro</Choice.Title>
								<Choice.Description>Unlimited projects and up to 25 members.</Choice.Description>
							</Choice.Content>
						</Choice.Root>
					</RadioGroup.Item>
				</RadioGroup.Root>
			</Field.Set>,
		);
		expect(await axeViolations(container)).toEqual([]);
	});
});
