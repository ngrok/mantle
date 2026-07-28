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

	test("merges a custom className and forwards arbitrary props", () => {
		render(
			<Main aria-label="Primary content" className="custom-class">
				content
			</Main>,
		);
		const main = screen.getByRole("main", { name: "Primary content" });
		expect(main).toHaveClass("custom-class");
	});
});
