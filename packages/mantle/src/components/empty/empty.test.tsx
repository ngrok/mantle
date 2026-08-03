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
		// Verify base classes are preserved alongside the custom one without
		// coupling to specific design-token utilities (which change on restyle).
		expect(title).toHaveAttribute("data-slot", "empty-title");
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

	test("Scrim renders behind the content, out of the accessibility tree and the hit area", () => {
		// The scrim exists to sit under the copy: if it ever paints above, it
		// hides the message, and if it takes pointer events it eats clicks meant
		// for the actions beside it.
		render(
			<Empty.Root data-testid="root">
				<Empty.Scrim data-testid="scrim" />
				<Empty.Title>No usage yet</Empty.Title>
			</Empty.Root>,
		);
		const scrim = screen.getByTestId("scrim");
		expect(scrim).toHaveAttribute("data-slot", "empty-scrim");
		expect(scrim).toHaveAttribute("aria-hidden", "true");
		expect(scrim).toHaveClass("pointer-events-none", "absolute", "-z-10");
		// -z-10 only stays inside the empty state when Root isolates; without it
		// the scrim drops behind the backdrop the empty state is layered over.
		expect(screen.getByTestId("root")).toHaveClass("isolate", "relative");
		// A decorative wash carries no text, so nothing of it reaches AT.
		expect(scrim).toBeEmptyDOMElement();
	});

	test("Scrim keeps its decorative contract even when a consumer spreads over it", () => {
		// The three guarantees a purely painted shape owes: nothing to announce,
		// nothing to focus, nothing to click. A spread arrives before them in the
		// element, so passing these is the exact way the contract would break.
		render(
			<Empty.Root>
				<Empty.Scrim aria-hidden={false} tabIndex={0} data-testid="scrim" />
				{/* @ts-expect-error — the scrim takes no children, and the assertions below are why */}
				<Empty.Scrim data-testid="scrim-with-children">Nested copy</Empty.Scrim>
				<Empty.Title>No usage yet</Empty.Title>
			</Empty.Root>,
		);
		const scrim = screen.getByTestId("scrim");
		expect(scrim).toHaveAttribute("aria-hidden", "true");
		expect(scrim).not.toHaveAttribute("tabindex");
		expect(scrim).toHaveClass("pointer-events-none");
		// The hazard the type forbids: nested copy paints, and no screen reader
		// ever reaches it, because the scrim hides its whole subtree.
		const nested = screen.getByTestId("scrim-with-children");
		expect(nested).toHaveTextContent("Nested copy");
		expect(nested).toHaveAttribute("aria-hidden", "true");
		// The title beside it stays announceable — the scrim hides itself only.
		expect(screen.getByRole("heading", { name: "No usage yet" })).toBeInTheDocument();
	});

	test("Scrim paints the card surface by default and takes a color override", () => {
		// The default is the pair that makes the contrast math hold: the wash
		// repaints the same surface the empty state would sit on unaided.
		const { rerender } = render(
			<Empty.Root>
				<Empty.Scrim data-testid="scrim" />
			</Empty.Root>,
		);
		expect(screen.getByTestId("scrim").className).toContain(
			"var(--empty-scrim-color,var(--background-color-card))",
		);
		rerender(
			<Empty.Root>
				<Empty.Scrim
					data-testid="scrim"
					className="[--empty-scrim-color:var(--background-color-popover)]"
				/>
			</Empty.Root>,
		);
		expect(screen.getByTestId("scrim").className).toContain(
			"[--empty-scrim-color:var(--background-color-popover)]",
		);
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
