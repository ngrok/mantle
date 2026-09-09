import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { DescriptionList } from "./description-list.js";

describe("DescriptionList", () => {
	test("Root renders a dl element", () => {
		render(
			<DescriptionList.Root data-testid="dl">
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		expect(dl.tagName).toBe("DL");
	});

	test("Label renders a dt element", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label data-testid="label">Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dt = screen.getByTestId("label");
		expect(dt.tagName).toBe("DT");
		expect(dt).toHaveTextContent("Name");
	});

	test("Value renders a dd element", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value data-testid="value">foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		expect(dd.tagName).toBe("DD");
		expect(dd).toHaveTextContent("foo");
	});

	test("Item renders a div element", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item data-testid="item">
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const div = screen.getByTestId("item");
		expect(div.tagName).toBe("DIV");
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

	test("custom className merges with defaults on Root", () => {
		render(
			<DescriptionList.Root className="custom-class" data-testid="dl">
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value>foo</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dl = screen.getByTestId("dl");
		expect(dl.className).toContain("custom-class");
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
		expect(dt.className).toContain("font-bold");
	});

	test("custom className merges with defaults on Value", () => {
		render(
			<DescriptionList.Root>
				<DescriptionList.Item>
					<DescriptionList.Label>Name</DescriptionList.Label>
					<DescriptionList.Value className="font-mono" data-testid="value">
						foo
					</DescriptionList.Value>
				</DescriptionList.Item>
			</DescriptionList.Root>,
		);
		const dd = screen.getByTestId("value");
		expect(dd.className).toContain("font-mono");
	});
});
