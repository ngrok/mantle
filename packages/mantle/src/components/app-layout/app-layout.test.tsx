import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Sidebar } from "../sidebar/sidebar.js";
import { AppLayout } from "./app-layout.js";

describe("AppLayout.Root", () => {
	test("renders a div stamped data-slot app-layout", () => {
		render(<AppLayout.Root data-testid="root">content</AppLayout.Root>);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("DIV");
		expect(root).toHaveAttribute("data-slot", "app-layout");
	});

	test("merges the viewport-pinning classes for real app shells", () => {
		render(
			<AppLayout.Root className="fixed inset-0" data-testid="root">
				content
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		// tailwind-merge override contract: the consumer's position utility replaces
		// the default `relative` instead of sitting next to it.
		expect(root).toHaveClass("fixed", "inset-0");
		expect(root).not.toHaveClass("relative");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Root className="consumer-frame" data-flavor="shell" data-testid="root" ref={ref}>
				content
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
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
		expect(root.className).toContain("consumer-frame");
		expect(root).toHaveAttribute("data-flavor", "shell");
		expect(ref.current).toBe(root);
	});
});

describe("AppLayout.Notice", () => {
	test("renders a div stamped data-slot app-layout-notice with its children", () => {
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
		expect(notice.className).toContain("consumer-notice");
		expect(notice).toHaveAttribute("data-flavor", "maintenance");
		expect(ref.current).toBe(notice);
	});
});

describe("AppLayout.Workspace", () => {
	test("renders a div stamped data-slot app-layout-workspace", () => {
		render(<AppLayout.Workspace data-testid="workspace">columns</AppLayout.Workspace>);
		const workspace = screen.getByTestId("workspace");
		expect(workspace.tagName).toBe("DIV");
		expect(workspace).toHaveAttribute("data-slot", "app-layout-workspace");
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
		expect(workspace.className).toContain("consumer-workspace");
		expect(workspace).toHaveAttribute("data-flavor", "columns");
		expect(ref.current).toBe(workspace);
	});
});

describe("AppLayout.Header", () => {
	test("stamps data-slot app-layout-header and renders its children", () => {
		render(<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>);
		const header = screen.getByTestId("header");
		expect(header).toHaveAttribute("data-slot", "app-layout-header");
		expect(header).toHaveTextContent("toolbar");
	});

	test("renders a div, so it never becomes the banner landmark", () => {
		// AppLayout.Body is the main landmark and the header is its sibling, so a
		// <header> here would have no sectioning ancestor and would BE the banner.
		render(
			<AppLayout.Root>
				<AppLayout.Workspace>
					<AppLayout.Content>
						<AppLayout.Header data-testid="header">toolbar</AppLayout.Header>
						<AppLayout.Body>page</AppLayout.Body>
					</AppLayout.Content>
				</AppLayout.Workspace>
			</AppLayout.Root>,
		);
		expect(screen.getByTestId("header").tagName).toBe("DIV");
		expect(screen.getByRole("main")).toHaveTextContent("page");
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
		// Why: proves the banner query the two absence tests rely on can match.
		expect(screen.getByRole("banner")).toBe(header);
		expect(header.tagName).toBe("HEADER");
		expect(header).toHaveAttribute("data-slot", "app-layout-header");
		expect(header.className).toContain("consumer-toolbar");
		expect(header).toHaveAttribute("data-flavor", "toolbar");
		expect(ref.current).toBe(header);
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
	test("renders a div stamped data-slot app-layout-content", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		const content = screen.getByTestId("content");
		expect(content.tagName).toBe("DIV");
		expect(content).toHaveAttribute("data-slot", "app-layout-content");
	});

	test("owns the card gutter as its own margin, driven by a public variable", () => {
		render(<AppLayout.Content data-testid="content">page</AppLayout.Content>);
		// Cross-file spelling pin: the docs-page API table and `AppLayout.Header`'s
		// `calc` both name `--app-layout-card-gutter`. This margin utility is where
		// the card reads it.
		expect(screen.getByTestId("content").className).toContain(
			"m-(--app-layout-card-gutter,0.5rem)",
		);
	});

	test("merges custom className deterministically", () => {
		// tailwind-merge override contract: the consumer's radius replaces the
		// default instead of sitting next to it.
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
		expect(content.className).toContain("consumer-card");
		expect(content).toHaveAttribute("data-flavor", "card");
		expect(ref.current).toBe(content);
	});
});

describe("AppLayout.Body", () => {
	test("renders the Main landmark stamped data-slot app-layout-body main", () => {
		render(<AppLayout.Body data-testid="body">page</AppLayout.Body>);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("MAIN");
		expect(body).toHaveAttribute("id", "main");
		expect(body).toHaveAttribute("tabindex", "-1");
		expect(body).toHaveAttribute("data-slot", "app-layout-body main");
		expect(body).toHaveTextContent("page");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLElement>();
		render(
			<AppLayout.Body className="consumer-page" data-flavor="page" data-testid="body" ref={ref}>
				page
			</AppLayout.Body>,
		);
		const body = screen.getByTestId("body");
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
		expect(screen.getByTestId("body")).toHaveAttribute(
			"data-slot",
			"app-shell app-layout-body main",
		);
	});

	test("asChild renders the child with no landmark, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<AppLayout.Body asChild className="consumer-page" data-flavor="page" ref={ref}>
				<div data-testid="body">page</div>
			</AppLayout.Body>,
		);
		const body = screen.getByTestId("body");
		expect(body.tagName).toBe("DIV");
		expect(screen.queryByRole("main")).not.toBeInTheDocument();
		expect(body).not.toHaveAttribute("id");
		expect(body).toHaveAttribute("data-slot", "app-layout-body");
		expect(body.className).toContain("consumer-page");
		expect(body).toHaveAttribute("data-flavor", "page");
		expect(ref.current).toBe(body);
	});
});

describe.each([
	["HeaderStart", AppLayout.HeaderStart, "app-layout-header-start"],
	["HeaderContent", AppLayout.HeaderContent, "app-layout-header-content"],
	["HeaderActions", AppLayout.HeaderActions, "app-layout-header-actions"],
] as const)("AppLayout.%s", (_name, Slot, slot) => {
	test(`renders a div stamped data-slot ${slot} with its children`, () => {
		render(<Slot data-testid="slot">controls</Slot>);
		const element = screen.getByTestId("slot");
		expect(element.tagName).toBe("DIV");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element).toHaveTextContent("controls");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Slot className="consumer-slot" data-flavor="controls" data-testid="slot" ref={ref}>
				controls
			</Slot>,
		);
		const element = screen.getByTestId("slot");
		expect(element.className).toContain("consumer-slot");
		expect(element).toHaveAttribute("data-flavor", "controls");
		expect(ref.current).toBe(element);
	});

	test("joins an ancestor's data-slot ahead of its own", () => {
		render(
			<Slot data-slot="app-shell" data-testid="slot">
				controls
			</Slot>,
		);
		expect(screen.getByTestId("slot")).toHaveAttribute("data-slot", `app-shell ${slot}`);
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Slot asChild className="consumer-slot" data-flavor="controls" ref={ref}>
				<nav data-testid="slot">controls</nav>
			</Slot>,
		);
		const element = screen.getByTestId("slot");
		expect(element.tagName).toBe("NAV");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element.className).toContain("consumer-slot");
		expect(element).toHaveAttribute("data-flavor", "controls");
		expect(ref.current).toBe(element);
	});
});

describe("AppLayout.Header slots", () => {
	test("the three slots land in the header in start, content, actions order", () => {
		render(
			<AppLayout.Header data-testid="header">
				<AppLayout.HeaderStart>trigger</AppLayout.HeaderStart>
				<AppLayout.HeaderContent>trail</AppLayout.HeaderContent>
				<AppLayout.HeaderActions>actions</AppLayout.HeaderActions>
			</AppLayout.Header>,
		);
		// The slot chain is public API: consumer CSS and the docs both name it, and
		// the browser test reads the same three attributes to measure the row.
		const slots = [...screen.getByTestId("header").children].map((child) =>
			child.getAttribute("data-slot"),
		);
		expect(slots).toEqual([
			"app-layout-header-start",
			"app-layout-header-content",
			"app-layout-header-actions",
		]);
	});

	test("a consumer's margin on HeaderActions replaces the end alignment", () => {
		// tailwind-merge override contract: the consumer's `ml-0` replaces the
		// default `ml-auto` instead of sitting next to it.
		render(
			<AppLayout.HeaderActions className="ml-0" data-testid="actions">
				actions
			</AppLayout.HeaderActions>,
		);
		const actions = screen.getByTestId("actions");
		expect(actions).toHaveClass("ml-0");
		expect(actions).not.toHaveClass("ml-auto");
	});
});
