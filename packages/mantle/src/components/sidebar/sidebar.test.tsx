import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { fireEvent, render as renderComponent, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import mantleCss from "../../mantle.css?raw";
import type * as UseBreakpointModule from "../../hooks/use-breakpoint.js";
import { Avatar } from "../avatar/index.js";
import { Command } from "../command/command.js";
import { DropdownMenu } from "../dropdown-menu/index.js";
import { TooltipProvider } from "../tooltip/index.js";
import { Sidebar, useSidebar } from "./sidebar.js";

/**
 * `Sidebar.Trigger` renders a real tooltip, so every subject needs a
 * `TooltipProvider` — the same ancestor `Sidebar.Tooltip` requires, and the one
 * an app mounts at its root. Wrapping here keeps it out of every call site; a
 * nested provider in the tests that mount their own is harmless.
 */
const render = (ui: ReactElement) => renderComponent(ui, { wrapper: TooltipProvider });

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

	test("Trigger's tooltip shows its label and shortcut to pointer users", async () => {
		// Not gated on the rail state the way `Sidebar.Tooltip` is: the trigger is
		// icon-only at every breakpoint, so a pointer user has nothing else to read.
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
				<Sidebar.Trigger shortcut={<kbd>B</kbd>} />
			</Sidebar.Root>,
		);

		await user.hover(screen.getByRole("button", { name: "Toggle Sidebar" }));

		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("Toggle Sidebar");
		expect(tooltip).toHaveTextContent("B");
	});

	test("Trigger's tooltip drops the shortcut when the root does not own it", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root keyboardShortcut={false}>
				<Sidebar.Nav />
				<Sidebar.Trigger shortcut={<kbd>B</kbd>} />
			</Sidebar.Root>,
		);

		await user.hover(screen.getByRole("button", { name: "Toggle Sidebar" }));

		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("Toggle Sidebar");
		expect(tooltip).not.toHaveTextContent("B");
	});

	describe("Trigger aria-keyshortcuts", () => {
		test("advertises Control+B in the server render", () => {
			// The server cannot know the platform, so it renders the non-Apple answer
			// and corrects itself in an effect; post-mount state cannot observe the
			// render path.
			const html = renderToString(
				<TooltipProvider>
					<Sidebar.Root>
						<Sidebar.Nav />
						<Sidebar.Trigger />
					</Sidebar.Root>
				</TooltipProvider>,
			);
			expect(html).toContain('aria-keyshortcuts="Control+B"');
		});

		test("advertises Meta+B on an Apple platform", async () => {
			// `restoreMocks` in vitest.config.ts tears the spy down between tests.
			vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
			render(
				<Sidebar.Root>
					<Sidebar.Nav />
					<Sidebar.Trigger />
				</Sidebar.Root>,
			);
			await waitFor(() => {
				expect(screen.getByRole("button", { name: "Toggle Sidebar" })).toHaveAttribute(
					"aria-keyshortcuts",
					"Meta+B",
				);
			});
		});

		test("is absent when the root does not own the shortcut", () => {
			// Announcing a chord nothing binds is worse than announcing none.
			render(
				<Sidebar.Root keyboardShortcut={false}>
					<Sidebar.Nav />
					<Sidebar.Trigger />
				</Sidebar.Root>,
			);
			expect(screen.getByRole("button", { name: "Toggle Sidebar" })).not.toHaveAttribute(
				"aria-keyshortcuts",
			);
		});
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
		// `restoreMocks` in vitest.config.ts undoes it between tests.
		beforeEach(() => {
			vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
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

describe("Sidebar.Nav first paint", () => {
	// The first paint is part of the API: the server cannot know the viewport, so
	// `isMobile` is desktop-first and the panel hides itself in CSS below the
	// root's `mobileBreakpoint` instead. These render the actual pre-hydration
	// markup — the client tests above always observe the post-effect state.
	test.for(["sm", "md", "lg"] as const)(
		"hides the desktop panel below the %s breakpoint with static classes",
		(mobileBreakpoint) => {
			const html = renderToString(
				<Sidebar.Root mobileBreakpoint={mobileBreakpoint}>
					<Sidebar.Nav />
				</Sidebar.Root>,
			);
			// Static strings, one per breakpoint: Tailwind cannot see an interpolated
			// class name, so the mapping is a complete Record rather than a template.
			expect(html).toContain(`hidden ${mobileBreakpoint}:block`);
		},
	);

	test("drops the visibility gate once hydrated, so no sliver of widths is unreachable", () => {
		// After hydration `isMobile` is authoritative. Keeping the CSS gate would
		// leave a sliver (Tailwind's min-width variant vs the hook's max-width query
		// differ by 0.01rem) where the desktop panel renders, CSS hides it, and no
		// mobile sheet exists — navigation unreachable.
		render(
			<Sidebar.Root mobileBreakpoint="lg">
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		const nav = screen.getByTestId("nav");
		expect(nav).not.toHaveClass("hidden");
		expect(nav).not.toHaveClass("lg:block");
	});

	test("gates the collapse transition on hydration so an SSR state correction snaps", () => {
		const html = renderToString(
			<Sidebar.Root defaultOpen={false}>
				<Sidebar.Nav />
			</Sidebar.Root>,
		);
		// The server already paints the persisted state — there is no first-frame
		// correction to hide — and it must not animate into it on load.
		expect(html).toContain('data-state="collapsed"');
		expect(html).not.toContain("transition-[width]");
		expect(html).not.toContain("data-hydrated");

		render(
			<Sidebar.Root defaultOpen={false}>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		const nav = screen.getByTestId("nav");
		expect(nav).toHaveAttribute("data-hydrated", "");
		expect(nav).toHaveClass("transition-[width]");
	});

	test("keeps the group label's fade gated on the nav's data-hydrated", () => {
		const html = renderToString(
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Body>
						<Sidebar.Group>
							<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
						</Sidebar.Group>
					</Sidebar.Body>
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
		// The label's own transition is gated in CSS rather than in JS, so it ships
		// in the server markup but only fires once the nav stamps data-hydrated.
		expect(html).toContain("group-data-hydrated/sidebar-nav:transition-opacity");
		expect(html).not.toContain("data-hydrated=");
	});
});

describe("Sidebar reduced motion", () => {
	test("the animating panel opts out of the width transition", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		expect(screen.getByTestId("nav")).toHaveClass(
			"transition-[width]",
			"motion-reduce:transition-none",
		);
	});

	test("the group label's fade opts out under the same hydration gate", () => {
		// The gated transition rule outranks a bare motion-reduce override (0,2,0 vs
		// 0,1,0), so an ungated opt-out would lose and the label would still fade.
		render(
			<Sidebar.Group>
				<Sidebar.GroupLabel data-testid="label">Traffic</Sidebar.GroupLabel>
			</Sidebar.Group>,
		);
		expect(screen.getByTestId("label")).toHaveClass(
			"group-data-hydrated/sidebar-nav:transition-opacity",
			"group-data-hydrated/sidebar-nav:motion-reduce:transition-none",
		);
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

describe("--sidebar-header-height", () => {
	// The band is a grid track, and a track emits no data attribute — the class is
	// the only thing that observes it here, and happy-dom lays out nothing, so
	// header-band.browser.test.tsx measures what the track actually does. These two
	// assertions cover what that file cannot: the spelling AppLayout.Header's calc()
	// reads (see app-layout.test.tsx), and the absence of the fixed height that
	// squeezed a second row before issue #1399.
	test("the header sizes its first row from the token and caps nothing", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Header data-testid="header" />
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
		const header = screen.getByTestId("header");
		// toHaveClass matches whole tokens, so a permuted track (grid-rows-2) or a
		// dropped items-center fails here rather than silently unaligning the toolbar.
		expect(header).toHaveClass(
			"grid",
			"grid-rows-(--sidebar-header-height,4.5rem)",
			"items-center",
		);
		// A `h-*` of any kind would clamp the header again, which is what forced
		// consumers to raise the token — and the toolbar with it — for two rows.
		expect([...header.classList].filter((name) => name.startsWith("h-"))).toEqual([]);
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

describe("Sidebar.SearchTrigger", () => {
	test("renders a type=button styled row by default", () => {
		render(<Sidebar.SearchTrigger>Search…</Sidebar.SearchTrigger>);
		const button = screen.getByRole("button", { name: "Search…" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("data-slot", "sidebar-search-trigger");
	});

	test("className, ref, and data-* reach the row", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<Sidebar.SearchTrigger className="custom-class" data-flavor="primary" ref={ref}>
				Search…
			</Sidebar.SearchTrigger>,
		);
		const button = screen.getByRole("button", { name: "Search…" });
		expect(button.className).toContain("custom-class");
		expect(button).toHaveAttribute("data-flavor", "primary");
		expect(ref.current).toBe(button);
	});

	test("asChild renders the consumer element with the search row styles", () => {
		// `shortcut` is unavailable here by construction — a cloned child has no
		// room for a sibling hint — so the whole row content is the consumer's.
		render(
			<Sidebar.SearchTrigger asChild className="custom-class">
				<a href="/search">Search…</a>
			</Sidebar.SearchTrigger>,
		);
		const link = screen.getByRole("link", { name: "Search…" });
		expect(link).toHaveAttribute("data-slot", "sidebar-search-trigger");
		expect(link.className).toContain("custom-class");
		expect(link).not.toHaveAttribute("type");
	});

	test("an incoming data-slot chain is joined, not clobbered", () => {
		// This is how the row reads once `Command.SearchTrigger` wraps it: the
		// palette's slot, then the row's.
		render(
			<Sidebar.SearchTrigger data-slot="command-search-trigger">Search…</Sidebar.SearchTrigger>,
		);
		expect(screen.getByRole("button", { name: "Search…" })).toHaveAttribute(
			"data-slot",
			"command-search-trigger sidebar-search-trigger",
		);
	});

	test("the shortcut hint is rendered aria-hidden, outside the accessible name", async () => {
		// The chord is announced by the `aria-keyshortcuts` that
		// `Command.SearchTrigger` adds, so the visible chips must not repeat it.
		render(
			<Sidebar.SearchTrigger shortcut={<kbd>K</kbd>}>
				<MagnifyingGlassIcon />
				<span>Search</span>
			</Sidebar.SearchTrigger>,
		);
		const button = screen.getByRole("button", { name: "Search" });
		const hint = button.querySelector("[aria-hidden='true']");
		expect(hint).not.toBeNull();
		expect(hint).toHaveTextContent("K");
	});

	test("renders no hint element when no shortcut is passed", () => {
		render(
			<Sidebar.SearchTrigger>
				<MagnifyingGlassIcon />
				<span>Search</span>
			</Sidebar.SearchTrigger>,
		);
		expect(
			screen.getByRole("button", { name: "Search" }).querySelector("[aria-hidden='true']"),
		).toBeNull();
	});

	test("a Sidebar.Tooltip around it opens in the rail, shortcut and all", async () => {
		// Regression: `Command.SearchTrigger` typed its props as `{ children }` only,
		// so wrapping it in `Sidebar.Tooltip` dropped every prop Radix's
		// `Tooltip.Trigger` passes down — the row rendered fine and the tooltip
		// could never open. This is the composition the docs recommend, so it is
		// asserted end to end rather than per-part.
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Sidebar.Root defaultOpen={false}>
					<Sidebar.Nav>
						<Command.DialogRoot keyboardShortcut={false}>
							<Sidebar.Tooltip label="Search" shortcut={<kbd>K</kbd>}>
								<Command.SearchTrigger>
									<Sidebar.SearchTrigger>
										<MagnifyingGlassIcon />
										<span>Search</span>
									</Sidebar.SearchTrigger>
								</Command.SearchTrigger>
							</Sidebar.Tooltip>
						</Command.DialogRoot>
					</Sidebar.Nav>
				</Sidebar.Root>
			</TooltipProvider>,
		);

		await user.hover(screen.getByRole("button", { name: "Search" }));

		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("Search");
		expect(tooltip).toHaveTextContent("K");
	});

	test("stays highlighted while its palette is open, even inside a Sidebar.Tooltip", async () => {
		// Cross-part pin: `Tooltip.Trigger` hands its own `data-state` down, and
		// Radix's prop merge lets the child's value win — so `Command.SearchTrigger`
		// has to re-stamp the palette's state after the forwarded props. Without
		// that, this row reads `data-state="closed"` with the palette open and
		// `rowClassName`'s `data-state-open:` styling never fires.
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Sidebar.Root>
					<Sidebar.Nav>
						<Command.DialogRoot keyboardShortcut={false}>
							<Sidebar.Tooltip label="Search">
								<Command.SearchTrigger>
									<Sidebar.SearchTrigger data-testid="row">
										<MagnifyingGlassIcon />
										<span>Search</span>
									</Sidebar.SearchTrigger>
								</Command.SearchTrigger>
							</Sidebar.Tooltip>
							<Command.DialogContent title="Palette">
								<Command.Input placeholder="Type a command…" />
							</Command.DialogContent>
						</Command.DialogRoot>
					</Sidebar.Nav>
				</Sidebar.Root>
			</TooltipProvider>,
		);

		const row = screen.getByTestId("row");
		expect(row).toHaveAttribute("data-state", "closed");

		await user.click(row);

		// Queried by test id: the open modal marks everything outside it
		// `aria-hidden`, so a role query cannot reach the row any more.
		await waitFor(() => {
			expect(screen.getByTestId("row")).toHaveAttribute("data-state", "open");
		});
	});

	test("keeps its label in the accessibility tree in the collapsed rail", async () => {
		// The rail hides everything after the leading icon with `sr-only` rather
		// than removing it, so the row still has a name when it is only a chip —
		// the same contract `Sidebar.SwitcherTrigger` keeps.
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav">
					<Sidebar.Body>
						<Sidebar.SearchTrigger>
							<MagnifyingGlassIcon />
							<span>Search…</span>
						</Sidebar.SearchTrigger>
					</Sidebar.Body>
				</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		expect(screen.getByRole("button", { name: "Search…" })).toBeInTheDocument();
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
					{/* The rail state is what gates the label, so these tests toggle it
					    the way a user does rather than by re-rendering `defaultOpen` —
					    which seeds the uncontrolled state once and never collapses it. */}
					<Sidebar.Trigger />
				</Sidebar.Root>
			</TooltipProvider>
		);
	}

	/**
	 * Renders one `Sidebar.Tooltip` in the collapsed desktop rail — the only rail
	 * state that shows a label — hovers the row, and answers with the tooltip
	 * surface, so a test can assert what reached `Tooltip.Content`.
	 */
	async function hoverRailTooltip(tooltip: ReactElement): Promise<HTMLElement> {
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Sidebar.Root defaultOpen={false}>
					<Sidebar.Nav>{tooltip}</Sidebar.Nav>
				</Sidebar.Root>
			</TooltipProvider>,
		);
		await user.hover(screen.getByRole("button", { name: "Endpoints" }));
		return screen.findByRole("tooltip");
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

		const row = screen.getByRole("button", { name: "Endpoints" });
		await user.hover(row);

		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		// The mobile arm of the veto, held to the same bar as the expanded panel
		// below: silent means Radix's own state is closed, not just that the
		// surface was withheld.
		expect(row).not.toHaveAttribute("aria-describedby");
		expect(row).toHaveAttribute("data-state", "closed");
	});

	test("closes the label when the pointer leaves the row", async () => {
		const user = userEvent.setup();
		render(<RailRow defaultOpen={false} />);
		const row = screen.getByRole("button", { name: "Endpoints" });

		await user.hover(row);
		expect(await screen.findByRole("tooltip")).toBeInTheDocument();

		await user.unhover(row);
		await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
	});

	test("leaves an expanded row undescribed after the pointer sweeps across it", async () => {
		// The label may not open while the panel is expanded, and "not open" has to
		// mean Radix's own open state, not just a withheld surface: an open state
		// with no mounted surface points aria-describedby at an id that is not in
		// the document.
		const user = userEvent.setup();
		render(<RailRow defaultOpen />);
		const row = screen.getByRole("button", { name: "Endpoints" });

		await user.hover(row);

		expect(row).not.toHaveAttribute("aria-describedby");
		expect(row).toHaveAttribute("data-state", "closed");
	});

	test("stays closed when the rail collapses after the pointer swept an expanded row", async () => {
		// Regression: the pointer crossing an expanded row on its way to the
		// collapse trigger used to latch the label open — the panel withheld the
		// surface, so nothing was mounted to close it again — and collapsing then
		// popped a tooltip nobody was hovering.
		const user = userEvent.setup();
		render(<RailRow defaultOpen />);
		const row = screen.getByRole("button", { name: "Endpoints" });

		await user.hover(row);
		await user.unhover(row);
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	test("stays closed when the rail collapses while the row holds focus", async () => {
		// Focus opens a tooltip per the ARIA pattern, so a row focused while the
		// panel was expanded must not have that pending state cashed in the moment
		// the rail collapses under it.
		const user = userEvent.setup();
		render(<RailRow defaultOpen />);
		const row = screen.getByRole("button", { name: "Endpoints" });
		row.focus();

		await user.keyboard(platformChord);

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		expect(row).toHaveFocus();
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	test("stays closed when a label shown in the rail survives an expand and a re-collapse", async () => {
		// The pointer never leaves the row here: it is the rail toggling out from
		// under it, twice. Neither flip may leave an open state behind to replay.
		const user = userEvent.setup();
		render(<RailRow defaultOpen={false} />);

		await user.hover(screen.getByRole("button", { name: "Endpoints" }));
		expect(await screen.findByRole("tooltip")).toBeInTheDocument();

		await user.keyboard(platformChord);
		await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());

		await user.keyboard(platformChord);

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	test("stays closed when the rail collapses after a menu on the row hands focus back", async () => {
		// The overlay path into the same bug. Closing a menu restores focus to its
		// trigger, which here is also the tooltip trigger, so Radix asks for a label
		// the expanded panel has no use for — a request that must not outlive the
		// collapse either. The hover first is what makes it a *repeat* request, the
		// shape a mirror of Radix's state can silently keep queued.
		const user = userEvent.setup();
		render(
			<TooltipProvider>
				<Sidebar.Root defaultOpen>
					<Sidebar.Nav data-testid="nav">
						<Sidebar.Footer>
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
					<Sidebar.Trigger />
				</Sidebar.Root>
			</TooltipProvider>,
		);
		const row = screen.getByRole("button", { name: "Help" });

		await user.hover(row);
		await user.click(row);
		await user.click(await screen.findByRole("menuitem", { name: "Docs" }));
		await waitFor(() =>
			expect(screen.queryByRole("menuitem", { name: "Docs" })).not.toBeInTheDocument(),
		);
		await user.keyboard(platformChord);

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});

	test("forwards className, data-*, and the ref to the tooltip surface", async () => {
		// Every prop but `children` and `label` is Tooltip.Content's, so the whole
		// content surface stays reachable without a prop bag.
		const ref = createRef<HTMLDivElement>();
		const tooltip = await hoverRailTooltip(
			<Sidebar.Tooltip
				className="custom-class"
				data-flavor="primary"
				data-slot="outer"
				label="Endpoints"
				ref={ref}
			>
				<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
			</Sidebar.Tooltip>,
		);
		expect(tooltip).toHaveClass("bg-tooltip", "custom-class");
		expect(tooltip).toHaveAttribute("data-flavor", "primary");
		// ancestors first, this row's slot name last
		expect(tooltip).toHaveAttribute("data-slot", "outer sidebar-tooltip");
		expect(ref.current).toBe(tooltip);
	});

	// avoidCollisions is off in both side tests so the placed side is exactly the
	// requested one: happy-dom lays nothing out, so Radix's flip middleware would
	// otherwise pick a side from zero-sized rects.
	test("side defaults to right, pointing the tooltip away from the rail", async () => {
		const tooltip = await hoverRailTooltip(
			<Sidebar.Tooltip avoidCollisions={false} label="Endpoints">
				<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
			</Sidebar.Tooltip>,
		);
		expect(tooltip).toHaveAttribute("data-side", "right");
	});

	test("side can be overridden", async () => {
		const tooltip = await hoverRailTooltip(
			<Sidebar.Tooltip avoidCollisions={false} label="Endpoints" side="top">
				<Sidebar.ItemButton>Endpoints</Sidebar.ItemButton>
			</Sidebar.Tooltip>,
		);
		expect(tooltip).toHaveAttribute("data-side", "top");
	});

	test("keeps the trigger mounted across a collapse so focus is not dropped", async () => {
		// Regression guard on keeping Tooltip.Root mounted across the rail states:
		// unmounting it would take the Trigger — and the focused row — with it. The
		// rail collapses by keyboard so focus stays on the row under test.
		const user = userEvent.setup();
		render(<RailRow defaultOpen />);
		const row = screen.getByRole("button", { name: "Endpoints" });
		row.focus();
		expect(row).toHaveFocus();

		await user.keyboard(platformChord);

		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
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
	// DropdownMenu.RadioGroup/RadioItem with an Avatar (see the docs recipe).
	// This guards the composition the docs demonstrate.
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
								<Avatar.Root appearance="square" colorSeed={account.id}>
									<Avatar.Fallback name={account.name} />
								</Avatar.Root>
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

/**
 * The props every part is probed with: a `className` that must land beside the
 * part's own classes, an arbitrary `data-*`, an incoming `data-slot` chain the
 * part must join rather than replace, a `data-testid` to find the element by,
 * and a `ref` that must receive the element that actually rendered. One shape,
 * so the default-element and `asChild` tables assert the same contract.
 */
type PartProbeProps = {
	className: string;
	"data-flavor": string;
	"data-slot": string;
	"data-testid": string;
	ref: (element: HTMLElement | null) => void;
};

/**
 * One part under probe: what it renders, what it styles itself with, and the
 * ancestors it needs to render at all.
 */
type PartCase = {
	/** The part's name, for the test title. */
	name: string;
	/** A class the part applies itself, which must survive beside the consumer's. */
	ownClass: string;
	/** The part's own `data-slot` name, joined after the incoming chain. */
	slot: string;
	/** The tag the probe must land on, which is what proves *which* element rendered. */
	tagName: string;
	/** Renders the part, probe props applied, inside whatever ancestors it requires. */
	renderPart: (probe: PartProbeProps) => ReactElement;
};

/**
 * Renders one probed part and asserts the whole forwarding contract: the element
 * that rendered, the part's classes beside the consumer's, an arbitrary `data-*`,
 * the joined `data-slot` chain, and the `ref`.
 */
function expectPartForwarding({ ownClass, renderPart, slot, tagName }: PartCase): void {
	const refTarget: { current: HTMLElement | null } = { current: null };
	render(
		renderPart({
			className: "custom-class",
			"data-flavor": "primary",
			"data-slot": "outer",
			"data-testid": "part",
			ref: (element) => {
				refTarget.current = element;
			},
		}),
	);

	const element = screen.getByTestId("part");
	expect(element.tagName).toBe(tagName);
	expect(element).toHaveClass(ownClass, "custom-class");
	expect(element).toHaveAttribute("data-flavor", "primary");
	// ancestors first, the part's own slot name last — a join, never a replacement
	expect(element).toHaveAttribute("data-slot", `outer ${slot}`);
	expect(refTarget.current).toBe(element);
}

/** Every part that renders DOM, on its default element. */
const defaultElementCases: Array<PartCase> = [
	{
		name: "Nav",
		ownClass: "group/sidebar-nav",
		slot: "sidebar-nav",
		tagName: "DIV",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav {...probe} />
			</Sidebar.Root>
		),
	},
	{
		name: "Trigger",
		ownClass: "icon-button",
		slot: "sidebar-trigger",
		tagName: "BUTTON",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Trigger {...probe} />
			</Sidebar.Root>
		),
	},
	{
		name: "Header",
		ownClass: "px-3",
		slot: "sidebar-header",
		tagName: "DIV",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Header {...probe}>header</Sidebar.Header>
				</Sidebar.Nav>
			</Sidebar.Root>
		),
	},
	{
		name: "Body",
		ownClass: "scroll-fade-y",
		slot: "sidebar-body",
		tagName: "DIV",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Body {...probe}>body</Sidebar.Body>
				</Sidebar.Nav>
			</Sidebar.Root>
		),
	},
	{
		name: "Footer",
		ownClass: "pt-3",
		slot: "sidebar-footer",
		tagName: "DIV",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Footer {...probe}>footer</Sidebar.Footer>
				</Sidebar.Nav>
			</Sidebar.Root>
		),
	},
	{
		name: "Group",
		ownClass: "pt-0.5",
		slot: "sidebar-group",
		tagName: "DIV",
		renderPart: (probe) => <Sidebar.Group {...probe} />,
	},
	{
		name: "GroupLabel",
		ownClass: "text-muted",
		slot: "sidebar-group-label",
		tagName: "DIV",
		renderPart: (probe) => (
			<Sidebar.Group>
				<Sidebar.GroupLabel {...probe}>Traffic</Sidebar.GroupLabel>
			</Sidebar.Group>
		),
	},
	{
		name: "List",
		ownClass: "space-y-px",
		slot: "sidebar-list",
		tagName: "UL",
		renderPart: (probe) => (
			<Sidebar.Group>
				<Sidebar.List {...probe} />
			</Sidebar.Group>
		),
	},
	{
		name: "Item",
		ownClass: "list-none",
		slot: "sidebar-item",
		tagName: "LI",
		renderPart: (probe) => (
			<Sidebar.List>
				<Sidebar.Item {...probe} />
			</Sidebar.List>
		),
	},
	{
		name: "ItemButton",
		ownClass: "rounded-md",
		slot: "sidebar-item-button",
		tagName: "BUTTON",
		renderPart: (probe) => (
			<Sidebar.List>
				<Sidebar.Item>
					<Sidebar.ItemButton {...probe}>Endpoints</Sidebar.ItemButton>
				</Sidebar.Item>
			</Sidebar.List>
		),
	},
	{
		name: "SearchTrigger",
		ownClass: "rounded-md",
		slot: "sidebar-search-trigger",
		tagName: "BUTTON",
		renderPart: (probe) => <Sidebar.SearchTrigger {...probe}>Search…</Sidebar.SearchTrigger>,
	},
	{
		name: "SwitcherTrigger",
		ownClass: "font-medium",
		slot: "sidebar-switcher-trigger",
		tagName: "BUTTON",
		renderPart: (probe) => <Sidebar.SwitcherTrigger {...probe}>Acme Corp</Sidebar.SwitcherTrigger>,
	},
	{
		name: "Separator",
		ownClass: "my-3",
		slot: "sidebar-separator",
		tagName: "DIV",
		renderPart: (probe) => <Sidebar.Separator {...probe} />,
	},
];

/**
 * Every part that takes `asChild`, each swapping in a tag its default is not, so
 * the assertion proves the child rendered rather than the part's own element.
 * `Sidebar.Nav` and `Sidebar.Trigger` are absent on purpose — both document why
 * they take no `asChild` — and `Sidebar.Tooltip` forwards `asChild` to Radix's
 * `Tooltip.Content` rather than mantle's `Slot`.
 */
const asChildCases: Array<PartCase> = [
	{
		name: "Header",
		ownClass: "px-3",
		slot: "sidebar-header",
		tagName: "SECTION",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Header asChild {...probe}>
						<section>header</section>
					</Sidebar.Header>
				</Sidebar.Nav>
			</Sidebar.Root>
		),
	},
	{
		name: "Body",
		ownClass: "scroll-fade-y",
		slot: "sidebar-body",
		tagName: "SECTION",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Body asChild {...probe}>
						<section>body</section>
					</Sidebar.Body>
				</Sidebar.Nav>
			</Sidebar.Root>
		),
	},
	{
		name: "Footer",
		ownClass: "pt-3",
		slot: "sidebar-footer",
		tagName: "FOOTER",
		renderPart: (probe) => (
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Footer asChild {...probe}>
						<footer>footer</footer>
					</Sidebar.Footer>
				</Sidebar.Nav>
			</Sidebar.Root>
		),
	},
	{
		name: "Group",
		ownClass: "pt-0.5",
		slot: "sidebar-group",
		tagName: "SECTION",
		renderPart: (probe) => (
			<Sidebar.Group asChild {...probe}>
				<section>group</section>
			</Sidebar.Group>
		),
	},
	{
		name: "GroupLabel",
		ownClass: "text-muted",
		slot: "sidebar-group-label",
		tagName: "H3",
		renderPart: (probe) => (
			<Sidebar.Group>
				<Sidebar.GroupLabel asChild {...probe}>
					<h3>Traffic</h3>
				</Sidebar.GroupLabel>
			</Sidebar.Group>
		),
	},
	{
		name: "List",
		ownClass: "space-y-px",
		slot: "sidebar-list",
		tagName: "OL",
		renderPart: (probe) => (
			<Sidebar.Group>
				<Sidebar.List asChild {...probe}>
					<ol />
				</Sidebar.List>
			</Sidebar.Group>
		),
	},
	{
		name: "Item",
		ownClass: "list-none",
		slot: "sidebar-item",
		tagName: "DIV",
		renderPart: (probe) => (
			<Sidebar.List>
				<Sidebar.Item asChild {...probe}>
					<div>row</div>
				</Sidebar.Item>
			</Sidebar.List>
		),
	},
	{
		name: "ItemButton",
		ownClass: "rounded-md",
		slot: "sidebar-item-button",
		tagName: "A",
		renderPart: (probe) => (
			<Sidebar.List>
				<Sidebar.Item>
					<Sidebar.ItemButton asChild {...probe}>
						<a href="/endpoints">Endpoints</a>
					</Sidebar.ItemButton>
				</Sidebar.Item>
			</Sidebar.List>
		),
	},
	{
		name: "SearchTrigger",
		ownClass: "rounded-md",
		slot: "sidebar-search-trigger",
		tagName: "A",
		renderPart: (probe) => (
			<Sidebar.SearchTrigger asChild {...probe}>
				<a href="/search">Search…</a>
			</Sidebar.SearchTrigger>
		),
	},
	{
		name: "SwitcherTrigger",
		ownClass: "font-medium",
		slot: "sidebar-switcher-trigger",
		tagName: "A",
		renderPart: (probe) => (
			<Sidebar.SwitcherTrigger asChild {...probe}>
				<a href="/switch">Acme Corp</a>
			</Sidebar.SwitcherTrigger>
		),
	},
	{
		name: "Separator",
		ownClass: "my-3",
		slot: "sidebar-separator",
		tagName: "HR",
		renderPart: (probe) => (
			<Sidebar.Separator asChild {...probe}>
				<hr />
			</Sidebar.Separator>
		),
	},
];

describe("Sidebar part forwarding", () => {
	test.for(defaultElementCases)(
		"$name forwards className, data-*, and ref, and joins the incoming data-slot chain",
		(partCase) => {
			expectPartForwarding(partCase);
		},
	);

	test.for(asChildCases)(
		"$name asChild renders the child and merges classes, data-*, and the ref onto it",
		(partCase) => {
			expectPartForwarding(partCase);
		},
	);
});
