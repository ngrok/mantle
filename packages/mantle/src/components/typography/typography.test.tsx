import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import * as Typography from "./typography-parts.js";

describe("Typography", () => {
	test.each([
		[1, Typography.H1],
		[2, Typography.H2],
		[3, Typography.H3],
		[4, Typography.H4],
		[5, Typography.H5],
		[6, Typography.H6],
	] as const)("H%i renders a heading of its level and stamps its slot", (level, Part) => {
		render(<Part data-testid="heading">Endpoints</Part>);
		const heading = screen.getByRole("heading", { level, name: "Endpoints" });
		expect(heading).toHaveAttribute("data-slot", `typography-h${level}`);
		expect(heading).toBe(screen.getByTestId("heading"));
	});

	test("P renders a paragraph that takes className, ref, and data attributes", () => {
		const ref = createRef<HTMLParagraphElement>();
		render(
			<Typography.P ref={ref} className="custom" data-testid="paragraph">
				Each endpoint gets a public URL.
			</Typography.P>,
		);
		const paragraph = screen.getByTestId("paragraph");
		expect(paragraph.tagName).toBe("P");
		expect(paragraph).toHaveAttribute("data-slot", "typography-p");
		expect(paragraph).toHaveClass("custom");
		expect(ref.current).toBe(paragraph);
	});

	test("P asChild renders the child with its class, data attributes, and ref", () => {
		const ref = createRef<HTMLParagraphElement>();
		render(
			<figure>
				<Typography.P asChild ref={ref} className="custom" data-testid="caption">
					<figcaption className="child">Traffic by region</figcaption>
				</Typography.P>
			</figure>,
		);
		const caption = screen.getByTestId("caption");
		expect(caption.tagName).toBe("FIGCAPTION");
		expect(caption).toHaveAttribute("data-slot", "typography-p");
		expect(caption).toHaveClass("custom", "child");
		expect(ref.current).toBe(caption);
	});

	test("a heading composed with asChild joins the data-slot chain", () => {
		render(
			<Typography.H2 asChild data-slot="card-title">
				<h2 data-testid="heading">Traffic policy</h2>
			</Typography.H2>,
		);
		expect(screen.getByTestId("heading")).toHaveAttribute("data-slot", "card-title typography-h2");
	});
});
