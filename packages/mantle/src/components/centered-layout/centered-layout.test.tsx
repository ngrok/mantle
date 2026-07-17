import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Main } from "../main/main.js";
import { CenteredLayout } from "./centered-layout.js";

describe("CenteredLayout", () => {
	test("Root renders a div element with data-slot", () => {
		render(<CenteredLayout.Root data-testid="root">content</CenteredLayout.Root>);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "centered-layout");
		expect(root).toHaveTextContent("content");
	});

	test("Root merges custom className", () => {
		render(
			<CenteredLayout.Root className="custom-class" data-testid="root">
				content
			</CenteredLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.className).toContain("custom-class");
		expect(root.className).toContain("min-h-full");
	});

	test("Root renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<CenteredLayout.Root asChild>
				<section data-testid="root">content</section>
			</CenteredLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "centered-layout");
		expect(root).toHaveTextContent("content");
	});

	test("Root forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<CenteredLayout.Root data-testid="root" data-flavor="auth" ref={ref}>
				content
			</CenteredLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-flavor", "auth");
		expect(ref.current).toBe(root);
	});

	test("Body renders a div element with data-slot", () => {
		render(<CenteredLayout.Body data-testid="body">content</CenteredLayout.Body>);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("DIV");
		expect(body).toHaveAttribute("data-slot", "centered-layout-body");
		expect(body).toHaveTextContent("content");
	});

	test("Body merges custom className", () => {
		render(
			<CenteredLayout.Body className="gap-8" data-testid="body">
				content
			</CenteredLayout.Body>,
		);
		const body = screen.getByTestId("body");
		expect(body.className).toContain("gap-8");
		expect(body.className).toContain("flex-1");
	});

	test("Body renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<CenteredLayout.Body asChild>
				<section data-testid="body">content</section>
			</CenteredLayout.Body>,
		);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("SECTION");
		expect(body).toHaveAttribute("data-slot", "centered-layout-body");
	});

	test("Body forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<CenteredLayout.Body data-testid="body" data-region="hero" ref={ref}>
				content
			</CenteredLayout.Body>,
		);
		const body = screen.getByTestId("body");
		expect(body).toHaveAttribute("data-region", "hero");
		expect(ref.current).toBe(body);
	});

	test("Notice renders an unstyled full-width strip", () => {
		render(<CenteredLayout.Notice data-testid="notice">impersonating</CenteredLayout.Notice>);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("DIV");
		expect(notice).toHaveAttribute("data-slot", "centered-layout-notice");
		expect(notice.className).toContain("shrink-0");
		expect(notice).toHaveTextContent("impersonating");
	});

	test("Notice is not a header banner landmark", () => {
		render(<CenteredLayout.Notice>impersonating</CenteredLayout.Notice>);
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test("Notice renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<CenteredLayout.Notice asChild>
				<aside data-testid="notice">impersonating</aside>
			</CenteredLayout.Notice>,
		);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("ASIDE");
		expect(notice).toHaveAttribute("data-slot", "centered-layout-notice");
	});

	test("Notice forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<CenteredLayout.Notice data-testid="notice" data-flavor="warning" ref={ref}>
				impersonating
			</CenteredLayout.Notice>,
		);
		const notice = screen.getByTestId("notice");
		expect(notice).toHaveAttribute("data-flavor", "warning");
		expect(ref.current).toBe(notice);
	});

	test("Footer renders a footer element with data-slot", () => {
		render(<CenteredLayout.Footer data-testid="footer">legal</CenteredLayout.Footer>);
		const footer = screen.getByTestId("footer");
		expect(footer.tagName).toBe("FOOTER");
		expect(footer).toHaveAttribute("data-slot", "centered-layout-footer");
		expect(footer).toHaveTextContent("legal");
	});

	test("Footer merges custom className", () => {
		render(
			<CenteredLayout.Footer className="justify-center" data-testid="footer">
				legal
			</CenteredLayout.Footer>,
		);
		const footer = screen.getByTestId("footer");
		expect(footer.className).toContain("justify-center");
		expect(footer.className).toContain("shrink-0");
	});

	test("Footer renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<CenteredLayout.Footer asChild>
				<div data-testid="footer">legal</div>
			</CenteredLayout.Footer>,
		);
		const footer = screen.getByTestId("footer");
		expect(footer.tagName).toBe("DIV");
		expect(footer).toHaveAttribute("data-slot", "centered-layout-footer");
	});

	test("Footer forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLElement>();
		render(
			<CenteredLayout.Footer data-testid="footer" data-position="pinned" ref={ref}>
				legal
			</CenteredLayout.Footer>,
		);
		const footer = screen.getByTestId("footer");
		expect(footer).toHaveAttribute("data-position", "pinned");
		expect(ref.current).toBe(footer);
	});

	test("Header renders a header element with data-slot, exposed as a banner landmark", () => {
		render(<CenteredLayout.Header data-testid="header">account</CenteredLayout.Header>);
		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("HEADER");
		expect(header).toHaveAttribute("data-slot", "centered-layout-header");
		expect(header).toHaveTextContent("account");
		expect(screen.getByRole("banner")).toBe(header);
	});

	test("Header merges custom className", () => {
		render(
			<CenteredLayout.Header className="sticky top-0 justify-end" data-testid="header">
				account
			</CenteredLayout.Header>,
		);
		const header = screen.getByTestId("header");
		expect(header.className).toContain("sticky");
		expect(header.className).toContain("shrink-0");
	});

	test("Header renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<CenteredLayout.Header asChild>
				<div data-testid="header">account</div>
			</CenteredLayout.Header>,
		);
		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("DIV");
		expect(header).toHaveAttribute("data-slot", "centered-layout-header");
	});

	test("Header forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLElement>();
		render(
			<CenteredLayout.Header data-testid="header" data-position="pinned" ref={ref}>
				account
			</CenteredLayout.Header>,
		);
		const header = screen.getByTestId("header");
		expect(header).toHaveAttribute("data-position", "pinned");
		expect(ref.current).toBe(header);
	});

	test("asChild composition accumulates the data-slot chain in DOM order", () => {
		render(
			<CenteredLayout.Root asChild>
				<CenteredLayout.Body data-testid="body">content</CenteredLayout.Body>
			</CenteredLayout.Root>,
		);
		const body = screen.getByTestId("body");
		expect(body).toHaveAttribute("data-slot", "centered-layout centered-layout-body");
	});

	test("asChild data-slot chains extend through nested composition down to the rendered element", () => {
		render(
			<CenteredLayout.Root asChild>
				<CenteredLayout.Body asChild>
					<section data-slot="auth-body" data-testid="body">
						content
					</section>
				</CenteredLayout.Body>
			</CenteredLayout.Root>,
		);
		const body = screen.getByTestId("body");
		expect(body).toHaveAttribute("data-slot", "centered-layout centered-layout-body auth-body");
	});

	test("renders a full composition", () => {
		render(
			<CenteredLayout.Root data-testid="root">
				<a href="#main">Skip to main content</a>
				<CenteredLayout.Notice data-testid="notice">impersonating</CenteredLayout.Notice>
				<CenteredLayout.Header data-testid="header">
					<button type="button">Close</button>
				</CenteredLayout.Header>
				<CenteredLayout.Body data-testid="body">
					<a href="https://ngrok.com">acme</a>
					<Main>
						<p>Sign in to your account</p>
					</Main>
				</CenteredLayout.Body>
				<CenteredLayout.Footer data-testid="footer">
					<button type="button">Toggle theme</button>
				</CenteredLayout.Footer>
			</CenteredLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-slot", "centered-layout");
		expect(screen.getByTestId("body")).toHaveAttribute("data-slot", "centered-layout-body");
		// the notice strip sits above everything, including the header banner
		expect(screen.getByTestId("notice").compareDocumentPosition(screen.getByTestId("header"))).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(screen.getByRole("banner")).toBe(screen.getByTestId("header"));
		expect(screen.getByRole("main")).toHaveTextContent("Sign in to your account");
		expect(screen.getByRole("contentinfo")).toBe(screen.getByTestId("footer"));
		expect(screen.getByRole("link", { name: "acme" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
	});
});
