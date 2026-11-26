import { act, render, screen, waitFor } from "@testing-library/react";
import { Profiler, type ReactNode, useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterAll, afterEach, beforeAll, describe, expect, onTestFinished, test, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";
import { useLocalStorage } from "../../hooks/use-local-storage.js";
import mantleCss from "../../mantle.css?raw";
import { isApplePlatform } from "../../utils/platform.js";
import * as Command from "../command/command-parts.js";
import * as DropdownMenu from "../dropdown-menu/dropdown-menu-parts.js";
import * as AppLayout from "../app-layout/app-layout-parts.js";
import { useSidePanel } from "../app-layout/app-layout.js";
import { TooltipProvider } from "../tooltip/index.js";
import * as Sidebar from "./sidebar-parts.js";
import { useSidebar } from "./sidebar.js";

/**
 * Real-browser cascade for `Sidebar.Nav`'s hydration gates and for a row's
 * open highlight. The visibility gate is a `max-*:not-data-hydrated:` variant,
 * so tailwind-merge keeps it beside a consumer display utility and its
 * `:not([data-hydrated])` selector outranks the bare utility's class. The
 * transition gates are negated the same way, and only a running
 * `CSSTransition` can observe whether they held or released. The open
 * highlight is a class keyed on `aria-expanded` through a tooltip trigger, so
 * only the computed style can observe it. happy-dom resolves no stylesheet and
 * runs no transition, and `prefers-reduced-motion` is a Playwright page
 * emulation.
 *
 * The stylesheet below is Tailwind 4.3.3's own output for the utilities in
 * play, keyed by the same escaped class selectors, with the theme variables
 * resolved. Regenerate it by compiling those class names through
 * `tailwindcss`'s `compile()`.
 */
const STYLE = `
@layer theme {
	:root {
		--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
		--text-color-strong: rgb(17, 24, 39);
	}
}
@layer base {
	/* Tailwind's preflight. Without it, WebKit paints a row in its own button text color. */
	button { color: inherit; }
}
@layer utilities {
	.flex { display: flex; }
	.aria-expanded\\:text-strong[aria-expanded="true"] { color: var(--text-color-strong); }
	.w-\\(--sidebar-width\\,13rem\\) { width: var(--sidebar-width, 13rem); }
	.transition-none { transition-property: none; }
	.w-full { width: 100%; }
	.my-3 { margin-block: 0.75rem; }
	.h-px { height: 1px; }
	.px-2 { padding-inline: 0.5rem; }
	.px-3 { padding-inline: 0.75rem; }
	.py-1 { padding-block: 0.25rem; }
	.pr-1\\.5 { padding-right: 0.375rem; }
	.pl-1 { padding-left: 0.25rem; }
	.transition-\\[width\\,padding\\,margin\\] {
		transition-property: width,padding,margin;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.transition-\\[width\\] {
		transition-property: width;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.transition-\\[width\\,padding\\] {
		transition-property: width,padding;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.transition-\\[padding\\] {
		transition-property: padding;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.transition-opacity {
		transition-property: opacity;
		transition-timing-function: var(--tw-ease, cubic-bezier(0.4, 0, 0.2, 1));
		transition-duration: var(--tw-duration, 150ms);
	}
	.duration-200 { --tw-duration: 200ms; transition-duration: 200ms; }
	.ease-out-strong { --tw-ease: var(--ease-out-strong); transition-timing-function: var(--ease-out-strong); }
	.not-data-hydrated\\:transition-none:not([data-hydrated]) { transition-property: none; }
	.group-not-data-hydrated\\/sidebar-nav\\:transition-none:is(:where(.group\\/sidebar-nav):not([data-hydrated]) *) {
		transition-property: none;
	}
	.group-not-data-expanded\\/sidebar-nav\\:opacity-0:is(:where(.group\\/sidebar-nav):not([data-expanded]) *) {
		opacity: 0%;
	}
	.not-data-expanded\\:w-\\(--sidebar-width-icon\\,3\\.25rem\\):not([data-expanded]) {
		width: var(--sidebar-width-icon, 3.25rem);
	}
	.group-not-data-expanded\\/sidebar-nav\\:ml-1:is(:where(.group\\/sidebar-nav):not([data-expanded]) *) {
		margin-left: 0.25rem;
	}
	.group-not-data-expanded\\/sidebar-nav\\:w-7:is(:where(.group\\/sidebar-nav):not([data-expanded]) *) {
		width: 1.75rem;
	}
	.group-not-data-expanded\\/sidebar-nav\\:w-9:is(:where(.group\\/sidebar-nav):not([data-expanded]) *) {
		width: 2.25rem;
	}
	.group-not-data-expanded\\/sidebar-nav\\:p-1:is(:where(.group\\/sidebar-nav):not([data-expanded]) *) {
		padding: 0.25rem;
	}
	.group-data-expanded\\/sidebar-nav\\:pr-1:is(:where(.group\\/sidebar-nav)[data-expanded] *) {
		padding-right: 0.25rem;
	}
	@media (width < 64rem) {
		.max-lg\\:not-data-hydrated\\:hidden:not([data-hydrated]) { display: none; }
	}
	@media (prefers-reduced-motion: reduce) {
		.motion-reduce\\:transition-none { transition-property: none; }
	}
}
`;

const STORAGE_KEY = "sidebar-state";

let styleElement: HTMLStyleElement;
let container: HTMLDivElement | null = null;

beforeAll(() => {
	styleElement = document.createElement("style");
	styleElement.textContent = STYLE;
	document.head.appendChild(styleElement);
});

afterAll(() => {
	styleElement.remove();
});

afterEach(async () => {
	container?.remove();
	container = null;
	localStorage.removeItem(STORAGE_KEY);
	await commands.emulateMedia({ reducedMotion: "no-preference" });
});

/** Mounts server markup as the browser paints it before hydration and returns the panel. */
const mountServerHtml = (html: string): HTMLElement => {
	container = document.createElement("div");
	container.innerHTML = html;
	document.body.appendChild(container);
	const nav = container.querySelector('[data-slot="sidebar-nav"]');
	if (!(nav instanceof HTMLElement)) {
		throw new Error('No element carries data-slot="sidebar-nav".');
	}
	return nav;
};

test("hides the desktop panel below the breakpoint before hydration, under a consumer display utility too", async () => {
	await page.viewport(414, 896);
	const nav = mountServerHtml(
		renderToString(
			<Sidebar.Root mobileBreakpoint="lg">
				<Sidebar.Nav className="flex" />
			</Sidebar.Root>,
		),
	);
	expect(getComputedStyle(nav).display).toBe("none");

	// Hydration stamps the attribute, which releases the gate to the consumer's utility.
	nav.setAttribute("data-hydrated", "");
	expect(getComputedStyle(nav).display).toBe("flex");
});

test("keeps a consumer display utility above the breakpoint before hydration", async () => {
	// Why: a gate that forced `block` here would flip the panel's display on
	// hydration and relayout a flex consumer on every load.
	await page.viewport(1280, 800);
	const nav = mountServerHtml(
		renderToString(
			<Sidebar.Root mobileBreakpoint="lg">
				<Sidebar.Nav className="flex" />
			</Sidebar.Root>,
		),
	);
	expect(getComputedStyle(nav).display).toBe("flex");
});

/** The docs' localStorage persistence recipe: the server paints `expanded`, the client corrects. */
function PersistedShell() {
	const [storedState, setStoredState] = useLocalStorage(STORAGE_KEY, "expanded");
	return (
		<Sidebar.Root
			open={storedState === "expanded"}
			onOpenChange={(open) => setStoredState(open ? "expanded" : "collapsed")}
		>
			<Sidebar.Nav>
				<Sidebar.Body>
					<Sidebar.Group>
						<Sidebar.GroupLabel>Traffic</Sidebar.GroupLabel>
					</Sidebar.Group>
				</Sidebar.Body>
			</Sidebar.Nav>
		</Sidebar.Root>
	);
}

test("snaps a persisted-collapsed correction into place with no transition", async () => {
	await page.viewport(1280, 800);
	// `useLocalStorage` stores JSON, so the seed is the encoded string.
	localStorage.setItem(STORAGE_KEY, JSON.stringify("collapsed"));
	const nav = mountServerHtml(renderToString(<PersistedShell />));
	expect(nav).toHaveAttribute("data-expanded");
	// Why read the width: a real page paints the server markup before hydration,
	// and only a painted width can be the start value of a transition.
	expect(getComputedStyle(nav).width).toBe("208px");

	if (container == null) {
		throw new Error("The server markup is not mounted.");
	}
	render(<PersistedShell />, { container, hydrate: true });
	// Why wait: the stamp lands one frame after the correction, and the
	// transition rules apply only once it does.
	await waitFor(() => {
		expect(nav).toHaveAttribute("data-hydrated", "");
	});
	const label = container.querySelector('[data-slot="sidebar-group-label"]');
	if (!(label instanceof HTMLElement)) {
		throw new Error('No element carries data-slot="sidebar-group-label".');
	}
	expect(nav).not.toHaveAttribute("data-expanded");
	expect(getComputedStyle(nav).width).toBe("52px");
	expect(nav.getAnimations()).toHaveLength(0);
	expect(getComputedStyle(label).opacity).toBe("0");
	expect(label.getAnimations()).toHaveLength(0);
});

type ShellOptions = {
	/** A consumer `className` for `Sidebar.Body`. */
	bodyClassName?: string;
	/** A consumer `className` for `Sidebar.GroupLabel`. */
	labelClassName?: string;
	/** A consumer `className` for `Sidebar.Nav`. */
	navClassName?: string;
	/** A consumer `className` for `Sidebar.ItemButton`. */
	rowClassName?: string;
	/** A consumer `className` for `Sidebar.Separator`. */
	separatorClassName?: string;
	/** A consumer `className` for `Sidebar.SwitcherTrigger`. */
	switcherClassName?: string;
};

/**
 * Renders the panel, a switcher, a group label, a row, a separator, and the
 * trigger, then waits for the gates to release. `Sidebar.SearchTrigger` shares
 * the row's class string, so the row stands in for it.
 */
async function renderExpandedShell({
	bodyClassName,
	labelClassName,
	navClassName,
	rowClassName,
	separatorClassName,
	switcherClassName,
}: ShellOptions = {}): Promise<{
	body: HTMLElement;
	label: HTMLElement;
	nav: HTMLElement;
	row: HTMLElement;
	separator: HTMLElement;
	switcher: HTMLElement;
}> {
	await page.viewport(1280, 800);
	render(
		<TooltipProvider>
			<Sidebar.Root>
				<Sidebar.Nav className={navClassName} data-testid="nav">
					<Sidebar.Header>
						<Sidebar.SwitcherTrigger className={switcherClassName} data-testid="switcher">
							Acme Corp
						</Sidebar.SwitcherTrigger>
					</Sidebar.Header>
					<Sidebar.Body className={bodyClassName} data-testid="body">
						<Sidebar.Group>
							<Sidebar.GroupLabel className={labelClassName} data-testid="label">
								Traffic
							</Sidebar.GroupLabel>
							<Sidebar.List>
								<Sidebar.Item>
									<Sidebar.ItemButton className={rowClassName} data-testid="row">
										Endpoints
									</Sidebar.ItemButton>
								</Sidebar.Item>
							</Sidebar.List>
						</Sidebar.Group>
						<Sidebar.Separator className={separatorClassName} data-testid="separator" />
					</Sidebar.Body>
				</Sidebar.Nav>
				<Sidebar.Trigger />
			</Sidebar.Root>
		</TooltipProvider>,
	);
	const nav = screen.getByTestId("nav");
	await waitFor(() => {
		expect(nav).toHaveAttribute("data-hydrated", "");
	});
	// Why read the width: only a painted width can be the start value of a transition.
	expect(getComputedStyle(nav).width).toBe("208px");
	return {
		body: screen.getByTestId("body"),
		label: screen.getByTestId("label"),
		nav,
		row: screen.getByTestId("row"),
		separator: screen.getByTestId("separator"),
		switcher: screen.getByTestId("switcher"),
	};
}

/**
 * Records every transition that starts under `nav` as `<data-slot>:<property>`.
 * A 200ms transition can end before a click round-trip returns, so the event
 * is the stable observable, not `getAnimations()`.
 */
function recordTransitions(nav: HTMLElement): string[] {
	const transitions: string[] = [];
	nav.addEventListener("transitionrun", (event) => {
		// The first name in a joined chain is the sidebar part's own.
		const slot =
			event.target instanceof HTMLElement ? event.target.dataset.slot?.split(" ")[0] : "";
		transitions.push(`${slot}:${event.propertyName}`);
	});
	return transitions;
}

test("animates a collapse the user triggers after hydration", async () => {
	const { nav } = await renderExpandedShell();
	const transitions = recordTransitions(nav);

	await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

	expect(nav).not.toHaveAttribute("data-expanded");
	// Why every part: each trades its expanded shape for its collapsed one on the sidebar's
	// clock, or it takes the collapsed shape on the first frame and the sidebar catches up.
	await waitFor(() => {
		expect(transitions).toEqual(
			expect.arrayContaining([
				"sidebar-nav:width",
				"sidebar-group-label:opacity",
				"sidebar-item-button:width",
				"sidebar-item-button:padding-left",
				"sidebar-item-button:margin-left",
				"sidebar-switcher-trigger:width",
				// The switcher's `pl-1` and its collapsed `p-1` agree, so only the trailing side moves.
				"sidebar-switcher-trigger:padding-right",
				"sidebar-separator:width",
				"sidebar-body:padding-right",
			]),
		);
	});
});

test("snaps a collapse the user triggers under reduced motion", async () => {
	await commands.emulateMedia({ reducedMotion: "reduce" });
	expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	const { body, label, nav, row, separator, switcher } = await renderExpandedShell();
	const transitions = recordTransitions(nav);

	await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

	expect(nav).not.toHaveAttribute("data-expanded");
	expect(getComputedStyle(nav).width).toBe("52px");
	expect(getComputedStyle(label).opacity).toBe("0");
	expect(getComputedStyle(row).width).toBe("28px");
	expect(getComputedStyle(switcher).width).toBe("36px");
	expect(getComputedStyle(separator).width).toBe("36px");
	expect(getComputedStyle(body).paddingRight).toBe("12px");
	expect(transitions).toEqual([]);
});

test("lets a consumer transition-none replace the default transition", async () => {
	// Why: the default and the consumer utility share one tailwind-merge group, so
	// only the last one in `cx` reaches the element and the cascade never decides.
	const { body, label, nav, row, separator, switcher } = await renderExpandedShell({
		bodyClassName: "transition-none",
		labelClassName: "transition-none",
		navClassName: "transition-none",
		rowClassName: "transition-none",
		separatorClassName: "transition-none",
		switcherClassName: "transition-none",
	});
	const transitions = recordTransitions(nav);

	await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));

	expect(nav).not.toHaveAttribute("data-expanded");
	expect(getComputedStyle(nav).width).toBe("52px");
	expect(getComputedStyle(label).opacity).toBe("0");
	expect(getComputedStyle(row).width).toBe("28px");
	expect(getComputedStyle(switcher).width).toBe("36px");
	expect(getComputedStyle(separator).width).toBe("36px");
	expect(getComputedStyle(body).paddingRight).toBe("12px");
	expect(transitions).toEqual([]);
});

test("a row inside Sidebar.Tooltip keeps its open highlight while its menu is open", async () => {
	// Why: the tooltip trigger sits between the row and the menu trigger in the
	// composition the docs recommend. The highlight keys on `aria-expanded`,
	// which only the menu trigger stamps, so the tooltip must not drop it.
	await page.viewport(1280, 800);
	render(
		<TooltipProvider>
			<Sidebar.Root>
				<Sidebar.Nav>
					<Sidebar.Body>
						<Sidebar.List>
							<Sidebar.Item>
								<DropdownMenu.Root>
									<Sidebar.Tooltip label="Help">
										<DropdownMenu.Trigger asChild>
											<Sidebar.ItemButton data-testid="row">Help</Sidebar.ItemButton>
										</DropdownMenu.Trigger>
									</Sidebar.Tooltip>
									<DropdownMenu.Content>
										<DropdownMenu.Item>Documentation</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Sidebar.Item>
						</Sidebar.List>
					</Sidebar.Body>
				</Sidebar.Nav>
			</Sidebar.Root>
		</TooltipProvider>,
	);
	const row = screen.getByTestId("row");
	expect(row).toHaveAttribute("aria-expanded", "false");
	expect(getComputedStyle(row).color).toBe("rgb(0, 0, 0)");

	await userEvent.click(row);

	// Queried by test id: the open menu marks everything outside it `aria-hidden`.
	await waitFor(() => {
		expect(screen.getByTestId("row")).toHaveAttribute("aria-expanded", "true");
	});
	expect(getComputedStyle(row).color).toBe("rgb(17, 24, 39)");
});

describe("Sidebar.Nav on the native <dialog>", () => {
	let sheetStyle: HTMLStyleElement;

	beforeAll(async () => {
		// Why the scroll lock from `mantle.css`: it is the one rule there that this
		// part relies on, and Tailwind compiles none of it.
		const scrollLock = mantleCss.match(/\[data-mantle-scroll-lock\] body\s*\{[^}]*\}/)?.[0];
		if (scrollLock == null) {
			throw new Error("mantle.css holds no scroll lock rule for open native dialogs.");
		}
		sheetStyle = document.createElement("style");
		sheetStyle.textContent = [
			await commands.tailwindCss("./sidebar.tsx"),
			await commands.tailwindCss("../sheet/presentation.tsx"),
			await commands.tailwindCss("../dialog/native-primitive.tsx"),
			scrollLock,
		].join("\n");
		document.head.append(sheetStyle);
	});

	afterAll(() => {
		sheetStyle.remove();
	});

	afterEach(() => {
		// Why: Escape and clicks leave an open `<dialog>` in the top layer between tests.
		for (const dialog of document.querySelectorAll("dialog")) {
			dialog.close();
		}
	});

	/** The `<dialog>` of the one rendered `Sidebar.Nav`. */
	const sheetDialog = (): HTMLDialogElement => {
		const dialog = document.querySelector('dialog[data-slot~="sidebar-positioner"]');
		if (!(dialog instanceof HTMLDialogElement)) {
			throw new Error("No Sidebar.Nav <dialog> is rendered.");
		}
		return dialog;
	};

	/** Waits until `isMobile` has corrected and the panel is the sheet. */
	const waitForSheet = () =>
		waitFor(() => {
			expect(document.querySelector('[data-slot~="sidebar-nav"]')).toHaveAttribute("data-mobile");
		});

	function MobileShell({ children, onMount }: { children?: ReactNode; onMount?: () => void }) {
		return (
			<TooltipProvider>
				<Sidebar.Root>
					<Sidebar.Nav>
						<Sidebar.Body>
							<MountProbe onMount={onMount} />
							<Sidebar.List>
								<Sidebar.Item>
									<Sidebar.ItemButton asChild>
										<a href="#endpoints">Endpoints</a>
									</Sidebar.ItemButton>
								</Sidebar.Item>
							</Sidebar.List>
							{children}
						</Sidebar.Body>
					</Sidebar.Nav>
					<Sidebar.Trigger />
				</Sidebar.Root>
			</TooltipProvider>
		);
	}

	function MountProbe({ onMount }: { onMount?: () => void }) {
		useEffect(() => onMount?.(), [onMount]);
		return null;
	}

	test("on a phone, hydration keeps the server nav, and the switch to the sheet mounts nothing again", async () => {
		await page.viewport(414, 896);
		const onMount = vi.fn<() => void>();
		const host = document.createElement("div");
		host.innerHTML = renderToString(<MobileShell onMount={onMount} />);
		document.body.append(host);
		onTestFinished(() => host.remove());
		const serverNav = host.querySelector("nav");

		const root = await act(async () => hydrateRoot(host, <MobileShell onMount={onMount} />));
		onTestFinished(() => root.unmount());
		await waitForSheet();

		expect(host.querySelector("nav")).toBe(serverNav);
		expect(onMount).toHaveBeenCalledOnce();
		// Closed, the sheet shows nothing.
		expect(serverNav?.checkVisibility()).toBe(false);
	});

	test("a tap opens the modal sheet before any React render, and Escape closes it", async () => {
		await page.viewport(414, 896);
		let commits = 0;
		let paletteCommits = 0;
		render(
			<Profiler id="shell" onRender={() => commits++}>
				<MobileShell>
					{/* Why a closed palette: a closed dialog must not render when the sheet opens. */}
					<Profiler id="palette" onRender={() => paletteCommits++}>
						<Command.DialogRoot keyboardShortcut={false}>
							<Command.DialogContent title="Palette">
								<Command.Input placeholder="Type a command…" />
							</Command.DialogContent>
						</Command.DialogRoot>
					</Profiler>
				</MobileShell>
			</Profiler>,
		);
		await waitForSheet();
		const trigger = screen.getByRole("button", { name: "Toggle Sidebar" });
		const dialog = sheetDialog();
		commits = 0;
		paletteCommits = 0;

		// Why focus first: a pointer press focuses the button, and the `<dialog>`
		// returns focus to the element that had it when it opened.
		trigger.focus();
		trigger.click();

		// The open is a DOM call in the click handler; the state render comes later.
		expect(dialog.matches(":modal")).toBe(true);
		expect(commits).toBe(0);
		// Why a microtask: a store update renders there, on the sync lane, before
		// the paint. The state render that follows is a transition, after it.
		await Promise.resolve();
		expect(paletteCommits).toBe(0);
		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));

		expect(screen.getByRole("dialog", { name: "Main" })).toBe(dialog);
		expect(dialog.contains(document.activeElement)).toBe(true);
		// The page behind is inert, and its scroll is locked.
		trigger.focus();
		expect(document.activeElement).not.toBe(trigger);
		expect(getComputedStyle(document.body).overflow).toBe("hidden");
		// No gutter: in an app shell whose root does not scroll, one would narrow the shell.
		expect(getComputedStyle(document.body).paddingInlineEnd).toBe("0px");
		// The panel slides in to the left edge at `--sidebar-width-mobile`.
		const panel = dialog.querySelector('[data-slot~="sidebar-nav"]');
		await Promise.all(panel?.getAnimations().map((animation) => animation.finished) ?? []);
		expect(panel?.getBoundingClientRect().left).toBe(0);
		expect(panel == null ? null : getComputedStyle(panel).width).toBe("288px");

		await userEvent.keyboard("{Escape}");
		// Why wait on the exit: the dialog closes when its exit animations end. A
		// `waitFor` gives up after 1 s, and WebKit in CI can skip frames that long.
		await waitFor(() => expect(dialog).not.toHaveAttribute("data-open"));
		await Promise.allSettled(
			dialog.getAnimations({ subtree: true }).map((animation) => animation.finished),
		);
		await waitFor(() => expect(dialog.open).toBe(false));
		await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
		expect(document.activeElement).toBe(trigger);
		expect(getComputedStyle(document.body).overflow).not.toBe("hidden");
	});

	test("a controlled sheet asks its owner on Escape and stays open while the owner keeps it", async () => {
		await page.viewport(414, 896);
		const onOpenMobileChange = vi.fn<(open: boolean) => void>();
		render(
			<Sidebar.Root openMobile onOpenMobileChange={onOpenMobileChange}>
				<Sidebar.Nav>
					<a href="#endpoints">Endpoints</a>
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
		await waitForSheet();
		await waitFor(() => expect(sheetDialog().matches(":modal")).toBe(true));

		await userEvent.keyboard("{Escape}");

		expect(onOpenMobileChange).toHaveBeenCalledExactlyOnceWith(false);
		expect(sheetDialog().matches(":modal")).toBe(true);
	});

	test("on desktop the <dialog> is inline: no dialog role, and a menu in the nav portals to the body", async () => {
		await page.viewport(1280, 800);
		render(
			<div style={{ display: "flex", height: 400 }}>
				<Sidebar.Root>
					<Sidebar.Nav data-testid="panel">
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>Account</DropdownMenu.Trigger>
							<DropdownMenu.Content>
								<DropdownMenu.Item>Settings</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</Sidebar.Nav>
				</Sidebar.Root>
			</div>,
		);
		const dialog = sheetDialog();
		expect(dialog).toHaveAttribute("role", "generic");
		expect(dialog).not.toHaveAttribute("aria-label");
		expect(dialog).not.toHaveAttribute("aria-labelledby");
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByRole("navigation", { name: "Main" }).checkVisibility()).toBe(true);
		expect(screen.getByTestId("panel").getBoundingClientRect().width).toBe(208);

		await userEvent.click(screen.getByRole("button", { name: "Account" }));

		const menu = await screen.findByRole("menu");
		expect(menu.closest("dialog")).toBeNull();
	});

	test("a palette that a shortcut opens from inside the closed sheet shows on the page", async () => {
		// The closed sheet keeps the nav mounted, so a palette root inside it still
		// binds its shortcut, and its dialog must not mount in the hidden sheet.
		await page.viewport(414, 896);
		render(
			<Sidebar.Root>
				<Sidebar.Nav>
					<Command.DialogRoot>
						<Command.DialogContent title="Palette">
							<Command.Input placeholder="Type a command…" />
						</Command.DialogContent>
					</Command.DialogRoot>
				</Sidebar.Nav>
			</Sidebar.Root>,
		);
		await waitForSheet();

		// The palette binds ⌘K on Apple platforms and Ctrl+K elsewhere.
		const modifier = isApplePlatform() ? "Meta" : "Control";
		await userEvent.keyboard(`{${modifier}>}k{/${modifier}}`);

		const input = await screen.findByPlaceholderText("Type a command…");
		expect(input.closest("dialog")).not.toBe(sheetDialog());
		await waitFor(() => expect(input.checkVisibility()).toBe(true));
	});

	test("a palette root in the nav that closes the sheet as it opens shows on the page", async () => {
		function Search() {
			const { setOpenMobile } = useSidebar();
			return (
				<Command.DialogRoot
					keyboardShortcut={false}
					onOpenChange={(open) => {
						if (open) {
							setOpenMobile(false);
						}
					}}
				>
					<Command.SearchTrigger>
						<Sidebar.SearchTrigger>Search</Sidebar.SearchTrigger>
					</Command.SearchTrigger>
					<Command.DialogContent title="Palette">
						<Command.Input placeholder="Type a command…" />
					</Command.DialogContent>
				</Command.DialogRoot>
			);
		}
		await page.viewport(414, 896);
		render(
			<TooltipProvider>
				<Sidebar.Root>
					<Sidebar.Nav>
						<Sidebar.Header>
							<Search />
						</Sidebar.Header>
					</Sidebar.Nav>
					<Sidebar.Trigger />
				</Sidebar.Root>
			</TooltipProvider>,
		);
		await waitForSheet();
		await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		await waitFor(() => expect(sheetDialog().matches(":modal")).toBe(true));
		// Why a record: a palette that mounts in the closing sheet moves to the
		// body a render later, so only the history shows it.
		const mountedInSheet: Node[] = [];
		const observer = new MutationObserver((records) => {
			mountedInSheet.push(...records.flatMap((record) => [...record.addedNodes]));
		});
		observer.observe(sheetDialog(), { childList: true, subtree: true });
		onTestFinished(() => observer.disconnect());
		await userEvent.click(screen.getByRole("button", { name: "Search" }));

		await waitFor(() => expect(sheetDialog().open).toBe(false));
		const input = await screen.findByPlaceholderText("Type a command…");
		expect(input.closest("dialog")).not.toBe(sheetDialog());
		expect(mountedInSheet).toEqual([]);
		await waitFor(() => expect(document.activeElement).toBe(input));
		expect(input.checkVisibility()).toBe(true);
	});

	test("a palette that a row of the open sheet opens paints above the sheet and takes input", async () => {
		// The dashboard composes it this way: the palette's content renders outside
		// `Sidebar.Nav`, and its trigger is a row of the nav.
		await page.viewport(414, 896);
		render(
			<TooltipProvider>
				<Sidebar.Root>
					<Command.DialogRoot keyboardShortcut={false}>
						<Sidebar.Nav>
							<Sidebar.Header>
								<Command.SearchTrigger>
									<Sidebar.SearchTrigger>Search</Sidebar.SearchTrigger>
								</Command.SearchTrigger>
							</Sidebar.Header>
						</Sidebar.Nav>
						<Command.DialogContent title="Palette">
							<Command.Input placeholder="Type a command…" />
						</Command.DialogContent>
					</Command.DialogRoot>
					<Sidebar.Trigger />
				</Sidebar.Root>
			</TooltipProvider>,
		);
		await waitForSheet();
		await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		await userEvent.click(screen.getByRole("button", { name: "Search" }));

		const input = await screen.findByPlaceholderText("Type a command…");
		await waitFor(() => expect(document.activeElement).toBe(input));
		const box = input.getBoundingClientRect();
		const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
		expect(hit === input || input.contains(hit)).toBe(true);
		await userEvent.keyboard("abc");
		expect(input).toHaveValue("abc");

		// The first Escape closes the palette alone; the second closes the sheet.
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByPlaceholderText("Type a command…")).toBeNull());
		expect(sheetDialog().matches(":modal")).toBe(true);
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(sheetDialog().open).toBe(false));
	});

	test.each([
		"the viewport crosses the breakpoint",
		"setOpenMobile(false) runs on a phone",
	] as const)(
		"a palette open over the sheet keeps its node, text, and focus when %s",
		async (closer) => {
			const sidebar = { setOpenMobile: (_open: boolean) => {} };
			function CaptureSetOpenMobile() {
				const { setOpenMobile } = useSidebar();
				useEffect(() => {
					sidebar.setOpenMobile = setOpenMobile;
				}, [setOpenMobile]);
				return null;
			}
			await page.viewport(414, 896);
			render(
				<TooltipProvider>
					<Sidebar.Root>
						<CaptureSetOpenMobile />
						<Command.DialogRoot keyboardShortcut={false}>
							<Sidebar.Nav>
								<Sidebar.Header>
									<Command.SearchTrigger>
										<Sidebar.SearchTrigger>Search</Sidebar.SearchTrigger>
									</Command.SearchTrigger>
								</Sidebar.Header>
							</Sidebar.Nav>
							<Command.DialogContent title="Palette">
								<Command.Input placeholder="Type a command…" />
							</Command.DialogContent>
						</Command.DialogRoot>
						<Sidebar.Trigger />
					</Sidebar.Root>
				</TooltipProvider>,
			);
			await waitForSheet();
			await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
			await userEvent.click(screen.getByRole("button", { name: "Search" }));
			const input = await screen.findByPlaceholderText("Type a command…");
			await waitFor(() => expect(document.activeElement).toBe(input));
			await userEvent.keyboard("abc");

			// Why both: on a phone the closed `<dialog>` hides the panel, and its
			// close returns focus to the trigger.
			if (closer === "the viewport crosses the breakpoint") {
				await page.viewport(1280, 800);
			} else {
				act(() => sidebar.setOpenMobile(false));
			}

			await waitFor(() => expect(sheetDialog().open).toBe(false));
			await waitFor(() => expect(input.checkVisibility()).toBe(true));
			expect(screen.getByPlaceholderText("Type a command…")).toBe(input);
			expect(input).toHaveValue("abc");
			expect(document.activeElement).toBe(input);
			// The closed sheet's nav is not left inert under the palette.
			expect(document.querySelector('[data-slot~="sidebar-nav"]')?.closest("[inert]")).toBeNull();
		},
	);

	test.each([
		"a controlled sheet that its owner closes in the handler",
		"a sheet that an effect closes",
	] as const)(
		"a palette that opens from %s moves out of the closed sheet and takes input",
		async (closer) => {
			// Why: both close the `<dialog>` after the render that mounts the palette
			// in it, as the close-on-navigation pattern does.
			const controlled = closer === "a controlled sheet that its owner closes in the handler";
			function CloseSheetWhenOpen({ open }: { open: boolean }) {
				const { setOpenMobile } = useSidebar();
				useEffect(() => {
					if (open && !controlled) {
						setOpenMobile(false);
					}
				}, [open, setOpenMobile]);
				return null;
			}
			function Shell() {
				const [openMobile, setOpenMobile] = useState(false);
				const [paletteOpen, setPaletteOpen] = useState(false);
				return (
					<TooltipProvider>
						<Sidebar.Root
							{...(controlled ? { openMobile, onOpenMobileChange: setOpenMobile } : null)}
						>
							<Command.DialogRoot
								keyboardShortcut={false}
								open={paletteOpen}
								onOpenChange={(open) => {
									setPaletteOpen(open);
									if (open && controlled) {
										setOpenMobile(false);
									}
								}}
							>
								<CloseSheetWhenOpen open={paletteOpen} />
								<Sidebar.Nav>
									<Sidebar.Header>
										<Command.SearchTrigger>
											<Sidebar.SearchTrigger>Search</Sidebar.SearchTrigger>
										</Command.SearchTrigger>
									</Sidebar.Header>
								</Sidebar.Nav>
								<Command.DialogContent title="Palette">
									<Command.Input placeholder="Type a command…" />
								</Command.DialogContent>
							</Command.DialogRoot>
							<Sidebar.Trigger />
						</Sidebar.Root>
					</TooltipProvider>
				);
			}
			await page.viewport(414, 896);
			render(<Shell />);
			await waitForSheet();
			await userEvent.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
			await waitFor(() => expect(sheetDialog().matches(":modal")).toBe(true));
			await userEvent.click(screen.getByRole("button", { name: "Search" }));

			await waitFor(() => expect(sheetDialog().open).toBe(false));
			await waitFor(() => {
				const input = screen.getByPlaceholderText("Type a command…");
				expect(input.closest("dialog")).not.toBe(sheetDialog());
				expect(input.checkVisibility()).toBe(true);
			});
			const input = screen.getByPlaceholderText("Type a command…");
			await waitFor(() => expect(document.activeElement).toBe(input));
			await userEvent.keyboard("abc");
			expect(input).toHaveValue("abc");
		},
	);
});

describe("Sidebar beside an open AppLayout.SidePanel", () => {
	function PanelToggle() {
		const { toggle } = useSidePanel();
		return (
			<button type="button" onClick={toggle}>
				Toggle panel
			</button>
		);
	}

	/**
	 * A wide window, so only the row's width decides: the `lg` sheet and every
	 * viewport query stay out of play.
	 */
	function Shell({
		rowWidth,
		panelMounted = true,
		navInRow = true,
		defaultOpen = true,
		onOpenChange,
		card,
		navClassName = "transition-none",
	}: {
		rowWidth: string;
		panelMounted?: boolean;
		navInRow?: boolean;
		defaultOpen?: boolean;
		onOpenChange?: (open: boolean) => void;
		card?: ReactNode;
		/** `transition-none` by default, so a toggle shows in the next frame. */
		navClassName?: string;
	}) {
		const nav = <Sidebar.Nav className={navClassName} data-testid="nav" />;
		return (
			<TooltipProvider>
				<AppLayout.SidePanelRoot defaultOpen={defaultOpen}>
					<Sidebar.Root onOpenChange={onOpenChange}>
						<PanelToggle />
						<div style={{ display: "flex", width: rowWidth, height: 400 }}>
							{!navInRow && nav}
							<AppLayout.Workspace className="h-full flex-1">
								{navInRow && nav}
								{card}
								{panelMounted && <AppLayout.SidePanel aria-label="Assistant" />}
							</AppLayout.Workspace>
						</div>
					</Sidebar.Root>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>
		);
	}

	const nav = () => screen.getByTestId("nav");
	/** Waits `count` frames: a loop or a late request shows up within a few. */
	const frames = async (count: number) => {
		for (let i = 0; i < count; i++) {
			await new Promise<void>((resolve) => {
				requestAnimationFrame(() => resolve());
			});
		}
	};
	const loadStyles = async (css = "") => {
		const style = document.createElement("style");
		style.textContent = await commands.tailwindCss(
			["../app-layout/app-layout.tsx", "./sidebar.tsx"],
			{
				mantleCss: true,
				css,
			},
		);
		document.head.append(style);
		onTestFinished(() => style.remove());
	};

	test("collapses below the row's lane and expands again when the row widens", async () => {
		await page.viewport(1600, 900);
		await loadStyles();
		// Why 800px: under the 56.5rem (904px) lane, in a window far above it.
		const { rerender } = render(<Shell rowWidth="800px" />);
		await waitFor(() => {
			expect(nav()).not.toHaveAttribute("data-expanded");
		});

		rerender(<Shell rowWidth="1000px" />);
		await waitFor(() => {
			expect(nav()).toHaveAttribute("data-expanded");
		});
	});

	test("follows a stylesheet that loads while the panel is open", async () => {
		await page.viewport(1600, 900);
		render(<Shell rowWidth="800px" />);
		expect(nav()).toHaveAttribute("data-expanded");

		await loadStyles();
		await waitFor(() => {
			expect(nav()).not.toHaveAttribute("data-expanded");
		});
	});

	test("follows the app's @theme lane through an open, a close, and an unmount", async () => {
		await page.viewport(1600, 900);
		// Why 1200px: above the default lane (904px), under the app's 80rem (1280px).
		await loadStyles("@theme { --container-side-panel-lane: 80rem; }");
		const user = userEvent.setup();
		const onOpenChange = vi.fn<(open: boolean) => void>();
		const { rerender } = render(
			<Shell rowWidth="1200px" defaultOpen={false} onOpenChange={onOpenChange} />,
		);
		expect(nav()).toHaveAttribute("data-expanded");

		await user.click(screen.getByRole("button", { name: "Toggle panel" }));
		await waitFor(() => {
			expect(nav()).not.toHaveAttribute("data-expanded");
		});

		await user.click(screen.getByRole("button", { name: "Toggle panel" }));
		await waitFor(() => {
			expect(nav()).toHaveAttribute("data-expanded");
		});

		await user.click(screen.getByRole("button", { name: "Toggle panel" }));
		await waitFor(() => {
			expect(nav()).not.toHaveAttribute("data-expanded");
		});

		rerender(<Shell rowWidth="1200px" panelMounted={false} onOpenChange={onOpenChange} />);
		await waitFor(() => {
			expect(nav()).toHaveAttribute("data-expanded");
		});
		expect(onOpenChange).toHaveBeenCalledTimes(0);
	});

	test("a nav outside the panel's row stays expanded and settles", async () => {
		// Why: collapsing a nav beside the row widens the row, which would release the request.
		await page.viewport(1600, 900);
		await loadStyles();
		render(<Shell rowWidth="1000px" navInRow={false} />);
		const changes: boolean[] = [];
		const observer = new MutationObserver(() => changes.push(nav().hasAttribute("data-expanded")));
		observer.observe(nav(), { attributes: true, attributeFilter: ["data-expanded"] });
		onTestFinished(() => observer.disconnect());
		await frames(10);
		expect(nav()).toHaveAttribute("data-expanded");
		expect(changes).toEqual([]);
	});

	test("padding on the panel's children does not count as the lane", async () => {
		await page.viewport(1600, 900);
		await loadStyles('[data-slot~="app-layout-side-panel"] > * { padding-inline: 8px; }');
		render(<Shell rowWidth="1200px" />);
		await frames(5);
		expect(nav()).toHaveAttribute("data-expanded");
	});

	test("a panel in a nested row leaves the outer row's nav expanded", async () => {
		// Why: the outer row's nav must not collapse for a panel whose own row has no nav.
		await page.viewport(1600, 900);
		await loadStyles("@theme { --container-side-panel-lane: 80rem; }");
		render(
			<TooltipProvider>
				<AppLayout.SidePanelRoot defaultOpen>
					<Sidebar.Root>
						<div style={{ width: 1400, height: 400 }}>
							<AppLayout.Workspace className="h-full">
								<Sidebar.Nav data-testid="nav" />
								<AppLayout.Workspace className="flex-1">
									<AppLayout.SidePanel aria-label="Assistant" />
								</AppLayout.Workspace>
							</AppLayout.Workspace>
						</div>
					</Sidebar.Root>
				</AppLayout.SidePanelRoot>
			</TooltipProvider>,
		);
		const changes: boolean[] = [];
		const observer = new MutationObserver(() => changes.push(nav().hasAttribute("data-expanded")));
		observer.observe(nav(), { attributes: true, attributeFilter: ["data-expanded"] });
		onTestFinished(() => observer.disconnect());
		await frames(10);
		expect(nav()).toHaveAttribute("data-expanded");
		expect(changes).toEqual([]);
	});

	test("a row that crosses the lane raises no error for an app's own observer", async () => {
		await page.viewport(1600, 900);
		await loadStyles("@theme { --container-side-panel-lane: 80rem; }");
		const errors: string[] = [];
		const onError = (event: ErrorEvent) => {
			errors.push(event.message);
			event.preventDefault();
		};
		window.addEventListener("error", onError);
		onTestFinished(() => window.removeEventListener("error", onError));
		const card = <div data-testid="card" style={{ flex: 1, minWidth: 0 }} />;
		const { rerender } = render(<Shell rowWidth="1400px" card={card} />);
		const cardObserver = new ResizeObserver(() => {});
		cardObserver.observe(screen.getByTestId("card"));
		onTestFinished(() => cardObserver.disconnect());
		await frames(2);

		rerender(<Shell rowWidth="1200px" card={card} />);
		await waitFor(() => {
			expect(nav()).not.toHaveAttribute("data-expanded");
		});
		await frames(2);
		expect(errors).toEqual([]);
	});

	test("hydration with the panel open collapses the sidebar with no transition", async () => {
		await page.viewport(1600, 900);
		await loadStyles("@theme { --container-side-panel-lane: 80rem; }");
		const container = document.createElement("div");
		container.innerHTML = renderToString(<Shell rowWidth="1200px" navClassName="" />);
		document.body.append(container);
		onTestFinished(() => container.remove());
		const serverNav = container.querySelector('[data-slot~="sidebar-nav"]');
		if (!(serverNav instanceof HTMLElement)) {
			throw new Error("The server markup has no Sidebar.Nav.");
		}
		expect(serverNav).toHaveAttribute("data-expanded");
		const runs: string[] = [];
		serverNav.addEventListener("transitionrun", (event) => runs.push(event.propertyName));

		render(<Shell rowWidth="1200px" navClassName="" />, { container, hydrate: true });
		await waitFor(() => {
			expect(serverNav).toHaveAttribute("data-hydrated");
		});
		expect(serverNav).not.toHaveAttribute("data-expanded");
		await frames(2);
		expect(runs).not.toContain("width");
	});
});
