import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Card } from "./card.js";

describe("Card", () => {
	test.each([
		["Root", Card.Root, "card"],
		["Header", Card.Header, "card-header"],
		["Body", Card.Body, "card-body"],
		["Footer", Card.Footer, "card-footer"],
	] as const)("%s stamps data-slot=%s and forwards props", (_name, Part, slot) => {
		render(
			<Part data-testid="part" id="part">
				content
			</Part>,
		);
		const element = screen.getByTestId("part");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element).toHaveAttribute("id", "part");
	});

	test("Title renders an h3 by default and stamps its slot", () => {
		render(<Card.Title>Heading</Card.Title>);
		const title = screen.getByRole("heading", { level: 3, name: "Heading" });
		expect(title).toHaveAttribute("data-slot", "card-title");
	});

	test("Title asChild renders the child heading level", () => {
		render(
			<Card.Title asChild>
				<h2>Heading</h2>
			</Card.Title>,
		);
		expect(screen.getByRole("heading", { level: 2, name: "Heading" })).toHaveAttribute(
			"data-slot",
			"card-title",
		);
	});
});
