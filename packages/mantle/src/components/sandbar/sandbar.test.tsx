import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { TransitionEvent } from "react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import mantleCss from "../../mantle.css?raw";
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
	// the panel — the only role="alert" the component renders
	const region = document.querySelector('div.sr-only[role="alert"]');
	if (!(region instanceof HTMLElement)) {
		throw new Error("assertive region not found");
	}
	return region;
}

/**
 * An open bar whose save button can be driven through the loading flip that
 * `reportSaving` keys on. `disabled` is left off unless a test is pinning the
 * `disabled={false}` beside `isLoading` case.
 */
const loadableSaveTree = ({ disabled, isLoading }: { disabled?: boolean; isLoading: boolean }) => (
	<Sandbar.Root open>
		<Sandbar.Message>You have unsaved changes</Sandbar.Message>
		<Sandbar.Actions>
			<Sandbar.SaveButton disabled={disabled} isLoading={isLoading} onClick={() => {}}>
				Save
			</Sandbar.SaveButton>
		</Sandbar.Actions>
	</Sandbar.Root>
);

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
			</Sandbar.Root>,
		);

		expect(document.querySelector('[data-slot="sandbar"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-message"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-actions"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-discard-button"]')).toBeInTheDocument();
		expect(document.querySelector('[data-slot="sandbar-save-button"]')).toBeInTheDocument();
	});

	test("the panel is an invert-theme island styled by opposite-theme surface tokens", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		// Cross-file spelling pin, asserting BOTH sides together: the panel emits
		// the class, and mantle.css is what gives it meaning — the theme blocks'
		// selector extensions (`:root:is(.dark, …) .invert-theme`) plus the
		// palette-alias rule. Renaming either side alone silently un-themes every
		// Sandbar. The computed inversion itself is proven end-to-end by
		// theme/invert-theme.browser.test.ts.
		expect(getPanel().classList.contains("invert-theme")).toBe(true);
		expect(mantleCss).toContain(".invert-theme {");
		expect(mantleCss).toContain(") .invert-theme {");
	});

	test("Root forwards className, ref, and data-* props to the panel", () => {
		const panelRef = createRef<HTMLDivElement>();
		render(
			<Sandbar.Root className="custom-class" data-testid="panel" open ref={panelRef}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		const panel = screen.getByTestId("panel");
		expect(panel).toBe(getPanel());
		expect(panelRef.current).toBe(panel);
		expect(panel.className).toContain("custom-class");
		expect(panel).toHaveAttribute("role", "group");
		expect(panel).toHaveAttribute("tabindex", "-1");
	});

	test("every part forwards className and ref", () => {
		const messageRef = createRef<HTMLParagraphElement>();
		const actionsRef = createRef<HTMLDivElement>();
		const saveRef = createRef<HTMLButtonElement>();
		const discardRef = createRef<HTMLButtonElement>();

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

	test("Message and Actions support asChild, merging classes, data-*, and the ref", () => {
		const messageRef = createRef<HTMLSpanElement>();
		const actionsRef = createRef<HTMLElement>();
		render(
			<Sandbar.Root open>
				<Sandbar.Message asChild className="part-class">
					<span className="child-class" data-testid="message" ref={messageRef}>
						You have unsaved changes
					</span>
				</Sandbar.Message>
				<Sandbar.Actions asChild className="part-class">
					<section className="child-class" data-testid="actions" ref={actionsRef} />
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		const message = screen.getByTestId("message");
		expect(message.tagName).toBe("SPAN");
		expect(message).toHaveAttribute("data-slot", "sandbar-message");
		expect(message.className).toContain("part-class");
		expect(message.className).toContain("child-class");
		expect(messageRef.current).toBe(message);

		const actions = screen.getByTestId("actions");
		expect(actions.tagName).toBe("SECTION");
		expect(actions).toHaveAttribute("data-slot", "sandbar-actions");
		expect(actions.className).toContain("part-class");
		expect(actions.className).toContain("child-class");
		expect(actionsRef.current).toBe(actions);
	});

	test("SaveButton and DiscardButton support asChild, merging classes, data-*, and the ref", () => {
		// callback refs, because both props types declare `Ref<HTMLButtonElement>`
		// while the swapped child here is an anchor
		const saveTarget: { current: HTMLElement | null } = { current: null };
		const discardTarget: { current: HTMLElement | null } = { current: null };
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton
						asChild
						className="part-class"
						ref={(element) => {
							discardTarget.current = element;
						}}
					>
						<a className="child-class" data-testid="discard" href="/settings">
							Discard
						</a>
					</Sandbar.DiscardButton>
					<Sandbar.SaveButton
						asChild
						className="part-class"
						ref={(element) => {
							saveTarget.current = element;
						}}
					>
						<a className="child-class" data-testid="save" href="/settings/save">
							Save
						</a>
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		const save = screen.getByTestId("save");
		expect(save.tagName).toBe("A");
		// the part's slot must survive the swap and still beat `Button`'s own
		// `data-slot="button"` — the spread order inside Button is what decides it
		expect(save).toHaveAttribute("data-slot", "sandbar-save-button");
		expect(save.className).toContain("part-class");
		expect(save.className).toContain("child-class");
		expect(saveTarget.current).toBe(save);

		const discard = screen.getByTestId("discard");
		expect(discard.tagName).toBe("A");
		expect(discard).toHaveAttribute("data-slot", "sandbar-discard-button");
		expect(discard.className).toContain("part-class");
		expect(discard.className).toContain("child-class");
		expect(discardTarget.current).toBe(discard);
	});

	test("the blessed buttons stamp Sandbar's own resolved appearance and intent", () => {
		render(fullTree({ open: true }));

		// `Button` requires `appearance` and `intent`; defaulting them is why these
		// two parts exist instead of bare Buttons, so the resolved pair is Sandbar's
		// contract — and Button publishes each one as a documented data attribute
		const save = screen.getByRole("button", { name: "Save" });
		expect(save).toHaveAttribute("data-appearance", "filled");
		expect(save).toHaveAttribute("data-intent", "neutral");
		expect(save).toHaveAttribute("data-size", "md");
		expect(save).toHaveAttribute("data-disabled", "false");
		expect(save).toHaveAttribute("data-loading", "false");

		const discard = screen.getByRole("button", { name: "Discard" });
		expect(discard).toHaveAttribute("data-appearance", "outlined");
		expect(discard).toHaveAttribute("data-intent", "neutral");
		expect(discard).toHaveAttribute("data-size", "md");
		expect(discard).toHaveAttribute("data-disabled", "false");
		expect(discard).toHaveAttribute("data-loading", "false");
	});

	test("a consumer appearance and intent win over the part defaults", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton appearance="ghost" onClick={() => {}}>
						Discard
					</Sandbar.DiscardButton>
					<Sandbar.SaveButton appearance="link" intent="danger" onClick={() => {}}>
						Delete
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		expect(screen.getByRole("button", { name: "Discard" })).toHaveAttribute(
			"data-appearance",
			"ghost",
		);
		const save = screen.getByRole("button", { name: "Delete" });
		expect(save).toHaveAttribute("data-appearance", "link");
		expect(save).toHaveAttribute("data-intent", "danger");
		// documented in both JSDoc tables: `data-size` is absent for `link`
		expect(save).not.toHaveAttribute("data-size");
	});

	test("every part joins an incoming data-slot chain ahead of its own slot", () => {
		render(
			<Sandbar.Root data-slot="outer" open>
				<Sandbar.Message data-slot="outer-message">You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions data-slot="outer-actions">
					<Sandbar.DiscardButton data-slot="outer-discard" onClick={() => {}}>
						Discard
					</Sandbar.DiscardButton>
					<Sandbar.SaveButton data-slot="outer-save" onClick={() => {}}>
						Save
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		// ancestors-first, so the rendered attribute reads in DOM order
		expect(document.querySelector('[data-slot="outer sandbar"]')).toBeInTheDocument();
		expect(
			document.querySelector('[data-slot="outer-message sandbar-message"]'),
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-slot="outer-actions sandbar-actions"]'),
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-slot="outer-discard sandbar-discard-button"]'),
		).toBeInTheDocument();
		expect(
			document.querySelector('[data-slot="outer-save sandbar-save-button"]'),
		).toBeInTheDocument();
	});

	test("the panel reflects its presence through data-state", () => {
		const { rerender } = render(fullTree({ open: true }));
		expect(getPanel()).toHaveAttribute("data-state", "open");

		rerender(fullTree({ open: false }));
		// closing keeps the panel mounted but already reports "closed" — that flip
		// is what drives the exit transition
		expect(getPanel()).toHaveAttribute("data-state", "closed");
	});

	test("parts throw when rendered outside Sandbar.Root", () => {
		// silence React's own error logging for the intentional render throw
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => {
			render(<Sandbar.Message>orphan</Sandbar.Message>);
		}).toThrow(/Sandbar\.Message/);
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

	test("a consumer aria-labelledby wins over the message", () => {
		render(
			<Sandbar.Root aria-labelledby="external-heading" open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);
		const panel = getPanel();
		const message = document.querySelector('[data-slot="sandbar-message"]');
		expect(panel).toHaveAttribute("aria-labelledby", "external-heading");
		// the consumer id wins over the message's own generated id
		expect(panel.getAttribute("aria-labelledby")).not.toBe(message?.getAttribute("id"));
		expect(panel).not.toHaveAttribute("aria-label");
	});

	test("unmounting the message drops its stale aria-labelledby and falls back to the default", () => {
		const tree = ({ withMessage }: { withMessage: boolean }) => (
			<Sandbar.Root open>
				{withMessage && <Sandbar.Message>You have unsaved changes</Sandbar.Message>}
				<Sandbar.Actions>
					<Sandbar.SaveButton onClick={() => {}}>Save</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ withMessage: true }));

		const panel = getPanel();
		const message = document.querySelector('[data-slot="sandbar-message"]');
		expect(message).toHaveAttribute("id");
		expect(panel).toHaveAttribute("aria-labelledby", message?.getAttribute("id"));

		// removing the Message must reset messageId so the panel does not keep an
		// aria-labelledby pointing at a node that no longer exists
		rerender(tree({ withMessage: false }));
		expect(panel).not.toHaveAttribute("aria-labelledby");
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

	test("a transition ending on a composed child does not close the panel early", () => {
		const { rerender } = render(fullTree({ open: true }));
		rerender(fullTree({ open: false }));

		const panel = getPanel();
		const child = panel.querySelector('[data-slot="sandbar-message"]');
		if (!(child instanceof HTMLElement)) {
			throw new Error("message child not found");
		}
		// a composed child's own opacity/translate transition bubbles up to the
		// panel handler; `target !== currentTarget` must stop it from advancing
		// the presence machine while the panel is still exiting
		fireTransitionEnd(child, "translate");
		expect(panel).not.toHaveAttribute("hidden");

		// the panel's own transition still closes it
		fireTransitionEnd(panel, "translate");
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

	test("Escape does nothing", async () => {
		const user = userEvent.setup();
		render(fullTree({ open: true }));
		const panel = getPanel();

		// the whole keydown/keypress/keyup sequence, delivered to the focused panel:
		// a discard wired to keyup, or to the wrapper instead of the panel, would
		// pass a keydown-only assertion while destroying the user's data
		panel.focus();
		await user.keyboard("{Escape}");

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
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake();
		});
		// no frame boundary: the announcer injects synchronously with the commit, so
		// this also pins that a rAF-deferred injection would regress (rAF never runs
		// in a backgrounded tab, which would drop the announcement outright)
		expect(getAlertRegion()).toHaveTextContent(
			"You have unsaved changes. Save or discard them before leaving.",
		);
	});

	test("repeated shakes alternate a trailing no-break space so identical text re-announces", () => {
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake();
		});
		const first = getAlertRegion().textContent;

		act(() => {
			handle.current?.shake();
		});
		const second = getAlertRegion().textContent;

		expect(first).not.toBe(second);
		expect(second).toBe(`${first}\u00A0`);
	});

	test("shake accepts a custom announcement for non-save intents", () => {
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>3 items pending publish</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake({ announcement: "Publish or discard your pending items first." });
		});
		expect(getAlertRegion()).toHaveTextContent("Publish or discard your pending items first.");
	});

	test("opening with no message announces the aria-label politely", () => {
		const tree = ({ open }: { open: boolean }) => (
			<Sandbar.Root aria-label="Pending publishes" open={open}>
				<Sandbar.Actions>
					<Sandbar.SaveButton onClick={() => {}}>Save</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ open: false }));
		rerender(tree({ open: true }));
		expect(getStatusRegion()).toHaveTextContent("Pending publishes");
	});

	test("opening with neither a message nor an aria-label announces the default", () => {
		const tree = ({ open }: { open: boolean }) => (
			<Sandbar.Root open={open}>
				<Sandbar.Actions>
					<Sandbar.SaveButton onClick={() => {}}>Save</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ open: false }));
		rerender(tree({ open: true }));
		expect(getStatusRegion()).toHaveTextContent("Unsaved changes");
	});

	test("the assertive announcer clears itself after the 1s window", () => {
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		act(() => {
			handle.current?.shake();
		});
		expect(getAlertRegion()).toHaveTextContent(
			"You have unsaved changes. Save or discard them before leaving.",
		);

		act(() => {
			vi.advanceTimersByTime(1_000);
		});
		expect(getAlertRegion()).toHaveTextContent("");
	});
});

describe("Sandbar interaction", () => {
	test("clicking the blessed buttons runs the consumer's handlers", async () => {
		const user = userEvent.setup();
		const save = vi.fn<() => void>();
		const discard = vi.fn<() => void>();
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton onClick={discard}>Discard</Sandbar.DiscardButton>
					<Sandbar.SaveButton onClick={save}>Save</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		await user.click(screen.getByRole("button", { name: "Save" }));
		expect(save).toHaveBeenCalledTimes(1);
		expect(discard).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "Discard" }));
		expect(discard).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledTimes(1);
	});

	test("a loading SaveButton is disabled and cannot be activated", async () => {
		const user = userEvent.setup();
		const save = vi.fn<() => void>();
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.SaveButton isLoading onClick={save}>
						Save
					</Sandbar.SaveButton>
				</Sandbar.Actions>
			</Sandbar.Root>,
		);

		const saveButton = screen.getByRole("button", { name: "Save" });
		expect(saveButton).toBeDisabled();
		expect(saveButton).toHaveAttribute("data-loading", "true");
		await user.click(saveButton);
		expect(save).not.toHaveBeenCalled();
	});

	test("Root runs a consumer onTransitionEnd before advancing its own presence", () => {
		const onTransitionEnd = vi.fn<(event: TransitionEvent<HTMLDivElement>) => void>();
		const tree = ({ open }: { open: boolean }) => (
			<Sandbar.Root onTransitionEnd={onTransitionEnd} open={open}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ open: true }));
		rerender(tree({ open: false }));

		const panel = getPanel();
		const event = new Event("transitionend", { bubbles: true, cancelable: true });
		Object.assign(event, { propertyName: "translate" });
		fireEvent(panel, event);

		expect(onTransitionEnd).toHaveBeenCalledTimes(1);
		// field-by-field, not toMatchObject: the argument is a React SyntheticEvent
		// whose `target` is a DOM node, and a deep match walks the whole document
		const forwarded = onTransitionEnd.mock.lastCall?.[0];
		expect(forwarded?.propertyName).toBe("translate");
		expect(forwarded?.target).toBe(panel);
		expect(panel).toHaveAttribute("hidden");
	});
});

describe("Sandbar regressions", () => {
	test("an asChild Message keeps the panel's accessible name pointed at the rendered id", () => {
		// regression: Slot's merge lets the child's own `id` win, so registering the
		// generated id aimed aria-labelledby at a non-existent element — and because
		// a present aria-labelledby suppresses aria-label, the group lost its name
		render(
			<Sandbar.Root open>
				<Sandbar.Message asChild>
					<span id="consumer-owned-id">You have unsaved changes</span>
				</Sandbar.Message>
			</Sandbar.Root>,
		);

		const panel = getPanel();
		expect(panel).toHaveAttribute("aria-labelledby", "consumer-owned-id");
		expect(document.getElementById("consumer-owned-id")).toBeInTheDocument();
		expect(panel).toHaveAccessibleName("You have unsaved changes");
	});

	test("a joined data-slot chain still announces the message text", () => {
		// regression: the lookup used an exact-match [data-slot="sandbar-message"],
		// which cannot match the chain joinDataSlot produces, so the announcement
		// silently fell back to the generic default
		vi.useFakeTimers();
		try {
			const tree = ({ open }: { open: boolean }) => (
				<Sandbar.Root open={open}>
					<Sandbar.Message data-slot="outer-message">You have 3 unsaved endpoints</Sandbar.Message>
				</Sandbar.Root>
			);
			const { rerender } = render(tree({ open: false }));
			rerender(tree({ open: true }));

			expect(
				document.querySelector('[data-slot="outer-message sandbar-message"]'),
			).toBeInTheDocument();
			expect(getStatusRegion()).toHaveTextContent("You have 3 unsaved endpoints");
		} finally {
			vi.useRealTimers();
		}
	});

	test("a repeated polite announcement still reaches the live region", () => {
		// regression: setPoliteText with a byte-identical string is a React bail-out,
		// so a retried save never re-announced "Saving changes…"
		vi.useFakeTimers();
		try {
			const { rerender } = render(loadableSaveTree({ isLoading: false }));

			rerender(loadableSaveTree({ isLoading: true }));
			const first = getStatusRegion().textContent;
			expect(first).toContain("Saving changes…");

			// the save failed; the user retries with the same announcement text
			rerender(loadableSaveTree({ isLoading: false }));
			rerender(loadableSaveTree({ isLoading: true }));
			const second = getStatusRegion().textContent;
			expect(second).toContain("Saving changes…");
			// a live region only speaks on a change, so the two injections must differ
			expect(second).not.toBe(first);
		} finally {
			vi.useRealTimers();
		}
	});

	test("a focused save button that goes disabled while loading parks focus on the panel", () => {
		// the gate's positive path, in the same environment as its negative twin
		// below: Button collapses `isLoading` into the native `disabled` attribute,
		// so without the park focus evaporates mid-save
		const { rerender } = render(loadableSaveTree({ isLoading: false }));

		const saveButton = screen.getByRole("button", { name: "Save" });
		saveButton.focus();
		expect(document.activeElement).toBe(saveButton);

		rerender(loadableSaveTree({ isLoading: true }));
		expect(saveButton).toBeDisabled();
		expect(document.activeElement).toBe(getPanel());
	});

	test("a save button left explicitly enabled while loading keeps focus", () => {
		// regression: Button resolves disabled as `ariaDisabled ?? disabled ??
		// isLoading`, so `disabled={false}` beside `isLoading` leaves it enabled and
		// focusable — parking focus then yanked it off a live, still-clickable
		// control onto a panel that renders no focus ring
		const { rerender } = render(loadableSaveTree({ disabled: false, isLoading: false }));

		const saveButton = screen.getByRole("button", { name: "Save" });
		saveButton.focus();

		rerender(loadableSaveTree({ disabled: false, isLoading: true }));
		expect(saveButton).not.toBeDisabled();
		expect(document.activeElement).toBe(saveButton);
	});
});
