import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import * as Panel from "./panel-parts.js";

describe("Panel.Root", () => {
	test("renders a complementary landmark named by aria-label, stamped data-slot panel", () => {
		render(<Panel.Root aria-label="Assistant">conversation</Panel.Root>);
		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(panel).toHaveAttribute("data-slot", "panel");
		expect(panel).toHaveTextContent("conversation");
	});

	test("forwards className, a ref, and arbitrary data-* to the rendered root", () => {
		const ref = createRef<HTMLElement>();
		render(
			<Panel.Root aria-label="Assistant" className="h-120" data-flavor="assistant" ref={ref}>
				conversation
			</Panel.Root>,
		);
		const panel = screen.getByRole("complementary", { name: "Assistant" });
		expect(panel.className).toContain("h-120");
		expect(panel).toHaveAttribute("data-flavor", "assistant");
		expect(ref.current).toBe(panel);
	});

	test("joins an ancestor's data-slot ahead of its own", () => {
		render(
			<Panel.Root aria-label="Assistant" data-slot="details">
				conversation
			</Panel.Root>,
		);
		expect(screen.getByRole("complementary")).toHaveAttribute("data-slot", "details panel");
	});

	test("asChild renders the child with no landmark, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLElement>();
		render(
			<Panel.Root asChild className="h-120" data-flavor="assistant" ref={ref}>
				<section data-testid="panel">conversation</section>
			</Panel.Root>,
		);
		const panel = screen.getByTestId("panel");
		expect(panel.tagName).toBe("SECTION");
		expect(panel).toHaveAttribute("data-slot", "panel");
		expect(panel.className).toContain("h-120");
		expect(panel).toHaveAttribute("data-flavor", "assistant");
		expect(ref.current).toBe(panel);
		expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
	});
});

describe.each([
	["Header", Panel.Header, "panel-header"],
	["Body", Panel.Body, "panel-body"],
	["Footer", Panel.Footer, "panel-footer"],
] as const)("Panel.%s", (_name, Part, slot) => {
	test(`renders a div stamped data-slot ${slot} with its children and no landmark`, () => {
		render(<Part data-testid="part">conversation</Part>);
		const element = screen.getByTestId("part");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element).toHaveTextContent("conversation");
		expect(screen.queryByRole("banner")).not.toBeInTheDocument();
		expect(screen.queryByRole("main")).not.toBeInTheDocument();
	});

	test("joins an ancestor's data-slot ahead of its own", () => {
		render(
			<Part data-slot="details" data-testid="part">
				conversation
			</Part>,
		);
		expect(screen.getByTestId("part")).toHaveAttribute("data-slot", `details ${slot}`);
	});

	test("asChild renders the child, merging classes, data attributes, and the ref", () => {
		const ref = createRef<HTMLDivElement>();
		render(
			<Part asChild className="consumer-part" data-flavor="assistant" ref={ref}>
				<section data-testid="part">conversation</section>
			</Part>,
		);
		const element = screen.getByTestId("part");
		expect(element.tagName).toBe("SECTION");
		expect(element).toHaveAttribute("data-slot", slot);
		expect(element.className).toContain("consumer-part");
		expect(element).toHaveAttribute("data-flavor", "assistant");
		expect(ref.current).toBe(element);
	});
});
