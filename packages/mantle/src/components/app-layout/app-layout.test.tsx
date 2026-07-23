import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Main } from "../main/main.js";
import { AlertCenter } from "../alert-center/alert-center.js";
import { AppLayout } from "./app-layout.js";

describe("AppLayout.Root", () => {
	test("renders a div that fills its ancestor rather than the viewport", () => {
		render(<AppLayout.Root data-testid="root">content</AppLayout.Root>);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "app-layout");
		expect(root.className).toContain("h-full");
		expect(root.className).not.toContain("fixed");
	});

	test("merges the viewport-pinning classes for real app shells", () => {
		render(
			<AppLayout.Root className="fixed inset-0" data-testid="root">
				content
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.className).toContain("fixed");
		expect(root.className).toContain("inset-0");
	});

	test("forwards refs and data-* attributes", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Root data-testid="root" data-flavor="shell" ref={ref}>
				content
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-flavor", "shell");
		expect(ref.current).toBe(root);
	});

	test("renders as child element when asChild is true, keeping data-slot", () => {
		render(
			<AppLayout.Root asChild>
				<section data-testid="root">content</section>
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "app-layout");
	});
});

describe("AppLayout.Notice", () => {
	test("renders an unstyled full-width strip", () => {
		render(<AppLayout.Notice data-testid="notice">impersonating</AppLayout.Notice>);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("DIV");
		expect(notice).toHaveAttribute("data-slot", "app-layout-notice");
		expect(notice.className).toContain("shrink-0");
		expect(notice).toHaveTextContent("impersonating");
	});

	test("is not a header banner landmark", () => {
		render(<AppLayout.Notice>impersonating</AppLayout.Notice>);
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test("stacks an impersonation banner with the alert center in one shell slot", () => {
		render(
			<AppLayout.Root>
				<AppLayout.Notice data-testid="notice">
					<div>Impersonating jane@example.com</div>
					<AlertCenter.Root
						alerts={[{ id: "transfer-limit", intent: "warning", title: "Approaching your limit" }]}
					>
						<AlertCenter.Bar />
						<AlertCenter.Content />
					</AlertCenter.Root>
				</AppLayout.Notice>
				<AppLayout.Body data-testid="body" />
			</AppLayout.Root>,
		);

		const notice = screen.getByTestId("notice");
		const body = screen.getByTestId("body");
		expect(notice.className).toContain("flex-col");
		expect(notice.querySelector('[data-slot="alert-center-bar"]')).not.toBeNull();
		expect(notice.compareDocumentPosition(body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});
});

describe("AppLayout.Header", () => {
	test("renders a sticky in-card toolbar header", () => {
		render(<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>);
		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("HEADER");
		expect(header).toHaveAttribute("data-slot", "app-layout-header");
		// sticky first child of AppLayout.Content: pins while page content
		// scrolls beneath it
		expect(header.className).toContain("sticky");
		expect(header.className).toContain("border-b");
	});
});

describe("AppLayout.Body + Inset + Content", () => {
	test("compose the shell regions in DOM order", () => {
		render(
			<AppLayout.Root>
				<AppLayout.Notice data-testid="notice">notice</AppLayout.Notice>
				<AppLayout.Body data-testid="body">
					<AppLayout.Inset data-testid="inset">
						<AppLayout.Content data-testid="content">
							<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>
							page
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>,
		);
		const notice = screen.getByTestId("notice");
		const body = screen.getByTestId("body");
		const header = screen.getByTestId("header");
		const content = screen.getByTestId("content");
		expect(notice.compareDocumentPosition(body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(body).toContainElement(content);
		// the toolbar header lives INSIDE the scrolling content card
		expect(content).toContainElement(header);
		expect(screen.getByTestId("inset")).toHaveAttribute("data-slot", "app-layout-inset");
		expect(body).toHaveAttribute("data-slot", "app-layout-body");
	});

	test("Content is the scroll container, not the page", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("DIV");
		expect(content).toHaveAttribute("data-slot", "app-layout-content");
		expect(content.className).toContain("overflow-y-auto");
		expect(content.className).toContain("overscroll-none");
	});

	test("Content composes the Main landmark via asChild", () => {
		render(
			<AppLayout.Content asChild>
				<Main data-testid="main">page</Main>
			</AppLayout.Content>,
		);
		const main = screen.getByRole("main");
		expect(main).toBe(screen.getByTestId("main"));
		expect(main).toHaveAttribute("id", "main");
		// the Slot merge keeps the scroll-card classes on the landmark and
		// Main joins the incoming data-slot chain instead of clobbering it
		expect(main.className).toContain("overflow-y-auto");
		expect(main.className).toContain("bg-card");
		expect(main).toHaveAttribute("data-slot", "app-layout-content main");
	});

	test("Content merges custom className deterministically", () => {
		render(
			<AppLayout.Content className="rounded-none" data-testid="content">
				page
			</AppLayout.Content>,
		);
		const content = screen.getByTestId("content");
		expect(content.className).toContain("rounded-none");
		expect(content.className).not.toContain("rounded-xl");
	});
});
