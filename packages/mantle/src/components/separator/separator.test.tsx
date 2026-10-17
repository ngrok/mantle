import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { ButtonGroup } from "../button/button-group.js";
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

	test("falls back to horizontal for an orientation value TypeScript would have rejected", () => {
		render(
			<Separator
				data-testid="separator"
				// @ts-expect-error -- a JavaScript consumer can pass anything; the guard normalizes it
				orientation="diagonal"
			/>,
		);
		expect(screen.getByTestId("separator")).toHaveAttribute("data-orientation", "horizontal");
	});

	test("forwards its ref to the rendered div", () => {
		const ref = createRef<HTMLDivElement>();
		render(<Separator ref={ref} data-testid="separator" />);
		expect(ref.current).toBe(screen.getByTestId("separator"));
	});

	test("chains a caller's data-slot in front of its own", () => {
		render(<Separator data-slot="dropdown-menu-separator" data-testid="separator" />);
		expect(screen.getByTestId("separator")).toHaveAttribute(
			"data-slot",
			"dropdown-menu-separator separator",
		);
	});

	// Why a class assertion: the tailwind-merge override contract. A caller's className
	// must beat the default `bg-separator` color.
	test("lets a caller className win the separator color", () => {
		render(<Separator className="bg-card" data-testid="separator" />);
		const separator = screen.getByTestId("separator");
		expect(Array.from(separator.classList).filter((name) => name.startsWith("bg-"))).toEqual([
			"bg-card",
		]);
	});

	// Why a class assertion: a cross-file spelling pin. ButtonGroup's panel appearance spaces
	// its dividers with `[&>.separator]:mx-px` (button/button-group.tsx), so both halves render
	// together here and a rename of either one fails this test.
	test("carries the `separator` class a panel ButtonGroup's divider spacing selects on", () => {
		render(
			<ButtonGroup appearance="panel" data-testid="group">
				<Separator data-testid="separator" orientation="vertical" />
			</ButtonGroup>,
		);
		const group = screen.getByTestId("group");
		const separator = screen.getByTestId("separator");
		expect(group).toHaveClass("[&>.separator]:mx-px");
		expect(separator).toHaveClass("separator");
		// The selector is direct-child only, so the nesting is part of the contract.
		expect(separator.parentElement).toBe(group);
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

	// Why a class assertion: a cross-element spelling pin. The group emits
	// `data-horizontal-separator-group` plus the `group` class, and a horizontal separator
	// stretches with `group-data-horizontal-separator-group:flex-1`; a rename of one side alone
	// drops the stretch with every other test green.
	test("a HorizontalSeparatorGroup carries the attribute its child separators' stretch variant matches", () => {
		render(
			<HorizontalSeparatorGroup data-testid="group">
				<Separator data-testid="separator" />
			</HorizontalSeparatorGroup>,
		);
		const group = screen.getByTestId("group");
		expect(group).toHaveAttribute("data-horizontal-separator-group");
		expect(group).toHaveClass("group");
		expect(screen.getByTestId("separator")).toHaveClass(
			"group-data-horizontal-separator-group:flex-1",
		);
	});

	test("HorizontalSeparatorGroup forwards its ref to the rendered div", () => {
		const ref = createRef<HTMLDivElement>();
		render(<HorizontalSeparatorGroup ref={ref} data-testid="group" />);
		expect(ref.current).toBe(screen.getByTestId("group"));
	});

	test("HorizontalSeparatorGroup asChild renders the child element with the group attributes and still forces horizontal", () => {
		render(
			<HorizontalSeparatorGroup asChild>
				<section data-testid="group">
					<Separator semantic orientation="vertical" />
				</section>
			</HorizontalSeparatorGroup>,
		);
		const group = screen.getByTestId("group");
		// Why tagName: the asChild swap renders the child element in place of the default.
		expect(group.tagName).toBe("SECTION");
		expect(group).toHaveAttribute("data-slot", "horizontal-separator-group");
		expect(group).toHaveAttribute("data-horizontal-separator-group");
		expect(screen.getByRole("separator")).toHaveAttribute("data-orientation", "horizontal");
	});

	test("asChild keeps the role, data attributes, and children on the child element", () => {
		render(
			<Separator asChild semantic orientation="vertical">
				<li data-testid="child">between</li>
			</Separator>,
		);
		const child = screen.getByTestId("child");
		// Why tagName: the asChild swap renders the child element in place of the default.
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
