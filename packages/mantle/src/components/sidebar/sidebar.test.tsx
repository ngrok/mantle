import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from "vitest";
import mantleCss from "../../mantle.css?raw";
import type * as UseBreakpointModule from "../../hooks/use-breakpoint.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { TooltipProvider } from "../tooltip/index.js";
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

/**
 * The keyboard chord that toggles the sidebar under this suite. happy-dom
 * reports a non-Apple `navigator.platform` whatever machine the tests run on
 * (asserted in `utils/platform.test.ts`), so the platform modifier here is
 * `Ctrl`. Apple behavior is covered by stubbing the platform explicitly.
 */
const platformChord = "{Control>}b{/Control}";

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
				<Sidebar.Nav className="custom-class" data-testid="nav" data-flavor="primary" ref={ref} />
			</Sidebar.Root>,
		);
		const surface = screen.getByTestId("nav");
		expect(surface).toHaveAttribute("data-slot", "sidebar-nav");
		expect(surface).toHaveAttribute("data-state", "expanded");
		expect(surface).toHaveAttribute("data-flavor", "primary");
		expect(surface.className).toContain("custom-class");
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

	test("Ctrl+B toggles the sidebar and Ctrl+Shift+B passes through", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		await user.keyboard(platformChord);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");

		await user.keyboard(platformChord);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");

		// Shift combinations (e.g. the browser's own Ctrl+Shift+B) are left alone
		await user.keyboard("{Control>}{Shift>}b{/Shift}{/Control}");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("⌘B does not toggle on a non-Apple platform", async () => {
		// Regression (issue #1374): the handler used to accept `metaKey ||
		// ctrlKey` on every platform. The two modifiers are distinct chords and
		// must not substitute for each other in either direction.
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		await user.keyboard("{Meta>}b{/Meta}");
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("Ctrl+B still toggles with Caps Lock on (uppercase key without shift)", () => {
		// Regression: with Caps Lock engaged, browsers report key "B" while
		// shiftKey stays false — the shortcut must match case-insensitively.
		// Raw event dispatch because user-event's "B" always implies Shift.
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		fireEvent.keyDown(window, { key: "B", ctrlKey: true });
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
	});

	test("keyboardShortcut={false} disables the toggle", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root keyboardShortcut={false}>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		await user.keyboard(platformChord);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	describe("on Apple platforms", () => {
		// The handler resolves the platform once per mount, so the stub has to be
		// installed before `render()` — a `beforeEach` is the only safe place.
		let platform: MockInstance<() => string> | undefined;

		beforeEach(() => {
			platform = vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
		});

		afterEach(() => {
			platform?.mockRestore();
			platform = undefined;
		});

		test("⌘B toggles the sidebar", async () => {
			const user = userEvent.setup();
			render(
				<Sidebar.Root>
					<Sidebar.Nav data-testid="nav" />
				</Sidebar.Root>,
			);
			await user.keyboard("{Meta>}b{/Meta}");
			expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		});

		test("Ctrl+B is left to macOS, which binds it to caret-back", async () => {
			// Regression (issue #1374): Ctrl+B is the native emacs-style "move the
			// cursor back one character" binding in every macOS text field, and the
			// handler used to preventDefault() it and toggle the sidebar instead.
			const user = userEvent.setup();
			render(
				<Sidebar.Root>
					<Sidebar.Nav data-testid="nav" />
				</Sidebar.Root>,
			);
			await user.keyboard("{Control>}b{/Control}");
			expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
		});

		test("⌘+Ctrl+B is a different chord and passes through", async () => {
			const user = userEvent.setup();
			render(
				<Sidebar.Root>
					<Sidebar.Nav data-testid="nav" />
				</Sidebar.Root>,
			);
			await user.keyboard("{Meta>}{Control>}b{/Control}{/Meta}");
			expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
		});
	});

	test.for([
		["an input", <input key="input" data-testid="editable" />],
		["a textarea", <textarea key="textarea" data-testid="editable" />],
		["a select", <select key="select" data-testid="editable" />],
		[
			"a contenteditable host",
			<div key="editable" contentEditable suppressContentEditableWarning data-testid="editable" />,
		],
	] as const)("the shortcut is ignored when the event target is %s", ([, field]) => {
		// Regression (issue #1374): this is a bubble-phase `window` listener that
		// calls preventDefault() unconditionally, so without a target guard it
		// reaches inside every text field and embedded editor (Monaco binds the
		// chord itself, but only while its own textarea has focus).
		//
		// Dispatched at the element rather than via user.keyboard: `event.target`
		// is exactly what the guard inspects, and happy-dom does not emulate
		// native contenteditable focusability.
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
				{field}
			</Sidebar.Root>,
		);

		const notPrevented = fireEvent.keyDown(screen.getByTestId("editable"), {
			key: "b",
			ctrlKey: true,
		});

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
		// Skipping the toggle is not enough — swallowing the default would still
		// break whatever the field or its embedded editor binds the chord to.
		expect(notPrevented).toBe(true);
	});

	test("with two mounted roots, only the first claimant handles the shortcut", async () => {
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
		await user.keyboard(platformChord);
		expect(screen.getByTestId("primary")).toHaveAttribute("data-state", "collapsed");
		expect(screen.getByTestId("secondary")).toHaveAttribute("data-state", "expanded");
	});

	test("shortcut ownership stays with the first root across repeated presses", async () => {
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
		await user.keyboard(platformChord);
		await user.keyboard(platformChord);
		await user.keyboard(platformChord);
		expect(screen.getByTestId("primary")).toHaveAttribute("data-state", "collapsed");
		expect(screen.getByTestId("secondary")).toHaveAttribute("data-state", "expanded");
	});

	test("shortcut ownership hands off when the owning root unmounts", async () => {
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
		await user.keyboard(platformChord);
		expect(screen.getByTestId("secondary")).toHaveAttribute("data-state", "collapsed");
	});

	test("an opted-out root never claims shortcut ownership", async () => {
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
		await user.keyboard(platformChord);
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
		expect(menu.className).toContain("min-w-(--sidebar-row-width)");
		// the trigger width survives beside the floor — min-width clamps it up
		expect(menu.className).toContain("w-(--radix-dropdown-menu-trigger-width)");
		expect(menu.className).not.toContain("min-w-32");
	});

	// A spelling pin, not a layout assertion (happy-dom lays nothing out): change
	// the regions' padding and this fails, pointing at the token that hard-codes
	// the sum. The rendered geometry is covered by the Playwright pass in the PR.
	test("the 1rem it subtracts is the padding Header, Body, and Footer all apply", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Header data-testid="header" />
					<Sidebar.Body data-testid="body" />
					<Sidebar.Footer data-testid="footer" />
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
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
		expect(onOpenMobileChange).toHaveBeenCalledWith(false);
	});

	test("uses the root mobileBreakpoint for the media query", () => {
		render(
			<Sidebar.Root mobileBreakpoint="md">
				<Sidebar.Nav />
			</Sidebar.Root>,
		);
		expect(useIsBelowBreakpointMock).toHaveBeenCalledWith("md");
	});

	test("defaults the media query to the lg breakpoint", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
			</Sidebar.Root>,
		);
		expect(useIsBelowBreakpointMock).toHaveBeenCalledWith("lg");
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
		expect(onOpenMobileChange).toHaveBeenCalledWith(true);
		expect(screen.getByRole("dialog", { name: "Main" })).toBeInTheDocument();

		useIsBelowBreakpointMock.mockReturnValue(false);
		rerender(
			<Sidebar.Root onOpenMobileChange={onOpenMobileChange}>
				<Sidebar.Nav>content</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);
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

	test("GroupLabel asChild renders a consumer heading with the label styles", () => {
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel asChild>
					<h4 data-testid="label">Traffic</h4>
				</Sidebar.GroupLabel>
			</Sidebar.Group>,
		);
		const label = screen.getByRole("heading", { level: 4, name: "Traffic" });
		expect(label).toHaveAttribute("data-slot", "sidebar-group-label");
		expect(label.className).toContain("text-muted");
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
			<Sidebar.ItemButton asChild current className="custom-class">
				<a href="/endpoints">Endpoints</a>
			</Sidebar.ItemButton>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });
		expect(link).toHaveAttribute("aria-current", "page");
		expect(link).toHaveAttribute("data-slot", "sidebar-item-button");
		expect(link).not.toHaveAttribute("type");
		expect(link.className).toContain("custom-class");
		expect(link.className).toContain("rounded-md");
	});

	test("styles the current row from either attribute, so a self-marking child needs no current", () => {
		// A composed child that resolved the match itself — react-router's `NavLink`
		// sets `aria-current="page"` — gets the row treatment without the parent
		// re-deriving the route to pass `current`. Both variants ride on every row;
		// which one applies is the attribute's job, so this pins that the
		// `aria-current` half is wired at all.
		render(
			<Sidebar.ItemButton asChild>
				<a aria-current="page" href="/endpoints">
					Endpoints
				</a>
			</Sidebar.ItemButton>,
		);
		const link = screen.getByRole("link", { name: "Endpoints" });

		expect(link).toHaveAttribute("aria-current", "page");
		expect(link).not.toHaveAttribute("data-current");
		expect(link.className).toContain("aria-[current=page]:bg-neutral-500/15");
		expect(link.className).toContain("aria-[current=page]:text-strong");
		// `current` keeps driving the same treatment through `data-current`.
		expect(link.className).toContain("data-current:bg-neutral-500/15");
	});
});

describe("Sidebar.SwitcherTrigger", () => {
	test("renders a type=button styled row by default", () => {
		render(<Sidebar.SwitcherTrigger>Acme Corp</Sidebar.SwitcherTrigger>);
		const button = screen.getByRole("button", { name: "Acme Corp" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("data-slot", "sidebar-switcher-trigger");
	});

	test("asChild renders the consumer element with the switcher styles", () => {
		render(
			<Sidebar.SwitcherTrigger asChild>
				<a href="/switch">Acme Corp</a>
			</Sidebar.SwitcherTrigger>,
		);
		const link = screen.getByRole("link", { name: "Acme Corp" });
		expect(link).toHaveAttribute("data-slot", "sidebar-switcher-trigger");
		expect(link).not.toHaveAttribute("type");
	});
});

describe("Sidebar.Tooltip", () => {
	function RailRow({ defaultOpen }: { defaultOpen: boolean }) {
		return (
			<TooltipProvider>
				<Sidebar.Root defaultOpen={defaultOpen}>
					<Sidebar.Nav data-testid="nav">
						<Sidebar.Body>
							<Sidebar.Group>
								<Sidebar.List>
									<Sidebar.Item>
										<Sidebar.Tooltip label="Endpoints">
											<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
										</Sidebar.Tooltip>
									</Sidebar.Item>
								</Sidebar.List>
							</Sidebar.Group>
						</Sidebar.Body>
					</Sidebar.Nav>
				</Sidebar.Root>
			</TooltipProvider>
		);
	}

	test("renders the row it wraps, keeping the row contract intact", () => {
		render(<RailRow defaultOpen />);
		const row = screen.getByRole("button", { name: "Endpoints" });
		// One element is both the tooltip trigger and the row, so the data-slot
		// chain accumulates in DOM order rather than one side clobbering the other.
		expect(row).toHaveAttribute("data-slot", "tooltip-trigger sidebar-item-button");
		expect(row).toHaveAttribute("type", "button");
	});

	test("shows the label on hover while collapsed to the icon rail", async () => {
		const user = userEvent.setup();
		render(<RailRow defaultOpen={false} />);

		await user.hover(screen.getByRole("button", { name: "Endpoints" }));
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Endpoints");
	});

	test("stays silent while the panel is expanded — the row reads its own label", async () => {
		const user = userEvent.setup();
		render(<RailRow defaultOpen />);

		await user.hover(screen.getByRole("button", { name: "Endpoints" }));
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	test("stays silent on mobile, where the sheet shows full labels", async () => {
		const user = userEvent.setup();
		useIsBelowBreakpointMock.mockReturnValue(true);
		render(
			<TooltipProvider>
				<Sidebar.Root defaultOpen={false}>
					<Sidebar.Tooltip label="Endpoints">
						<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
					</Sidebar.Tooltip>
				</Sidebar.Root>
			</TooltipProvider>,
		);

		await user.hover(screen.getByRole("button", { name: "Endpoints" }));
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	test("keeps the trigger mounted across a collapse so focus is not dropped", () => {
		// Regression guard on gating the Content rather than the Root: unmounting
		// Tooltip.Root would take the Trigger — and the focused row — with it.
		const { rerender } = render(<RailRow defaultOpen />);
		const row = screen.getByRole("button", { name: "Endpoints" });
		row.focus();
		expect(row).toHaveFocus();

		rerender(<RailRow defaultOpen={false} />);
		expect(screen.getByRole("button", { name: "Endpoints" })).toBe(row);
		expect(row).toHaveFocus();
	});

	test("composes with a DropdownMenu trigger between it and the row", async () => {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Sidebar.Root defaultOpen={false}>
					<Sidebar.Nav data-testid="nav">
						<Sidebar.Footer>
							{/*
							 * DropdownMenu.Root is renderless, so it has to sit OUTSIDE the
							 * tooltip: Tooltip.Trigger asChild needs a real element to clone.
							 */}
							<DropdownMenu.Root>
								<Sidebar.Tooltip label="Help">
									<DropdownMenu.Trigger asChild>
										<Sidebar.ItemButton>Help</Sidebar.ItemButton>
									</DropdownMenu.Trigger>
								</Sidebar.Tooltip>
								<DropdownMenu.Content>
									<DropdownMenu.Item>Docs</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Sidebar.Footer>
					</Sidebar.Nav>
				</Sidebar.Root>
			</TooltipProvider>,
		);

		const trigger = screen.getByRole("button", { name: "Help" });
		// The row is simultaneously a tooltip trigger and a menu trigger.
		await user.hover(trigger);
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Help");

		await user.click(trigger);
		expect(await screen.findByRole("menuitem", { name: "Docs" })).toBeInTheDocument();
	});

	test("throws when rendered outside Sidebar.Root", () => {
		// Fails loudly rather than silently never showing a tooltip.
		expect(() =>
			render(
				<TooltipProvider>
					<Sidebar.Tooltip label="Endpoints">
						<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
					</Sidebar.Tooltip>
				</TooltipProvider>,
			),
		).toThrow(/Sidebar.Tooltip must be rendered inside Sidebar.Root/);
	});

	test("requires a single element child at the type level", () => {
		// `Tooltip.Trigger asChild` clones its child, so the two shapes below fail
		// silently at runtime rather than loudly: no children renders no row at all
		// (Radix returns the empty children untouched), and a text child throws deep
		// inside Radix's slot. The required `ReactElement` keeps both off the API.
		const withoutChildren = (
			// @ts-expect-error -- children is required
			<Sidebar.Tooltip label="Endpoints" />
		);

		const withTextChild = (
			// @ts-expect-error -- children must be a single element, not text
			<Sidebar.Tooltip label="Endpoints">Endpoints</Sidebar.Tooltip>
		);

		const withElementChild = (
			<Sidebar.Tooltip label="Endpoints">
				<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
			</Sidebar.Tooltip>
		);

		expect(withoutChildren).toBeTruthy();
		expect(withTextChild).toBeTruthy();
		expect(withElementChild).toBeTruthy();
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
	test("renders a decorative inset separator", () => {
		render(<Sidebar.Separator data-testid="separator" />);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("role", "none");
		expect(separator).toHaveAttribute("data-slot", "sidebar-separator");
		// inset: aligned with the px-3 content padding, never edge to edge
		expect(separator.className).toContain("my-3");
		expect(separator.className).not.toContain("-mx-3");
	});
});

function renderedSwatchClass(accountId: string): string {
	const { unmount } = render(
		<Sidebar.AccountAvatar data-testid={accountId} accountId={accountId} accountName="Test" />,
	);
	const avatar = screen.getByTestId(accountId);
	const swatch = Array.from(avatar.classList).find((name) => name.startsWith("bg-"));
	unmount();
	expect(swatch).toBeDefined();
	return swatch ?? "";
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
