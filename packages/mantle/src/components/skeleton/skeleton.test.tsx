import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Skeleton } from "./skeleton.js";

describe("Skeleton", () => {
	test("is hidden from assistive technology by default", () => {
		render(<Skeleton data-testid="skeleton" />);
		const skeleton = screen.getByTestId("skeleton");
		expect(skeleton).toHaveAttribute("aria-hidden", "true");
		expect(skeleton).toHaveAttribute("data-slot", "skeleton");
	});

	test("aria-hidden={false} opts the placeholder back into the accessibility tree", () => {
		render(<Skeleton aria-hidden={false} data-testid="skeleton" />);
		expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "false");
	});

	test("asChild renders the child with the slot and the hidden state", () => {
		render(
			<Skeleton asChild className="h-12 w-12 rounded-full">
				<span data-testid="skeleton" />
			</Skeleton>,
		);
		const skeleton = screen.getByTestId("skeleton");
		expect(skeleton.tagName).toBe("SPAN");
		expect(skeleton).toHaveAttribute("aria-hidden", "true");
		expect(skeleton).toHaveAttribute("data-slot", "skeleton");
	});
});
