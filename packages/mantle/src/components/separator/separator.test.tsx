import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { createRef } from "react";
import { describe, expect, test } from "vitest";
import { ButtonGroup } from "../button/button-group.js";
import { HorizontalSeparatorGroup, Separator } from "./separator.js";

type Orientation = ComponentProps<typeof Separator>["orientation"];

describe("Separator", () => {
	test("is decorative by default and stays out of the accessibility tree", () => {
		render(<Separator data-testid="separator" />);

		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("role", "none");
		expect(separator).not.toHaveAttribute("aria-orientation");
		expect(separator).toHaveAttribute("data-slot", "separator");
		expect(separator).toHaveAttribute("data-orientation", "horizontal");
		// `data-separator` is what HorizontalSeparatorGroup's
		// `[&>*:not([data-separator])]:shrink-0` selector excludes, so every
		// separator has to carry it for the group's layout to work.
		expect(separator).toHaveAttribute("data-separator");
		expect(screen.queryByRole("separator")).toBeNull();
	});

	test("semantic joins the accessibility tree as a separator", () => {
		render(<Separator semantic />);

		expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "separator");
	});

	test.each<{
		ariaOrientation: string | null;
		orientation: Orientation;
		role: string;
		semantic: boolean;
	}>([
		{ ariaOrientation: null, orientation: "horizontal", role: "none", semantic: false },
		{ ariaOrientation: null, orientation: "vertical", role: "none", semantic: false },
		// `aria-orientation` defaults to horizontal, so the semantic horizontal
		// separator deliberately omits the attribute rather than restating it.
		{ ariaOrientation: null, orientation: "horizontal", role: "separator", semantic: true },
		{ ariaOrientation: "vertical", orientation: "vertical", role: "separator", semantic: true },
	])(
		"semantic=$semantic orientation=$orientation renders role=$role and aria-orientation=$ariaOrientation",
		({ ariaOrientation, orientation, role, semantic }) => {
			render(<Separator data-testid="separator" orientation={orientation} semantic={semantic} />);

			const separator = screen.getByTestId("separator");
			expect(separator).toHaveAttribute("role", role);
			expect(separator).toHaveAttribute("data-orientation", orientation);
			// `getAttribute` is null for an absent attribute, so one assertion
			// covers both "omitted" and "set to this value".
			expect(separator.getAttribute("aria-orientation")).toBe(ariaOrientation);
		},
	);

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

	test("lets a caller className win the separator color", () => {
		render(<Separator className="bg-card" data-testid="separator" />);

		const separator = screen.getByTestId("separator");
		expect(separator).toHaveClass("bg-card");
		expect(separator).not.toHaveClass("bg-separator");
	});

	test("carries the `separator` class a panel ButtonGroup's divider spacing selects on", () => {
		// Two halves of one cross-file contract, rendered together: ButtonGroup's
		// panel appearance spaces its dividers with `[&>.separator]:mx-px`
		// (button/button-group.tsx) and matches on the literal `separator` class
		// this component emits. Renaming either half alone drops the spacing with
		// every other test still green.
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

	test("lets a caller rename the slot and the role through props", () => {
		// DropdownMenu.Separator, Select.Separator, Command.Separator,
		// Sidebar.Separator and CursorPagination all rely on `data-slot` being
		// overridable, which only works while `{...props}` spreads last.
		render(
			<Separator data-slot="dropdown-menu-separator" data-testid="separator" role="presentation" />,
		);

		const separator = screen.getByTestId("separator");
		expect(separator).toHaveAttribute("data-slot", "dropdown-menu-separator");
		expect(separator).toHaveAttribute("role", "presentation");
	});

	test("drops children unless asChild is set", () => {
		render(<Separator data-testid="separator">or</Separator>);

		expect(screen.getByTestId("separator")).toBeEmptyDOMElement();
		expect(screen.queryByText("or")).toBeNull();
	});

	test("asChild renders the caller's element with the separator attributes and slot chain", () => {
		render(
			<Separator asChild orientation="vertical" semantic>
				<span data-slot="toolbar-divider" data-testid="separator" />
			</Separator>,
		);

		const separator = screen.getByRole("separator");
		expect(separator.tagName).toBe("SPAN");
		expect(separator).toBe(screen.getByTestId("separator"));
		expect(separator).toHaveAttribute("data-slot", "separator toolbar-divider");
		expect(separator).toHaveAttribute("data-orientation", "vertical");
		expect(separator).toHaveAttribute("aria-orientation", "vertical");
		expect(separator).toHaveAttribute("data-separator");
		// The ButtonGroup divider-spacing contract above has to survive Slot too.
		expect(separator).toHaveClass("separator");
	});

	test("asChild renders the child's own content", () => {
		render(
			<Separator asChild>
				<span data-testid="separator">or</span>
			</Separator>,
		);

		expect(screen.getByTestId("separator")).toHaveTextContent("or");
	});

	test("forwards ref to the rendered element", () => {
		const ref = createRef<HTMLDivElement>();
		render(<Separator data-testid="separator" ref={ref} />);

		expect(ref.current).toBe(screen.getByTestId("separator"));
	});
});

describe("HorizontalSeparatorGroup", () => {
	test("renders its children inside a slotted group container", () => {
		render(
			<HorizontalSeparatorGroup data-testid="group">
				<h3>ngrok mantle</h3>
			</HorizontalSeparatorGroup>,
		);

		const group = screen.getByTestId("group");
		expect(group).toHaveAttribute("data-slot", "horizontal-separator-group");
		expect(group).toContainElement(screen.getByRole("heading", { name: "ngrok mantle" }));
	});

	test("marks itself with the attribute the child separator's stretch variant matches", () => {
		// Two halves of one contract: the group emits
		// `data-horizontal-separator-group` and a horizontal separator stretches
		// with `group-data-horizontal-separator-group:flex-1`. Renaming either half
		// alone silently drops the stretch, and no other check would notice.
		render(
			<HorizontalSeparatorGroup data-testid="group">
				<Separator data-testid="separator" />
			</HorizontalSeparatorGroup>,
		);

		expect(screen.getByTestId("group")).toHaveAttribute("data-horizontal-separator-group");
		expect(screen.getByTestId("group")).toHaveClass("group");
		expect(screen.getByTestId("separator")).toHaveClass(
			"group-data-horizontal-separator-group:flex-1",
		);
	});

	test("forces a nested Separator's orientation to horizontal, overriding its own prop", () => {
		render(
			<HorizontalSeparatorGroup>
				<div>
					<Separator data-testid="nested" orientation="vertical" semantic />
				</div>
			</HorizontalSeparatorGroup>,
		);

		const separator = screen.getByTestId("nested");
		expect(separator).toHaveAttribute("data-orientation", "horizontal");
		// The forced orientation has to reach ARIA too, not just the data attribute.
		expect(separator).not.toHaveAttribute("aria-orientation");
	});

	test("does not affect separators rendered outside of it", () => {
		render(
			<>
				<HorizontalSeparatorGroup>
					<Separator data-testid="inside" orientation="vertical" />
				</HorizontalSeparatorGroup>
				<Separator data-testid="outside" orientation="vertical" />
			</>,
		);

		expect(screen.getByTestId("inside")).toHaveAttribute("data-orientation", "horizontal");
		expect(screen.getByTestId("outside")).toHaveAttribute("data-orientation", "vertical");
	});

	test("asChild renders the caller's element with the group attributes and slot chain", () => {
		render(
			<HorizontalSeparatorGroup asChild>
				<section data-slot="banner" data-testid="group">
					<h3>ngrok mantle</h3>
				</section>
			</HorizontalSeparatorGroup>,
		);

		const group = screen.getByTestId("group");
		expect(group.tagName).toBe("SECTION");
		expect(group).toHaveAttribute("data-slot", "horizontal-separator-group banner");
		expect(group).toHaveAttribute("data-horizontal-separator-group");
		expect(group).toContainElement(screen.getByRole("heading", { name: "ngrok mantle" }));
	});

	test("still forces descendant orientation when rendered asChild", () => {
		render(
			<HorizontalSeparatorGroup asChild>
				<section>
					<Separator data-testid="separator" orientation="vertical" />
				</section>
			</HorizontalSeparatorGroup>,
		);

		expect(screen.getByTestId("separator")).toHaveAttribute("data-orientation", "horizontal");
	});
});
