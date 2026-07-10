import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Field } from "../field/field.js";
import { OtpInput } from "./otp-input.js";

describe("OtpInput", () => {
	test("Field.Control wrapping OtpInput.Root applies field ARIA wiring to the hidden input", () => {
		render(
			<Field.Item name="code">
				<Field.Control>
					<OtpInput.Root maxLength={3} data-testid="otp">
						<OtpInput.Group>
							<OtpInput.Slot index={0} />
							<OtpInput.Slot index={1} />
							<OtpInput.Slot index={2} />
						</OtpInput.Group>
					</OtpInput.Root>
				</Field.Control>
				<Field.Errors data-testid="errors" messages={["Required."]} />
				<Field.Description data-testid="desc">Enter your code.</Field.Description>
			</Field.Item>,
		);

		const input = screen.getByTestId("otp");
		const errors = screen.getByTestId("errors");
		const description = screen.getByTestId("desc");
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(input.getAttribute("aria-describedby")).toContain(errors.id);
		expect(input.getAttribute("aria-describedby")).toContain(description.id);
		expect(input).toHaveAttribute("aria-errormessage", errors.id);
	});
});
