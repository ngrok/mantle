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

	test("joins the ancestor `data-slot` chain ahead of its own slot on the anchor", () => {
		render(<SkipToMainLink data-slot="outer" />);
		expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
			"data-slot",
			"outer skip-to-main-link anchor",
		);
	});

	test("renders an anchor with `href` derived from a custom `targetId`", () => {
		render(<SkipToMainLink targetId="content" />);
		const link = screen.getByRole("link", { name: "Skip to main content" });
		expect(link).toHaveAttribute("href", "#content");
	});

	test("cancels the click so the browser neither scrolls nor adds a history entry", () => {
		// The anchor keeps `href="#main"` for copy-link and no-JS semantics, so only
		// `preventDefault()` stops the browser's own hash navigation. A spy on
		// `pushState` cannot observe that default, so assert the cancellation itself.
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

	test("on click, focuses the target element and lets the browser scroll it into view", async () => {
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

		// Why no options: `preventScroll` would leave an off-screen target focused
		// but out of view.
		expect(focusSpy).toHaveBeenCalledTimes(1);
		expect(focusSpy).toHaveBeenCalledWith();
		expect(main).toHaveFocus();
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

	test("on click, updates the URL hash via history.replaceState (no new history entry)", async () => {
		const user = userEvent.setup();
		const replaceStateSpy = vi.spyOn(window.history, "replaceState");
		const pushStateSpy = vi.spyOn(window.history, "pushState");

		render(
			<>
				<SkipToMainLink />
				<main id="main" tabIndex={-1}>
					main content
				</main>
			</>,
		);

		await user.click(screen.getByRole("link", { name: "Skip to main content" }));

		expect(replaceStateSpy).toHaveBeenCalledTimes(1);
		expect(replaceStateSpy).toHaveBeenLastCalledWith(null, "", "#main");
		expect(pushStateSpy).not.toHaveBeenCalled();
		expect(window.location.hash).toBe("#main");
	});

	test("calls the consumer `onClick` after the hash update and the focus move", async () => {
		const user = userEvent.setup();
		let hashAtCall = "";
		let focusedAtCall: Element | null = null;
		const handleClick = vi.fn<() => void>(() => {
			hashAtCall = window.location.hash;
			focusedAtCall = document.activeElement;
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
		expect(hashAtCall).toBe("#main");
		expect(focusedAtCall).toBe(screen.getByRole("main"));
	});
});
