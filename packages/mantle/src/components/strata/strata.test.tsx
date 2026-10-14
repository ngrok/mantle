import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Strata } from "./strata.js";

type PartCase = {
	/** The namespace member under test, for the generated test name. */
	readonly name: string;
	/** The `data-slot` the part stamps on its own default element. */
	readonly slot: string;
	/** Renders the part with the consumer props every case asserts. */
	readonly element: (ref: (node: HTMLElement | null) => void) => ReactNode;
};

/**
 * Every part rendered on its default branch — no `asChild` — with the same
 * three consumer props. The `asChild` cases below go through `Slot`, which
 * merges the child's own props, so they stay green even when a part drops
 * `{...props}` from the branch that renders its own element.
 */
const defaultElementCases: readonly PartCase[] = [
	{
		name: "Root",
		slot: "strata",
		element: (ref) => (
			<Strata.Root className="custom-part" data-analytics="settings" data-testid="part" ref={ref} />
		),
	},
	{
		name: "Section",
		slot: "strata-section",
		element: (ref) => (
			<Strata.Section
				className="custom-part"
				data-analytics="settings"
				data-testid="part"
				ref={ref}
			/>
		),
	},
	{
		name: "Header",
		slot: "strata-header",
		element: (ref) => (
			<Strata.Header
				className="custom-part"
				data-analytics="settings"
				data-testid="part"
				ref={ref}
			/>
		),
	},
	{
		name: "Title",
		slot: "strata-title",
		element: (ref) => (
			<Strata.Title
				className="custom-part"
				data-analytics="settings"
				data-testid="part"
				ref={ref}
			/>
		),
	},
	{
		name: "Description",
		slot: "strata-description",
		element: (ref) => (
			<Strata.Description
				className="custom-part"
				data-analytics="settings"
				data-testid="part"
				ref={ref}
			/>
		),
	},
	{
		name: "Body",
		slot: "strata-body",
		element: (ref) => (
			<Strata.Body className="custom-part" data-analytics="settings" data-testid="part" ref={ref} />
		),
	},
];

function TwoSectionPage() {
	return (
		<Strata.Root data-testid="root">
			<Strata.Section data-testid="providers">
				<Strata.Header>
					<Strata.Title>Providers</Strata.Title>
					<Strata.Description>What providers keys may call.</Strata.Description>
				</Strata.Header>
				<Strata.Body>
					<button type="button">Add a provider</button>
				</Strata.Body>
			</Strata.Section>
			<Strata.Section data-testid="rules">
				<Strata.Header>
					<Strata.Title>Routing rules</Strata.Title>
					<Strata.Description>Define how requests are authenticated.</Strata.Description>
				</Strata.Header>
				<Strata.Body>
					<button type="button">Add rule</button>
				</Strata.Body>
			</Strata.Section>
		</Strata.Root>
	);
}

describe("Strata", () => {
	test("every part stamps its data-slot on the expected element", () => {
		const { container } = render(<TwoSectionPage />);

		// `data-slot` is public API, so a rename breaks consumer CSS in another
		// repo. Pin every part's slot name to the element it lands on. A missing
		// slot reads back as null rather than skipping the assertion.
		const slots = [
			"strata",
			"strata-section",
			"strata-header",
			"strata-title",
			"strata-description",
			"strata-body",
		] as const;
		const tagNames = slots.map(
			(slot) => container.querySelector(`[data-slot="${slot}"]`)?.tagName ?? null,
		);

		expect(tagNames).toEqual(["DIV", "SECTION", "HEADER", "H2", "P", "DIV"]);
	});

	test("renders one heading and one description per section, in document order", () => {
		render(<TwoSectionPage />);

		expect(
			screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
		).toEqual(["Providers", "Routing rules"]);
		expect(screen.getByText("What providers keys may call.")).toBeInTheDocument();
		expect(screen.getByText("Define how requests are authenticated.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Add a provider" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Add rule" })).toBeInTheDocument();
	});

	test("each Header carries its own section's title, not the page's", () => {
		const { container } = render(<TwoSectionPage />);
		const headers = container.querySelectorAll('[data-slot="strata-header"]');

		expect(headers).toHaveLength(2);
		expect(headers[0]).toHaveTextContent("Providers");
		expect(headers[1]).toHaveTextContent("Routing rules");
	});

	test("Title renders a level-2 heading, and asChild re-levels it", () => {
		const { rerender } = render(<Strata.Title>Providers</Strata.Title>);
		expect(screen.getByRole("heading", { level: 2, name: "Providers" })).toBeInTheDocument();

		rerender(
			<Strata.Title asChild>
				<h3>Providers</h3>
			</Strata.Title>,
		);
		expect(screen.getByRole("heading", { level: 3, name: "Providers" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
	});

	test("Header is a header element nested directly in its own Section", () => {
		const { container } = render(<TwoSectionPage />);
		const headers = container.querySelectorAll('[data-slot="strata-header"]');

		// Why not getByRole("banner"): HTML-AAM maps `<header>` to `banner` only
		// when no sectioning ancestor scopes it, and testing-library's role mapping
		// does not model that condition — it reports both headers as banners. The
		// nesting below is the half mantle owns; browsers apply the scoping.
		expect(Array.from(headers, (header) => header.tagName)).toEqual(["HEADER", "HEADER"]);
		expect(Array.from(headers, (header) => header.closest("section"))).toEqual(
			Array.from(headers, (header) => header.parentElement),
		);
	});

	test("Section takes no accessible name, so it adds no region landmark", () => {
		render(<TwoSectionPage />);

		expect(screen.queryAllByRole("region")).toHaveLength(0);
	});

	// The docs discourage naming a Section, but the escape hatch has to work: a
	// section that is a real destination needs the landmark, so `aria-labelledby`
	// must reach the `<section>` rather than being swallowed by the part.
	test("Section becomes a region landmark once a consumer names it", () => {
		render(
			<Strata.Root>
				<Strata.Section aria-labelledby="providers-title">
					<Strata.Header>
						<Strata.Title id="providers-title">Providers</Strata.Title>
					</Strata.Header>
					<Strata.Body>content</Strata.Body>
				</Strata.Section>
			</Strata.Root>,
		);

		expect(screen.getByRole("region", { name: "Providers" })).toBeInTheDocument();
	});

	test.each(defaultElementCases)(
		"$name forwards className, data-*, and the ref to its own default element",
		({ slot, element }) => {
			const refNodes: Array<HTMLElement | null> = [];
			render(
				element((node) => {
					refNodes.push(node);
				}),
			);

			const part = screen.getByTestId("part");
			expect(part).toHaveAttribute("data-slot", slot);
			expect(part).toHaveAttribute("data-analytics", "settings");
			expect(part.className).toContain("custom-part");
			expect(refNodes.at(-1)).toBe(part);
		},
	);

	test("Root forwards className, data-*, and the ref through an asChild swap", () => {
		const ref = createRef<HTMLElement>();
		render(
			<Strata.Root asChild className="custom-root">
				<main data-testid="root" data-region="settings" ref={ref}>
					content
				</main>
			</Strata.Root>,
		);

		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("MAIN");
		expect(root).toHaveAttribute("data-slot", "strata");
		expect(root).toHaveAttribute("data-region", "settings");
		expect(root.className).toContain("custom-root");
		expect(ref.current).toBe(root);
	});

	test("Section forwards className, data-*, and the ref through an asChild swap", () => {
		const ref = createRef<HTMLFieldSetElement>();
		render(
			<Strata.Section asChild className="custom-section">
				<fieldset data-testid="section" data-group="providers" ref={ref}>
					content
				</fieldset>
			</Strata.Section>,
		);

		const section = screen.getByTestId("section");
		expect(section.tagName).toBe("FIELDSET");
		expect(section).toHaveAttribute("data-slot", "strata-section");
		expect(section).toHaveAttribute("data-group", "providers");
		expect(section.className).toContain("custom-section");
		expect(ref.current).toBe(section);
	});

	test("Header forwards className, data-*, and the ref through an asChild swap", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Strata.Header asChild className="custom-header">
				<div data-testid="header" data-density="tight" ref={ref}>
					content
				</div>
			</Strata.Header>,
		);

		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("DIV");
		expect(header).toHaveAttribute("data-slot", "strata-header");
		expect(header).toHaveAttribute("data-density", "tight");
		expect(header.className).toContain("custom-header");
		expect(ref.current).toBe(header);
	});

	test("Title forwards className, data-*, and the ref through an asChild swap", () => {
		const ref = createRef<HTMLHeadingElement>();
		render(
			<Strata.Title asChild className="custom-title">
				<h3 data-testid="title" data-tone="loud" ref={ref}>
					Providers
				</h3>
			</Strata.Title>,
		);

		const title = screen.getByTestId("title");
		expect(title.tagName).toBe("H3");
		expect(title).toHaveAttribute("data-slot", "strata-title");
		expect(title).toHaveAttribute("data-tone", "loud");
		expect(title.className).toContain("custom-title");
		expect(ref.current).toBe(title);
	});

	test("Description forwards className, data-*, and the ref through an asChild swap", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Strata.Description asChild className="custom-description">
				<div data-testid="description" data-tone="quiet" ref={ref}>
					What providers keys may call.
				</div>
			</Strata.Description>,
		);

		const description = screen.getByTestId("description");
		expect(description.tagName).toBe("DIV");
		expect(description).toHaveAttribute("data-slot", "strata-description");
		expect(description).toHaveAttribute("data-tone", "quiet");
		expect(description.className).toContain("custom-description");
		expect(ref.current).toBe(description);
	});

	test("Body forwards className, data-*, and the ref through an asChild swap", () => {
		const ref = createRef<HTMLFormElement>();
		render(
			<Strata.Body asChild className="custom-body">
				<form data-testid="body" data-state="dirty" ref={ref}>
					content
				</form>
			</Strata.Body>,
		);

		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("FORM");
		expect(body).toHaveAttribute("data-slot", "strata-body");
		expect(body).toHaveAttribute("data-state", "dirty");
		expect(body.className).toContain("custom-body");
		expect(ref.current).toBe(body);
	});

	test("asChild composition accumulates the data-slot chain in DOM order", () => {
		render(
			<Strata.Section asChild>
				<Strata.Body data-testid="body">content</Strata.Body>
			</Strata.Section>,
		);

		expect(screen.getByTestId("body")).toHaveAttribute("data-slot", "strata-section strata-body");
	});

	test("asChild data-slot chains extend through nested composition to the rendered element", () => {
		render(
			<Strata.Root asChild>
				<Strata.Section asChild>
					<section data-slot="access-scope" data-testid="section">
						content
					</section>
				</Strata.Section>
			</Strata.Root>,
		);

		expect(screen.getByTestId("section")).toHaveAttribute(
			"data-slot",
			"strata strata-section access-scope",
		);
	});

	// tailwind-merge override contract: the consumer's spacing must beat the
	// part's own default, or a page cannot tighten one section.
	test("a consumer's className replaces Section's vertical rhythm", () => {
		render(<Strata.Section className="py-4" data-testid="section" />);

		const section = screen.getByTestId("section");
		expect(section.className).toContain("py-4");
		expect(section.className).not.toContain("py-8");
	});

	// tailwind-merge override contract, as above — Body's default gap is a
	// starting point, not a floor.
	test("a consumer's className replaces Body's gap", () => {
		render(<Strata.Body className="gap-8" data-testid="body" />);

		const body = screen.getByTestId("body");
		expect(body.className).toContain("gap-8");
		expect(body.className).not.toContain("gap-4");
	});
});
