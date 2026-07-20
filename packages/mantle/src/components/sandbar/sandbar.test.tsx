import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SandbarHandle } from "./sandbar.js";
import { Sandbar } from "./sandbar.js";

function getPanel(): HTMLElement {
	const panel = document.querySelector('[data-slot="sandbar"]');
	if (!(panel instanceof HTMLElement)) {
		throw new Error("sandbar panel not found");
	}
	return panel;
}

function getStatusRegion(): HTMLElement {
	const region = document.querySelector('[role="status"]');
	if (!(region instanceof HTMLElement)) {
		throw new Error("status region not found");
	}
	return region;
}

function getAlertRegion(): HTMLElement {
	// the persistent assertive announcer is the sr-only role="alert" sibling of
	// the panel, not Sandbar.Error's Alert (which deliberately has no role)
	const region = document.querySelector('div.sr-only[role="alert"]');
	if (!(region instanceof HTMLElement)) {
		throw new Error("assertive region not found");
	}
	return region;
}

const fullTree = ({ open }: { open: boolean }) => (
	<Sandbar.Root open={open}>
		<Sandbar.Message>You have unsaved changes</Sandbar.Message>
		<Sandbar.Actions>
			<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
			<Sandbar.SaveButton onClick={() => {}}>Save</Sandbar.SaveButton>
		</Sandbar.Actions>
	</Sandbar.Root>
);

describe("Sandbar structure", () => {
	test("renders every part with its data-slot", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
					<Sandbar.SaveButton onClick={() => {}}>Save</Sandbar.SaveButton>
				</Sandbar.Actions>
				<Sandbar.Error>Save failed</Sandbar.Error>
			</Sandbar.Root>,
		);

		expect(document.querySelector('[data-slot="sandbar"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-message"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-actions"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-discard-button"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-save-button"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-error"]')).toBeInTheDocument();
	});

	test("the panel is an invert-theme island styled by opposite-theme surface tokens", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		const panel = getPanel();
		expect(panel.classList.contains("invert-theme")).toBe(true);
		// the surface tokens resolve against the inverted theme, not the page theme
		expect(panel.className).toContain("bg-base");
		expect(panel.className).toContain("text-strong");
	});

	test("Root forwards className, ref, and data-* props to the panel", () => {
		const TestBed = () => {
			const panelRef = useRef<HTMLDivElement>(null);
			return (
				<Sandbar.Root className="custom-class" data-testid="panel" open ref={panelRef}>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				</Sandbar.Root>
			);
		};
		render(<TestBed />);

		const panel = screen.getByTestId("panel");
		expect(panel).toBe(getPanel());
		expect(panel.className).toContain("custom-class");
		expect(panel).toHaveAttribute("role", "group");
		expect(panel).toHaveAttribute("tabindex", "-1");
	});

	test("every part forwards className and ref", () => {
		const messageRef = createRef<HTMLParagraphElement>();
		const actionsRef = createRef<HTMLDivElement>();
		const saveRef = createRef<HTMLButtonElement>();
		const discardRef = createRef<HTMLButtonElement>();
		const errorRef = createRef<HTMLDivElement>();

		render(
			<Sandbar.Root open>
				<Sandbar.Message className="message-class" ref={messageRef}>
					You have unsaved changes
				</Sandbar.Message>
				<Sandbar.Actions className="actions-class" ref={actionsRef}>
					<Sandbar.DiscardButton className="discard-class" onClick={() => {}} ref={discardRef}>
						Discard
					</Sandbar.DiscardButton>
					<Sandbar.SaveButton className="save-class" onClick={() => {}} ref={saveRef}>
						Save
					</Sandbar.SaveButton>
				</Sandbar.Actions>
				<Sandbar.Error className="error-class" ref={errorRef}>
					Save failed
				</Sandbar.Error>
			</Sandbar.Root>,
		);

		expect(messageRef.current).toHaveAttribute("data-slot", "sandbar-message");
		expect(messageRef.current?.className).toContain("message-class");
		expect(actionsRef.current).toHaveAttribute("data-slot", "sandbar-actions");
		expect(actionsRef.current?.className).toContain("actions-class");
		expect(saveRef.current).toHaveAttribute("data-slot", "sandbar-save-button");
		expect(saveRef.current?.className).toContain("save-class");
		expect(discardRef.current).toHaveAttribute("data-slot", "sandbar-discard-button");
		expect(discardRef.current?.className).toContain("discard-class");
		expect(errorRef.current).toHaveAttribute("data-slot", "sandbar-error");
		expect(errorRef.current?.className).toContain("error-class");
	});

	test("the message is a plain paragraph with no live-region role", () => {
		render(fullTree({ open: true }));
		const message = document.querySelector('[data-slot="sandbar-message"]');
		expect(message).toBeInTheDocument();
		expect(message?.tagName).toBe("P");
		expect(message).not.toHaveAttribute("role");
		expect(message).not.toHaveAttribute("aria-live");
	});

	test("the actions row is a plain div, not a toolbar", () => {
		render(fullTree({ open: true }));
		const actions = document.querySelector('[data-slot="sandbar-actions"]');
		expect(actions).not.toHaveAttribute("role");
	});

	test("Message and Actions support asChild", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message asChild>
					<span data-testid="message">You have unsaved changes</span>
				</Sandbar.Message>
				<Sandbar.Actions asChild>
					<section data-testid="actions" />
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		const message = screen.getByTestId("message");
		expect(message.tagName).toBe("SPAN");
		expect(message).toHaveAttribute("data-slot", "sandbar-message");
		const actions = screen.getByTestId("actions");
		expect(actions.tagName).toBe("SECTION");
		expect(actions).toHaveAttribute("data-slot", "sandbar-actions");
	});

	test("parts throw when rendered outside Sandbar.Root", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => {
			render(<Sandbar.Message>orphan</Sandbar.Message>);
		}).toThrow(/Sandbar\.Message/);
		consoleError.mockRestore();
	});

	test("Sandbar.Error renders a danger alert without role=alert", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Error>Save failed</Sandbar.Error>
			</Sandbar.Root>,
		);
		const error = document.querySelector('[data-slot="sandbar-error"]');
		expect(error).toBeInTheDocument();
		expect(error).not.toHaveAttribute("role");
		expect(error).toHaveTextContent("Save failed");
	});
});

describe("Sandbar accessible name", () => {
	test("the panel is labelled by the message by default", () => {
		render(fullTree({ open: true }));
		const panel = getPanel();
		const message = document.querySelector('[data-slot="sandbar-message"]');
		expect(message).toHaveAttribute("id");
		expect(panel).toHaveAttribute("aria-labelledby", message?.getAttribute("id"));
		expect(panel).not.toHaveAttribute("aria-label");
	});

	test("a consumer aria-label wins over the message", () => {
		render(
			<Sandbar.Root aria-label="Pending publishes" open>
				<Sandbar.Message>3 items pending publish</Sandbar.Message>
			</Sandbar.Root>,
		);
		const panel = getPanel();
		expect(panel).toHaveAttribute("aria-label", "Pending publishes");
		expect(panel).not.toHaveAttribute("aria-labelledby");
	});

	test("falls back to the default label when no message is mounted", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Actions>
					<Sandbar.SaveButton onClick={() => {}}>Save</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>,
		);
		const panel = getPanel();
		expect(panel).toHaveAttribute("aria-label", "Unsaved changes");
	});
});

describe("Sandbar presence", () => {
	test("open renders the panel visible with data-state=open", () => {
		render(fullTree({ open: true }));
		const panel = getPanel();
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel).not.toHaveAttribute("hidden");
	});

	test("mounting closed hides the panel immediately, with no exit phase", () => {
		render(fullTree({ open: false }));
		const panel = getPanel();
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).toHaveAttribute("hidden");
	});

	/**
	 * happy-dom has no TransitionEvent constructor, so fireEvent.transitionEnd
	 * drops `propertyName` — build the event by hand instead.
	 */
	function fireTransitionEnd(element: HTMLElement, propertyName: string) {
		const event = new Event("transitionend", { bubbles: true, cancelable: true });
		Object.assign(event, { propertyName });
		fireEvent(element, event);
	}

	test("closing keeps the panel visible until the exit transition ends", () => {
		const { rerender } = render(fullTree({ open: true }));
		rerender(fullTree({ open: false }));

		const panel = getPanel();
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).not.toHaveAttribute("hidden");

		fireTransitionEnd(panel, "translate");
		expect(panel).toHaveAttribute("hidden");
	});

	test("a consumer transition ending on another property does not close the panel early", () => {
		const { rerender } = render(fullTree({ open: true }));
		rerender(fullTree({ open: false }));

		const panel = getPanel();
		fireTransitionEnd(panel, "background-color");
		expect(panel).not.toHaveAttribute("hidden");

		fireTransitionEnd(panel, "opacity");
		expect(panel).toHaveAttribute("hidden");
	});

	test("the safety timeout closes the panel when no transition ever fires", () => {
		vi.useFakeTimers();
		try {
			const { rerender } = render(fullTree({ open: true }));
			rerender(fullTree({ open: false }));
			const panel = getPanel();
			expect(panel).not.toHaveAttribute("hidden");

			act(() => {
				vi.advanceTimersByTime(400);
			});
			expect(panel).toHaveAttribute("hidden");
		} finally {
			vi.useRealTimers();
		}
	});

	test("opening from rest paints one closed-pose frame, then transitions to open", async () => {
		const { rerender } = render(fullTree({ open: false }));
		rerender(fullTree({ open: true }));

		// the pre-paint frame: visible but still in the closed pose, so the
		// enter has a from-state to transition from
		const panel = getPanel();
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).not.toHaveAttribute("hidden");

		await waitFor(() => {
			expect(panel).toHaveAttribute("data-state", "open");
		});
	});

	test("reopening mid-exit retargets straight to open — no restart frame", () => {
		const { rerender } = render(fullTree({ open: true }));
		rerender(fullTree({ open: false }));
		rerender(fullTree({ open: true }));

		// synchronously open: the in-flight transition retargets from the
		// panel's current position instead of restarting from the bottom
		const panel = getPanel();
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel).not.toHaveAttribute("hidden");
	});

	test("closing during the pre-paint opening frame hides immediately — nothing visible happened yet", () => {
		const { rerender } = render(fullTree({ open: false }));
		rerender(fullTree({ open: true }));
		rerender(fullTree({ open: false }));

		const panel = getPanel();
		expect(panel).toHaveAttribute("data-state", "closed");
		expect(panel).toHaveAttribute("hidden");
	});

	test("the announcers stay mounted and unhidden while the panel is closed", () => {
		render(fullTree({ open: false }));
		expect(getStatusRegion()).toBeInTheDocument();
		expect(getAlertRegion()).toBeInTheDocument();
		expect(getStatusRegion()).not.toHaveAttribute("hidden");
		expect(getPanel()).toHaveAttribute("hidden");
	});

	test("opening does not steal focus", () => {
		const tree = ({ open }: { open: boolean }) => (
			<div>
				<button type="button">Outside</button>
				{fullTree({ open })}
			</div>
		);
		const { rerender } = render(tree({ open: false }));

		const outside = screen.getByRole("button", { name: "Outside" });
		outside.focus();
		rerender(tree({ open: true }));

		expect(document.activeElement).toBe(outside);
	});

	test("Escape does nothing", () => {
		render(fullTree({ open: true }));
		const panel = getPanel();
		fireEvent.keyDown(panel, { key: "Escape" });
		expect(panel).toHaveAttribute("data-state", "open");
		expect(panel).not.toHaveAttribute("hidden");
	});
});

describe("Sandbar announcements", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test("opening announces the message text politely, then clears it", () => {
		const { rerender } = render(fullTree({ open: false }));
		expect(getStatusRegion()).toHaveTextContent("");

		rerender(fullTree({ open: true }));
		expect(getStatusRegion()).toHaveTextContent("You have unsaved changes");

		act(() => {
			vi.advanceTimersByTime(1_000);
		});
		expect(getStatusRegion()).toHaveTextContent("");
	});

	test("mounting with open already true does not announce (mount is not a change)", () => {
		render(fullTree({ open: true }));
		expect(getStatusRegion()).toHaveTextContent("");
	});

	test("reopening within the clear window announces again", () => {
		// regression: the polite region is cleared on close so a reopen with the
		// byte-identical message still registers as a live-region change
		const { rerender } = render(fullTree({ open: false }));
		rerender(fullTree({ open: true }));
		expect(getStatusRegion()).toHaveTextContent("You have unsaved changes");

		rerender(fullTree({ open: false }));
		expect(getStatusRegion()).toHaveTextContent("");

		rerender(fullTree({ open: true }));
		expect(getStatusRegion()).toHaveTextContent("You have unsaved changes");
	});

	test("a pending save announces politely", () => {
		const tree = ({ isLoading }: { isLoading: boolean }) => (
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.SaveButton isLoading={isLoading} onClick={() => {}}>
						Save
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ isLoading: false }));
		rerender(tree({ isLoading: true }));
		expect(getStatusRegion()).toHaveTextContent("Saving changes…");
	});

	test("shake announces assertively with the default wording", () => {
		const handle = { current: null as SandbarHandle | null };
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake();
			vi.advanceTimersToNextFrame();
		});
		expect(getAlertRegion()).toHaveTextContent(
			"You have unsaved changes. Save or discard them before leaving.",
		);
	});

	test("repeated shakes alternate a trailing no-break space so identical text re-announces", () => {
		const handle = { current: null as SandbarHandle | null };
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake();
			vi.advanceTimersToNextFrame();
		});
		const first = getAlertRegion().textContent;

		act(() => {
			handle.current?.shake();
			vi.advanceTimersToNextFrame();
		});
		const second = getAlertRegion().textContent;

		expect(first).not.toBe(second);
		expect(second).toBe(`${first}\u00A0`);
	});

	test("shake accepts a custom announcement for non-save intents", () => {
		const handle = { current: null as SandbarHandle | null };
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>3 items pending publish</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake({ announcement: "Publish or discard your pending items first." });
			vi.advanceTimersToNextFrame();
		});
		expect(getAlertRegion()).toHaveTextContent("Publish or discard your pending items first.");
	});

	test("a mounted Sandbar.Error mirrors its text through the assertive announcer", () => {
		const tree = (error: string | null) => (
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				{error != null && <Sandbar.Error>{error}</Sandbar.Error>}
			</Sandbar.Root>
		);
		const { rerender } = render(tree(null));
		rerender(tree("Something went wrong while saving."));

		act(() => {
			vi.advanceTimersToNextFrame();
		});
		expect(getAlertRegion()).toHaveTextContent("Something went wrong while saving.");
	});

	test("Sandbar.Error re-announces when its text changes", () => {
		const tree = (error: string) => (
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Error>{error}</Sandbar.Error>
			</Sandbar.Root>
		);
		const { rerender } = render(tree("First failure."));
		act(() => {
			vi.advanceTimersToNextFrame();
		});
		expect(getAlertRegion()).toHaveTextContent("First failure.");

		rerender(tree("Second failure."));
		act(() => {
			vi.advanceTimersToNextFrame();
		});
		expect(getAlertRegion()).toHaveTextContent("Second failure.");
	});
});
