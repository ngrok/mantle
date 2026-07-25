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
		const main = screen.getByRole("main");
		expect(main.className).toContain("custom-class");
		expect(main.className).toContain("focus:outline-hidden");
	});
});
