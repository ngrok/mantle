import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
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
