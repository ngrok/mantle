import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import mantleCss from "../../mantle.css?raw";
import type * as UseBreakpointModule from "../../hooks/use-breakpoint.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { Sidebar, useSidebar } from "./sidebar.js";

const { useIsBelowBreakpointMock } = vi.hoisted(() => ({
	useIsBelowBreakpointMock: vi.fn<(breakpoint: string) => boolean>(() => false),
}));

// happy-dom cannot lay out a real viewport, so simulate the mobile/desktop
// switch at the hook boundary instead of resizing a window that has no layout.
vi.mock("../../hooks/use-breakpoint.js", async (importOriginal) => ({
	...(await importOriginal<typeof UseBreakpointModule>()),
	useIsBelowBreakpoint: useIsBelowBreakpointMock,
}));

beforeEach(() => {
	useIsBelowBreakpointMock.mockReset();
	useIsBelowBreakpointMock.mockReturnValue(false);
});

describe("Sidebar.Nav (desktop)", () => {
	test("renders a nav landmark named Main by default", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav>content</Sidebar.Nav>
			</Sidebar.Root>,
		);
		expect(screen.getByRole("navigation", { name: "Main" })).toHaveTextContent("content");
	});

	test("aria-label overrides the default nav name", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav aria-label="Product" />
			</Sidebar.Root>,
		);
		expect(screen.getByRole("navigation", { name: "Product" })).toBeInTheDocument();
		expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
	});

	test("panel surface carries data-slot, data-state, className, ref, and data-* props", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Sidebar.Root>
				<Sidebar.Nav
					className="bg-card custom-class"
					data-testid="nav"
					data-flavor="primary"
					ref={ref}
				/>
			</Sidebar.Root>,
		);
		const surface = screen.getByTestId("nav");
		expect(surface).toHaveAttribute("data-slot", "sidebar-nav");
		expect(surface).toHaveAttribute("data-state", "expanded");
		expect(surface).toHaveAttribute("data-flavor", "primary");
		// The background deliberately lives on this surface rather than the inner
		// <nav> so a consumer `bg-*` replaces it outright (tailwind-merge) instead
		// of being painted over by mantle's default.
		expect(surface).toHaveClass("bg-card", "custom-class");
		expect(surface).not.toHaveClass("bg-base");
		expect(ref.current).toBe(surface);
	});

	test("defaultOpen={false} renders the panel collapsed", () => {
		render(
			<Sidebar.Root defaultOpen={false}>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
	});

	test("Trigger toggles the panel and reflects state via aria-expanded", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(trigger).toHaveAttribute("data-state", "expanded");

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("Trigger aria-controls references the nav landmark", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(nav.id).not.toBe("");
		expect(screen.getByRole("button", { name: "Toggle Sidebar" })).toHaveAttribute(
			"aria-controls",
			nav.id,
		);
	});

	test("Trigger omits aria-controls while the mobile sheet is closed", async () => {
		// Regression: the mobile nav lives inside a Sheet whose content Radix
		// unmounts while closed, so a permanent aria-controls would reference an
		// element that is not in the document.
		const user = userEvent.setup();
		useIsBelowBreakpointMock.mockReturnValue(true);
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
		expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
		expect(trigger).not.toHaveAttribute("aria-controls");

		await user.click(trigger);
		const nav = screen.getByRole("navigation", { name: "Main" });
		expect(trigger).toHaveAttribute("aria-controls", nav.id);
	});

	test("controlled open reports changes through onOpenChange without flipping itself", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root open onOpenChange={onOpenChange}>
				<Sidebar.Nav data-testid="nav" />
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
		// controlled: the parent did not update `open`, so the panel stays expanded
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("Trigger respects event.defaultPrevented from the consumer onClick", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root onOpenChange={onOpenChange}>
				<Sidebar.Nav data-testid="nav" />
				<Sidebar.Trigger onClick={(event) => event.preventDefault()} />
			</Sidebar.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("⌘B toggles the sidebar and ⌘⇧B passes through", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");

		await user.keyboard("{Control>}b{/Control}");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");

		// Shift combinations (e.g. the browser's own ⌘⇧B) are left alone
		await user.keyboard("{Meta>}{Shift>}b{/Shift}{/Meta}");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("⌘B still toggles with Caps Lock on (uppercase key without shift)", () => {
		// Regression: with Caps Lock engaged, browsers report key "B" while
		// shiftKey stays false — the shortcut must match case-insensitively.
		// Raw event dispatch because user-event's "B" always implies Shift.
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		fireEvent.keyDown(window, { key: "B", metaKey: true });
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
	});

	test("keyboardShortcut={false} disables the ⌘B toggle", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root keyboardShortcut={false}>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("with two mounted roots, only the first claimant handles ⌘B", async () => {
		// Regression: the shortcut has exactly one owner per window — a second
		// sidebar (sibling root) must not toggle in lockstep with the first.
		const user = userEvent.setup();
		render(
			<>
				<Sidebar.Root>
					<Sidebar.Nav data-testid="primary" />
				</Sidebar.Root>
				<Sidebar.Root>
					<Sidebar.Nav data-testid="secondary" />
				</Sidebar.Root>
			</>,
		);
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("primary")).toHaveAttribute("data-state", "collapsed");
		expect(screen.getByTestId("secondary")).toHaveAttribute("data-state", "expanded");
	});

	test("⌘B ownership stays with the first root across repeated presses", async () => {
		// Regression: the owner used to re-claim on every toggle (its `toggle`
		// identity is in the effect's deps), which re-queued it at the TAIL and
		// handed ownership to the sibling — so press 2 toggled the wrong sidebar.
		const user = userEvent.setup();
		render(
			<>
				<Sidebar.Root>
					<Sidebar.Nav data-testid="primary" />
				</Sidebar.Root>
				<Sidebar.Root>
					<Sidebar.Nav data-testid="secondary" />
				</Sidebar.Root>
			</>,
		);
		await user.keyboard("{Meta>}b{/Meta}");
		await user.keyboard("{Meta>}b{/Meta}");
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("primary")).toHaveAttribute("data-state", "collapsed");
		expect(screen.getByTestId("secondary")).toHaveAttribute("data-state", "expanded");
	});

	test("⌘B ownership hands off when the owning root unmounts", async () => {
		// The keyed conditional keeps the second root's instance stable across
		// the rerender, so React genuinely unmounts the owner instead of
		// relabeling it — a real handoff, not a fresh mount.
		function TwoRoots({ showPrimary }: { showPrimary: boolean }) {
			return (
				<>
					{showPrimary && (
						<Sidebar.Root key="primary">
							<Sidebar.Nav data-testid="primary" />
						</Sidebar.Root>
					)}
					<Sidebar.Root key="secondary">
						<Sidebar.Nav data-testid="secondary" />
					</Sidebar.Root>
				</>
			);
		}
		const user = userEvent.setup();
		const { rerender } = render(<TwoRoots showPrimary />);
		rerender(<TwoRoots showPrimary={false} />);
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("secondary")).toHaveAttribute("data-state", "collapsed");
	});

	test("an opted-out root never claims ⌘B ownership", async () => {
		// keyboardShortcut={false} must not park an inert claim at the head of
		// the queue — the enabled sibling owns the shortcut immediately.
		const user = userEvent.setup();
		render(
			<>
				<Sidebar.Root keyboardShortcut={false}>
					<Sidebar.Nav data-testid="silent" />
				</Sidebar.Root>
				<Sidebar.Root>
					<Sidebar.Nav data-testid="active" />
				</Sidebar.Root>
			</>,
		);
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("silent")).toHaveAttribute("data-state", "expanded");
		expect(screen.getByTestId("active")).toHaveAttribute("data-state", "collapsed");
	});

	test("mounting with controlled openMobile on desktop does not clobber it", () => {
		// Regression: the stale-sheet reset must only fire on a real
		// mobile→desktop transition — never on mount, where it would override a
		// controlled openMobile during SSR hydration (isMobile is desktop-first
		// until the media query snapshot corrects).
		const onOpenMobileChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root openMobile onOpenMobileChange={onOpenMobileChange}>
				<Sidebar.Nav />
			</Sidebar.Root>,
		);
		expect(onOpenMobileChange).not.toHaveBeenCalled();
	});

	test("Header, Body, and Footer render in DOM order inside the nav", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Header data-testid="header">header</Sidebar.Header>
					<Sidebar.Body data-testid="body">body</Sidebar.Body>
					<Sidebar.Footer data-testid="footer">footer</Sidebar.Footer>
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Main" });
		const header = screen.getByTestId("header");
		const body = screen.getByTestId("body");
		const footer = screen.getByTestId("footer");
		expect(nav).toContainElement(header);
		expect(header.compareDocumentPosition(body)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(body.compareDocumentPosition(footer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(header).toHaveAttribute("data-slot", "sidebar-header");
		expect(body).toHaveAttribute("data-slot", "sidebar-body");
		expect(footer).toHaveAttribute("data-slot", "sidebar-footer");
	});
});

describe("Sidebar collapse", () => {
	test("the collapsed desktop panel keeps its content in the accessibility tree", () => {
		render(
			<Sidebar.Root defaultOpen={false}>
				<Sidebar.Nav data-testid="nav">content</Sidebar.Nav>
			</Sidebar.Root>,
		);
		const nav = screen.getByTestId("nav");
		expect(nav).toHaveAttribute("data-state", "collapsed");
		// the collapse target is always the icon rail — no per-mode attribute
		expect(nav).not.toHaveAttribute("data-collapsible");
		expect(screen.getByRole("navigation", { name: "Main" })).toHaveTextContent("content");
	});

	test("the desktop panel emits data-hydrated once client rendering settles", () => {
		// data-hydrated is the CSS gate that lets descendant collapse
		// transitions (e.g. GroupLabel's) snap instead of animating when an SSR
		// state correction lands on load. In a client test, effects have run by
		// the time we assert, so the attribute must be present.
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-hydrated");
	});
});

describe("Sidebar.Nav (pre-hydration)", () => {
	// The server cannot know the viewport, so `isMobile` is desktop-first and the
	// server always emits the desktop panel — CSS is the only thing keeping it off
	// a narrow first paint, because no mobile sheet exists until hydration. That
	// branch is unreachable from a client render (useIsHydrated is already true on
	// the first commit), so drive it through renderToString.
	test.each([
		{ mobileBreakpoint: "sm", visibility: "hidden sm:block" },
		{ mobileBreakpoint: "md", visibility: "hidden md:block" },
		{ mobileBreakpoint: "lg", visibility: "hidden lg:block" },
	] as const)(
		"mobileBreakpoint=$mobileBreakpoint hides the server-rendered panel with $visibility",
		({ mobileBreakpoint, visibility }) => {
			const html = renderToString(
				<Sidebar.Root mobileBreakpoint={mobileBreakpoint}>
					<Sidebar.Nav />
				</Sidebar.Root>,
			);
			expect(html).toContain('data-slot="sidebar-nav"');
			// These responsive utilities ARE the pre-hydration gate — the whole
			// mechanism is CSS, there is no attribute mirroring it, and a server
			// render exposes nothing but its HTML. Mapping breakpoint → variant is
			// the only way the wrong-breakpoint bug (panel hidden on the exact
			// widths where no sheet exists yet) can be caught at all.
			expect(html).toContain(visibility);
			// the hydration gates are the other half of the contract: no
			// data-hydrated for descendants to key off, and no width transition, so
			// an SSR state correction snaps instead of animating shut on load
			expect(html).not.toContain("data-hydrated");
			expect(html).not.toContain("transition-[width]");
		},
	);

	test("drops the visibility gate once hydrated so the panel is never hidden with no sheet", () => {
		render(
			<Sidebar.Root mobileBreakpoint="lg">
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		const nav = screen.getByTestId("nav");
		expect(nav).toHaveAttribute("data-hydrated");
		// Both classes are the contract itself and have no attribute twin, so they
		// are asserted directly — and each is the positive half of the pre-hydration
		// case above. Keeping `hidden lg:block` after hydration would leave the
		// sliver of widths between Tailwind's min-width variant and the hook's
		// max-width query with a rendered-but-invisible panel and no sheet;
		// `transition-[width]` must come back, or the collapse never animates.
		expect(nav).not.toHaveClass("hidden");
		expect(nav).toHaveClass("transition-[width]");
	});
});

describe("--sidebar-row-width", () => {
	// The token is public API for surfaces that render OUTSIDE the panel: a
	// switcher's menu is portaled to document.body, so it inherits nothing the
	// sidebar sets and reads the expanded row width from :root instead — which is
	// how a menu keeps that width while its trigger shrinks into the icon rail.
	// happy-dom loads no stylesheet, so guard the declaration itself.
	test("mantle.css derives it at :root from the expanded panel width", () => {
		expect(mantleCss).toMatch(
			/:root\s*\{[^}]*--sidebar-row-width:\s*calc\(\s*var\(\s*--sidebar-width\s*,\s*16rem\s*\)\s*-\s*1rem\s*\)/,
		);
	});

	// The floor only lands because `cx` (tailwind-merge) drops
	// DropdownMenu.Content's own `min-w-32` when the recipe passes a `min-w-*`.
	// Cascade order would not save it: Tailwind emits `.min-w-(--var)` BEFORE the
	// numeric scale, so if a tailwind-merge upgrade ever stopped grouping the
	// bare-variable shorthand with that scale, `min-w-32` (128px) would win and
	// the rail menu would silently shrink back to the bug this token fixed.
	test("the documented menu recipe replaces DropdownMenu.Content's own min-width", () => {
		render(
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger asChild>
					<Sidebar.SwitcherTrigger>Acme Corp</Sidebar.SwitcherTrigger>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content
					data-testid="menu"
					width="trigger"
					className="min-w-(--sidebar-row-width)"
				>
					<DropdownMenu.Item>Billing</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const menu = screen.getByTestId("menu");
		// toHaveClass matches whole class tokens, so `min-w-32` cannot pass by
		// being a substring of some other utility
		expect(menu).toHaveClass("min-w-(--sidebar-row-width)");
		// the trigger width survives beside the floor — min-width clamps it up
		expect(menu).toHaveClass("w-(--radix-dropdown-menu-trigger-width)");
		expect(menu).not.toHaveClass("min-w-32");
	});

	// A spelling pin, not a layout assertion (happy-dom lays nothing out): change
	// the regions' padding and this fails, pointing at the token that hard-codes
	// the sum. The rendered geometry is covered by the Playwright pass in the PR.
	test("the 1rem it subtracts is the padding Header, Body, and Footer all apply", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav">
					<Sidebar.Header data-testid="header" />
					<Sidebar.Body data-testid="body" />
					<Sidebar.Footer data-testid="footer" />
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
		// The other half of the pair: the regions' `group-data-[state=expanded]/sidebar-nav:`
		// variant only resolves because the panel names the group `sidebar-nav` AND
		// carries data-state. Renaming either side silently drops the trailing trim
		// with every other assertion still green, so assert both together.
		const nav = screen.getByTestId("nav");
		expect(nav).toHaveClass("group/sidebar-nav");
		expect(nav).toHaveAttribute("data-state", "expanded");
		for (const region of ["header", "body", "footer"]) {
			// px-3 (0.75rem) plus the expanded pr-1 (0.25rem) is the 1rem the token
			// subtracts, so a row spans --sidebar-width minus exactly that.
			// toHaveClass matches whole class tokens — a substring assertion would
			// stay green for a half-step edit (px-3.5, pr-1.5), the very change that
			// makes the token's hard-coded 1rem wrong.
			expect(screen.getByTestId(region)).toHaveClass(
				"px-3",
				"group-data-[state=expanded]/sidebar-nav:pr-1",
			);
		}
	});
});

describe("Sidebar.Nav (mobile)", () => {
	beforeEach(() => {
		useIsBelowBreakpointMock.mockReturnValue(true);
	});

	test("renders nothing until the trigger opens the sheet", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav>content</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		const sheet = screen.getByRole("dialog", { name: "Main" });
		expect(sheet).toHaveAttribute("data-slot", "sidebar-nav");
		expect(sheet).toHaveAttribute("data-mobile");
		expect(screen.getByRole("navigation", { name: "Main" })).toHaveTextContent("content");
	});

	test("consumer aria-labelledby names the sheet dialog and the nav consistently", () => {
		// Regression: without forwarding, the dialog fell back to "Sidebar"
		// while the nav carried the referenced name.
		render(
			<Sidebar.Root openMobile>
				<span id="sidebar-name">Product areas</span>
				<Sidebar.Nav aria-labelledby="sidebar-name">content</Sidebar.Nav>
			</Sidebar.Root>,
		);
		expect(screen.getByRole("dialog", { name: "Product areas" })).toBeInTheDocument();
		expect(screen.getByRole("navigation", { name: "Product areas" })).toBeInTheDocument();
	});

	test("controlled openMobile opens the sheet and reports closes", async () => {
		const user = userEvent.setup();
		const onOpenMobileChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root openMobile onOpenMobileChange={onOpenMobileChange}>
				<Sidebar.Nav>content</Sidebar.Nav>
			</Sidebar.Root>,
		);
		expect(screen.getByRole("dialog", { name: "Main" })).toBeInTheDocument();

		await user.keyboard("{Escape}");
		expect(onOpenMobileChange).toHaveBeenCalledExactlyOnceWith(false);
		// controlled: the parent kept openMobile, so the sheet stays mounted
		expect(screen.getByRole("dialog", { name: "Main" })).toBeInTheDocument();
	});

	test("uses the root mobileBreakpoint for the media query", () => {
		render(
			<Sidebar.Root mobileBreakpoint="md">
				<Sidebar.Nav />
			</Sidebar.Root>,
		);
		// the hook runs once per render, so pin the argument rather than a count —
		// and prove the default is not also queried alongside the override
		expect(useIsBelowBreakpointMock).toHaveBeenLastCalledWith("md");
		expect(useIsBelowBreakpointMock).not.toHaveBeenCalledWith("lg");
	});

	test("defaults the media query to the lg breakpoint", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
			</Sidebar.Root>,
		);
		expect(useIsBelowBreakpointMock).toHaveBeenLastCalledWith("lg");
	});

	test("clears a stale open sheet when the viewport leaves mobile", async () => {
		const user = userEvent.setup();
		const onOpenMobileChange = vi.fn<(open: boolean) => void>();
		const { rerender } = render(
			<Sidebar.Root onOpenMobileChange={onOpenMobileChange}>
				<Sidebar.Nav>content</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		expect(onOpenMobileChange).toHaveBeenCalledExactlyOnceWith(true);
		expect(screen.getByRole("dialog", { name: "Main" })).toBeInTheDocument();

		useIsBelowBreakpointMock.mockReturnValue(false);
		rerender(
			<Sidebar.Root onOpenMobileChange={onOpenMobileChange}>
				<Sidebar.Nav>content</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
		// exactly one reset, not a loop of them: the effect fires on the
		// mobile→desktop transition only
		expect(onOpenMobileChange).toHaveBeenCalledTimes(2);
		expect(onOpenMobileChange).toHaveBeenLastCalledWith(false);
		expect(screen.queryByRole("dialog", { name: "Main" })).not.toBeInTheDocument();
	});
});

describe("useSidebar", () => {
	test("throws when called outside Sidebar.Root", () => {
		function Standalone() {
			useSidebar();
			return null;
		}
		// silence React's error boundary noise for the expected throw. try/finally
		// so a failed assertion cannot leave console.error mocked for the rest of
		// the file, hiding React's key/act/hydration warnings.
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			expect(() => render(<Standalone />)).toThrow("useSidebar must be used within Sidebar.Root.");
		} finally {
			consoleError.mockRestore();
		}
	});

	test("exposes toggle and setters that drive the panel", async () => {
		const user = userEvent.setup();
		function CustomTrigger() {
			const { open, toggle } = useSidebar();
			return (
				<button type="button" onClick={toggle}>
					{open ? "collapse it" : "expand it"}
				</button>
			);
		}
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
				<CustomTrigger />
			</Sidebar.Root>,
		);
		await user.click(screen.getByRole("button", { name: "collapse it" }));
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		await user.click(screen.getByRole("button", { name: "expand it" }));
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});
});

describe("Sidebar.Group + GroupLabel + List", () => {
	test("labels the list with the group label via aria-labelledby", () => {
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
				<Sidebar.List>
					<Sidebar.Item>
						<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
					</Sidebar.Item>
				</Sidebar.List>
			</Sidebar.Group>,
		);
		expect(screen.getByRole("list", { name: "Traffic" })).toBeInTheDocument();
	});

	test("labels the list with a consumer-supplied GroupLabel id", () => {
		// Regression: the group used to register only its own generated id, so a
		// consumer `id` on the label silently left the list unnamed.
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel id="traffic-label">Traffic</Sidebar.GroupLabel>
				<Sidebar.List data-testid="list">
					<Sidebar.Item>
						<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
					</Sidebar.Item>
				</Sidebar.List>
			</Sidebar.Group>,
		);
		expect(screen.getByTestId("list")).toHaveAttribute("aria-labelledby", "traffic-label");
		expect(screen.getByRole("list", { name: "Traffic" })).toBeInTheDocument();
	});

	test("drops the list's aria-labelledby when the label unmounts", () => {
		function Group({ showLabel }: { showLabel: boolean }) {
			return (
				<Sidebar.Group>
					{showLabel && <Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>}
					<Sidebar.List data-testid="list">
						<Sidebar.Item>
							<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
						</Sidebar.Item>
					</Sidebar.List>
				</Sidebar.Group>
			);
		}
		const { rerender } = render(<Group showLabel />);
		expect(screen.getByTestId("list")).toHaveAttribute("aria-labelledby");
		rerender(<Group showLabel={false} />);
		expect(screen.getByTestId("list")).not.toHaveAttribute("aria-labelledby");
	});

	test("renders the list without aria-labelledby when the group has no label", () => {
		render(
			<Sidebar.Group>
				<Sidebar.List data-testid="list">
					<Sidebar.Item>
						<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
					</Sidebar.Item>
				</Sidebar.List>
			</Sidebar.Group>,
		);
		expect(screen.getByTestId("list")).not.toHaveAttribute("aria-labelledby");
	});

	test("GroupLabel renders a div, not a heading", () => {
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel data-testid="label">Traffic</Sidebar.GroupLabel>
			</Sidebar.Group>,
		);
		const label = screen.getByTestId("label");
		expect(label.tagName).toBe("DIV");
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
	});

	test("GroupLabel asChild keeps the slot and merges the consumer's own className", () => {
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel asChild>
					<h4 className="custom-class" data-testid="label">
						Traffic
					</h4>
				</Sidebar.GroupLabel>
			</Sidebar.Group>,
		);
		const label = screen.getByRole("heading", { level: 4, name: "Traffic" });
		expect(label).toHaveAttribute("data-slot", "sidebar-group-label");
		// Slot merges rather than replaces: the child keeps its own class while the
		// part's recipe also lands on it
		expect(label).toHaveClass("custom-class");
		expect(label.className).not.toBe("custom-class");
	});

	// The docs' Polymorphism example swaps the label element; the group's naming
	// wiring has to survive that, or the list silently loses its accessible name.
	test("GroupLabel asChild still names the list via aria-labelledby", () => {
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel asChild>
					<h3>Traffic</h3>
				</Sidebar.GroupLabel>
				<Sidebar.List data-testid="list" />
			</Sidebar.Group>,
		);
		const label = screen.getByRole("heading", { level: 3, name: "Traffic" });
		expect(label.id).not.toBe("");
		expect(screen.getByTestId("list")).toHaveAttribute("aria-labelledby", label.id);
	});
});

describe("Sidebar.Item + ItemButton", () => {
	test("renders a list item wrapping a type=button by default", () => {
		render(
			<Sidebar.List>
				<Sidebar.Item data-testid="item">
					<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
				</Sidebar.Item>
			</Sidebar.List>,
		);
		const item = screen.getByTestId("item");
		expect(item.tagName).toBe("LI");
		const button = screen.getByRole("button", { name: "Endpoints" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("data-slot", "sidebar-item-button");
	});

	test("current sets aria-current=page and the data-current state", () => {
		render(<Sidebar.ItemButton current>Endpoints</Sidebar.ItemButton>);
		const button = screen.getByRole("button", { name: "Endpoints" });
		expect(button).toHaveAttribute("aria-current", "page");
		expect(button).toHaveAttribute("data-current");
	});

	test("non-current rows render neither aria-current nor data-current", () => {
		render(<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>);
		const button = screen.getByRole("button", { name: "Endpoints" });
		expect(button).not.toHaveAttribute("aria-current");
		expect(button).not.toHaveAttribute("data-current");
	});

	test("asChild composes a router-style link and keeps the row contract", () => {
		render(
			<Sidebar.ItemButton asChild current className="rounded-none custom-class">
				<a href="/endpoints">Endpoints</a>
			</Sidebar.ItemButton>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link).toHaveAttribute("aria-current", "page");
		expect(link).toHaveAttribute("data-slot", "sidebar-item-button");
		expect(link).not.toHaveAttribute("type");
		// tailwind-merge contract: a consumer radius replaces the row's own
		// instead of losing to it, and unrelated classes are just added
		expect(link).toHaveClass("rounded-none", "custom-class");
		expect(link).not.toHaveClass("rounded-md");
	});
});

describe("Sidebar.SwitcherTrigger", () => {
	test("renders a type=button row carrying the switcher slot by default", () => {
		render(<Sidebar.SwitcherTrigger>Acme Corp</Sidebar.SwitcherTrigger>);
		const button = screen.getByRole("button", { name: "Acme Corp" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("data-slot", "sidebar-switcher-trigger");
	});

	test("asChild renders the consumer element with the switcher slot and no button type", () => {
		render(
			<Sidebar.SwitcherTrigger asChild>
				<a href="/switch">Acme Corp</a>
			</Sidebar.SwitcherTrigger>,
		);
		const link = screen.getByRole("link", { name: "Acme Corp" });
		expect(link).toHaveAttribute("data-slot", "sidebar-switcher-trigger");
		// an anchor must not inherit the default type="button" the button branch adds
		expect(link).not.toHaveAttribute("type");
	});
});

describe("switch-accounts recipe (composition)", () => {
	// The account switcher is deliberately not a Sidebar part — it composes
	// DropdownMenu.RadioGroup/RadioItem with Sidebar.AccountAvatar (see the
	// docs recipe). This guards the composition the docs demonstrate.
	test("radio items compose an avatar, name, and checked state", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger>Switch</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.RadioGroup value="acc_atlas" onValueChange={onValueChange}>
						{[
							{ id: "acc_acme", name: "Acme Corp" },
							{ id: "acc_atlas", name: "Atlas Industries" },
						].map((account) => (
							<DropdownMenu.RadioItem key={account.id} value={account.id}>
								<Sidebar.AccountAvatar accountId={account.id} accountName={account.name} />
								<span className="min-w-0 flex-1 truncate">{account.name}</span>
							</DropdownMenu.RadioItem>
						))}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		expect(screen.getByRole("menuitemradio", { name: "Acme Corp" })).toHaveAttribute(
			"aria-checked",
			"false",
		);
		expect(screen.getByRole("menuitemradio", { name: "Atlas Industries" })).toHaveAttribute(
			"aria-checked",
			"true",
		);
		await user.click(screen.getByRole("menuitemradio", { name: "Acme Corp" }));
		expect(onValueChange).toHaveBeenCalledExactlyOnceWith("acc_acme");
	});
});

describe("Sidebar.Separator", () => {
	test("renders a decorative horizontal separator carrying the sidebar slot", () => {
		render(<Sidebar.Separator data-testid="separator" />);
		const separator = screen.getByTestId("separator");
		// decorative by default: role="none" keeps it out of the a11y tree, and it
		// must not announce itself as a semantic separator
		expect(separator).toHaveAttribute("role", "none");
		expect(separator).not.toHaveAttribute("aria-orientation");
		expect(screen.queryByRole("separator")).not.toBeInTheDocument();
		// the sidebar slot replaces the base Separator's own, so consumer CSS can
		// target this hairline specifically
		expect(separator).toHaveAttribute("data-slot", "sidebar-separator");
		expect(separator).toHaveAttribute("data-orientation", "horizontal");
	});

	test("semantic renders an announced separator", () => {
		render(<Sidebar.Separator semantic data-testid="separator" />);
		expect(screen.getByRole("separator")).toBe(screen.getByTestId("separator"));
	});
});

function renderedSwatchClass(accountId: string | undefined): string {
	const { unmount } = render(
		<Sidebar.AccountAvatar data-testid="avatar" accountId={accountId} accountName="Test" />,
	);
	const swatch = Array.from(screen.getByTestId("avatar").classList).find((name) =>
		name.startsWith("bg-"),
	);
	unmount();
	if (swatch == null) {
		throw new Error(`AccountAvatar rendered no bg-* swatch for accountId ${accountId}`);
	}
	return swatch;
}

describe("Sidebar.AccountAvatar", () => {
	test("derives one uppercase initial from a single-word name", () => {
		render(<Sidebar.AccountAvatar accountId="acc_1" accountName="ngrok" />);
		expect(screen.getByText("N")).toBeInTheDocument();
	});

	test("derives two initials from a multi-word name and caps at two", () => {
		render(<Sidebar.AccountAvatar accountId="acc_1" accountName="Acme Corp International" />);
		expect(screen.getByText("AC")).toBeInTheDocument();
	});

	test("strips special characters before deriving initials", () => {
		render(<Sidebar.AccountAvatar accountId="acc_1" accountName="!!!Banana***" />);
		expect(screen.getByText("B")).toBeInTheDocument();
	});

	test("keeps a surrogate-pair first character whole instead of splitting it", () => {
		// Regression: substring(0, 1) split an emoji-leading name into a lone
		// surrogate that rendered as U+FFFD.
		render(<Sidebar.AccountAvatar accountId="acc_1" accountName="🚀 Rocket" />);
		expect(screen.getByText("🚀R")).toBeInTheDocument();
	});

	test("falls back to ? for empty names", () => {
		render(<Sidebar.AccountAvatar accountId="acc_1" accountName="" />);
		expect(screen.getByText("?")).toBeInTheDocument();
	});

	test("the same accountId always renders the same swatch", () => {
		const first = renderedSwatchClass("acc_stable");
		const second = renderedSwatchClass("acc_stable");
		expect(first).toBe(second);
	});

	// Pinning id → swatch is what makes the derivation testable at all: the class
	// IS the output of `djb2Hash(id) >>> 0` modulo the palette length, indexed
	// into a tuple whose hue order the implementation documents as load-bearing.
	// "the same id twice agrees" holds for any constant — including the
	// `?? "bg-neutral-500"` grey every account falls back to if the `>>> 0`
	// (or the modulo's positivity) ever goes away, since most ids then index
	// negatively.
	test.each([
		["acc_acme", "bg-emerald-500"],
		["acc_atlas", "bg-purple-500"],
		["acc_stable", "bg-green-500"],
		["acc_1", "bg-blue-500"],
	] as const)("accountId=%s picks %s", (accountId, expected) => {
		expect(renderedSwatchClass(accountId)).toBe(expected);
	});

	test("different accountIds pick different swatches", () => {
		expect(renderedSwatchClass("acc_acme")).not.toBe(renderedSwatchClass("acc_atlas"));
	});

	test("a missing accountId resolves like the empty string", () => {
		expect(renderedSwatchClass(undefined)).toBe(renderedSwatchClass(""));
		expect(renderedSwatchClass(undefined)).toBe("bg-orange-500");
	});
});

describe("Sidebar.UserAvatar", () => {
	test("renders the silhouette fallback and aria-label without a src", () => {
		render(<Sidebar.UserAvatar data-testid="avatar" alt="Jane Doe" />);
		const avatar = screen.getByTestId("avatar");
		expect(avatar).toHaveAttribute("aria-label", "Jane Doe");
		expect(avatar.querySelector("img")).not.toBeInTheDocument();
		expect(avatar.querySelector("svg")).toBeInTheDocument();
	});

	test("renders the profile image and drops the container aria-label with a src", () => {
		render(
			<Sidebar.UserAvatar data-testid="avatar" src="https://example.com/me.png" alt="Jane Doe" />,
		);
		const avatar = screen.getByTestId("avatar");
		expect(avatar).not.toHaveAttribute("aria-label");
		expect(screen.getByRole("img", { name: "Jane Doe" })).toHaveAttribute(
			"src",
			"https://example.com/me.png",
		);
	});
});
