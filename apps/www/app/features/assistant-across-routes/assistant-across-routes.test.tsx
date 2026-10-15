// @vitest-environment happy-dom
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AssistantPage,
	AssistantPanel,
	assistantViewTransitionClassName,
	crossesAssistant,
	isAssistantPath,
} from "~/features/assistant-across-routes/assistant-across-routes";
import {
	AssistantComposer,
	AssistantConversationProvider,
	AssistantTranscript,
} from "~/features/assistant-across-routes/assistant-conversation";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const composerName = "Message the assistant";
const firstStarter = "Route and authenticate API traffic";

/** A user on a fake clock, for a reply in flight. */
function setupUserOnFakeClock() {
	// Why shouldAdvanceTime: user-event drains its actions with a `setTimeout(0)`
	// that a frozen vitest clock never fires, so every `user.*` call would hang.
	vi.useFakeTimers({ shouldAdvanceTime: true });
	return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describe("isAssistantPath", () => {
	it.each([
		["/assistant", true],
		["/assistant/c_123", true],
		// The router matches case-insensitively and decodes the pathname.
		["/Assistant/", true],
		["/assi%73tant", true],
		["/assistants", false],
		["/endpoints", false],
	])("%s → %s", (pathname, expected) => {
		expect(isAssistantPath(pathname)).toBe(expected);
	});
});

describe("crossesAssistant", () => {
	it.each([
		["/assistant", "/endpoints", true],
		["/endpoints", "/assistant", true],
		["/endpoints", "/domains", false],
		["/assistant", "/assistant/c_123", false],
	])("%s → %s crosses: %s", (from, to, expected) => {
		expect(crossesAssistant(from, to)).toBe(expected);
	});
});

/** One conversation with the transcript and the composer as removable hosts. */
function Hosts({
	showTranscript,
	showComposer,
}: {
	showTranscript: boolean;
	showComposer: boolean;
}) {
	return (
		<AssistantConversationProvider>
			{showTranscript && <AssistantTranscript />}
			{showComposer && <AssistantComposer />}
		</AssistantConversationProvider>
	);
}

describe("AssistantConversationProvider", () => {
	it("keeps a reply streaming while the transcript unmounts and remounts", async () => {
		const user = setupUserOnFakeClock();
		const { rerender } = render(<Hosts showTranscript showComposer={false} />);

		await user.click(screen.getByRole("button", { name: firstStarter }));
		rerender(<Hosts showTranscript={false} showComposer={false} />);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		rerender(<Hosts showTranscript showComposer={false} />);

		expect(screen.queryByText(/the only thing you deploy\.$/, { selector: "p" })).not.toBeNull();
		expect(screen.queryByText("Working through it…")).toBeNull();
	});

	it("announces the whole reply once it lands, not each streamed word", async () => {
		const user = setupUserOnFakeClock();
		render(<Hosts showTranscript showComposer={false} />);
		const status = screen.getByRole("status");

		await user.click(screen.getByRole("button", { name: firstStarter }));
		expect(status.textContent).toBe("Working through it…");
		// Why 600ms: the first word lands at 360ms and the rest follow every 45ms,
		// so the visible reply has several words while the region still says to wait.
		await act(async () => {
			await vi.advanceTimersByTimeAsync(600);
		});
		expect(screen.queryByText(/^Here is the shape\./, { selector: "p" })).not.toBeNull();
		expect(status.textContent).toBe("Working through it…");

		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		expect(status.textContent).toMatch(/the only thing you deploy\.$/);
	});

	it("keeps the draft while the composer unmounts and remounts", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Hosts showTranscript={false} showComposer />);

		await user.type(screen.getByRole("textbox", { name: composerName }), "hello");
		rerender(<Hosts showTranscript={false} showComposer={false} />);
		rerender(<Hosts showTranscript={false} showComposer />);

		expect(screen.queryByDisplayValue("hello")).not.toBeNull();
	});
});

describe("AssistantComposer", () => {
	it("keeps the draft when a send during a reply is rejected", async () => {
		const user = setupUserOnFakeClock();
		render(<Hosts showTranscript showComposer />);

		await user.click(screen.getByRole("button", { name: firstStarter }));
		await user.type(screen.getByRole("textbox", { name: composerName }), "second{Enter}");

		expect(screen.queryByDisplayValue("second")).not.toBeNull();
		expect(screen.queryByText("second", { selector: "p" })).toBeNull();
	});

	it("ignores the Enter that confirms an input method editor candidate", async () => {
		const user = userEvent.setup();
		render(<Hosts showTranscript showComposer />);
		const textbox = screen.getByRole("textbox", { name: composerName });

		await user.type(textbox, "こんにちは");
		fireEvent.keyDown(textbox, { key: "Enter", isComposing: true });

		expect(screen.queryByDisplayValue("こんにちは")).not.toBeNull();
		expect(screen.queryByText("こんにちは", { selector: "p" })).toBeNull();
	});
});

describe("AssistantPage", () => {
	function renderPage() {
		render(
			<TooltipProvider>
				<AssistantConversationProvider>
					<Sidebar.Root>
						<AppLayout.SidePanelRoot>
							<AppLayout.SidePanelTrigger label="Toggle the assistant" />
							<AssistantPage />
						</AppLayout.SidePanelRoot>
					</Sidebar.Root>
				</AssistantConversationProvider>
			</TooltipProvider>,
		);
		return screen.getByRole("button", { name: "Toggle the assistant" });
	}

	it("opens the companion on the first typed message", async () => {
		const user = userEvent.setup();
		const trigger = renderPage();
		expect(trigger.getAttribute("aria-expanded")).toBe("false");

		await user.type(screen.getByRole("textbox", { name: composerName }), "hello{Enter}");

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
	});

	it("opens the companion on a starter prompt", async () => {
		const user = userEvent.setup();
		const trigger = renderPage();

		await user.click(screen.getByRole("button", { name: firstStarter }));

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
	});
});

describe("AssistantPanel", () => {
	function renderPanel({ open }: { open: boolean }) {
		render(
			<TooltipProvider>
				<AssistantConversationProvider>
					<AppLayout.SidePanelRoot defaultOpen={open}>
						<AssistantPanel />
					</AppLayout.SidePanelRoot>
				</AssistantConversationProvider>
			</TooltipProvider>,
		);
		return screen.getByRole("complementary", { name: "Assistant" });
	}

	// Why a class assertion: the name is a contract that crosses files. The
	// assistant route puts the same class on `AppLayout.Content`, and
	// `assistant-view-transition.css` times `::view-transition-group(assistant)`.
	it("names the open panel for the view transition", () => {
		const panel = renderPanel({ open: true });
		expect(panel.classList.contains(assistantViewTransitionClassName)).toBe(true);
	});

	// Why assert the absence: a named closed panel beside a named page is the
	// one duplicate that makes the browser skip the transition.
	it("leaves the closed panel unnamed", () => {
		const panel = renderPanel({ open: false });
		expect(panel.classList.contains(assistantViewTransitionClassName)).toBe(false);
	});
});
