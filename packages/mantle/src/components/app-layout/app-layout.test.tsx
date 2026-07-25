import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Main } from "../main/main.js";
import { Alert } from "../alert/alert.js";
import { AlertCenter } from "../alert-center/alert-center.js";
import { Sidebar } from "../sidebar/sidebar.js";
import { AppLayout } from "./app-layout.js";

describe("AppLayout.Root", () => {
	test("renders a div carrying the app-layout slot", () => {
		render(<AppLayout.Root data-testid="root">content</AppLayout.Root>);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "app-layout");
		expect(root).toHaveTextContent("content");
	});

	// tailwind-merge override contract: real app shells pin the frame to the
	// viewport with `fixed inset-0`, which has to REPLACE Root's default
	// `relative` positioning rather than land beside it and lose to source order.
	test("lets a caller's viewport-pinning classes replace the default positioning", () => {
		render(
			<AppLayout.Root className="fixed inset-0" data-testid="root">
				content
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveClass("fixed", "inset-0");
		expect(root).not.toHaveClass("relative");
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
	test("renders a plain div carrying the notice slot", () => {
		render(<AppLayout.Notice data-testid="notice">maintenance</AppLayout.Notice>);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("DIV");
		expect(notice).toHaveAttribute("data-slot", "app-layout-notice");
		expect(notice).toHaveTextContent("maintenance");
	});

	test("is not a header banner landmark", () => {
		render(<AppLayout.Notice>maintenance</AppLayout.Notice>);
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test("renders as child element, joining the data-slot chain and forwarding its ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Root asChild>
				<AppLayout.Notice asChild ref={ref}>
					<aside data-slot="maintenance" data-testid="notice">
						maintenance
					</aside>
				</AppLayout.Notice>
			</AppLayout.Root>,
		);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("ASIDE");
		expect(notice).toHaveAttribute("data-slot", "app-layout app-layout-notice maintenance");
		expect(ref.current).toBe(notice);
	});

	test("stacks a maintenance banner with the alert center in one shell slot", () => {
		render(
			<AppLayout.Root>
				<AppLayout.Notice data-testid="notice">
					<div>Scheduled maintenance in progress</div>
					<AlertCenter.Root>
						<AlertCenter.Bar data-testid="alert-bar" />
						<AlertCenter.Content />
						<AlertCenter.Item id="transfer-limit" intent="warning">
							<Alert.Content>
								<Alert.Title>Approaching your limit</Alert.Title>
							</Alert.Content>
						</AlertCenter.Item>
					</AlertCenter.Root>
				</AppLayout.Notice>
				<AppLayout.Body data-testid="body" />
			</AppLayout.Root>,
		);

		const notice = screen.getByTestId("notice");
		const body = screen.getByTestId("body");
		const maintenance = screen.getByText("Scheduled maintenance in progress");
		const alertBar = screen.getByTestId("alert-bar");

		// both messages live in the one notice slot, in author order, and the slot
		// as a whole sits above the shell body
		expect(notice).toContainElement(maintenance);
		expect(alertBar).toHaveAttribute("data-slot", "alert-center-bar");
		expect(notice).toContainElement(alertBar);
		expect(maintenance.compareDocumentPosition(alertBar)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(notice.compareDocumentPosition(body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		// the alert center projects its top alert into the bar, so the notice slot
		// really carries the message rather than an empty row
		expect(within(alertBar).getByText("Approaching your limit")).toBeInTheDocument();
	});
});

describe("AppLayout.Header", () => {
	test("renders a semantic header element carrying the toolbar slot", () => {
		render(<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>);
		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("HEADER");
		expect(header).toHaveAttribute("data-slot", "app-layout-header");
		expect(header).toHaveTextContent("toolbar");
	});

	test("renders as child element, joining the data-slot chain and forwarding its ref", () => {
		const ref = createRef<HTMLElement>();
		render(
			<AppLayout.Content asChild>
				<AppLayout.Header asChild ref={ref}>
					<div data-slot="page-toolbar" data-testid="header">
						toolbar
					</div>
				</AppLayout.Header>
			</AppLayout.Content>,
		);
		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("DIV");
		expect(header).toHaveAttribute(
			"data-slot",
			"app-layout-content app-layout-header page-toolbar",
		);
		expect(ref.current).toBe(header);
	});
});

// The toolbar/sidebar-header alignment is documented as "an invariant, not a
// coincidence", and it is spelled across three files: Root names the
// `group/app-layout` container, Sidebar.Header emits `data-slot="sidebar-header"`
// and owns `--sidebar-header-height`, and AppLayout.Header derives its own
// height from that token through a `group-has-[…]` variant. happy-dom loads no
// Tailwind, so this is a deliberate cross-file spelling pin in the same spirit
// as the `--sidebar-row-width` pin in sidebar.test.tsx — rendered geometry is a
// Playwright concern, but the three spellings agreeing is not, because renaming
// any one of them silently drops every real shell's toolbar back to `h-14` with
// nothing else failing. `toHaveClass` matches whole tokens, so a rewritten
// calc() or a renamed group fails here.
describe("AppLayout.Header ↔ Sidebar.Header alignment", () => {
	test("derives its height from the sidebar header's token via Root's group", () => {
		render(
			<Sidebar.Root>
				<AppLayout.Root data-testid="root">
					<AppLayout.Body>
						<Sidebar.Nav>
							<Sidebar.Header data-testid="sidebar-header">switcher</Sidebar.Header>
						</Sidebar.Nav>
						<AppLayout.Inset>
							<AppLayout.Content>
								<AppLayout.Header data-testid="toolbar">toolbar</AppLayout.Header>
							</AppLayout.Content>
						</AppLayout.Inset>
					</AppLayout.Body>
				</AppLayout.Root>
			</Sidebar.Root>,
		);
		const root = screen.getByTestId("root");
		const sidebarHeader = screen.getByTestId("sidebar-header");
		const toolbar = screen.getByTestId("toolbar");

		// the `:has()` lookup only reaches the sidebar header because Root is a
		// common ancestor of both rows
		expect(root).toContainElement(sidebarHeader);
		expect(root).toContainElement(toolbar);
		expect(root).toHaveClass("group/app-layout");
		expect(sidebarHeader).toHaveAttribute("data-slot", "sidebar-header");
		expect(toolbar).toHaveClass(
			"group-has-[[data-slot~=sidebar-header]]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-1rem-2px)]",
		);
		// both rows read the same token with the same default, which is what makes
		// overriding it on a common ancestor move them together
		expect(sidebarHeader).toHaveClass("h-[var(--sidebar-header-height,4.5rem)]");
	});

	test("falls back to the standalone toolbar height with no sidebar header in the shell", () => {
		render(
			<AppLayout.Root data-testid="root">
				<AppLayout.Body>
					<AppLayout.Inset>
						<AppLayout.Content>
							<AppLayout.Header data-testid="toolbar">toolbar</AppLayout.Header>
						</AppLayout.Content>
					</AppLayout.Inset>
				</AppLayout.Body>
			</AppLayout.Root>,
		);
		expect(screen.getByTestId("toolbar")).toHaveClass("h-14");
		expect(screen.getByTestId("root").querySelector('[data-slot~="sidebar-header"]')).toBeNull();
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

	test("Body renders as child element, joining the data-slot chain and forwarding its ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Root asChild>
				<AppLayout.Body asChild ref={ref}>
					<section data-slot="shell-columns" data-testid="body">
						columns
					</section>
				</AppLayout.Body>
			</AppLayout.Root>,
		);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("SECTION");
		expect(body).toHaveAttribute("data-slot", "app-layout app-layout-body shell-columns");
		expect(ref.current).toBe(body);
	});

	test("Inset renders as child element, joining the data-slot chain and forwarding its ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Body asChild>
				<AppLayout.Inset asChild ref={ref}>
					<section data-slot="content-column" data-testid="inset">
						column
					</section>
				</AppLayout.Inset>
			</AppLayout.Body>,
		);
		const inset = screen.getByTestId("inset");
		expect(inset.tagName).toBe("SECTION");
		expect(inset).toHaveAttribute("data-slot", "app-layout-body app-layout-inset content-column");
		expect(ref.current).toBe(inset);
	});

	test("Content renders a div carrying the content slot", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("DIV");
		expect(content).toHaveAttribute("data-slot", "app-layout-content");
		expect(content).toHaveTextContent("page");
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
		// Main joins the incoming data-slot chain instead of clobbering it, and its
		// own landmark wiring survives the Slot merge — which is what lets a
		// SkipToMainLink aimed at #main move focus into the content card
		expect(main).toHaveAttribute("data-slot", "app-layout-content main");
		expect(main).toHaveAttribute("tabindex", "-1");
		main.focus();
		expect(main).toHaveFocus();
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
