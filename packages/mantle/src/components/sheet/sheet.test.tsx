import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Sheet } from "./sheet.js";

describe("Sheet.Content", () => {
	describe("accessible description", () => {
		it("carries no aria-describedby when no Description is rendered", async () => {
			const user = userEvent.setup();
			render(
				<Sheet.Root>
					<Sheet.Trigger asChild>
						<button type="button">Open</button>
					</Sheet.Trigger>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Endpoint details</Sheet.Title>
						</Sheet.Header>
					</Sheet.Content>
				</Sheet.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			expect(content).not.toHaveAttribute("aria-describedby");
		});

		it("points aria-describedby at the Description when one is rendered", async () => {
			const user = userEvent.setup();
			render(
				<Sheet.Root>
					<Sheet.Trigger asChild>
						<button type="button">Open</button>
					</Sheet.Trigger>
					<Sheet.Content>
						<Sheet.Header>
							<Sheet.Title>Endpoint details</Sheet.Title>
							<Sheet.Description>Traffic policy and edges for this endpoint.</Sheet.Description>
						</Sheet.Header>
					</Sheet.Content>
				</Sheet.Root>,
			);
			await user.click(screen.getByRole("button", { name: "Open" }));

			const content = await screen.findByRole("dialog");
			const description = screen.getByText("Traffic policy and edges for this endpoint.");
			expect(description.id).not.toBe("");
			expect(content).toHaveAttribute("aria-describedby", description.id);
			expect(content).toHaveAccessibleDescription("Traffic policy and edges for this endpoint.");
		});
	});
});
