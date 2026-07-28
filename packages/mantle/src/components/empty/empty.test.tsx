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

	test("Root lets a custom className override the conflicting default padding", () => {
		render(
			<Empty.Root className="custom-class p-0" data-testid="root">
				content
			</Empty.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveClass("custom-class", "p-0");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(root).not.toHaveClass("p-6");
	});

	test("Icon renders the given svg and claims the empty-icon slot", () => {
		render(
			<Empty.Root>
				<Empty.Icon
					data-testid="icon"
					svg={<svg aria-hidden="true" className="caller-svg-class" />}
				/>
			</Empty.Root>,
		);
		const icon = screen.getByTestId("icon");
		expect(icon.tagName.toLowerCase()).toBe("svg");
		// the passed element itself is what renders — its own props survive the clone
		expect(icon).toHaveClass("caller-svg-class");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		// SvgOnly sets its own data-slot="svg-only" first and lets spread props
		// override it, so Icon's slot only survives because of that ordering —
		// consumer CSS keyed on [data-slot="empty-icon"] depends on it
		expect(icon).toHaveAttribute("data-slot", "empty-icon");
	});

	test("Icon lets a custom className override the default size", () => {
		render(
			<Empty.Root>
				<Empty.Icon className="size-16" data-testid="icon" svg={<svg aria-hidden="true" />} />
			</Empty.Root>,
		);
		const icon = screen.getByTestId("icon");
		expect(icon).toHaveClass("size-16");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(icon).not.toHaveClass("size-10");
		expect(icon).toHaveAttribute("data-slot", "empty-icon");
	});

	test("Title renders a level-3 heading by default", () => {
		render(
			<Empty.Root>
				<Empty.Title>Heading</Empty.Title>
			</Empty.Root>,
		);
		const title = screen.getByRole("heading", { level: 3, name: "Heading" });
		expect(title).toHaveAttribute("data-slot", "empty-title");
	});

	test("Title lets a custom className override the conflicting default size", () => {
		render(
			<Empty.Root>
				<Empty.Title className="text-2xl" data-testid="title">
					Heading
				</Empty.Title>
			</Empty.Root>,
		);
		const title = screen.getByTestId("title");
		expect(title).toHaveClass("text-2xl");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(title).not.toHaveClass("text-sm");
	});

	test("Title renders the given heading level when asChild is true", () => {
		render(
			<Empty.Root>
				<Empty.Title asChild>
					<h1>Heading</h1>
				</Empty.Title>
			</Empty.Root>,
		);
		expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
		const title = screen.getByRole("heading", { level: 1, name: "Heading" });
		expect(title).toHaveAttribute("data-slot", "empty-title");
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

	test("Description lets a custom className override the conflicting default size", () => {
		render(
			<Empty.Root>
				<Empty.Description className="text-xs" data-testid="desc">
					<p>Some text</p>
				</Empty.Description>
			</Empty.Root>,
		);
		const description = screen.getByTestId("desc");
		expect(description).toHaveClass("text-xs");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(description).not.toHaveClass("text-sm");
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
		expect(description).toHaveAttribute("data-slot", "empty-description");
	});

	test("Actions renders a div wrapping its action children", () => {
		render(
			<Empty.Root>
				<Empty.Actions data-testid="actions">
					<button type="button">Click</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		const actions = screen.getByTestId("actions");
		expect(actions.tagName).toBe("DIV");
		expect(actions).toContainElement(screen.getByRole("button", { name: "Click" }));
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

	test("Actions lets a custom className override the conflicting default gap", () => {
		render(
			<Empty.Root>
				<Empty.Actions className="gap-4" data-testid="actions">
					<button type="button">Click</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		const actions = screen.getByTestId("actions");
		expect(actions).toHaveClass("gap-4");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(actions).not.toHaveClass("gap-2");
	});

	test("renders a full composition", () => {
		render(
			<Empty.Root data-testid="root">
				<Empty.Icon data-testid="icon" svg={<svg aria-hidden="true" />} />
				<Empty.Title data-testid="title">No results</Empty.Title>
				<Empty.Description data-testid="desc">
					<p>Try again later.</p>
				</Empty.Description>
				<Empty.Actions data-testid="actions">
					<button type="button">Retry</button>
				</Empty.Actions>
			</Empty.Root>,
		);
		const root = screen.getByTestId("root");
		const icon = screen.getByTestId("icon");
		const title = screen.getByTestId("title");
		expect(root).toHaveAttribute("data-slot", "empty");
		expect(root).toContainElement(icon);
		// the icon leads the stack, above the heading
		expect(icon.compareDocumentPosition(title)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(title).toHaveTextContent("No results");
		expect(screen.getByTestId("desc")).toHaveTextContent("Try again later.");
		expect(screen.getByRole("button")).toHaveTextContent("Retry");
	});
});
