import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { Sidebar } from "../sidebar/sidebar.js";
import { TooltipProvider } from "../tooltip/index.js";
import { AppLayout, useSidePanel } from "./app-layout.js";

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
					<AppLayout.SidePanelRoot defaultOpen>
						<AppLayout.SidePanel>
							<AppLayout.SidePanelHeader data-testid="panel-header">
								assistant
							</AppLayout.SidePanelHeader>
						</AppLayout.SidePanel>
					</AppLayout.SidePanelRoot>
				</AppLayout.Workspace>
			</AppLayout.Root>,
		);
		const root = screen.getByTestId("root");
		expect([...root.classList]).toContain("group/app-layout");
		expect(root.querySelector('[data-slot~="sidebar-header"]')).not.toBeNull();
		const derivedHeight =
			"group-has-data-[slot~=sidebar-header]/app-layout:h-[calc(var(--sidebar-header-height,4.5rem)-2*var(--app-layout-card-gutter,0.5rem)-2px)]";
		expect(screen.getByTestId("header").className).toContain(derivedHeight);
		// The panel header sits on the same band, so a derivation that reaches one
		// row and not the other unaligns the two cards.
		expect(screen.getByTestId("panel-header").className).toContain(derivedHeight);
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

describe("AppLayout.SidePanel", () => {
	test("renders an aside stamped data-slot app-layout-side-panel with the root's id and its children", () => {
		render(
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.SidePanel aria-label="Assistant">conversation</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(panel.tagName).toBe("ASIDE");
		expect(panel).toHaveAttribute("data-slot", "app-layout-side-panel");
		expect(panel).toHaveAttribute("id");
		expect(panel).toHaveTextContent("conversation");
	});

	test("throws outside AppLayout.SidePanelRoot", () => {
		// Why: silence React's error log for the expected throw.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<AppLayout.SidePanel>conversation</AppLayout.SidePanel>)).toThrow(
			"AppLayout.SidePanel must be rendered inside AppLayout.SidePanelRoot.",
		);
	});

	test("starts closed and inert, and the trigger opens and closes it", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot>
					<AppLayout.SidePanelTrigger />
					<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle side panel" });
		const panel = screen.getByTestId("panel");
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(trigger).toHaveAttribute("data-state", "closed");
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).toHaveAttribute("inert");

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(trigger).toHaveAttribute("data-state", "open");
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel).not.toHaveAttribute("inert");

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).toHaveAttribute("inert");
		// Still mounted: the closed panel keeps its children's state.
		expect(panel).toHaveTextContent("conversation");
	});

	test("defaultOpen starts the panel open", () => {
		render(
			<AppLayout.SidePanelRoot defaultOpen>
				<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		const panel = screen.getByTestId("panel");
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel).not.toHaveAttribute("inert");
	});

	test("the trigger's aria-controls references the panel", () => {
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot>
					<AppLayout.SidePanelTrigger />
					<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle side panel" });
		expect(trigger).toHaveAttribute("aria-controls", screen.getByTestId("panel").id);
	});

	test("controlled open reports changes through onOpenChange without flipping itself", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot open onOpenChange={onOpenChange}>
					<AppLayout.SidePanelTrigger />
					<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle side panel" }));
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
		// controlled: the parent did not update `open`, so the panel stays open
		expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "open");
	});

	test("the trigger respects event.defaultPrevented from the consumer onClick", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot onOpenChange={onOpenChange}>
					<AppLayout.SidePanelTrigger onClick={(event) => event.preventDefault()} />
					<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle side panel" }));
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "closed");
	});

	test("the trigger renders a ghost neutral IconButton with its label as the tooltip", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot>
					<AppLayout.SidePanelTrigger label="Toggle the assistant" />
					<AppLayout.SidePanel>conversation</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle the assistant" });
		expect(trigger).toHaveAttribute("data-slot", "app-layout-side-panel-trigger");
		expect(trigger).toHaveAttribute("data-appearance", "ghost");
		expect(trigger).toHaveAttribute("data-intent", "neutral");
		await user.hover(trigger);
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Toggle the assistant");
	});

	test("closing from a trigger inside the panel moves focus to the trigger outside it", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot defaultOpen>
					<AppLayout.SidePanelTrigger label="Toggle the assistant" />
					<AppLayout.SidePanel data-testid="panel">
						<AppLayout.SidePanelHeader>
							<AppLayout.SidePanelTrigger label="Close the assistant" />
						</AppLayout.SidePanelHeader>
					</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		// Why: a closed panel is `inert`, so focus left inside it falls to <body>.
		await user.click(screen.getByRole("button", { name: "Close the assistant" }));
		expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "closed");
		expect(screen.getByRole("button", { name: "Toggle the assistant" })).toHaveFocus();
	});

	test("closing from the trigger outside the panel leaves focus where it is", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot defaultOpen>
					<button type="button">before</button>
					<AppLayout.SidePanelTrigger label="Toggle the assistant" />
					<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle the assistant" });
		await user.click(trigger);
		expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "closed");
		expect(trigger).toHaveFocus();
	});

	test("stamps id, data-state, and inert after a wider props object", () => {
		// Why: a consumer value for any of these would break the trigger's
		// `aria-controls`, desync the collapse from the root, or leave a closed
		// panel in the tab order.
		const consumerProps = { id: "mine", "data-state": "open", inert: false };
		render(
			<AppLayout.SidePanelRoot>
				<AppLayout.SidePanel data-testid="panel" {...consumerProps}>
					conversation
				</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		const panel = screen.getByTestId("panel");
		expect(panel.id).not.toBe("mine");
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).toHaveAttribute("inert");
	});

	test("stamps data-hydrated one frame after mount, not in the mount commit", async () => {
		// Why a frame: a persisted-state correction commits in the mount flush, and
		// the transition gate keys off the attribute, so a same-commit stamp animates it.
		render(
			<AppLayout.SidePanelRoot>
				<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		const panel = screen.getByTestId("panel");
		expect(panel).not.toHaveAttribute("data-hydrated");
		await waitFor(() => {
			expect(panel).toHaveAttribute("data-hydrated", "");
		});
	});

	test("the server render carries the cookie's state and no hydration stamp", () => {
		// Why renderToString: the first paint is the server HTML, and a mount
		// effect would overwrite what this asserts before a post-mount read.
		const html = renderToString(
			<AppLayout.SidePanelRoot defaultOpen={false}>
				<AppLayout.SidePanel>conversation</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		expect(html).toContain('data-state="closed"');
		expect(html).toContain("inert");
		// The class list names the attribute in its gate, so match the stamp itself.
		expect(html).not.toContain('data-hydrated=""');
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLElement>();
		render(
			<AppLayout.SidePanelRoot>
				<AppLayout.SidePanel
					className="consumer-panel"
					data-flavor="assistant"
					data-testid="panel"
					ref={ref}
				>
					conversation
				</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		const panel = screen.getByTestId("panel");
		expect(panel.className).toContain("consumer-panel");
		expect(panel).toHaveAttribute("data-flavor", "assistant");
		expect(ref.current).toBe(panel);
	});

	test("joins an ancestor-provided data-slot ahead of its own", () => {
		render(
			<AppLayout.SidePanelRoot>
				<AppLayout.SidePanel data-slot="app-shell" data-testid="panel">
					conversation
				</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		expect(screen.getByTestId("panel")).toHaveAttribute(
			"data-slot",
			"app-shell app-layout-side-panel",
		);
	});
});

describe("useSidePanel", () => {
	test("throws when called outside AppLayout.SidePanelRoot", () => {
		function Standalone() {
			useSidePanel();
			return null;
		}
		// Why: silence React's error log for the expected throw.
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Standalone />)).toThrow(
			"useSidePanel must be used within AppLayout.SidePanelRoot.",
		);
	});

	test("exposes toggle and setOpen that drive the panel", async () => {
		const user = userEvent.setup();
		function CustomControls() {
			const { open, setOpen, toggle } = useSidePanel();
			return (
				<>
					<button type="button" onClick={toggle}>
						{open ? "close it" : "open it"}
					</button>
					<button type="button" onClick={() => setOpen(false)}>
						dismiss
					</button>
				</>
			);
		}
		render(
			<AppLayout.SidePanelRoot>
				<CustomControls />
				<AppLayout.SidePanel data-testid="panel">conversation</AppLayout.SidePanel>
			</AppLayout.SidePanelRoot>,
		);
		await user.click(screen.getByRole("button", { name: "open it" }));
		expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "open");
		await user.click(screen.getByRole("button", { name: "dismiss" }));
		expect(screen.getByTestId("panel")).toHaveAttribute("data-state", "closed");
	});
});

describe.each([
	["SidePanelHeader", AppLayout.SidePanelHeader, "app-layout-side-panel-header"],
	["SidePanelBody", AppLayout.SidePanelBody, "app-layout-side-panel-body"],
	["SidePanelFooter", AppLayout.SidePanelFooter, "app-layout-side-panel-footer"],
] as const)("AppLayout.%s", (_name, Part, slot) => {
	test(`renders a div stamped data-slot ${slot} with its children and no landmark`, () => {
		render(<Part data-testid="part">conversation</Part>);
		const element = screen.getByTestId("part");
		expect(element.tagName).toBe("DIV");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element).toHaveTextContent("conversation");
		// Why: the page's body owns `main`, and a second landmark in the panel
		// would read as a second page.
		expect(screen.queryByRole("main")).not.toBeInTheDocument();
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Part className="consumer-part" data-flavor="assistant" data-testid="part" ref={ref}>
				conversation
			</Part>,
		);
		const element = screen.getByTestId("part");
		expect(element.className).toContain("consumer-part");
		expect(element).toHaveAttribute("data-flavor", "assistant");
		expect(ref.current).toBe(element);
	});

	test("joins an ancestor's data-slot ahead of its own", () => {
		render(
			<Part data-slot="app-shell" data-testid="part">
				conversation
			</Part>,
		);
		expect(screen.getByTestId("part")).toHaveAttribute("data-slot", `app-shell ${slot}`);
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Part asChild className="consumer-part" data-flavor="assistant" ref={ref}>
				<section data-testid="part">conversation</section>
			</Part>,
		);
		const element = screen.getByTestId("part");
		expect(element.tagName).toBe("SECTION");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element.className).toContain("consumer-part");
		expect(element).toHaveAttribute("data-flavor", "assistant");
		expect(ref.current).toBe(element);
	});
});
