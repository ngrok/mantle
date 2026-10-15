import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { SkipToMainLink } from "../skip-to-main-link/skip-to-main-link.js";
import { Main } from "./main.js";

describe("Main", () => {
	test("renders a focusable main landmark with the skip-link contract", () => {
		render(<Main data-testid="main">content</Main>);
		const main = screen.getByRole("main");
		expect(main).toBe(screen.getByTestId("main"));
		expect(main).toHaveAttribute("id", "main");
		expect(main).toHaveAttribute("tabindex", "-1");
		expect(main).toHaveAttribute("data-slot", "main");
	});

	test("receives focus when the paired skip link is activated", async () => {
		const user = userEvent.setup();
		render(
			<>
				<SkipToMainLink />
				<Main>content</Main>
			</>,
		);
		const main = screen.getByRole("main");
		expect(main).not.toHaveFocus();

		// SkipToMainLink resolves its target with getElementById(targetId), so its
		// default "main" target and Main's id="main" are one cross-file contract —
		// both sides are rendered here so a rename of either turns this red.
		await user.click(screen.getByRole("link", { name: "Skip to main content" }));

		expect(main).toHaveFocus();
	});

	test("appends its own slot to an incoming data-slot chain", () => {
		render(<Main data-slot="centered-layout-body">content</Main>);
		expect(screen.getByRole("main")).toHaveAttribute("data-slot", "centered-layout-body main");
	});

	test("forwards its ref to the rendered main element", () => {
		const ref = createRef<HTMLElement>();
		render(<Main ref={ref}>content</Main>);
		expect(ref.current).toBe(screen.getByRole("main"));
	});

	test("merges custom className", () => {
		render(<Main className="custom-class">content</Main>);
		// Why the class check: the tailwind-merge contract puts the consumer's class beside the defaults.
		expect(screen.getByRole("main")).toHaveClass("custom-class");
	});

	test("locks id and tabIndex so the skip-link target cannot drift", () => {
		// Why two renders: TypeScript reports one excess attribute per element, so
		// each stray prop needs its own `@ts-expect-error`.
		const { unmount } = render(
			<Main
				// @ts-expect-error -- id is not a Main prop; the skip link targets #main
				id="elsewhere"
			>
				content
			</Main>,
		);
		expect(screen.getByRole("main")).toHaveAttribute("id", "main");
		unmount();

		render(
			<Main
				// @ts-expect-error -- tabIndex is not a Main prop; the landmark must stay focusable
				tabIndex={0}
			>
				content
			</Main>,
		);
		expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
	});
});
