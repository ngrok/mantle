// @vitest-environment happy-dom
import { AppLayout } from "@ngrok/mantle/app-layout";
import { Sidebar } from "@ngrok/mantle/sidebar";
import { TooltipProvider } from "@ngrok/mantle/tooltip";
import { act, cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AssistantPage,
	AssistantPanel,
	assistantViewTransitionClassName,
	crossesAssistant,
	isAssistantPath,
} from "./assistant-across-routes";
import {
	AssistantComposer,
	AssistantConversationProvider,
	AssistantTranscript,
} from "./assistant-conversation";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("isAssistantPath", () => {
	it.each([
		["/assistant", true],
		["/assistant/c_123", true],
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
		// Why shouldAdvanceTime: user-event drains its actions with a `setTimeout(0)`
		// that a frozen vitest clock never fires, so every `user.*` call would hang.
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
		const { rerender } = render(<Hosts showTranscript showComposer={false} />);

		await user.click(screen.getByRole("button", { name: "Route and authenticate API traffic" }));
		rerender(<Hosts showTranscript={false} showComposer={false} />);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		rerender(<Hosts showTranscript showComposer={false} />);

		expect(screen.queryByText(/the only thing you deploy\.$/)).not.toBeNull();
		expect(screen.queryByRole("status")).toBeNull();
	});

	it("keeps the draft while the composer unmounts and remounts", async () => {
		const user = userEvent.setup();
		const { rerender } = render(<Hosts showTranscript={false} showComposer />);

		await user.type(screen.getByRole("textbox", { name: "Message the assistant" }), "hello");
		rerender(<Hosts showTranscript={false} showComposer={false} />);
		rerender(<Hosts showTranscript={false} showComposer />);

		expect(screen.queryByDisplayValue("hello")).not.toBeNull();
	});
});

describe("AssistantPage", () => {
	it("opens the companion on the first message", async () => {
		const user = userEvent.setup();
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
		const trigger = screen.getByRole("button", { name: "Toggle the assistant" });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");

		await user.type(screen.getByRole("textbox", { name: "Message the assistant" }), "hello{Enter}");

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
