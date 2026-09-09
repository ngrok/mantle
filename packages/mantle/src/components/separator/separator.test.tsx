import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { HorizontalSeparatorGroup, Separator } from "./separator.js";

describe("Separator", () => {
	test("is decorative by default: role=none with no aria-orientation", () => {
		render(<Separator data-testid="separator" />);
		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("role", "none");
		expect(separator).not.toHaveAttribute("aria-orientation");
		expect(separator).toHaveAttribute("data-orientation", "horizontal");
		expect(separator).toHaveAttribute("data-separator");
		expect(separator).toHaveAttribute("data-slot", "separator");
	});

	test("semantic renders role=separator and omits aria-orientation when horizontal", () => {
		render(<Separator semantic />);
		const separator = screen.getByRole("separator");
		expect(separator).not.toHaveAttribute("aria-orientation");
	});

	test("semantic vertical renders aria-orientation=vertical", () => {
		render(<Separator semantic orientation="vertical" />);
		const separator = screen.getByRole("separator");
		expect(separator).toHaveAttribute("aria-orientation", "vertical");
		expect(separator).toHaveAttribute("data-orientation", "vertical");
	});

	test("a HorizontalSeparatorGroup forces every child separator horizontal", () => {
		render(
			<HorizontalSeparatorGroup data-testid="group">
				<Separator semantic orientation="vertical" />
				<h3>ngrok mantle</h3>
				<Separator semantic orientation="vertical" />
			</HorizontalSeparatorGroup>,
		);
		const group = screen.getByTestId("group");
		expect(group).toHaveAttribute("data-slot", "horizontal-separator-group");
		expect(group).toHaveAttribute("data-horizontal-separator-group");
		for (const separator of screen.getAllByRole("separator")) {
			expect(separator).toHaveAttribute("data-orientation", "horizontal");
			expect(separator).not.toHaveAttribute("aria-orientation");
		}
	});

	test("HorizontalSeparatorGroup forwards its ref to the rendered div", () => {
		const ref = createRef<HTMLDivElement>();
		render(<HorizontalSeparatorGroup ref={ref} data-testid="group" />);
		expect(ref.current).toBe(screen.getByTestId("group"));
	});

	test("asChild keeps the role, data attributes, and children on the child element", () => {
		render(
			<Separator asChild semantic orientation="vertical">
				<li data-testid="child">between</li>
			</Separator>,
		);
		const child = screen.getByTestId("child");
		expect(child.tagName).toBe("LI");
		expect(child).toHaveAttribute("role", "separator");
		expect(child).toHaveAttribute("aria-orientation", "vertical");
		expect(child).toHaveAttribute("data-slot", "separator");
		expect(child).toHaveTextContent("between");
	});

	test("without asChild, children are dropped so the divider stays empty", () => {
		render(<Separator data-testid="separator">ignored</Separator>);
		expect(screen.getByTestId("separator")).toBeEmptyDOMElement();
	});
});
