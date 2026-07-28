import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SkipToMainLink } from "./skip-to-main-link.js";

describe("SkipToMainLink", () => {
	afterEach(() => {
		window.history.replaceState(null, "", "/");
	});

	test("renders an anchor with `href` derived from the default `targetId`", () => {
		render(<SkipToMainLink />);
		const link = screen.getByRole("link", { name: "Skip to main content" });
		expect(link).toHaveAttribute("href", "#main");
	});

	test("renders an anchor with `href` derived from a custom `targetId`", () => {
		render(<SkipToMainLink targetId="content" />);
		const link = screen.getByRole("link", { name: "Skip to main content" });
		expect(link).toHaveAttribute("href", "#content");
	});

	test("cancels the click so the browser neither scrolls nor adds a history entry", () => {
		// The anchor keeps `href="#main"` for copy-link / no-JS semantics, so the
		// only thing standing between activation and the browser's own hash
		// navigation — which scrolls the target into view and pushes a history
		// entry, neither of which goes through history.pushState — is
		// preventDefault(). Assert cancellation directly: a spy on pushState can
		// never observe the default behavior it is supposed to rule out.
		render(
			<>
				<SkipToMainLink />
				<main id="main" tabIndex={-1}>
					main content
				</main>
			</>,
		);
		const link = screen.getByRole("link", { name: "Skip to main content" });
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });

		fireEvent(link, click);

		expect(click.defaultPrevented).toBe(true);
	});

	test("on click, focuses the default target element without scrolling", async () => {
		const user = userEvent.setup();
		render(
			<>
				<SkipToMainLink />
				<main id="main" tabIndex={-1}>
					main content
				</main>
			</>,
		);
		const main = screen.getByRole("main");
		const focusSpy = vi.spyOn(main, "focus");

		await user.click(screen.getByRole("link", { name: "Skip to main content" }));

		expect(focusSpy).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
		expect(main).toHaveFocus();
		expect(window.location.hash).toBe("#main");
	});

	test("on click, focuses the element matching a custom `targetId`", async () => {
		const user = userEvent.setup();
		render(
			<>
				<SkipToMainLink targetId="content" />
				{/* a decoy with the default id: the lookup must follow targetId,
				    not the hard-coded "main" */}
				<div id="main" tabIndex={-1} data-testid="decoy" />
				<main id="content" tabIndex={-1}>
					main content
				</main>
			</>,
		);

		await user.click(screen.getByRole("link", { name: "Skip to main content" }));

		expect(screen.getByRole("main")).toHaveFocus();
		expect(screen.getByTestId("decoy")).not.toHaveFocus();
		expect(window.location.hash).toBe("#content");
	});

	test("on click, still updates the hash when no element matches `targetId`", async () => {
		const user = userEvent.setup();
		render(<SkipToMainLink targetId="not-in-the-document" />);
		const link = screen.getByRole("link", { name: "Skip to main content" });

		await user.click(link);

		// the optional-chained lookup must not throw, and the hash update runs
		// before it, so a broken landmark id still leaves a shareable URL
		expect(window.location.hash).toBe("#not-in-the-document");
		expect(link).toHaveFocus();
	});

	test("replaces the history entry rather than pushing one", async () => {
		const user = userEvent.setup();
		// `window.location.hash` reads the same after replaceState, pushState, and a
		// plain `location.hash = …`, so the hash assertions elsewhere in this file
		// cannot see the component start pushing entries — which would break Back
		// for every keyboard user who used the skip link.
		const replaceState = vi.spyOn(window.history, "replaceState");
		const pushState = vi.spyOn(window.history, "pushState");
		render(
			<>
				<SkipToMainLink />
				<main id="main" tabIndex={-1}>
					main content
				</main>
			</>,
		);

		await user.click(screen.getByRole("link", { name: "Skip to main content" }));

		expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "#main");
		expect(pushState).not.toHaveBeenCalled();
	});

	test("invokes the consumer `onClick` after performing the core behavior", async () => {
		const user = userEvent.setup();
		const stateAtCallTime: { activeElement: Element | null; hash: string } = {
			activeElement: null,
			hash: "",
		};
		const handleClick = vi.fn<() => void>(() => {
			stateAtCallTime.activeElement = document.activeElement;
			stateAtCallTime.hash = window.location.hash;
		});
		render(
			<>
				<SkipToMainLink onClick={handleClick} />
				<main id="main" tabIndex={-1}>
					main content
				</main>
			</>,
		);

		await user.click(screen.getByRole("link", { name: "Skip to main content" }));

		expect(handleClick).toHaveBeenCalledTimes(1);
		// "after" is the contract: the consumer handler observes an already
		// updated hash and an already focused landmark, so it can override either
		expect(stateAtCallTime.hash).toBe("#main");
		expect(stateAtCallTime.activeElement).toBe(screen.getByRole("main"));
	});
});
