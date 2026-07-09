import { render, screen } from "@testing-library/react";
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

	test("on click, focuses the target element without scrolling", async () => {
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

		expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
		expect(main).toHaveFocus();
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

		expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "#main");
		expect(pushStateSpy).not.toHaveBeenCalled();
		expect(window.location.hash).toBe("#main");

		replaceStateSpy.mockRestore();
		pushStateSpy.mockRestore();
	});

	test("invokes the consumer `onClick` after performing the core behavior", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();
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
	});
});
