import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Empty } from "./empty.js";

describe("Empty", () => {
	test("Root renders a div element", () => {
		render(<Empty.Root data-testid="root">content</Empty.Root>);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveTextContent("content");
	});

	test("Root merges custom className", () => {
		render(
			<Empty.Root className="custom-class" data-testid="root">
				content
			</Empty.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.className).toContain("custom-class");
	});

	test("Title renders an h3 element by default", () => {
		render(
			<Empty.Root>
				<Empty.Title data-testid="title">Heading</Empty.Title>
			</Empty.Root>,
		);
		const title = screen.getByTestId("title");
		expect(title.tagName).toBe("H3");
		expect(title).toHaveTextContent("Heading");
	});

	test("Title merges custom className", () => {
		render(
			<Empty.Root>
				<Empty.Title className="text-2xl" data-testid="title">
					Heading
				</Empty.Title>
			</Empty.Root>,
		);
		const title = screen.getByTestId("title");
		expect(title.className).toContain("text-2xl");
		expect(title.className).toContain("text-strong");
	});

	test("Title renders as child element when asChild is true", () => {
		render(
			<Empty.Root>
				<Empty.Title asChild>
					<h1 data-testid="title">Heading</h1>
				</Empty.Title>
			</Empty.Root>,
		);
		const title = screen.getByTestId("title");
		expect(title.tagName).toBe("H1");
		expect(title).toHaveTextContent("Heading");
		expect(title.className).toContain("text-strong");
	});

	test("Description renders a div element by default", () => {
		render(
			<Empty.Root>
				<Empty.Description data-testid="desc">
					<p>Some text</p>
				</Empty.Description>
			</Empty.Root>,
		);
		const description = screen.getByTestId("desc");
		expect(description.tagName).toBe("DIV");
		expect(description).toHaveTextContent("Some text");
	});

	test("Description merges custom className", () => {
		render(
			<Empty.Root>
				<Empty.Description className="text-xs" data-testid="desc">
					<p>Some text</p>
				</Empty.Description>
			</Empty.Root>,
		);
		const description = screen.getByTestId("desc");
		expect(description.className).toContain("text-xs");
		expect(description.className).toContain("text-body");
	});

	test("Description renders as child element when asChild is true", () => {
		render(
			<Empty.Root>
				<Empty.Description asChild>
					<section data-testid="desc">
						<p>Some text</p>
					</section>
				</Empty.Description>
			</Empty.Root>,
		);
		const description = screen.getByTestId("desc");
		expect(description.tagName).toBe("SECTION");
		expect(description.className).toContain("text-body");
	});

	test("Actions renders a div element", () => {
		render(
			<Empty.Root>
				<Empty.Actions data-testid="actions">
					<button type="button">Click</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		const actions = screen.getByTestId("actions");
		expect(actions.tagName).toBe("DIV");
	});

	test("Root renders as child element when asChild is true", () => {
		render(
			<Empty.Root asChild>
				<section data-testid="root">content</section>
			</Empty.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "empty");
		expect(root).toHaveTextContent("content");
	});

	test("Root forwards data-slot on the default element", () => {
		render(<Empty.Root data-testid="root">content</Empty.Root>);
		expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "empty");
	});

	test("Actions renders as child element when asChild is true", () => {
		render(
			<Empty.Root>
				<Empty.Actions asChild>
					<nav data-testid="actions">
						<button type="button">Click</button>
					</nav>
				</Empty.Actions>
			</Empty.Root>,
		);
		const actions = screen.getByTestId("actions");
		expect(actions.tagName).toBe("NAV");
		expect(actions).toHaveAttribute("data-slot", "empty-actions");
	});

	test("Actions forwards data-slot on the default element", () => {
		render(
			<Empty.Root>
				<Empty.Actions data-testid="actions">
					<button type="button">Click</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		expect(screen.getByTestId("actions")).toHaveAttribute("data-slot", "empty-actions");
	});

	test("Actions merges custom className", () => {
		render(
			<Empty.Root>
				<Empty.Actions className="gap-4" data-testid="actions">
					<button type="button">Click</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		const actions = screen.getByTestId("actions");
		expect(actions.className).toContain("gap-4");
	});

	test("renders a full composition", () => {
		render(
			<Empty.Root data-testid="root">
				<Empty.Title data-testid="title">No results</Empty.Title>
				<Empty.Description data-testid="desc">
					<p>Try again later.</p>
				</Empty.Description>
				<Empty.Actions data-testid="actions">
					<button type="button">Retry</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		expect(screen.getByTestId("root")).toBeInTheDocument();
		expect(screen.getByTestId("title")).toHaveTextContent("No results");
		expect(screen.getByTestId("desc")).toHaveTextContent("Try again later.");
		expect(screen.getByRole("button")).toHaveTextContent("Retry");
	});
});
