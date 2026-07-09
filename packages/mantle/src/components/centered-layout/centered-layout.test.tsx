import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
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

	test("Content renders the Main landmark by default", () => {
		render(
			<CenteredLayout.Content>
				<p>sign in</p>
			</CenteredLayout.Content>,
		);
		const main = screen.getByRole("main");
		expect(main).toHaveAttribute("id", "main");
		expect(main).toHaveAttribute("tabindex", "-1");
		expect(main).toHaveTextContent("sign in");
	});

	test("Content forwards className and ref to the Main landmark", () => {
		const ref = createRef<HTMLElement>();
		render(
			<CenteredLayout.Content className="w-full max-w-80" ref={ref}>
				<p>sign in</p>
			</CenteredLayout.Content>,
		);
		const main = screen.getByRole("main");
		expect(main.className).toContain("max-w-80");
		expect(ref.current).toBe(main);
	});

	test("Content with renderMain={false} renders a plain div, not a main landmark", () => {
		render(
			<CenteredLayout.Content data-testid="content" renderMain={false}>
				<p>sign in</p>
			</CenteredLayout.Content>,
		);
		expect(screen.queryByRole("main")).toBeNull();
		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("DIV");
		expect(content).toHaveAttribute("data-slot", "centered-layout-content");
		expect(content).toHaveTextContent("sign in");
	});

	test("Content with renderMain={false} applies className and forwards refs", () => {
		const ref = createRef<HTMLElement>();
		render(
			<CenteredLayout.Content
				className="w-full max-w-80"
				data-testid="content"
				ref={ref}
				renderMain={false}
			>
				<p>sign in</p>
			</CenteredLayout.Content>,
		);
		const content = screen.getByTestId("content");
		expect(content.className).toContain("max-w-80");
		expect(ref.current).toBe(content);
	});

	test("renders a full composition", () => {
		render(
			<CenteredLayout.Root data-testid="root">
				<a href="#main">Skip to main content</a>
				<CenteredLayout.Body data-testid="body">
					<a href="https://ngrok.com">acme</a>
					<CenteredLayout.Content>
						<p>Sign in to your account</p>
					</CenteredLayout.Content>
				</CenteredLayout.Body>
				<CenteredLayout.Footer data-testid="footer">
					<button type="button">Toggle theme</button>
				</CenteredLayout.Footer>
			</CenteredLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-slot", "centered-layout");
		expect(screen.getByTestId("body")).toHaveAttribute("data-slot", "centered-layout-body");
		expect(screen.getByRole("main")).toHaveTextContent("Sign in to your account");
		expect(screen.getByRole("contentinfo")).toBe(screen.getByTestId("footer"));
		expect(screen.getByRole("link", { name: "acme" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
	});
});
