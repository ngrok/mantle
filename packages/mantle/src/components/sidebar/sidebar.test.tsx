import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Sidebar } from "./sidebar.js";

describe("Sidebar.Root", () => {
	test("renders a nav element", () => {
		render(<Sidebar.Root aria-label="Primary" data-testid="sidebar-root" />);
		const nav = screen.getByRole("navigation", { name: "Primary" });
		expect(nav.tagName).toBe("NAV");
	});

	test("merges consumer className with base classes", () => {
		render(<Sidebar.Root aria-label="Primary" className="custom-class" data-testid="root" />);
		const nav = screen.getByTestId("root");
		expect(nav).toHaveClass("custom-class");
		expect(nav).toHaveClass("flex");
	});
});

describe("Sidebar.Item", () => {
	test("by default renders a button inside a list item", () => {
		render(
			<ul>
				<Sidebar.Item>Endpoints</Sidebar.Item>
			</ul>,
		);
		const button = screen.getByRole("button", { name: "Endpoints" });
		expect(button.tagName).toBe("BUTTON");
		expect(button.parentElement?.tagName).toBe("LI");
	});

	test("with asChild, merges styles onto the consumer's element", () => {
		render(
			<ul>
				<Sidebar.Item asChild>
					<a href="/endpoints">Endpoints</a>
				</Sidebar.Item>
			</ul>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/endpoints");
	});

	test("when active, sets data-active and aria-current=page", () => {
		render(
			<ul>
				<Sidebar.Item active>Endpoints</Sidebar.Item>
			</ul>,
		);
		const button = screen.getByRole("button", { name: "Endpoints" });
		expect(button).toHaveAttribute("data-active", "true");
		expect(button).toHaveAttribute("aria-current", "page");
	});

	test("when not active, omits data-active and aria-current", () => {
		render(
			<ul>
				<Sidebar.Item>Endpoints</Sidebar.Item>
			</ul>,
		);
		const button = screen.getByRole("button", { name: "Endpoints" });
		expect(button).not.toHaveAttribute("data-active");
		expect(button).not.toHaveAttribute("aria-current");
	});
});

describe("Sidebar.SectionTitle", () => {
	test("by default renders an h4", () => {
		render(<Sidebar.SectionTitle>Universal Gateway</Sidebar.SectionTitle>);
		const heading = screen.getByRole("heading", { level: 4, name: "Universal Gateway" });
		expect(heading.tagName).toBe("H4");
	});

	test("with asChild, renders the consumer's element with title styles", () => {
		render(
			<Sidebar.SectionTitle asChild>
				<a href="/endpoints">Universal Gateway</a>
			</Sidebar.SectionTitle>,
		);
		const link = screen.getByRole("link", { name: "Universal Gateway" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveClass("rounded-md");
	});
});

describe("Sidebar.RailItem", () => {
	test("renders a button with aria-label set to the label prop", () => {
		render(
			<Sidebar.Rail>
				<Sidebar.RailItem icon={<svg data-testid="ug-icon" />} label="Universal Gateway" />
			</Sidebar.Rail>,
		);
		const button = screen.getByRole("button", { name: "Universal Gateway" });
		expect(button).toBeInTheDocument();
		expect(screen.getByTestId("ug-icon")).toBeInTheDocument();
	});

	test("when active, sets data-active and aria-current=page", () => {
		render(
			<Sidebar.Rail>
				<Sidebar.RailItem icon={<svg />} label="Universal Gateway" active />
			</Sidebar.Rail>,
		);
		const button = screen.getByRole("button", { name: "Universal Gateway" });
		expect(button).toHaveAttribute("data-active", "true");
		expect(button).toHaveAttribute("aria-current", "page");
	});

	test("with asChild, renders the consumer's element with rail styles", () => {
		render(
			<Sidebar.Rail>
				<Sidebar.RailItem asChild icon={<svg />} label="Universal Gateway">
					<a href="/universal-gateway">
						<svg />
					</a>
				</Sidebar.RailItem>
			</Sidebar.Rail>,
		);
		const link = screen.getByRole("link", { name: "Universal Gateway" });
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/universal-gateway");
	});
});

describe("Sidebar layout primitives", () => {
	test("Header, Body, and Footer render in order inside Root", () => {
		render(
			<Sidebar.Root aria-label="Primary">
				<Sidebar.Header data-testid="header">Header content</Sidebar.Header>
				<Sidebar.Body data-testid="body">Body content</Sidebar.Body>
				<Sidebar.Footer data-testid="footer">Footer content</Sidebar.Footer>
			</Sidebar.Root>,
		);
		const header = screen.getByTestId("header");
		const body = screen.getByTestId("body");
		const footer = screen.getByTestId("footer");
		expect(header).toBeInTheDocument();
		expect(body).toBeInTheDocument();
		expect(footer).toBeInTheDocument();
		// Header before Body before Footer
		expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(body.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
