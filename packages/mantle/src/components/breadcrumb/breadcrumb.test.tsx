import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Breadcrumb } from "./breadcrumb.js";

describe("Breadcrumb", () => {
	test("Root renders a nav landmark labeled Breadcrumb by default", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
		expect(nav.tagName).toBe("NAV");
		expect(nav).toHaveAttribute("data-slot", "breadcrumb");
	});

	test("Root's default aria-label is overridable by the consumer", () => {
		render(
			<Breadcrumb.Root aria-label="Miettes de pain">
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Accueil</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByRole("navigation", { name: "Miettes de pain" })).toBeInTheDocument();
		expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeInTheDocument();
	});

	test("Root renders as child element when asChild is true and keeps data-slot", () => {
		render(
			<Breadcrumb.Root asChild>
				<div data-testid="root">crumbs</div>
			</Breadcrumb.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "breadcrumb");
		expect(root).toHaveAttribute("aria-label", "Breadcrumb");
	});

	test("Root merges custom className", () => {
		render(
			<Breadcrumb.Root className="custom-class" data-testid="root">
				crumbs
			</Breadcrumb.Root>,
		);
		expect(screen.getByTestId("root").className).toContain("custom-class");
	});

	test("Root forwards a ref to the nav element", () => {
		const ref = createRef<HTMLElement>();
		render(<Breadcrumb.Root ref={ref}>crumbs</Breadcrumb.Root>);
		expect(ref.current).not.toBeNull();
		expect(ref.current?.tagName).toBe("NAV");
	});

	test("List renders an ordered list", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const list = screen.getByRole("list");
		expect(list.tagName).toBe("OL");
		expect(list).toHaveAttribute("data-slot", "breadcrumb-list");
	});

	test("List merges custom className with base classes", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List className="gap-3">
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const list = screen.getByRole("list");
		expect(list.className).toContain("gap-3");
		expect(list.className).toContain("flex-wrap");
	});

	test("Item renders a listitem and merges custom className", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item className="pl-2">
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const item = screen.getByRole("listitem");
		expect(item.tagName).toBe("LI");
		expect(item).toHaveAttribute("data-slot", "breadcrumb-item");
		expect(item.className).toContain("pl-2");
		expect(item.className).toContain("inline-flex");
	});

	test("Link renders an anchor with its href", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/endpoints");
		expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
	});

	test("Link renders as child element when asChild is true, merging className and keeping data-slot", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link asChild className="font-medium">
							<a href="/endpoints" className="router-link">
								Endpoints
							</a>
						</Breadcrumb.Link>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link).toHaveAttribute("href", "/endpoints");
		expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
		expect(link.className).toContain("font-medium");
		expect(link.className).toContain("router-link");
	});

	test("Page renders a span with aria-current=page and is not a link", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const page = screen.getByText("Current");
		expect(page.tagName).toBe("SPAN");
		expect(page).toHaveAttribute("aria-current", "page");
		expect(page).toHaveAttribute("data-slot", "breadcrumb-page");
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	test("Page always emits aria-current=page — a consumer-supplied value cannot override it", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Page aria-current="false">Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		expect(screen.getByText("Current")).toHaveAttribute("aria-current", "page");
	});

	test("Separator always stays presentational — consumer role/aria-hidden cannot override it", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator data-testid="separator" role="listitem" aria-hidden="false" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("role", "presentation");
		expect(separator).toHaveAttribute("aria-hidden", "true");
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
	});

	test("Separator renders an aria-hidden li with a default caret icon", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator data-testid="separator" />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Current</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator.tagName).toBe("LI");
		expect(separator).toHaveAttribute("aria-hidden", "true");
		expect(separator).toHaveAttribute("role", "presentation");
		expect(separator).toHaveAttribute("data-slot", "breadcrumb-separator");
		expect(separator.querySelector("svg")).not.toBeNull();
	});

	test("Separator custom children replace the default caret", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Separator data-testid="separator">
						<span>/</span>
					</Breadcrumb.Separator>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveTextContent("/");
		expect(separator.querySelector("svg")).toBeNull();
	});

	test("Separators are excluded from the accessible listitem count", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>ep_2h8</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		// role="presentation" removes listitem semantics from separators.
		expect(screen.getAllByRole("listitem")).toHaveLength(3);
	});

	test("full composition nests navigation > list > items in order", () => {
		render(
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/endpoints">Endpoints</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>ep_2h8</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
		const list = screen.getByRole("list");
		expect(nav).toContainElement(list);
		const items = screen.getAllByRole("listitem");
		for (const item of items) {
			expect(list).toContainElement(item);
		}
		expect(items[0]).toHaveTextContent("Home");
		expect(items[1]).toHaveTextContent("Endpoints");
		expect(items[2]).toHaveTextContent("ep_2h8");
		expect(screen.getAllByRole("link")).toHaveLength(2);
		expect(screen.getByText("ep_2h8")).toHaveAttribute("aria-current", "page");
	});
});
