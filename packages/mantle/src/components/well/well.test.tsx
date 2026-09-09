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

	test("a consumer className wins over the default background", () => {
		// tailwind-merge override contract: the consumer's utility replaces the
		// conflicting default instead of sitting next to it.
		render(
			<Well data-testid="well" className="custom-class bg-red-500">
				content
			</Well>,
		);
		const well = screen.getByTestId("well");
		expect(well.className).toContain("custom-class");
		expect(well.className).toContain("bg-red-500");
		expect(well.className).not.toContain("bg-base");
	});

	test("forwards ref to the underlying div", () => {
		const ref = createRef<HTMLDivElement>();
		render(<Well ref={ref}>content</Well>);
		expect(ref.current).not.toBeNull();
		expect(ref.current?.tagName).toBe("DIV");
	});

	test("forwards arbitrary data-* props", () => {
		render(
			<Well data-testid="well" data-analytics-id="empty-state">
				content
			</Well>,
		);
		expect(screen.getByTestId("well")).toHaveAttribute("data-analytics-id", "empty-state");
	});

	test("asChild renders its child, merging classes and data-slot onto it", () => {
		render(
			<Well asChild className="custom-class">
				<section data-testid="well">content</section>
			</Well>,
		);
		const well = screen.getByTestId("well");
		expect(well.tagName).toBe("SECTION");
		expect(well).toHaveAttribute("data-slot", "well");
		expect(well.className).toContain("custom-class");
	});
});
