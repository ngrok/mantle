import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { mockMatchMedia } from "../../test-utils/mock-match-media.js";
import type { SandbarHandle } from "./sandbar.js";
import { Sandbar } from "./sandbar.js";

function getPanel(): HTMLElement {
	const panel = document.querySelector('[data-slot="sandbar"]');
	if (!(panel instanceof HTMLElement)) {
		throw new Error("sandbar panel not found");
	}
	return panel;
}

function getAlertRegion(): HTMLElement {
	const region = document.querySelector('div.sr-only[role="alert"]');
	if (!(region instanceof HTMLElement)) {
		throw new Error("assertive region not found");
	}
	return region;
}

describe("Sandbar (browser)", () => {
	test("shake animates the panel with the wiggle keyframes", () => {
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		const animateSpy = vi.spyOn(HTMLDivElement.prototype, "animate");
		handle.current?.shake();

		expect(animateSpy).toHaveBeenCalledTimes(1);
		const [keyframes, options] = animateSpy.mock.calls[0] ?? [];
		expect(Array.isArray(keyframes) && keyframes.length).toBe(8);
		expect(options).toMatchObject({ duration: 400, easing: "ease-in-out" });
	});

	test("a re-triggered shake cancels the in-flight animation", () => {
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		handle.current?.shake();
		const [first] = getPanel().getAnimations();
		expect(first).toBeDefined();

		handle.current?.shake();
		// cancel() drops the first animation to the idle state
		expect(first?.playState).toBe("idle");
		expect(getPanel().getAnimations().length).toBe(1);
	});

	test("shake under prefers-reduced-motion skips the animation but still announces", async () => {
		// `getPrefersReducedMotion` queries "(prefers-reduced-motion: no-preference)",
		// and an unprimed query reports `matches: false` — i.e. reduced motion.
		mockMatchMedia();
		const handle = createRef<SandbarHandle>();
		render(
			<Sandbar.Root handleRef={handle} open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		const animateSpy = vi.spyOn(HTMLDivElement.prototype, "animate");
		handle.current?.shake();

		expect(animateSpy).not.toHaveBeenCalled();
		await waitFor(() => {
			expect(getAlertRegion()).toHaveTextContent(
				"You have unsaved changes. Save or discard them before leaving.",
			);
		});
	});

	test("closing hides the panel via the safety timeout when no CSS transition runs", async () => {
		// browser tests load no Tailwind, so the exit transition never fires and
		// the 400ms safety timeout is the path that must close the panel
		const tree = ({ open }: { open: boolean }) => (
			<Sandbar.Root open={open}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ open: true }));
		rerender(tree({ open: false }));

		const panel = getPanel();
		expect(panel).not.toHaveAttribute("hidden");
		await waitFor(() => {
			expect(panel).toHaveAttribute("hidden");
		});
	});

	test("a focused save button going isLoading parks focus on the panel", async () => {
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

		const saveButton = screen.getByRole("button", { name: "Save" });
		saveButton.focus();
		expect(document.activeElement).toBe(saveButton);

		rerender(tree({ isLoading: true }));

		// the Button collapsed isLoading into native disabled — focus must land
		// on the panel instead of evaporating to <body>
		await waitFor(() => {
			expect(document.activeElement).toBe(getPanel());
		});
	});

	// NOTE (plan §6): there is deliberately no test for the generic focusout
	// parking path with a composed plain button — verified empirically that
	// Chromium does not fire focusout when a focused button becomes disabled
	// (the WHATWG focus-fixup divergence), so only the blessed SaveButton path
	// can guarantee parking. The focusout handler remains as best-effort for
	// engines that do fire it.

	test("closing restores focus to the element focused before entering the bar", async () => {
		const tree = ({ open }: { open: boolean }) => (
			<div>
				<button type="button">Last form field</button>
				<Sandbar.Root open={open}>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
					<Sandbar.Actions>
						<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
					</Sandbar.Actions>
				</Sandbar.Root>
			</div>
		);
		const { rerender } = render(tree({ open: true }));

		const outside = screen.getByRole("button", { name: "Last form field" });
		outside.focus();
		screen.getByRole("button", { name: "Discard" }).focus();

		rerender(tree({ open: false }));
		// the restore runs in a passive effect after the close commit — wait for
		// the focus outcome itself, not just the hidden attribute
		await waitFor(() => {
			expect(getPanel()).toHaveAttribute("hidden");
			expect(document.activeElement).toBe(outside);
		});
	});

	test("closing leaves focus alone when the user has already moved on", async () => {
		const tree = ({ open }: { open: boolean }) => (
			<div>
				<button type="button">Elsewhere</button>
				<Sandbar.Root open={open}>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
					<Sandbar.Actions>
						<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
					</Sandbar.Actions>
				</Sandbar.Root>
			</div>
		);
		const { rerender } = render(tree({ open: true }));

		const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
		screen.getByRole("button", { name: "Discard" }).focus();
		elsewhere.focus();

		rerender(tree({ open: false }));
		await waitFor(() => {
			expect(getPanel()).toHaveAttribute("hidden");
		});
		// flush the passive restore effect, then confirm it left focus alone. `act`
		// drains React's effect queue deterministically — a fixed sleep would let
		// this assertion pass merely by running before the effect it is guarding.
		await act(async () => {});
		expect(document.activeElement).toBe(elsewhere);
	});

	test("a stale restore target from a previous session never steals focus", async () => {
		// regression: restoreFocusRef must reset when a close session ends
		const tree = ({ open }: { open: boolean }) => (
			<div>
				<button type="button">Field A</button>
				<button type="button">Field B</button>
				<Sandbar.Root open={open}>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
					<Sandbar.Actions>
						<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
					</Sandbar.Actions>
				</Sandbar.Root>
			</div>
		);
		const { rerender } = render(tree({ open: true }));

		const fieldA = screen.getByRole("button", { name: "Field A" });
		const fieldB = screen.getByRole("button", { name: "Field B" });
		const discard = screen.getByRole("button", { name: "Discard" });

		// session 1: enter the bar from Field A, then move on to Field B
		fieldA.focus();
		discard.focus();
		fieldB.focus();
		rerender(tree({ open: false }));
		await waitFor(() => {
			expect(getPanel()).toHaveAttribute("hidden");
		});
		await act(async () => {});
		expect(document.activeElement).toBe(fieldB);

		// session 2: reopen and focus the bar directly from <body> — closing must
		// not teleport focus back to session 1's Field A
		rerender(tree({ open: true }));
		fieldB.blur();
		discard.focus();
		rerender(tree({ open: false }));
		await waitFor(() => {
			expect(getPanel()).toHaveAttribute("hidden");
		});
		await act(async () => {});
		expect(document.activeElement).not.toBe(fieldA);
	});

	test("restore is skipped when the pre-bar element has been removed", async () => {
		const tree = ({ open, showOutside }: { open: boolean; showOutside: boolean }) => (
			<div>
				{showOutside && <button type="button">Removed later</button>}
				<Sandbar.Root open={open}>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
					<Sandbar.Actions>
						<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
					</Sandbar.Actions>
				</Sandbar.Root>
			</div>
		);
		const { rerender } = render(tree({ open: true, showOutside: true }));

		screen.getByRole("button", { name: "Removed later" }).focus();
		screen.getByRole("button", { name: "Discard" }).focus();

		rerender(tree({ open: true, showOutside: false }));
		rerender(tree({ open: false, showOutside: false }));

		await waitFor(() => {
			expect(getPanel()).toHaveAttribute("hidden");
		});
		// the stored target is disconnected — focus is left where the browser put it
		// rather than restored to a dead node. Poll the focus itself: hiding the
		// panel drops focus to <body> through the browser's own focus-fixup, which
		// is not synchronous with the DOM mutation.
		await expect.poll(() => document.activeElement).toBe(document.body);
	});

	test("closing restores focus after an in-bar control dropped focus to the body", async () => {
		const tree = ({ open }: { open: boolean }) => (
			<div>
				<button type="button">Last form field</button>
				<Sandbar.Root open={open}>
					<Sandbar.Message>You have unsaved changes</Sandbar.Message>
					<Sandbar.Actions>
						<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
					</Sandbar.Actions>
				</Sandbar.Root>
			</div>
		);
		const { rerender } = render(tree({ open: true }));

		const outside = screen.getByRole("button", { name: "Last form field" });
		const discard = screen.getByRole("button", { name: "Discard" });
		outside.focus();
		discard.focus();
		// the in-bar control loses focus to <body> (not to another control) while
		// the bar is still open — the departed control is still connected, so the
		// focusout parking is a no-op and focus stays on <body>. Closing then runs
		// through the fell-to-body restore branch, not the focus-still-in-bar one.
		discard.blur();
		expect(document.activeElement).toBe(document.body);

		rerender(tree({ open: false }));
		await waitFor(() => {
			expect(getPanel()).toHaveAttribute("hidden");
			expect(document.activeElement).toBe(outside);
		});
	});

	// NOTE: the restore effect's remaining rejection guards — a stored candidate
	// that is now `:disabled`, or that fails `checkVisibility()` — are deliberately
	// untested. `HTMLElement.focus()` on a disabled or non-rendered element is a
	// spec-defined no-op, so removing either guard leaves the identical observable
	// outcome (focus stays on <body>); a black-box focus assertion cannot tell the
	// two apart. They remain as defensive fast-paths that skip a wasted focus() call.

	test("the panel is inert through the exit, not only once closed", async () => {
		const tree = ({ open }: { open: boolean }) => (
			<Sandbar.Root open={open}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
				<Sandbar.Actions>
					<Sandbar.DiscardButton onClick={() => {}}>Discard</Sandbar.DiscardButton>
				</Sandbar.Actions>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ open: true }));

		const panel = getPanel();
		const discard = screen.getByRole("button", { name: "Discard" });
		discard.focus();
		expect(document.activeElement).toBe(discard);
		expect(panel).not.toHaveAttribute("inert");

		rerender(tree({ open: false }));

		// Mid-exit: still painted (`hidden` lands only at rest, 400ms later via the
		// safety timeout) but no longer reachable. Without `inert` here the user
		// could Tab onto the visually-vanishing Discard button and activate it —
		// `data-state-closed:pointer-events-none` suppresses only the mouse.
		expect(panel).not.toHaveAttribute("hidden");
		expect(panel).toHaveAttribute("inert");
		// the browser evicts focus from an inert subtree, though not synchronously
		// with the attribute write
		await expect.poll(() => panel.contains(document.activeElement)).toBe(false);
	});
});

/**
 * Mirrors the two display utilities Tailwind 4 emits for the panel, in the layer
 * and selector form it emits them — that is what decides the cascade. Chromium's
 * own UA stylesheet supplies `[hidden] { display: none }`; Preflight (which would
 * add `[hidden] { display: none !important }`) is deliberately NOT included,
 * because a consumer importing only `tailwindcss/theme` + `tailwindcss/utilities`
 * does not get it either.
 */
const DISPLAY_STYLE = `
@layer utilities {
	.flex { display: flex; }
	.\\[\\&\\[hidden\\]\\]\\:hidden[hidden] { display: none; }
}
`;

describe("Sandbar closed-state display (browser)", () => {
	let styleElement: HTMLStyleElement;

	beforeAll(() => {
		styleElement = document.createElement("style");
		styleElement.textContent = DISPLAY_STYLE;
		document.head.appendChild(styleElement);
	});

	afterAll(() => {
		styleElement.remove();
	});

	test("the open panel lays out as a flex row", () => {
		render(
			<Sandbar.Root open>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>,
		);

		expect(getComputedStyle(getPanel()).display).toBe("flex");
	});

	test("the closed panel is display:none without Preflight's [hidden] override", async () => {
		const tree = ({ open }: { open: boolean }) => (
			<Sandbar.Root open={open}>
				<Sandbar.Message>You have unsaved changes</Sandbar.Message>
			</Sandbar.Root>
		);
		const { rerender } = render(tree({ open: true }));
		const panel = getPanel();

		rerender(tree({ open: false }));
		await waitFor(() => {
			expect(panel).toHaveAttribute("hidden");
		});

		// `.flex` is author-origin and outranks the UA `[hidden]` rule, so the bar
		// would stay fully visible, inert and un-dismissable at the bottom of every
		// page. The attribute-qualified variant on the panel is what wins instead.
		expect(getComputedStyle(panel).display).toBe("none");
	});
});
