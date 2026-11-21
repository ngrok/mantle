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

	test("Root asChild renders the child with its class, data attributes, and ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Typography.Root asChild ref={ref} className="custom" data-testid="root">
				<article aria-label="Post" className="child" />
			</Typography.Root>,
		);
		const article = screen.getByRole("article", { name: "Post" });
		expect(article).toHaveAttribute("data-slot", "typography");
		expect(article).toHaveAttribute("data-testid", "root");
		expect(article).toHaveClass("type-prose", "custom", "child");
		expect(ref.current).toBe(article);
	});

	test("a heading composed with asChild joins the data-slot chain", () => {
		render(
			<Typography.Root asChild>
				<Typography.H2 data-testid="heading">Traffic policy</Typography.H2>
			</Typography.Root>,
		);
		expect(screen.getByTestId("heading")).toHaveAttribute("data-slot", "typography typography-h2");
	});
});
