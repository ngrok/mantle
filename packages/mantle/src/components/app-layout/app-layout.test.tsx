import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Main } from "../main/main.js";
import { Alert } from "../alert/alert.js";
import { AlertCenter } from "../alert-center/alert-center.js";
import { Sidebar } from "../sidebar/sidebar.js";
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

	test("clips rather than hides, so focus cannot scroll the whole shell sideways", () => {
		// Regression (issue #1374): `overflow-hidden` IS a scroll container that
		// paints no scrollbar — the same trap AppLayout.Content avoids, one level up.
		// Anything wider than the frame lets Tab scroll the entire shell sideways,
		// translating the notice, the rail, and the card out of view with no
		// scrollbar and no gesture to bring them back. On a frame pinned with
		// `fixed inset-0` that is the whole window. `overflow-clip` is not a scroll
		// container at all.
		render(<AppLayout.Root data-testid="root">content</AppLayout.Root>);
		const { className } = screen.getByTestId("root");
		expect(className).toContain("overflow-clip");
		expect(className).not.toContain("overflow-hidden");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Root className="consumer-frame" data-flavor="shell" data-testid="root" ref={ref}>
				content
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.className).toContain("h-full");
		expect(root.className).toContain("consumer-frame");
		expect(root).toHaveAttribute("data-flavor", "shell");
		expect(ref.current).toBe(root);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.Root data-slot="app-shell" data-testid="root">
				content
			</AppLayout.Root>,
		);
		expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "app-shell app-layout");
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Root asChild className="consumer-frame" data-flavor="shell" ref={ref}>
				<section data-testid="root">content</section>
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "app-layout");
		expect(root.className).toContain("h-full");
		expect(root.className).toContain("consumer-frame");
		expect(root).toHaveAttribute("data-flavor", "shell");
		expect(ref.current).toBe(root);
	});
});

describe("AppLayout.Notice", () => {
	test("renders an unstyled full-width strip", () => {
		render(<AppLayout.Notice data-testid="notice">maintenance</AppLayout.Notice>);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("DIV");
		expect(notice).toHaveAttribute("data-slot", "app-layout-notice");
		expect(notice.className).toContain("shrink-0");
		expect(notice).toHaveTextContent("maintenance");
	});

	test("is not a header banner landmark", () => {
		render(<AppLayout.Notice>maintenance</AppLayout.Notice>);
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test("stacks a maintenance banner with the alert center in one shell slot", () => {
		render(
			<AppLayout.Root>
				<AppLayout.Notice data-testid="notice">
					<div>Scheduled maintenance in progress</div>
					<AlertCenter.Root>
						<AlertCenter.Bar />
						<AlertCenter.Content />
						<AlertCenter.Item id="transfer-limit" intent="warning">
							<Alert.Content>
								<Alert.Title>Approaching your limit</Alert.Title>
							</Alert.Content>
						</AlertCenter.Item>
					</AlertCenter.Root>
				</AppLayout.Notice>
				<AppLayout.Workspace data-testid="workspace" />
			</AppLayout.Root>,
		);

		const notice = screen.getByTestId("notice");
		const workspace = screen.getByTestId("workspace");
		expect(notice.className).toContain("flex-col");
		expect(notice.querySelector('[data-slot="alert-center-bar"]')).not.toBeNull();
		expect(notice.compareDocumentPosition(workspace)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Notice
				className="consumer-notice"
				data-flavor="maintenance"
				data-testid="notice"
				ref={ref}
			>
				maintenance
			</AppLayout.Notice>,
		);
		const notice = screen.getByTestId("notice");
		expect(notice.className).toContain("shrink-0");
		expect(notice.className).toContain("consumer-notice");
		expect(notice).toHaveAttribute("data-flavor", "maintenance");
		expect(ref.current).toBe(notice);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.Notice data-slot="app-shell" data-testid="notice">
				maintenance
			</AppLayout.Notice>,
		);
		expect(screen.getByTestId("notice")).toHaveAttribute(
			"data-slot",
			"app-shell app-layout-notice",
		);
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Notice asChild className="consumer-notice" data-flavor="maintenance" ref={ref}>
				<aside data-testid="notice">maintenance</aside>
			</AppLayout.Notice>,
		);
		const notice = screen.getByTestId("notice");
		expect(notice.tagName).toBe("ASIDE");
		expect(notice).toHaveAttribute("data-slot", "app-layout-notice");
		expect(notice.className).toContain("shrink-0");
		expect(notice.className).toContain("consumer-notice");
		expect(notice).toHaveAttribute("data-flavor", "maintenance");
		expect(ref.current).toBe(notice);
	});
});

describe("AppLayout.Workspace", () => {
	test("renders the columns row that lets the card scroll instead of the page", () => {
		render(<AppLayout.Workspace data-testid="workspace">columns</AppLayout.Workspace>);
		const workspace = screen.getByTestId("workspace");
		expect(workspace.tagName).toBe("DIV");
		expect(workspace).toHaveAttribute("data-slot", "app-layout-workspace");
		// min-h-0 on the row is what lets AppLayout.Body scroll rather than
		// growing the shell
		expect(workspace.className).toContain("min-h-0");
		expect(workspace.className).toContain("flex-1");
	});

	test("owns no gutter, so a rail stays flush against the window edge", () => {
		// Regression guard (issue #1374): the gutter belongs to the card's margin.
		// Padding here would inset the sidebar off the window edge and break the
		// flush collapsed icon rail.
		render(<AppLayout.Workspace data-testid="workspace">columns</AppLayout.Workspace>);
		expect([...screen.getByTestId("workspace").classList]).not.toContain("p-2");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Workspace
				className="consumer-workspace"
				data-flavor="columns"
				data-testid="workspace"
				ref={ref}
			>
				columns
			</AppLayout.Workspace>,
		);
		const workspace = screen.getByTestId("workspace");
		expect(workspace.className).toContain("min-h-0");
		expect(workspace.className).toContain("consumer-workspace");
		expect(workspace).toHaveAttribute("data-flavor", "columns");
		expect(ref.current).toBe(workspace);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.Workspace data-slot="app-shell" data-testid="workspace">
				columns
			</AppLayout.Workspace>,
		);
		expect(screen.getByTestId("workspace")).toHaveAttribute(
			"data-slot",
			"app-shell app-layout-workspace",
		);
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Workspace asChild className="consumer-workspace" data-flavor="columns" ref={ref}>
				<section data-testid="workspace">columns</section>
			</AppLayout.Workspace>,
		);
		const workspace = screen.getByTestId("workspace");
		expect(workspace.tagName).toBe("SECTION");
		expect(workspace).toHaveAttribute("data-slot", "app-layout-workspace");
		expect(workspace.className).toContain("min-h-0");
		expect(workspace.className).toContain("consumer-workspace");
		expect(workspace).toHaveAttribute("data-flavor", "columns");
		expect(ref.current).toBe(workspace);
	});
});

describe("AppLayout.Header", () => {
	test("renders a toolbar pinned by shrink-0 rather than sticky", () => {
		// Regression (issue #1374): the toolbar used to be `sticky` but IN FLOW
		// inside a block scroll container, which stole exactly its own height from
		// any page asking for h-full. Outside the scrollport it is pinned by
		// construction.
		render(<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>);
		const header = screen.getByTestId("header");
		expect(header).toHaveAttribute("data-slot", "app-layout-header");
		expect(header.className).toContain("shrink-0");
		expect(header.className).not.toContain("sticky");
		expect(header.className).toContain("border-b");
	});

	test("renders a div, so it never becomes the banner landmark", () => {
		// With Main composed onto AppLayout.Body, a <header> here would have no
		// sectioning ancestor and would therefore BE the banner landmark.
		render(
			<AppLayout.Root>
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>
						<AppLayout.Body asChild>
							<Main>page</Main>
						</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>,
		);
		expect(screen.getByTestId("header").tagName).toBe("DIV");
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Header
				className="consumer-toolbar"
				data-flavor="toolbar"
				data-testid="header"
				ref={ref}
			>
				toolbar
			</AppLayout.Header>,
		);
		const header = screen.getByTestId("header");
		expect(header.className).toContain("shrink-0");
		expect(header.className).toContain("consumer-toolbar");
		expect(header).toHaveAttribute("data-flavor", "toolbar");
		expect(ref.current).toBe(header);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.Header data-slot="app-shell" data-testid="header">
				toolbar
			</AppLayout.Header>,
		);
		expect(screen.getByTestId("header")).toHaveAttribute(
			"data-slot",
			"app-shell app-layout-header",
		);
	});

	test("asChild restores a semantic element, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Header asChild className="consumer-toolbar" data-flavor="toolbar" ref={ref}>
				<header data-testid="header">toolbar</header>
			</AppLayout.Header>,
		);
		const header = screen.getByTestId("header");
		expect(header.tagName).toBe("HEADER");
		expect(header).toHaveAttribute("data-slot", "app-layout-header");
		expect(header.className).toContain("shrink-0");
		expect(header.className).toContain("consumer-toolbar");
		expect(header).toHaveAttribute("data-flavor", "toolbar");
		expect(ref.current).toBe(header);
	});

	test("derives its height from the sidebar header token, net of the card gutter", () => {
		// The alignment invariant: h = sidebar header band - 2*(gutter + border).
		// Both the gutter and the border are doubled, which is what keeps this
		// toolbar's center on the band for ANY band height. The band is the sidebar
		// header's first row, so a header stacking a second row leaves this alone.
		render(<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>);
		const { className } = screen.getByTestId("header");
		expect(className).toContain("h-14");
		expect(className).toContain(
			"group-has-data-[slot~=sidebar-header]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]",
		);
	});

	test("both halves of the :has() coupling line up with what Sidebar.Header emits", () => {
		// The derived height is pure CSS, so happy-dom cannot measure it — but it
		// can prove the selector has something to match: AppLayout.Root names the
		// `app-layout` group the variant is scoped to, and Sidebar.Header stamps the
		// `data-slot` token the `:has()` looks for. Renaming either side silently
		// unaligns the two rows in a browser, and fails loudly here.
		// Sidebar.Header is rendered on its own rather than inside a Sidebar.Nav
		// because Nav requires Sidebar.Root's context and a mocked breakpoint hook,
		// and `:has()` matches the token at any depth regardless.
		render(
			<AppLayout.Root data-testid="root">
				<AppLayout.Workspace>
					<Sidebar.Header data-testid="sidebar-header">account switcher</Sidebar.Header>
					<AppLayout.Content>
						<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>
						<AppLayout.Body>page</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect([...root.classList]).toContain("group/app-layout");
		expect(root.querySelector('[data-slot~="sidebar-header"]')).not.toBeNull();
		expect(screen.getByTestId("header").className).toContain(
			"group-has-data-[slot~=sidebar-header]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]",
		);
		// The other half of the token contract: the sidebar header spends the same
		// variable, with the same fallback, on the grid track its first row sits in.
		// Two files spelling one token, so they are pinned in one test — rename it on
		// either side and the toolbar stops matching the switcher row.
		expect(screen.getByTestId("sidebar-header")).toHaveClass(
			"grid-rows-(--sidebar-header-height,4.5rem)",
		);
	});
});

describe("AppLayout.Content", () => {
	test("is the card surface, and is not itself a scroll container", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("DIV");
		expect(content).toHaveAttribute("data-slot", "app-layout-content");
		expect(content.className).toContain("bg-card");
		expect(content.className).toContain("rounded-xl");
		expect(content.className).not.toContain("overflow-y-auto");
	});

	test("clips rather than hides, so focus cannot scroll the card sideways", () => {
		// Regression (issue #1374): `overflow-hidden` IS a scroll container that
		// paints no scrollbar. A toolbar wider than the card would let Tab scroll
		// it, translating the header and the page off-screen with no way back.
		// `overflow-clip` is not a scroll container.
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		const { className } = screen.getByTestId("content");
		expect(className).toContain("overflow-clip");
		expect(className).not.toContain("overflow-hidden");
	});

	test("establishes a containing block for absolutely positioned page content", () => {
		// Regression (issue #1374): without `relative`, page content positioned
		// absolutely resolved against AppLayout.Root (fixed inset-0 in a real
		// shell) and painted across the sidebar rail.
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		expect(screen.getByTestId("content").className).toContain("relative");
	});

	test("owns the card gutter as its own margin, driven by a public variable", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		expect(screen.getByTestId("content").className).toContain(
			"m-(--app-layout-card-gutter,0.5rem)",
		);
	});

	test("is a flex column, so Header and Body stack and Body can flex", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		const { className } = screen.getByTestId("content");
		expect(className).toContain("flex");
		expect(className).toContain("flex-col");
		expect(className).toContain("min-w-0");
	});

	test("merges custom className deterministically", () => {
		render(
			<AppLayout.Content className="rounded-none" data-testid="content">
				page
			</AppLayout.Content>,
		);
		const content = screen.getByTestId("content");
		expect(content.className).toContain("rounded-none");
		expect(content.className).not.toContain("rounded-xl");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Content
				className="consumer-card"
				data-flavor="card"
				data-testid="content"
				ref={ref}
			>
				page
			</AppLayout.Content>,
		);
		const content = screen.getByTestId("content");
		expect(content.className).toContain("bg-card");
		expect(content.className).toContain("consumer-card");
		expect(content).toHaveAttribute("data-flavor", "card");
		expect(ref.current).toBe(content);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.Content data-slot="app-shell" data-testid="content">
				page
			</AppLayout.Content>,
		);
		expect(screen.getByTestId("content")).toHaveAttribute(
			"data-slot",
			"app-shell app-layout-content",
		);
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Content asChild className="consumer-card" data-flavor="card" ref={ref}>
				<article data-testid="content">page</article>
			</AppLayout.Content>,
		);
		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("ARTICLE");
		expect(content).toHaveAttribute("data-slot", "app-layout-content");
		expect(content.className).toContain("bg-card");
		expect(content.className).toContain("consumer-card");
		expect(content).toHaveAttribute("data-flavor", "card");
		expect(ref.current).toBe(content);
	});
});

describe("AppLayout.Body", () => {
	test("is the shell's only scroll container", () => {
		render(<AppLayout.Body data-testid="body">page</AppLayout.Body>);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("DIV");
		expect(body).toHaveAttribute("data-slot", "app-layout-body");
		expect(body.className).toContain("overflow-y-auto");
		expect(body.className).toContain("overscroll-none");
	});

	test("is a flex item with a definite height, so h-full pages fit the card", () => {
		render(<AppLayout.Body data-testid="body">page</AppLayout.Body>);
		const { className } = screen.getByTestId("body");
		expect(className).toContain("flex-1");
		expect(className).toContain("min-h-0");
		expect(className).toContain("w-full");
	});

	test("is block inside, so a contained page still centers at its max width", () => {
		// The other half of the invariant: as a flex CHILD, auto margins beat
		// align-items: stretch, so `mx-auto max-w-7xl` would shrink-to-fit and get
		// narrower as the viewport gets wider.
		render(<AppLayout.Body data-testid="body">page</AppLayout.Body>);
		// Token equality, not a regex: `\bflex\b` also matches `flex-1`, which the
		// part legitimately has as a flex ITEM.
		expect([...screen.getByTestId("body").classList]).not.toContain("flex");
	});

	test("composes the Main landmark via asChild, making the scrollport focusable", () => {
		// Composing Main HERE and not onto Content is what makes SkipToMainLink
		// useful: the focused landmark is the scroll container, so arrows, Space,
		// and PageDown scroll the page straight away.
		render(
			<AppLayout.Body asChild>
				<Main data-testid="main">page</Main>
			</AppLayout.Body>,
		);
		const main = screen.getByRole("main");
		expect(main).toBe(screen.getByTestId("main"));
		expect(main).toHaveAttribute("id", "main");
		expect(main.className).toContain("overflow-y-auto");
		expect(main).toHaveAttribute("data-slot", "app-layout-body main");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Body className="consumer-page" data-flavor="page" data-testid="body" ref={ref}>
				page
			</AppLayout.Body>,
		);
		const body = screen.getByTestId("body");
		expect(body.className).toContain("overflow-y-auto");
		expect(body.className).toContain("consumer-page");
		expect(body).toHaveAttribute("data-flavor", "page");
		expect(ref.current).toBe(body);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.Body data-slot="app-shell" data-testid="body">
				page
			</AppLayout.Body>,
		);
		expect(screen.getByTestId("body")).toHaveAttribute("data-slot", "app-shell app-layout-body");
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Body asChild className="consumer-page" data-flavor="page" ref={ref}>
				<Main data-testid="body">page</Main>
			</AppLayout.Body>,
		);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("MAIN");
		// Main stamps its own slot, so the chain reads in DOM order with the
		// composed child's name last.
		expect(body).toHaveAttribute("data-slot", "app-layout-body main");
		expect(body.className).toContain("overflow-y-auto");
		expect(body.className).toContain("consumer-page");
		expect(body).toHaveAttribute("data-flavor", "page");
		expect(ref.current).toBe(body);
	});
});

describe("AppLayout composition", () => {
	test("nests the shell regions in DOM order", () => {
		render(
			<AppLayout.Root>
				<AppLayout.Notice data-testid="notice">notice</AppLayout.Notice>
				<AppLayout.Workspace data-testid="workspace">
					<AppLayout.Content data-testid="content">
						<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>
						<AppLayout.Body data-testid="body">page</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>,
		);
		const notice = screen.getByTestId("notice");
		const workspace = screen.getByTestId("workspace");
		const content = screen.getByTestId("content");
		const header = screen.getByTestId("header");
		const body = screen.getByTestId("body");

		expect(notice.compareDocumentPosition(workspace)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(workspace).toContainElement(content);
		expect(content).toContainElement(header);
		expect(content).toContainElement(body);
		// the toolbar is a SIBLING of the scrollport, not inside it
		expect(header.compareDocumentPosition(body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(body).not.toContainElement(header);
	});

	test("ships no Footer part — a page-owned bottom bar goes inside Body", () => {
		// Deliberate omission, not an oversight: a route rendering through an
		// <Outlet /> inside Body could never reach a shell-level Footer, and the
		// real use case (an editor's validity bar) belongs to the page.
		expect("Footer" in AppLayout).toBe(false);
	});

	test("a page-owned bottom bar pins itself as the last flex child", () => {
		render(
			<AppLayout.Content data-testid="content">
				<AppLayout.Header>toolbar</AppLayout.Header>
				<AppLayout.Body>
					<div className="flex h-full flex-col">
						<div className="min-h-0 flex-1" data-testid="editor">
							editor
						</div>
						<div className="shrink-0" data-testid="status">
							Traffic policy is valid
						</div>
					</div>
				</AppLayout.Body>
			</AppLayout.Content>,
		);
		const status = screen.getByTestId("status");
		const editor = screen.getByTestId("editor");
		// The bar is the page's own last child, after the growing region — which
		// is what puts it on the card's bottom edge.
		expect(editor.compareDocumentPosition(status)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(status.className).toContain("shrink-0");
	});

	test("the shell exposes exactly one scroll container", () => {
		const { container } = render(
			<AppLayout.Root>
				<AppLayout.Notice>notice</AppLayout.Notice>
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header>toolbar</AppLayout.Header>
						<AppLayout.Body>page</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>,
		);
		const scrollers = container.querySelectorAll('[class*="overflow-y-auto"]');
		expect(scrollers).toHaveLength(1);
		expect(scrollers[0]).toHaveAttribute("data-slot", "app-layout-body");
	});
});
