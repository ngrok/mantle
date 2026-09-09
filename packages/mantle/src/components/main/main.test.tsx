import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
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

	test("forwards its ref to the rendered main element", () => {
		const ref = createRef<HTMLElement>();
		render(<Main ref={ref}>content</Main>);
		expect(ref.current).toBe(screen.getByRole("main"));
	});

	test("merges custom className", () => {
		render(<Main className="custom-class">content</Main>);
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
