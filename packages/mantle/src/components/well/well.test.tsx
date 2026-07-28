import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { Well } from "./well.js";

describe("Well", () => {
	test("renders a div with its data-slot", () => {
		render(<Well data-testid="well">content</Well>);
		const well = screen.getByTestId("well");
		expect(well.tagName).toBe("DIV");
		expect(well).toHaveAttribute("data-slot", "well");
		expect(well).toHaveTextContent("content");
	});

	test("lets a custom className override the conflicting default surface", () => {
		render(
			<Well data-testid="well" className="custom-class bg-card">
				content
			</Well>,
		);
		const well = screen.getByTestId("well");
		expect(well).toHaveClass("custom-class", "bg-card");
		// tailwind-merge resolves the same-group conflict in the consumer's favor
		expect(well).not.toHaveClass("bg-base");
	});

	test("forwards ref to the rendered div", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Well data-testid="well" ref={ref}>
				content
			</Well>,
		);
		expect(ref.current).toBe(screen.getByTestId("well"));
	});

	test("forwards arbitrary data-* props", () => {
		render(
			<Well data-testid="well" data-analytics-id="empty-state">
				content
			</Well>,
		);
		expect(screen.getByTestId("well")).toHaveAttribute("data-analytics-id", "empty-state");
	});

	test("asChild renders its child, merging classes, ref, and data-slot onto it", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Well asChild className="custom-class" ref={ref}>
				<section aria-label="Summary" className="child-class" data-testid="well">
					content
				</section>
			</Well>,
		);
		const well = screen.getByRole("region", { name: "Summary" });
		expect(well).toBe(screen.getByTestId("well"));
		expect(well).toHaveAttribute("data-slot", "well");
		// both the consumer's Well className and the child's own className survive
		expect(well).toHaveClass("custom-class", "child-class");
		expect(ref.current).toBe(well);
	});
});
