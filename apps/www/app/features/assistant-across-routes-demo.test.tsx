// @vitest-environment happy-dom
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantAcrossRoutesDemo } from "./assistant-across-routes-demo";

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
	cleanup();
	vi.useRealTimers();
	Reflect.deleteProperty(document, "startViewTransition");
});

const composerName = "Message the assistant";

/** The docs site mounts a `TooltipProvider` in `root.tsx`; the sidebar rows need it. */
function renderDemo() {
	return render(
		<TooltipProvider>
			<AssistantAcrossRoutesDemo />
		</TooltipProvider>,
	);
}

describe("AssistantAcrossRoutesDemo", () => {
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
		expect(within(panel).queryByText(/the only thing you deploy\.$/)).not.toBeNull();
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
