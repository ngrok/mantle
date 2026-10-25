// @vitest-environment happy-dom
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { act, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantAcrossRoutesDemo } from "~/features/assistant-across-routes-demo";

// Why a stub: happy-dom has no View Transitions. It runs the update at once,
// the way react-router falls back in a browser without them, and the count is
// the only trace of which navigations asked for one.
const startViewTransition = vi.fn<(update: () => void) => ViewTransition>((update) => {
	update();
	return {
		finished: Promise.resolve(),
		ready: Promise.resolve(),
		updateCallbackDone: Promise.resolve(),
		skipTransition: () => {},
		types: new Set<string>(),
	};
});

beforeEach(() => {
	Object.defineProperty(document, "startViewTransition", {
		configurable: true,
		value: startViewTransition,
	});
});

afterEach(() => {
	vi.useRealTimers();
	Reflect.deleteProperty(document, "startViewTransition");
});

const composerName = "Message the assistant";

/**
 * The query `AssistantSidebarRoot` reads: the viewport is narrower than the
 * lane an expanded rail needs.
 */
const belowTheLane = "(width < 56.5rem)";

/**
 * Stubs `window.matchMedia` so each listed query matches and every other one
 * (the rail's own `md` breakpoint included) does not. happy-dom has no viewport
 * to lay out, so the query is the only environment to mock.
 */
function stubMatchMedia(matching: ReadonlyArray<string>) {
	vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
		matches: matching.includes(query),
		media: query,
		onchange: null,
		// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
		addListener: () => {},
		// oxlint-disable-next-line typescript/no-deprecated -- Why: the `MediaQueryList` type still requires it.
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	}));
}

/** The docs site mounts a `TooltipProvider` in `root.tsx`; the sidebar rows need it. */
function renderDemo() {
	return render(
		<TooltipProvider>
			<AssistantAcrossRoutesDemo />
		</TooltipProvider>,
	);
}

/** The desktop rail's `data-state`, which `Sidebar.Nav` stamps around the `nav`. */
function railState() {
	return screen
		.getByRole("navigation", { name: "Main" })
		.closest("[data-state]")
		?.getAttribute("data-state");
}

describe("AssistantAcrossRoutesDemo", () => {
	it("collapses the rail when the panel opens below the lane and expands it again on close", async () => {
		stubMatchMedia([belowTheLane]);
		const user = userEvent.setup();
		renderDemo();

		// Why expanded here: the assistant route renders no panel beside the page.
		expect(railState()).toBe("expanded");

		await user.click(screen.getByRole("link", { name: "Endpoints" }));
		expect(railState()).toBe("collapsed");

		await user.click(screen.getByRole("button", { name: "Close the assistant" }));
		expect(railState()).toBe("expanded");
	});

	it("lets the reader expand the rail again beside the open panel, and keeps that choice on close", async () => {
		stubMatchMedia([belowTheLane]);
		const user = userEvent.setup();
		renderDemo();

		await user.click(screen.getByRole("link", { name: "Endpoints" }));
		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		expect(railState()).toBe("expanded");

		await user.click(screen.getByRole("button", { name: "Close the assistant" }));
		expect(railState()).toBe("expanded");
	});

	it("leaves a rail the reader collapsed alone when the panel closes", async () => {
		stubMatchMedia([belowTheLane]);
		const user = userEvent.setup();
		renderDemo();

		await user.click(screen.getByRole("button", { name: "Toggle Sidebar" }));
		await user.click(screen.getByRole("link", { name: "Endpoints" }));
		expect(railState()).toBe("collapsed");

		await user.click(screen.getByRole("button", { name: "Close the assistant" }));
		expect(railState()).toBe("collapsed");
	});

	it("keeps the rail expanded beside the open panel when the viewport holds the lane", async () => {
		stubMatchMedia([]);
		const user = userEvent.setup();
		renderDemo();

		await user.click(screen.getByRole("link", { name: "Endpoints" }));
		expect(railState()).toBe("expanded");
	});

	it("renders the conversation in main on the assistant route and in the panel elsewhere", async () => {
		const user = userEvent.setup();
		renderDemo();

		expect(
			within(screen.getByRole("main")).queryByRole("textbox", { name: composerName }),
		).not.toBeNull();
		expect(screen.queryByRole("complementary", { name: "Assistant" })).toBeNull();

		await user.click(screen.getByRole("link", { name: "Endpoints" }));

		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(within(panel).queryByRole("textbox", { name: composerName })).not.toBeNull();
		expect(
			within(screen.getByRole("main")).queryByRole("textbox", { name: composerName }),
		).toBeNull();
	});

	it("runs a view transition only when a navigation crosses the assistant's route", async () => {
		const user = userEvent.setup();
		renderDemo();

		await user.click(screen.getByRole("link", { name: "Endpoints" }));
		expect(startViewTransition).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("link", { name: "Domains" }));
		expect(startViewTransition).toHaveBeenCalledTimes(1);

		await user.click(screen.getByRole("link", { name: "Assistant" }));
		expect(startViewTransition).toHaveBeenCalledTimes(2);
	});

	it("keeps the reply streaming across the crossing", async () => {
		// Why shouldAdvanceTime: user-event drains its actions with a `setTimeout(0)`
		// that a frozen vitest clock never fires, so every `user.*` call would hang.
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		renderDemo();

		await user.click(screen.getByRole("button", { name: "Route and authenticate API traffic" }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(600);
		});
		await user.click(screen.getByRole("link", { name: "Endpoints" }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});

		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(
			within(panel).queryByText(/the only thing you deploy\.$/, { selector: "p" }),
		).not.toBeNull();
	});

	it("carries the draft across the crossing", async () => {
		const user = userEvent.setup();
		renderDemo();

		await user.type(screen.getByRole("textbox", { name: composerName }), "hello");
		await user.click(screen.getByRole("link", { name: "Endpoints" }));

		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(within(panel).queryByDisplayValue("hello")).not.toBeNull();
	});
});
