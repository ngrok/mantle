import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
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

describe("Sidebar collapse modes", () => {
	test("the desktop panel defaults to data-collapsible=offcanvas", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-collapsible", "offcanvas");
	});

	test("collapsible=icon is mirrored as data-collapsible on the panel", () => {
		render(
			<Sidebar.Root collapsible="icon" defaultOpen={false}>
				<Sidebar.Nav data-testid="nav" />
			</Sidebar.Root>,
		);
		const nav = screen.getByTestId("nav");
		expect(nav).toHaveAttribute("data-collapsible", "icon");
		expect(nav).toHaveAttribute("data-state", "collapsed");
	});

	test("useSidebar exposes the configured collapsible mode", () => {
		function ReadCollapsible() {
			const { collapsible } = useSidebar();
			return <span data-testid="mode">{collapsible}</span>;
		}
		render(
			<Sidebar.Root collapsible="icon">
				<ReadCollapsible />
			</Sidebar.Root>,
		);
		expect(screen.getByTestId("mode")).toHaveTextContent("icon");
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

describe("Sidebar.Rail", () => {
	test("carries the disclosure wiring but stays out of the tab order", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
				<Sidebar.Rail />
			</Sidebar.Root>,
		);
		const nav = screen.getByRole("navigation", { name: "Main" });
		const rail = screen.getByRole("button", { name: "Toggle Sidebar" });
		expect(rail).toHaveAttribute("data-slot", "sidebar-rail");
		expect(rail).toHaveAttribute("aria-controls", nav.id);
		expect(rail).toHaveAttribute("aria-expanded", "true");
		expect(rail).toHaveAttribute("title", "Toggle Sidebar");
		// pointer affordance only: keyboard users toggle via Trigger or ⌘B
		expect(rail).toHaveAttribute("tabindex", "-1");
	});

	test("toggles the desktop sidebar on click", async () => {
		const user = userEvent.setup();
		render(
			<Sidebar.Root>
				<Sidebar.Nav data-testid="nav" />
				<Sidebar.Rail />
			</Sidebar.Root>,
		);
		const rail = screen.getByRole("button", { name: "Toggle Sidebar" });

		await user.click(rail);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "collapsed");
		expect(rail).toHaveAttribute("aria-expanded", "false");
		expect(rail).toHaveAttribute("data-state", "collapsed");

		await user.click(rail);
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
		expect(rail).toHaveAttribute("aria-expanded", "true");
	});

	test("respects event.defaultPrevented from the consumer onClick", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root onOpenChange={onOpenChange}>
				<Sidebar.Nav data-testid="nav" />
				<Sidebar.Rail onClick={(event) => event.preventDefault()} />
			</Sidebar.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("under a controlled root, reports through onOpenChange without flipping itself", async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root open onOpenChange={onOpenChange}>
				<Sidebar.Nav data-testid="nav" />
				<Sidebar.Rail />
			</Sidebar.Root>,
		);
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
		// controlled: the parent did not update `open`, so the panel stays expanded
		expect(screen.getByTestId("nav")).toHaveAttribute("data-state", "expanded");
	});

	test("label overrides the accessible name and tooltip", () => {
		render(
			<Sidebar.Root>
				<Sidebar.Nav />
				<Sidebar.Rail label="Basculer la barre latérale" />
			</Sidebar.Root>,
		);
		const rail = screen.getByRole("button", { name: "Basculer la barre latérale" });
		expect(rail).toHaveAttribute("title", "Basculer la barre latérale");
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
		// silence React's error boundary noise for the expected throw
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Standalone />)).toThrow("useSidebar must be used within Sidebar.Root.");
		consoleError.mockRestore();
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
});

describe("Sidebar.SwitcherButton", () => {
	test("renders a type=button styled row by default", () => {
		render(<Sidebar.SwitcherButton>Acme Corp</Sidebar.SwitcherButton>);
		const button = screen.getByRole("button", { name: "Acme Corp" });
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("data-slot", "sidebar-switcher-button");
	});

	test("asChild renders the consumer element with the switcher styles", () => {
		render(
			<Sidebar.SwitcherButton asChild>
				<a href="/switch">Acme Corp</a>
			</Sidebar.SwitcherButton>,
		);
		const link = screen.getByRole("link", { name: "Acme Corp" });
		expect(link).toHaveAttribute("data-slot", "sidebar-switcher-button");
		expect(link).not.toHaveAttribute("type");
		expect(link.className).toContain("rounded-md");
	});
});

describe("Sidebar.SwitchAccountsRadioGroup", () => {
	const accounts = [
		{ id: "acc_acme", name: "Acme Corp" },
		{ id: "acc_atlas", name: "Atlas Industries" },
	];

	test("renders one checked menuitemradio per account inside an open menu", () => {
		render(
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger>Switch</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<Sidebar.SwitchAccountsRadioGroup
						accounts={accounts}
						value="acc_atlas"
						onValueChange={vi.fn<(value: string) => void>()}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		const acme = screen.getByRole("menuitemradio", { name: "Acme Corp" });
		const atlas = screen.getByRole("menuitemradio", { name: "Atlas Industries" });
		expect(acme).toHaveAttribute("aria-checked", "false");
		expect(atlas).toHaveAttribute("aria-checked", "true");
	});

	test("selecting an account reports its id through onValueChange", async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn<(value: string) => void>();
		render(
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger>Switch</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<Sidebar.SwitchAccountsRadioGroup
						accounts={accounts}
						value="acc_acme"
						onValueChange={onValueChange}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		await user.click(screen.getByRole("menuitemradio", { name: "Atlas Industries" }));
		expect(onValueChange).toHaveBeenCalledExactlyOnceWith("acc_atlas");
	});

	test("empty account names fall back to the id", () => {
		render(
			<DropdownMenu.Root open>
				<DropdownMenu.Trigger>Switch</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<Sidebar.SwitchAccountsRadioGroup
						accounts={[{ id: "acc_unnamed", name: "  " }]}
						value="acc_unnamed"
						onValueChange={vi.fn<(value: string) => void>()}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Root>,
		);
		expect(screen.getByRole("menuitemradio", { name: "acc_unnamed" })).toBeInTheDocument();
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
 * Hex values of the Tailwind classes used by the account avatar palette.
 * Snapshot of the Tailwind v4 default palette — if the palette in
 * `accountAvatarColors` changes, update this map so the contrast guarantee
 * below keeps being enforced against the real rendered colors.
 */
const avatarSwatchHex: Record<string, string> = {
	"bg-emerald-700": "#047857",
	"bg-gray-600": "#4b5563",
	"bg-red-600": "#dc2626",
	"bg-violet-600": "#7c3aed",
	"bg-cyan-700": "#0e7490",
	"bg-rose-600": "#e11d48",
	"bg-purple-600": "#9333ea",
	"bg-fuchsia-600": "#c026d3",
	"bg-green-700": "#15803d",
	"bg-orange-700": "#c2410c",
	"bg-indigo-600": "#4f46e5",
	"bg-teal-700": "#0f766e",
	"bg-yellow-700": "#a16207",
	"bg-sky-700": "#0369a1",
	"bg-pink-600": "#db2777",
	"bg-blue-600": "#2563eb",
	"bg-amber-700": "#b45309",
	"bg-neutral-600": "#525252",
};

function relativeLuminance(hex: string): number {
	const channels = [1, 3, 5].map((start) => {
		const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	const [red, green, blue] = channels;
	return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrastAgainstWhite(hex: string): number {
	return 1.05 / (relativeLuminance(hex) + 0.05);
}

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

	test("falls back to ? for empty names", () => {
		render(<Sidebar.AccountAvatar accountId="acc_1" accountName="" />);
		expect(screen.getByText("?")).toBeInTheDocument();
	});

	test("the same accountId always renders the same swatch", () => {
		const first = renderedSwatchClass("acc_stable");
		const second = renderedSwatchClass("acc_stable");
		expect(first).toBe(second);
	});

	test("every reachable swatch keeps at least 4.5:1 contrast under the white initials", () => {
		const seen = new Set<string>();
		for (let index = 0; index < 500; index += 1) {
			seen.add(renderedSwatchClass(`acc_${index}`));
		}
		// 500 sequential ids cover the whole 17-entry palette; if this ever
		// flakes below 17 the loop bound needs raising, not the assertion.
		expect(seen.size).toBe(17);
		for (const swatch of seen) {
			const hex = avatarSwatchHex[swatch];
			expect(hex, `missing hex snapshot for ${swatch}`).toBeDefined();
			expect(
				contrastAgainstWhite(hex ?? "#ffffff"),
				`${swatch} fails WCAG 4.5:1 against white initials`,
			).toBeGreaterThanOrEqual(4.5);
		}
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
