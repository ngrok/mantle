import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { expect, test } from "vitest";
import * as Accordion from "./accordion-parts.js";

test("a consumer expands a section by role", async () => {
	const user = userEvent.setup();
	render(
		<Accordion.Root type="single">
			<Accordion.Item value="a">
				<Accordion.Trigger>Billing</Accordion.Trigger>
				<Accordion.Content>
					<Accordion.Body>
						<button type="button">Pay invoice</button>
					</Accordion.Body>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>,
	);

	expect(screen.queryByRole("button", { name: "Pay invoice" })).toBeNull();
	await user.click(screen.getByRole("button", { name: "Billing" }));

	expect(screen.getByRole("button", { name: "Billing" })).toHaveAttribute("aria-expanded", "true");
	expect(screen.getByRole("button", { name: "Pay invoice" })).toBeInTheDocument();
});
