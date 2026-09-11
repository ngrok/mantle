// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it } from "vitest";
import { DocIndexList } from "./doc-index-list";

afterEach(() => {
	cleanup();
});

it("links each item in the given order, with the title and description in the row", () => {
	render(
		<MemoryRouter>
			<DocIndexList
				label="Recipes"
				items={[
					{ to: "/recipes/b", title: "Bravo", description: "Second recipe." },
					{ to: "/recipes/a", title: "Alpha", description: "First recipe." },
				]}
			/>
		</MemoryRouter>,
	);

	const list = screen.getByRole("list", { name: "Recipes" });
	const links = within(list).getAllByRole("link");
	expect(links.map((link) => link.getAttribute("href"))).toEqual(["/recipes/b", "/recipes/a"]);
	expect(links.map((link) => link.textContent)).toEqual([
		"BravoSecond recipe.",
		"AlphaFirst recipe.",
	]);
});

it("renders the badge before the title", () => {
	render(
		<MemoryRouter>
			<DocIndexList
				label="Guides"
				items={[
					{
						to: "/guides/one",
						title: "One",
						description: "The first guide.",
						badge: <span data-testid="badge">0001</span>,
					},
				]}
			/>
		</MemoryRouter>,
	);

	const badge = screen.getByTestId("badge");
	const title = screen.getByText("One");
	expect(badge.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
});
