import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Empty } from "./empty.js";

/** The Tailwind `font-size` utilities. */
const FONT_SIZE = /^text-(?:xs|sm|base|lg|\d?xl)$/;

/**
 * Returns the element's classes that match one utility group, so a
 * tailwind-merge override test can assert the group holds only the winner.
 */
function utilityClasses(element: Element, group: RegExp): string[] {
	return Array.from(element.classList).filter((name) => group.test(name));
}

describe("Empty", () => {
	test("Root merges custom className", () => {
		render(
			<Empty.Root className="custom-class p-0" data-testid="root">
				content
			</Empty.Root>,
		);
		const root = screen.getByTestId("root");
		// The tailwind-merge contract: the consumer's padding replaces the default
		// instead of sitting next to it.
		expect(root).toHaveClass("custom-class");
		expect(utilityClasses(root, /^p-/)).toEqual(["p-0"]);
	});

	test("Title renders an h3 element by default", () => {
		render(
			<Empty.Root>
				<Empty.Title>Heading</Empty.Title>
			</Empty.Root>,
		);
		const title = screen.getByRole("heading", { level: 3, name: "Heading" });
		expect(title).toHaveAttribute("data-slot", "empty-title");
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
		// The tailwind-merge contract: the consumer's size replaces the default.
		expect(utilityClasses(title, FONT_SIZE)).toEqual(["text-2xl"]);
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
		expect(title).toHaveAttribute("data-slot", "empty-title");
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
		// The tailwind-merge contract: the consumer's size replaces the default.
		expect(utilityClasses(description, FONT_SIZE)).toEqual(["text-xs"]);
		expect(description).toHaveAttribute("data-slot", "empty-description");
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
		// The tailwind-merge contract: the consumer's gap replaces the default.
		expect(utilityClasses(actions, /^gap-/)).toEqual(["gap-4"]);
	});

	test("Icon is hidden from assistive technology and stamps its slot", () => {
		render(
			<Empty.Root>
				<Empty.Icon svg={<svg data-testid="icon" />} />
				<Empty.Title>No results</Empty.Title>
			</Empty.Root>,
		);
		const icon = screen.getByTestId("icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		// The part's slot joins ahead of the `SvgOnly` it renders.
		expect(icon).toHaveAttribute("data-slot", "empty-icon svg-only");
	});

	test("Icon merges custom className", () => {
		render(
			<Empty.Root>
				<Empty.Icon className="size-16" svg={<svg data-testid="icon" />} />
			</Empty.Root>,
		);
		const icon = screen.getByTestId("icon");
		// The tailwind-merge contract: the consumer's size replaces the default.
		expect(utilityClasses(icon, /^size-/)).toEqual(["size-16"]);
	});

	test("Title forwards ref to the heading element", () => {
		const ref = createRef<HTMLHeadingElement>();
		render(
			<Empty.Root>
				<Empty.Title ref={ref}>Heading</Empty.Title>
			</Empty.Root>,
		);
		expect(ref.current).toBe(screen.getByRole("heading", { level: 3, name: "Heading" }));
	});
});
