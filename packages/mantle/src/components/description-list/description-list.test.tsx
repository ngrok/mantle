import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DescriptionList } from "./description-list.js";

/** The Tailwind `font-weight` utilities. */
const FONT_WEIGHT = /^font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/;

/**
 * Returns the element's classes that match one utility group, so a
 * tailwind-merge override test can assert the group holds only the winner.
 */
function utilityClasses(element: Element, group: RegExp): string[] {
	return Array.from(element.classList).filter((name) => group.test(name));
}

describe("DescriptionList", () => {
	test("Label renders its children", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label data-testid="label">Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dt = screen.getByTestId("label");
		expect(dt).toHaveTextContent("Name");
	});

	test("Value renders its children", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value data-testid="value">foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		expect(dd).toHaveTextContent("foo");
	});

	test("Item forwards consumer attributes to its element", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item data-testid="item">
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		expect(screen.getByTestId("item")).toHaveAttribute("data-slot", "description-list-item");
	});

	test.each([
		["Root", "description-list", "DL"],
		["Item", "description-list-item", "DIV"],
		["Label", "description-list-label", "DT"],
		["Value", "description-list-value", "DD"],
	] as const)("%s stamps data-slot=%s on its %s", (_part, slot, tagName) => {
		const { container } = render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const element = container.querySelector(`[data-slot="${slot}"]`);
		// Why tagName: the JSDoc names <dl>, <dt>, and <dd> as the parts' elements. No role query pins a <dl>.
		expect(element?.tagName).toBe(tagName);
	});

	test("a consumer data-slot on Root joins in front of the part's own slot", () => {
		const { container } = render(
			<DescriptionList.Root data-slot="resource-meta">
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		expect(container.querySelector("dl")).toHaveAttribute(
			"data-slot",
			"resource-meta description-list",
		);
	});

	test("Root asChild renders the child element with the slot and classes", () => {
		render(
			<DescriptionList.Root asChild className="custom-class">
				<section data-testid="root">
					<DescriptionList.Item>
						<DescriptionList.Label>Name</DescriptionList.Label>
						<DescriptionList.Value>foo</DescriptionList.Value>
					</DescriptionList.Item>
				</section>
			</DescriptionList.Root>,
		);
		const root = screen.getByTestId("root");
		expect(root.tagName).toBe("SECTION");
		expect(root).toHaveAttribute("data-slot", "description-list");
		expect(root).toHaveClass("custom-class");
	});

	test.each([
		{
			part: "Item",
			slot: "description-list-item",
			tagName: "A",
			element: (
				<DescriptionList.Root>
					<DescriptionList.Item asChild>
						<a href="/keys/1" data-testid="part">
							row
						</a>
					</DescriptionList.Item>
				</DescriptionList.Root>
			),
		},
		{
			part: "Label",
			slot: "description-list-label",
			tagName: "SPAN",
			element: (
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label asChild>
							<span data-testid="part">Name</span>
						</DescriptionList.Label>
						<DescriptionList.Value>foo</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			),
		},
		{
			part: "Value",
			slot: "description-list-value",
			tagName: "CODE",
			element: (
				<DescriptionList.Root>
					<DescriptionList.Item>
						<DescriptionList.Label>Name</DescriptionList.Label>
						<DescriptionList.Value asChild>
							<code data-testid="part">my-api-key</code>
						</DescriptionList.Value>
					</DescriptionList.Item>
				</DescriptionList.Root>
			),
		},
	])("$part asChild renders the child element with the slot", ({ slot, tagName, element }) => {
		render(element);
		const part = screen.getByTestId("part");
		expect(part.tagName).toBe(tagName);
		expect(part).toHaveAttribute("data-slot", slot);
	});

	test("custom className merges with defaults on Root", () => {
		render(
			<DescriptionList.Root className="custom-class rounded-none" data-testid="dl">
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		// The tailwind-merge contract: the consumer's radius replaces the default.
		expect(dl).toHaveClass("custom-class");
		expect(utilityClasses(dl, /^rounded/)).toEqual(["rounded-none"]);
	});

	test("custom className merges with defaults on Item", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item className="custom-class items-start" data-testid="item">
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const item = screen.getByTestId("item");
		// The tailwind-merge contract: the consumer's alignment replaces the default.
		expect(item).toHaveClass("custom-class");
		expect(utilityClasses(item, /^items-/)).toEqual(["items-start"]);
	});

	test("custom className merges with defaults on Label", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label className="font-bold" data-testid="label">
						Name
					</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dt = screen.getByTestId("label");
		// The tailwind-merge contract: the consumer's weight replaces the default.
		expect(utilityClasses(dt, FONT_WEIGHT)).toEqual(["font-bold"]);
	});

	test("custom className merges with defaults on Value", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value className="custom-class px-0" data-testid="value">
						foo
					</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		// The tailwind-merge contract: the consumer's padding replaces the default.
		expect(dd).toHaveClass("custom-class");
		expect(utilityClasses(dd, /^px-/)).toEqual(["px-0"]);
	});
});
