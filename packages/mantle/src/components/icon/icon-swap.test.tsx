import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { IconSwap } from "./icon-swap.js";

describe("IconSwap", () => {
	test("shows the active icon and hides the others from assistive technology", () => {
		render(
			<IconSwap
				active="check"
				icons={{
					check: <svg role="img" aria-label="Copied" />,
					copy: <svg role="img" aria-label="Copy" data-testid="copy" />,
				}}
			/>,
		);
		expect(screen.getByRole("img", { name: "Copied" })).toHaveAttribute("data-state", "active");
		expect(screen.queryByRole("img", { name: "Copy" })).not.toBeInTheDocument();
		expect(screen.getByTestId("copy")).toHaveAttribute("data-state", "inactive");
	});

	test("swaps the state of the same mounted icons", () => {
		const { rerender } = render(
			<IconSwap
				active="copy"
				icons={{ check: <svg data-testid="check" />, copy: <svg data-testid="copy" /> }}
			/>,
		);
		const check = screen.getByTestId("check");
		const copy = screen.getByTestId("copy");
		expect(copy).toHaveAttribute("data-state", "active");
		expect(check).toHaveAttribute("data-state", "inactive");

		rerender(
			<IconSwap
				active="check"
				icons={{ check: <svg data-testid="check" />, copy: <svg data-testid="copy" /> }}
			/>,
		);
		expect(screen.getByTestId("check")).toBe(check);
		expect(screen.getByTestId("copy")).toBe(copy);
		expect(check).toHaveAttribute("data-state", "active");
		expect(copy).toHaveAttribute("data-state", "inactive");
	});

	test("passes className, data attributes, and a joined data-slot to the root", () => {
		render(
			<IconSwap
				active="copy"
				icons={{ copy: <svg data-testid="copy" /> }}
				className="order-last"
				data-slot="copy-button"
				data-testid="root"
			/>,
		);
		const root = screen.getByTestId("root");
		expect(root).toHaveAttribute("data-slot", "copy-button icon-swap");
		expect(root).toHaveClass("order-last");
		expect(root).toContainElement(screen.getByTestId("copy"));
	});
});
