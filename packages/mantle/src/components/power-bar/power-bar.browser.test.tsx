import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { PowerBarHandle } from "./power-bar.js";
import { PowerBar } from "./power-bar.js";

function getPanel(): HTMLElement {
	const panel = document.querySelector('[data-slot="power-bar"]');
	if (!(panel instanceof HTMLElement)) {
		throw new Error("power bar panel not found");
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

/** Mock `matchMedia` to report `prefers-reduced-motion: reduce`. */
function mockReducedMotion() {
	// "(prefers-reduced-motion: no-preference)" → matches: false means reduced
	return vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn<() => void>(),
		removeListener: vi.fn<() => void>(),
		addEventListener: vi.fn<() => void>(),
		removeEventListener: vi.fn<() => void>(),
		dispatchEvent: vi.fn<() => boolean>(),
	}));
}

/** Wait out the passive effects that run after a timeout-driven close commit. */
async function settle() {
	await new Promise((resolve) => {
		window.setTimeout(resolve, 50);
	});
}

describe("PowerBar (browser)", () => {
	test("shake animates the panel with the wiggle keyframes", () => {
		const handle = { current: null as PowerBarHandle | null };
		render(
			<PowerBar.Root handleRef={handle} open>
				<PowerBar.Message>You have unsaved changes</PowerBar.Message>
			</PowerBar.Root>,
		);

		const animateSpy = vi.spyOn(HTMLDivElement.prototype, "animate");
		handle.current?.shake();

		expect(animateSpy).toHaveBeenCalledTimes(1);
		const [keyframes, options] = animateSpy.mock.calls[0] ?? [];
		expect(Array.isArray(keyframes) && keyframes.length).toBe(8);
		expect(options).toMatchObject({ duration: 400, easing: "ease-in-out" });
		animateSpy.mockRestore();
	});

	test("a re-triggered shake cancels the in-flight animation", () => {
		const handle = { current: null as PowerBarHandle | null };
		render(
			<PowerBar.Root handleRef={handle} open>
				<PowerBar.Message>You have unsaved changes</PowerBar.Message>
			</PowerBar.Root>,
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
		const matchMediaSpy = mockReducedMotion();
		const handle = { current: null as PowerBarHandle | null };
		render(
			<PowerBar.Root handleRef={handle} open>
				<PowerBar.Message>You have unsaved changes</PowerBar.Message>
			</PowerBar.Root>,
		);

		const animateSpy = vi.spyOn(HTMLDivElement.prototype, "animate");
		handle.current?.shake();

		expect(animateSpy).not.toHaveBeenCalled();
		await waitFor(() => {
			expect(getAlertRegion()).toHaveTextContent(
				"You have unsaved changes. Save or discard them before leaving.",
			);
		});

		animateSpy.mockRestore();
		matchMediaSpy.mockRestore();
	});

	test("closing hides the panel via the safety timeout when no CSS transition runs", async () => {
		// browser tests load no Tailwind, so the exit transition never fires and
		// the 400ms safety timeout is the path that must close the panel
		const tree = ({ open }: { open: boolean }) => (
			<PowerBar.Root open={open}>
				<PowerBar.Message>You have unsaved changes</PowerBar.Message>
			</PowerBar.Root>
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
			<PowerBar.Root open>
				<PowerBar.Message>You have unsaved changes</PowerBar.Message>
				<PowerBar.Actions>
					<PowerBar.SaveButton isLoading={isLoading} onClick={() => {}}>
						Save
					</PowerBar.SaveButton>
				</PowerBar.Actions>
			</PowerBar.Root>
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
				<PowerBar.Root open={open}>
					<PowerBar.Message>You have unsaved changes</PowerBar.Message>
					<PowerBar.Actions>
						<PowerBar.DiscardButton onClick={() => {}}>Discard</PowerBar.DiscardButton>
					</PowerBar.Actions>
				</PowerBar.Root>
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
				<PowerBar.Root open={open}>
					<PowerBar.Message>You have unsaved changes</PowerBar.Message>
					<PowerBar.Actions>
						<PowerBar.DiscardButton onClick={() => {}}>Discard</PowerBar.DiscardButton>
					</PowerBar.Actions>
				</PowerBar.Root>
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
		// let the passive restore effect run, then confirm it left focus alone
		await settle();
		expect(document.activeElement).toBe(elsewhere);
	});

	test("a stale restore target from a previous session never steals focus", async () => {
		// regression: restoreFocusRef must reset when a close session ends
		const tree = ({ open }: { open: boolean }) => (
			<div>
				<button type="button">Field A</button>
				<button type="button">Field B</button>
				<PowerBar.Root open={open}>
					<PowerBar.Message>You have unsaved changes</PowerBar.Message>
					<PowerBar.Actions>
						<PowerBar.DiscardButton onClick={() => {}}>Discard</PowerBar.DiscardButton>
					</PowerBar.Actions>
				</PowerBar.Root>
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
		await settle();
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
		await settle();
		expect(document.activeElement).not.toBe(fieldA);
	});

	test("restore is skipped when the pre-bar element has been removed", async () => {
		const tree = ({ open, showOutside }: { open: boolean; showOutside: boolean }) => (
			<div>
				{showOutside && <button type="button">Removed later</button>}
				<PowerBar.Root open={open}>
					<PowerBar.Message>You have unsaved changes</PowerBar.Message>
					<PowerBar.Actions>
						<PowerBar.DiscardButton onClick={() => {}}>Discard</PowerBar.DiscardButton>
					</PowerBar.Actions>
				</PowerBar.Root>
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
		await settle();
		// the stored target is disconnected — focus is left where the browser
		// put it rather than restored to a dead node
		expect(document.activeElement).toBe(document.body);
	});
});
